import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type InputHTMLAttributes } from "react";
import { Check, FileUp, FolderOpen, LoaderCircle, RefreshCw, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { ASSET_BUCKET, uploadAssetFile } from "@/lib/storage";
import { useProfile } from "@/hooks/useProfile";
import { formatFileSize } from "@/lib/file-preview";
import { createUploadEntries, normalizeFileList, readDataTransferItems, selectDirectory, supportsDirectoryPicker, type UploadEntry } from "@/lib/file-selection";
import type { AssetStatus } from "@/types/domain";

type Collection = { id: string; name: string };
type DirectoryInputAttributes = InputHTMLAttributes<HTMLInputElement> & { webkitdirectory?: string };
const directoryInputAttributes: DirectoryInputAttributes = { webkitdirectory: "" };
const UPLOAD_CONCURRENCY = 3;

export function AssetUploadPanel() {
  const { profile } = useProfile();
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [category, setCategory] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [status, setStatus] = useState<AssetStatus>("draft");
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!supabase) return;
    void supabase.from("asset_collections").select("id, name").order("name").then(({ data }) => setCollections((data ?? []) as Collection[]));
  }, []);

  const queuedCount = entries.filter((entry) => entry.state === "queued").length;
  const totalSize = entries.reduce((total, entry) => total + entry.size, 0);

  function replaceSelection(nextEntries: UploadEntry[]) {
    setEntries(nextEntries);
    setMessage(nextEntries.length ? null : "No files were found in that selection.");
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    replaceSelection(normalizeFileList(event.target.files ?? []));
    event.target.value = "";
  }

  async function handleFolderSelect() {
    if (!supportsDirectoryPicker()) {
      folderInputRef.current?.click();
      return;
    }
    try {
      replaceSelection(createUploadEntries(await selectDirectory()));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage(error instanceof Error ? error.message : "The folder could not be opened.");
    }
  }

  async function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    replaceSelection(createUploadEntries(await readDataTransferItems(event.dataTransfer.items)));
  }

  function renameEntry(id: string, name: string) {
    setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, name } : entry));
  }

  function removeEntry(id: string) {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }

  function clearQueue() {
    setEntries([]);
    setMessage(null);
  }

  function retryEntry(id: string) {
    setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, state: "queued", progress: 0, message: undefined } : entry));
  }

  async function upload() {
    if (!supabase || !profile?.id || !queuedCount) return;
    if (entries.some((entry) => entry.state === "queued" && !entry.name.trim())) {
      setMessage("Name every queued asset before uploading.");
      return;
    }
    const queue = entries.filter((entry) => entry.state === "queued");
    setUploading(true);
    setMessage(null);
    let cursor = 0;
    let uploaded = 0;
    let failed = 0;

    async function worker() {
      while (cursor < queue.length) {
        const entry = queue[cursor++];
        if (await uploadEntry(entry)) uploaded += 1;
        else failed += 1;
      }
    }

    await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, queue.length) }, () => worker()));
    setMessage(`${uploaded} uploaded · ${failed} failed`);
    setUploading(false);
  }

  async function uploadEntry(entry: UploadEntry) {
    if (!supabase || !profile?.id) return false;
    updateEntry(entry.id, { state: "uploading", progress: 5, message: undefined });
    let storagePath: string | null = null;
    let assetId: string | null = null;
    try {
      const folder = entry.relativePath ? `uploads/${entry.relativePath.split("/").slice(0, -1).join("/")}` : "uploads";
      storagePath = await uploadAssetFile(entry.file, folder);
      updateEntry(entry.id, { progress: 55 });
      const { data: asset, error: assetError } = await supabase.from("assets").insert({
        name: entry.name.trim(), category: category.trim() || null, collection_id: collectionId || null,
        asset_type: entry.mimeType, status, storage_path: storagePath, version: "1", owner_id: profile.id,
        metadata: { original_name: entry.file.name, relative_path: entry.relativePath || null, mime_type: entry.mimeType, size: entry.size },
      }).select().single();
      if (assetError) throw assetError;
      assetId = asset.id;
      updateEntry(entry.id, { progress: 80 });
      const { error: versionError } = await supabase.from("asset_versions").insert({ asset_id: asset.id, version: "1", storage_path: storagePath, created_by: profile.id, notes: "Initial upload" });
      if (versionError) throw versionError;
      updateEntry(entry.id, { state: "uploaded", progress: 100, message: "Ready" });
      return true;
    } catch (uploadError) {
      if (assetId) await supabase.from("assets").delete().eq("id", assetId);
      if (storagePath) await supabase.storage.from(ASSET_BUCKET).remove([storagePath]);
      const failure = uploadError instanceof Error ? uploadError.message : "Upload failed.";
      updateEntry(entry.id, { state: "failed", progress: 0, message: failure });
      return false;
    }
  }

  function updateEntry(id: string, changes: Partial<UploadEntry>) {
    setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, ...changes } : entry));
  }

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-white shadow-card">
      <div className="border-b border-border bg-[#f7f8f8] px-6 py-6 md:px-8"><div className="flex items-start gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#111111] text-white"><Upload className="h-5 w-5" /></span><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Asset library</p><h2 className="mt-1 font-display text-2xl font-bold tracking-[-0.03em]">Add new assets</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted">Choose files or a folder, then give every asset its own library name.</p></div></div></div>
      <div className="p-6 md:p-8">
        <div onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }} onDrop={(event) => void handleDrop(event)} className={`rounded-xl border-2 border-dashed p-6 transition ${dragging ? "border-[#111111] bg-[#eff1f3]" : "border-[#1111114d] bg-[#fbfbfb]"}`}><div className="text-center"><Upload className="mx-auto h-7 w-7 text-foreground" /><p className="mt-3 text-sm font-semibold">Drop files or folders here</p><p className="mt-1 text-xs text-muted">Or choose how you want to browse</p></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex h-11 items-center justify-center gap-2 rounded-pill border border-border bg-white px-5 text-sm font-semibold transition hover:border-[#111111] hover:bg-surface"><FileUp className="h-4 w-4" /> Choose files</button><button type="button" onClick={() => void handleFolderSelect()} className="inline-flex h-11 items-center justify-center gap-2 rounded-pill border border-border bg-white px-5 text-sm font-semibold transition hover:border-[#111111] hover:bg-surface"><FolderOpen className="h-4 w-4" /> Choose folder</button></div><input ref={fileInputRef} type="file" multiple onChange={handleFileChange} className="hidden" aria-label="Choose files" /><input ref={folderInputRef} type="file" {...directoryInputAttributes} multiple onChange={handleFileChange} className="hidden" aria-label="Choose folder" /></div>
        <div className="mt-6 grid gap-3 rounded-xl border border-border p-4 md:grid-cols-3"><input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Category, e.g. logos" aria-label="Category" className="h-11 rounded-md border border-border px-3 text-sm" /><select value={collectionId} onChange={(event) => setCollectionId(event.target.value)} aria-label="Collection" className="h-11 rounded-md border border-border bg-white px-3 text-sm"><option value="">No collection</option>{collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value as AssetStatus)} aria-label="Status" className="h-11 rounded-md border border-border bg-white px-3 text-sm">{(["draft", "approved", "current", "deprecated", "template"] as AssetStatus[]).map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
        {entries.length ? <div className="mt-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">Review upload</h3><p className="mt-1 text-xs text-muted">{entries.length} file{entries.length === 1 ? "" : "s"} · {formatFileSize(totalSize)}</p></div><button type="button" onClick={clearQueue} className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-foreground"><Trash2 className="h-3.5 w-3.5" /> Clear queue</button></div><div className="mt-3 space-y-2">{entries.map((entry) => <div key={entry.id} className="rounded-lg border border-border px-3 py-3"><div className="flex flex-wrap items-center gap-3"><input aria-label={`Asset name for ${entry.file.name}`} value={entry.name} onChange={(event) => renameEntry(entry.id, event.target.value)} placeholder="Asset name" disabled={entry.state === "uploading" || entry.state === "uploaded"} className="h-10 min-w-[180px] flex-1 rounded-md border border-border bg-white px-3 text-sm" /><span className="text-xs text-muted">{formatFileSize(entry.size)}</span>{entry.state === "failed" ? <button type="button" onClick={() => retryEntry(entry.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#b42318]" aria-label={`Retry ${entry.name}`}><RefreshCw className="h-3.5 w-3.5" /> Retry</button> : null}<button type="button" onClick={() => removeEntry(entry.id)} disabled={entry.state === "uploading"} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-foreground disabled:opacity-50" aria-label={`Remove ${entry.name}`}><X className="h-4 w-4" /></button></div>{entry.relativePath ? <p className="mt-2 truncate text-xs text-muted">{entry.relativePath}</p> : null}<div className="mt-3 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-[#111111] transition-all" style={{ width: `${entry.progress}%` }} /></div><span className={`inline-flex min-w-20 items-center justify-end gap-1 text-xs ${entry.state === "failed" ? "text-[#b42318]" : "text-muted"}`}>{entry.state === "uploading" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : entry.state === "uploaded" ? <Check className="h-3.5 w-3.5" /> : null}{entry.message ?? entry.state}</span></div></div>)}</div></div> : null}
        {message ? <p className="mt-4 rounded-lg bg-surface px-4 py-3 text-sm" role="status" aria-live="polite">{message}</p> : null}
        <div className="mt-6 flex justify-end"><Button onClick={() => void upload()} disabled={uploading || !queuedCount}>{uploading ? "Uploading..." : `Upload ${queuedCount} asset${queuedCount === 1 ? "" : "s"}`}</Button></div>
      </div>
    </section>
  );
}
