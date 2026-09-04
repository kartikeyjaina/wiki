import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type InputHTMLAttributes } from "react";
import { Check, FileUp, FolderOpen, LoaderCircle, RefreshCw, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CollectionSinglePicker } from "@/components/ui/CollectionSinglePicker";
import { supabase } from "@/lib/supabase";
import { ASSET_BUCKET, uploadAssetFile } from "@/lib/storage";
import { useProfile } from "@/hooks/useProfile";
import { formatFileSize } from "@/lib/file-preview";
import { createUploadEntries, normalizeFileList, readDataTransferItems, selectDirectory, supportsDirectoryPicker, type UploadEntry } from "@/lib/file-selection";
import type { AssetCollection, AssetStatus } from "@/types/domain";

type DirectoryInputAttributes = InputHTMLAttributes<HTMLInputElement> & { webkitdirectory?: string };
const directoryInputAttributes: DirectoryInputAttributes = { webkitdirectory: "" };
const UPLOAD_CONCURRENCY = 3;

type ClassifiedEntry = UploadEntry & { collectionId: string };

export function AssetUploadPanel({ initialCollectionId = "", collectionLabel }: { initialCollectionId?: string; collectionLabel?: string }) {
  const { profile } = useProfile();
  const [entries, setEntries] = useState<ClassifiedEntry[]>([]);
  const [collections, setCollections] = useState<AssetCollection[]>([]);
  const [defaultCollectionId, setDefaultCollectionId] = useState(initialCollectionId);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<AssetStatus>("draft");
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multipleInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!supabase) return;
    void supabase.from("asset_collections").select("*").eq("is_visible", true).is("archived_at", null).order("display_order").then(({ data, error }) => {
      if (error) setMessage(error.message); else setCollections((data ?? []) as AssetCollection[]);
    });
  }, []);

  useEffect(() => {
    if (!defaultCollectionId) return;
    setEntries((current) => current.map((entry) => ({ ...entry, collectionId: defaultCollectionId })));
  }, [defaultCollectionId]);

  const queuedEntries = entries.filter((entry) => entry.state === "queued");
  const queuedCount = queuedEntries.length;
  const totalSize = entries.reduce((total, entry) => total + entry.size, 0);
  const replaceSelection = (next: UploadEntry[]) => { setEntries(next.map((entry) => ({ ...entry, collectionId: initialCollectionId }))); setMessage(next.length ? null : "No files were found in that selection."); };
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => { replaceSelection(normalizeFileList(event.target.files ?? [])); event.target.value = ""; };
  async function handleFolderSelect() { if (!supportsDirectoryPicker()) { folderInputRef.current?.click(); return; } try { replaceSelection(createUploadEntries(await selectDirectory())); } catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; setMessage(error instanceof Error ? error.message : "The folder could not be opened."); } }
  async function handleDrop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); setDragging(false); replaceSelection(createUploadEntries(await readDataTransferItems(event.dataTransfer.items))); }
  const updateEntry = (id: string, changes: Partial<ClassifiedEntry>) => setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, ...changes } : entry));
  const retryEntry = (id: string) => updateEntry(id, { state: "queued", progress: 0, message: undefined });
  const retryFailed = () => setEntries((current) => current.map((entry) => entry.state === "failed" ? { ...entry, state: "queued", progress: 0, message: undefined } : entry));
  const clearCompleted = () => setEntries((current) => current.filter((entry) => entry.state !== "uploaded"));

  async function upload() {
    if (!supabase || !profile?.id || !queuedCount) return;
    if (queuedEntries.some((entry) => !entry.name.trim())) { setMessage("Name every queued asset before uploading."); return; }
    if (queuedEntries.some((entry) => !entry.collectionId)) { setMessage("Select a collection for every queued asset before uploading."); return; }
    setUploading(true); setMessage(null); let cursor = 0; let uploaded = 0; let failed = 0;
    async function worker() { while (cursor < queuedEntries.length) { const entry = queuedEntries[cursor++]; if (await uploadEntry(entry)) uploaded += 1; else failed += 1; } }
    await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, queuedEntries.length) }, worker));
    setMessage(`${uploaded} uploaded · ${failed} failed${failed ? ". Retry the failed files." : ""}`); setUploading(false);
  }

  async function uploadEntry(entry: ClassifiedEntry) {
    if (!supabase || !profile?.id) return false;
    updateEntry(entry.id, { state: "uploading", progress: 5, message: undefined }); let storagePath: string | null = null; let assetId: string | null = null;
    try {
      const baseFolder = `collections/${entry.collectionId}`;
      const relativeDirectory = entry.relativePath ? entry.relativePath.split("/").slice(0, -1).join("/") : "";
      storagePath = await uploadAssetFile(entry.file, relativeDirectory ? `${baseFolder}/${relativeDirectory}` : baseFolder);
      updateEntry(entry.id, { progress: 55 });
      const { data: asset, error: assetError } = await supabase.from("assets").insert({ name: entry.name.trim(), category: category.trim() || null, collection_id: entry.collectionId, asset_type: entry.mimeType, status, storage_path: storagePath, version: "1", owner_id: profile.id, metadata: { original_name: entry.file.name, relative_path: entry.relativePath || null, mime_type: entry.mimeType, size: entry.size } }).select().single();
      if (assetError) throw assetError; assetId = asset.id; updateEntry(entry.id, { progress: 80 });
      const { error: versionError } = await supabase.from("asset_versions").insert({ asset_id: asset.id, version: "1", storage_path: storagePath, created_by: profile.id, notes: "Initial upload" });
      if (versionError) throw versionError; updateEntry(entry.id, { state: "uploaded", progress: 100, message: "Ready" }); return true;
    } catch (error) {
      if (assetId) { const cleanupError = await supabase.from("assets").delete().eq("id", assetId); if (cleanupError.error) console.error("Asset cleanup failed", cleanupError.error); }
      if (storagePath) { const cleanupError = await supabase.storage.from(ASSET_BUCKET).remove([storagePath]); if (cleanupError.error) console.error("Storage cleanup failed", cleanupError.error); }
      updateEntry(entry.id, { state: "failed", progress: 0, message: error instanceof Error ? error.message : "Upload failed." }); return false;
    }
  }

  return <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-white shadow-card"><div className="border-b border-border bg-[#f7f8f8] px-6 py-6 md:px-8"><div className="flex items-start gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#111111] text-white"><Upload className="h-5 w-5" /></span><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Asset library</p><h2 className="mt-1 font-display text-2xl font-bold tracking-[-0.03em]">Add new assets</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted">Choose files or a folder, then classify every asset.</p></div></div></div><div className="p-6 md:p-8">{collectionLabel ? <p className="mb-4 rounded-lg bg-surface px-4 py-3 text-sm font-semibold">Uploading into {collectionLabel}</p> : null}<div onDragOver={(event) => event.preventDefault()} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => void handleDrop(event)} className={`rounded-xl border-2 border-dashed p-6 ${dragging ? "border-[#111111] bg-[#eff1f3]" : "border-[#1111114d] bg-[#fbfbfb]"}`}><div className="text-center"><Upload className="mx-auto h-7 w-7" /><p className="mt-3 text-sm font-semibold">Drop files or folders here</p></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex h-11 items-center justify-center gap-2 rounded-pill border border-border bg-white px-4 text-sm font-semibold"><FileUp className="h-4 w-4" /> Choose file</button><button type="button" onClick={() => multipleInputRef.current?.click()} className="inline-flex h-11 items-center justify-center gap-2 rounded-pill border border-border bg-white px-4 text-sm font-semibold"><FileUp className="h-4 w-4" /> Choose files</button><button type="button" onClick={() => void handleFolderSelect()} className="inline-flex h-11 items-center justify-center gap-2 rounded-pill border border-border bg-white px-4 text-sm font-semibold"><FolderOpen className="h-4 w-4" /> Choose folder</button></div><input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" aria-label="Choose one file" /><input ref={multipleInputRef} type="file" multiple onChange={handleFileChange} className="hidden" aria-label="Choose multiple files" /><input ref={folderInputRef} type="file" {...directoryInputAttributes} multiple onChange={handleFileChange} className="hidden" aria-label="Choose folder" /></div><div className="mt-6 grid gap-3 rounded-xl border border-border p-4 md:grid-cols-2"><label className="text-sm font-semibold">Default collection<CollectionSinglePicker collections={collections} value={defaultCollectionId} onChange={(value) => { setDefaultCollectionId(value); setEntries((current) => current.map((entry) => entry.collectionId ? entry : { ...entry, collectionId: value })); }} /></label><label className="text-sm font-semibold">Category<input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Category, e.g. logos" className="mt-1 h-10 w-full rounded-md border border-border px-3 text-sm" /></label><label className="text-sm font-semibold">Status<select value={status} onChange={(event) => setStatus(event.target.value as AssetStatus)} className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm">{(["draft", "approved", "current", "deprecated", "template"] as AssetStatus[]).map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div>{entries.length ? <div className="mt-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">Review upload</h3><p className="mt-1 text-xs text-muted">{entries.length} files · {formatFileSize(totalSize)}</p></div><div className="flex gap-3"><button type="button" onClick={retryFailed} className="text-xs font-semibold text-muted">Retry failed</button><button type="button" onClick={clearCompleted} className="text-xs font-semibold text-muted">Clear completed</button><button type="button" onClick={() => setEntries([])} className="inline-flex items-center gap-1 text-xs font-semibold text-muted"><Trash2 className="h-3.5 w-3.5" /> Clear queue</button></div></div><div className="mt-3 space-y-2">{entries.map((entry) => <div key={entry.id} className="rounded-lg border border-border p-3"><div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-start"><div className="min-w-0"><input aria-label={`Asset name for ${entry.file.name}`} value={entry.name} onChange={(event) => updateEntry(entry.id, { name: event.target.value })} disabled={entry.state === "uploading" || entry.state === "uploaded"} className="h-10 w-full rounded-md border border-border px-3 text-sm" />{entry.relativePath ? <p className="mt-2 truncate text-xs text-muted">{entry.relativePath}</p> : null}<p className="mt-1 text-xs text-muted">{formatFileSize(entry.size)} · {entry.mimeType}</p></div><CollectionSinglePicker collections={collections} value={entry.collectionId} onChange={(value) => updateEntry(entry.id, { collectionId: value })} label="Collection" compact /><div className="flex items-center gap-2 lg:pt-6">{entry.state === "failed" ? <button type="button" onClick={() => retryEntry(entry.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#b42318]"><RefreshCw className="h-3.5 w-3.5" /> Retry</button> : null}<button type="button" onClick={() => setEntries((current) => current.filter((item) => item.id !== entry.id))} disabled={entry.state === "uploading"} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface disabled:opacity-50" aria-label={`Remove ${entry.name}`}><X className="h-4 w-4" /></button></div></div><div className="mt-3 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface"><div className="h-full bg-[#111111] transition-all" style={{ width: `${entry.progress}%` }} /></div><span className={`inline-flex min-w-24 items-center justify-end gap-1 text-xs ${entry.state === "failed" ? "text-[#b42318]" : "text-muted"}`}>{entry.state === "uploading" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : entry.state === "uploaded" ? <Check className="h-3.5 w-3.5" /> : null}{entry.message ?? entry.state}</span></div></div>)}</div></div> : null}{message ? <p className="mt-4 rounded-lg bg-surface px-4 py-3 text-sm" role="status" aria-live="polite">{message}</p> : null}<div className="mt-6 flex justify-end"><Button onClick={() => void upload()} disabled={uploading || !queuedCount || queuedEntries.some((entry) => !entry.collectionId)}>{uploading ? "Uploading..." : `Upload ${queuedCount} asset${queuedCount === 1 ? "" : "s"}`}</Button></div></div></section>;
}
