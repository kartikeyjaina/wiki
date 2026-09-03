import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { ASSET_BUCKET, uploadAssetFile } from "@/lib/storage";
import { useProfile } from "@/hooks/useProfile";
import type { AssetStatus } from "@/types/domain";

type UploadEntry = { file: File; state: "queued" | "uploading" | "uploaded" | "failed"; message?: string };
type Collection = { id: string; name: string };

export function AssetUploadPanel() {
  const { profile } = useProfile();
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [category, setCategory] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [status, setStatus] = useState<AssetStatus>("draft");
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    void supabase.from("asset_collections").select("id, name").order("name").then(({ data }) => setCollections((data ?? []) as Collection[]));
  }, []);

  const selectedCount = useMemo(() => entries.filter((entry) => entry.state === "queued").length, [entries]);

  function addFiles(files: FileList | null) {
    if (!files) return;
    setEntries(Array.from(files).map((file) => ({ file, state: "queued" })));
    setMessage(null);
  }

  async function upload() {
    if (!supabase || !profile?.id || !selectedCount) return;
    setUploading(true);
    setMessage(null);
    let completed = 0;
    for (const entry of entries) {
      if (entry.state !== "queued") continue;
      setEntries((current) => current.map((item) => item.file === entry.file ? { ...item, state: "uploading" } : item));
      let storagePath: string | null = null;
      let assetId: string | null = null;
      try {
        const relativePath = (entry.file as File & { webkitRelativePath?: string }).webkitRelativePath;
        const folder = relativePath ? `uploads/${relativePath.split("/").slice(0, -1).join("/")}` : "uploads";
        storagePath = await uploadAssetFile(entry.file, folder);
        const { data: asset, error: assetError } = await supabase.from("assets").insert({
          name: entry.file.name,
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
        setEntries((current) => current.map((item) => item.file === entry.file ? { ...item, state: "uploaded" } : item));
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

  return <section className="mt-6 rounded-xl border border-border bg-white p-6"><h2 className="font-display text-2xl font-bold tracking-[-0.03em]">Upload assets</h2><p className="mt-2 text-sm text-muted">Select files or a folder, classify them once, then upload the batch.</p><div className="mt-4 grid gap-3 md:grid-cols-3"><label className="rounded-md border border-dashed border-border p-4 text-sm font-semibold">Browse files<input type="file" multiple onChange={(event) => addFiles(event.target.files)} className="mt-2 block w-full text-sm font-normal" /></label><label className="rounded-md border border-dashed border-border p-4 text-sm font-semibold">Browse folder<input type="file" multiple {...({ webkitdirectory: "" } as Record<string, string>)} onChange={(event) => addFiles(event.target.files)} className="mt-2 block w-full text-sm font-normal" /></label><div className="grid gap-3"><input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Category, e.g. logos" className="h-11 rounded-md border border-border px-3" /><select value={collectionId} onChange={(event) => setCollectionId(event.target.value)} className="h-11 rounded-md border border-border bg-white px-3"><option value="">No collection</option>{collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value as AssetStatus)} className="h-11 rounded-md border border-border bg-white px-3">{(["draft", "approved", "current", "deprecated", "template"] as AssetStatus[]).map((item) => <option key={item} value={item}>{item}</option>)}</select></div></div>{entries.length ? <div className="mt-5 space-y-2">{entries.map((entry) => <div key={`${entry.file.name}-${entry.file.size}`} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface px-3 py-2 text-sm"><span className="min-w-0 truncate">{entry.file.name} <span className="text-muted">({Math.ceil(entry.file.size / 1024)} KB)</span></span><span className={entry.state === "failed" ? "text-[#b42318]" : "text-muted"}>{entry.message ?? entry.state}</span></div>)}</div> : null}{message ? <p className="mt-4 rounded-md bg-surface px-4 py-3 text-sm" role="status">{message}</p> : null}<Button className="mt-5" onClick={() => void upload()} disabled={uploading || !selectedCount}>{uploading ? "Uploading..." : `Upload ${selectedCount} file${selectedCount === 1 ? "" : "s"}`}</Button></section>;
}