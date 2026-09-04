import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAssets } from "@/hooks/useAssets";
import { shortDate } from "@/lib/utils";
import { downloadAsset, getAssetPreviewUrl } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { useEntityFollow, useRecentlyViewed, useSavedAsset } from "@/hooks/useWorkspaceFeatures";
import type { AssetVersion } from "@/types/domain";
import { useProfile } from "@/hooks/useProfile";
import { nextAssetVersion } from "@/lib/asset-version";
import { uploadAssetFile } from "@/lib/storage";

export function AssetDetail() {
  const { id } = useParams();
  const { assets, loading } = useAssets();
  const asset = assets.find((item) => item.id === id);
  const { following, toggle: toggleFollowing } = useEntityFollow("asset", asset?.id);
  const { saved, toggle: toggleSaved } = useSavedAsset(asset?.id);
  const { isAdmin, profile } = useProfile();
  useRecentlyViewed("asset", asset?.id);
  const [collectionName, setCollectionName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [versions, setVersions] = useState<AssetVersion[]>([]);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [uploadingVersion, setUploadingVersion] = useState(false);

  useEffect(() => {
    if (!supabase || !asset?.collection_id) return;
    void supabase.from("asset_collections").select("name").eq("id", asset.collection_id).single().then(({ data }) => setCollectionName(data?.name ?? null));
  }, [asset?.collection_id]);

  useEffect(() => {
    setPreviewUrl(null); setPreviewError(false);
    if (!asset?.storage_path) return;
    void getAssetPreviewUrl(asset.storage_path).then(setPreviewUrl).catch(() => setPreviewError(true));
  }, [asset?.storage_path]);

  useEffect(() => {
    if (!supabase || !asset?.id) return;
    void supabase.from("asset_versions").select("*, creator:profiles!asset_versions_created_by_fkey(id, display_name, role, avatar_url)").eq("asset_id", asset.id).order("created_at", { ascending: false }).then(({ data, error }) => { setVersions((data ?? []) as AssetVersion[]); if (error) setVersionError("We couldn’t load version history."); });
  }, [asset?.id]);

  async function uploadVersion(file: File | undefined) {
    if (!supabase || !asset || !profile || !file) return;
    setUploadingVersion(true); setVersionError(null);
    let path: string | null = null;
    try {
      path = await uploadAssetFile(file, `assets/${asset.id}/versions`);
      const version = nextAssetVersion(versions);
      const versionResult = await supabase.from("asset_versions").insert({ asset_id: asset.id, version, storage_path: path, created_by: profile.id, notes: "Replacement upload" }).select("*, creator:profiles!asset_versions_created_by_fkey(id, display_name, role, avatar_url)").single();
      if (versionResult.error) throw versionResult.error;
      const assetResult = await supabase.from("assets").update({ version, storage_path: path, updated_at: new Date().toISOString(), metadata: { ...(asset.metadata ?? {}), original_name: file.name, mime_type: file.type, size: file.size } }).eq("id", asset.id);
      if (assetResult.error) throw assetResult.error;
      setVersions((items) => [versionResult.data as AssetVersion, ...items]);
    } catch { if (path) await supabase.storage.from("brand-assets").remove([path]); setVersionError("The replacement version could not be saved."); } finally { setUploadingVersion(false); }
  }

  if (loading) return <p className="text-sm text-muted">Loading asset...</p>;
  if (!asset) return <EmptyState title="Asset not found." description="Only real imported or uploaded assets appear here." />;

  return (
    <div>
     <PageHeader
  eyebrow="Asset"
  title={asset.name}
  description={asset.usage_guidance ?? undefined}
  action={
    asset.storage_path ? (
      <Button
        onClick={() => void downloadAsset(asset.storage_path!, String(asset.metadata?.original_name ?? asset.name))}
      >
        Download
      </Button>
    ) : null
  }
/>
      <div className="mb-6 flex gap-2"><Button size="sm" variant="secondary" onClick={() => void toggleSaved()}>{saved ? "Saved" : "Save"}</Button><Button size="sm" variant="secondary" onClick={() => void toggleFollowing()}>{following ? "Watching" : "Watch"}</Button></div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid min-h-[420px] place-items-center rounded-xl border border-border bg-surface p-8">
          {previewUrl && !previewError ? <img src={previewUrl} alt={asset.name} className="max-h-[70vh] max-w-full object-contain" onError={() => setPreviewError(true)} /> : <p className="text-sm text-muted">{previewError ? "Preview unavailable. Download the file to inspect it." : "Loading preview..."}</p>}
        </div>
        <aside className="space-y-4 rounded-xl border border-border bg-white p-5">
          <dl className="space-y-4 text-sm">
            <Meta label="Type" value={asset.asset_type} />
            <Meta label="Collection" value={collectionName} />
            <Meta label="Category" value={asset.category} />
            <Meta label="Version" value={asset.version} />
            <Meta label="Last reviewed" value={shortDate(asset.last_reviewed_at)} />
            <Meta label="Source" value={asset.source_url} />
          </dl>
        </aside>
      </div>
      <section className="mt-8 rounded-xl border border-border bg-white p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl font-bold">Version history</h2>{isAdmin ? <label className="inline-flex h-9 cursor-pointer items-center rounded-pill bg-foreground px-4 text-xs font-semibold text-white">{uploadingVersion ? "Uploading..." : "Upload replacement"}<input type="file" className="sr-only" disabled={uploadingVersion} onChange={(event) => void uploadVersion(event.target.files?.[0])} /></label> : null}</div>{versionError ? <p className="mt-3 rounded-md bg-[#fad9db] px-4 py-3 text-sm" role="alert">{versionError}</p> : null}{versions.length ? <ul className="mt-4 divide-y divide-border">{versions.map((version) => <li key={version.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-semibold">Version {version.version} {version.version === asset.version ? <Badge className="ml-2">Current</Badge> : null}</p><p className="text-sm text-muted">{version.creator?.display_name ?? "Workspace member"} · {new Date(version.created_at).toLocaleDateString()}{version.notes ? ` · ${version.notes}` : ""}</p></div>{version.storage_path ? <Button size="sm" variant="secondary" onClick={() => void downloadAsset(version.storage_path!, `${asset.name}-v${version.version}`)}>Download</Button> : null}</li>)}</ul> : <p className="mt-4 text-sm text-muted">No version history yet.</p>}</section>
    </div>
  );
}

function Meta({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="font-semibold text-foreground">{label}</dt>
      <dd className="mt-1 break-words text-muted">{value}</dd>
    </div>
  );
}
