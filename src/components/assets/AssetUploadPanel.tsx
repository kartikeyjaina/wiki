import { useEffect, useMemo, useRef, useState } from "react";
import { Check, FileUp, FolderOpen, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { ASSET_BUCKET, uploadAssetFile } from "@/lib/storage";
import { useProfile } from "@/hooks/useProfile";
import type { AssetStatus } from "@/types/domain";

type UploadEntry = { file: File; name: string; relativePath?: string; state: "queued" | "uploading" | "uploaded" | "failed"; message?: string };
type Collection = { id: string; name: string };
type DirectoryHandle = { values: () => AsyncIterableIterator<DirectoryEntryHandle> };
type DirectoryEntryHandle = { kind: "file" | "directory"; name: string; getFile: () => Promise<File>; values: () => AsyncIterableIterator<DirectoryEntryHandle> };
type FileSelection = { file: File; relativePath?: string };

export function AssetUploadPanel() {
  const { profile } = useProfile();
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [category, setCategory] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [status, setStatus] = useState<AssetStatus>("draft");
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!supabase) return;
    void supabase.from("asset_collections").select("id, name").order("name").then(({ data }) => setCollections((data ?? []) as Collection[]));
  }, []);

  const selectedCount = useMemo(() => entries.filter((entry) => entry.state === "queued").length, [entries]);

  function addFiles(files: FileList | null) {
    if (!files) return;
    setSelection(Array.from(files).map((file) => ({ file, relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath }))); 
    setMessage(null);
  }

  function setSelection(selection: FileSelection[]) {
    setEntries(selection.map(({ file, relativePath }) => ({ file, relativePath, name: file.name.replace(/\.[^/.]+$/, ""), state: "queued" })));
  }

  async function addFolder() {
    const picker = (window as Window & { showDirectoryPicker?: () => Promise<DirectoryHandle> }).showDirectoryPicker;
    if (!picker) {
      folderInputRef.current?.click();
      return;
    }
    try {
      const folder = await picker();
      const selection: FileSelection[] = [];
      async function collect(handle: DirectoryHandle, prefix = "") {
        for await (const entry of handle.values()) {
          const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (entry.kind === "file") selection.push({ file: await entry.getFile(), relativePath });
          else await collect(entry, relativePath);
        }
      }
      await collect(folder);
      setSelection(selection);
      setMessage(selection.length ? null : "That folder does not contain any files.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("The folder could not be opened.");
    }
  }

  function renameEntry(file: File, name: string) {
    setEntries((current) => current.map((item) => item.file === file ? { ...item, name } : item));
  }

  async function upload() {
    if (!supabase || !profile?.id || !selectedCount) return;
    if (entries.some((entry) => entry.state === "queued" && !entry.name.trim())) {
      setMessage("Name every asset before uploading.");
      return;
    }
    setUploading(true);
    setMessage(null);
    let completed = 0;
    for (const entry of entries) {
      if (entry.state !== "queued") continue;
      const assetName = entry.name.trim();
      setEntries((current) => current.map((item) => item.file === entry.file ? { ...item, state: "uploading" } : item));
      let storagePath: string | null = null;
      let assetId: string | null = null;
      try {
        const relativePath = entry.relativePath;
        const folder = relativePath ? `uploads/${relativePath.split("/").slice(0, -1).join("/")}` : "uploads";
        storagePath = await uploadAssetFile(entry.file, folder);
        const { data: asset, error: assetError } = await supabase.from("assets").insert({
          name: assetName,
          category: category.trim() || null,
          collection_id: collectionId || null,
          asset_type: entry.file.type || "application/octet-stream",
          status,
          storage_path: storagePath,
          version: "1",
          owner_id: profile.id,
          metadata: { original_name: entry.file.name, relative_path: relativePath || null, mime_type: entry.file.type || null, size: entry.file.size },
        }).select().single();
        if (assetError) throw assetError;
        assetId = asset.id;
        const { error: versionError } = await supabase.from("asset_versions").insert({ asset_id: asset.id, version: "1", storage_path: storagePath, created_by: profile.id, notes: "Initial upload" });
        if (versionError) throw versionError;
        completed += 1;
        setEntries((current) => current.map((item) => item.file === entry.file ? { ...item, state: "uploaded", message: "Ready" } : item));
      } catch (uploadError) {
        if (assetId) await supabase.from("assets").delete().eq("id", assetId);
        if (storagePath) await supabase.storage.from(ASSET_BUCKET).remove([storagePath]);
        const failure = uploadError instanceof Error ? uploadError.message : "Upload failed.";
        setEntries((current) => current.map((item) => item.file === entry.file ? { ...item, state: "failed", message: failure } : item));
      }
    }
    setMessage(`${completed} of ${selectedCount} file${selectedCount === 1 ? "" : "s"} uploaded.`);
    setUploading(false);
  }

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-white shadow-card">
      <div className="border-b border-border bg-[#f7f8f8] px-6 py-6 md:px-8">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#111111] text-white"><Upload className="h-5 w-5" /></span>
          <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Asset library</p><h2 className="mt-1 font-display text-2xl font-bold tracking-[-0.03em]">Add new assets</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted">Bring in files, give each one a clear name, and set its library details before publishing.</p></div>
        </div>
      </div>
      <div className="p-6 md:p-8">
        <div className="grid gap-4 md:grid-cols-2">
          <button type="button" onClick={() => fileInputRef.current?.click()} className="group flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#1111114d] bg-[#fbfbfb] px-5 text-center transition hover:border-[#111111] hover:bg-[#f3f4f4]">
            <FileUp className="h-6 w-6 text-foreground" /><span className="mt-3 text-sm font-semibold">Choose a file</span><span className="mt-1 text-xs text-muted">Browse your folders and select one asset</span>
          </button>
          <button type="button" onClick={() => void addFolder()} className="group flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#1111114d] bg-[#fbfbfb] px-5 text-center transition hover:border-[#111111] hover:bg-[#f3f4f4]">
            <FolderOpen className="h-6 w-6 text-foreground" /><span className="mt-3 text-sm font-semibold">Choose a folder</span><span className="mt-1 text-xs text-muted">Upload everything inside a folder</span>
          </button>
          <input ref={fileInputRef} type="file" onChange={(event) => addFiles(event.target.files)} className="hidden" />
          <input ref={folderInputRef} type="file" multiple {...({ webkitdirectory: "" } as Record<string, string>)} onChange={(event) => addFiles(event.target.files)} className="hidden" />
        </div>
        <div className="mt-6 grid gap-3 rounded-xl border border-border p-4 md:grid-cols-3">
          <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Category, e.g. logos" aria-label="Category" className="h-11 rounded-md border border-border px-3 text-sm" />
          <select value={collectionId} onChange={(event) => setCollectionId(event.target.value)} aria-label="Collection" className="h-11 rounded-md border border-border bg-white px-3 text-sm"><option value="">No collection</option>{collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select>
          <select value={status} onChange={(event) => setStatus(event.target.value as AssetStatus)} aria-label="Status" className="h-11 rounded-md border border-border bg-white px-3 text-sm">{(["draft", "approved", "current", "deprecated", "template"] as AssetStatus[]).map((item) => <option key={item} value={item}>{item}</option>)}</select>
        </div>
        {entries.length ? <div className="mt-6"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Name your assets</h3><span className="text-xs text-muted">{selectedCount} ready to upload</span></div><div className="mt-3 space-y-2">{entries.map((entry) => <div key={`${entry.file.name}-${entry.file.size}`} className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-3"><input aria-label="Asset name" value={entry.name} onChange={(event) => renameEntry(entry.file, event.target.value)} placeholder="Asset name" disabled={entry.state !== "queued"} className="h-10 min-w-[180px] flex-1 rounded-md border border-border bg-white px-3 text-sm" /><span className="text-xs text-muted">{Math.ceil(entry.file.size / 1024)} KB</span><span className={`inline-flex items-center gap-1 text-xs ${entry.state === "failed" ? "text-[#b42318]" : "text-muted"}`}>{entry.state === "uploaded" ? <Check className="h-3.5 w-3.5" /> : null}{entry.message ?? entry.state}</span></div>)}</div></div> : null}
        {message ? <p className="mt-4 rounded-lg bg-surface px-4 py-3 text-sm" role="status">{message}</p> : null}
        <div className="mt-6 flex justify-end"><Button onClick={() => void upload()} disabled={uploading || !selectedCount}>{uploading ? "Uploading..." : `Upload ${selectedCount} asset${selectedCount === 1 ? "" : "s"}`}</Button></div>
      </div>
    </section>
  );
}
