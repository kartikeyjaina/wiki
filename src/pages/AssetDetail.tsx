import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAssets } from "@/hooks/useAssets";
import { shortDate } from "@/lib/utils";
import { downloadAsset, getAssetPreviewUrl, uploadAssetFile } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { useEntityFollow, useRecentlyViewed, useSavedAsset } from "@/hooks/useWorkspaceFeatures";
import type { AssetVersion } from "@/types/domain";
import { useProfile } from "@/hooks/useProfile";
import { recordActivity } from "@/lib/activity";

export function AssetDetail() {
  const { id } = useParams();
  const { assets, loading, reload: reloadAssets } = useAssets();
  const asset = assets.find((item) => item.id === id);
  const { following, toggle: toggleFollowing } = useEntityFollow("asset", asset?.id);
  const { saved, toggle: toggleSaved } = useSavedAsset(asset?.id);
  const { isAdmin, profile } = useProfile();
  useRecentlyViewed("asset", asset?.id);

  const [collectionName, setCollectionName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [versions, setVersions] = useState<AssetVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<string | null>(null);

  // Load collection name
  useEffect(() => {
    if (!supabase || !asset?.collection_id) return;
    void supabase
      .from("asset_collections")
      .select("name")
      .eq("id", asset.collection_id)
      .single()
      .then(({ data }) => setCollectionName(data?.name ?? null));
  }, [asset?.collection_id]);

  // Load preview URL using signed URL
  useEffect(() => {
    setPreviewUrl(null);
    setPreviewError(false);
    if (!asset?.storage_path) return;
    void getAssetPreviewUrl(asset.storage_path)
      .then(setPreviewUrl)
      .catch(() => setPreviewError(true));
  }, [asset?.storage_path]);

  const loadVersions = async () => {
    if (!supabase || !asset?.id) return;
    setVersionsLoading(true);
    const { data, error } = await supabase
      .from("asset_versions")
      .select(
        "*, creator:profiles!asset_versions_created_by_fkey(id, display_name, role, avatar_url)",
      )
      .eq("asset_id", asset.id)
      .order("created_at", { ascending: false });
    setVersions((data ?? []) as AssetVersion[]);
    if (error) setVersionError("We couldn't load version history.");
    setVersionsLoading(false);
  };

  useEffect(() => {
    void loadVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset?.id]);

  async function uploadVersion(file: File | undefined) {
    if (!supabase || !asset || !profile || !file) return;
    setUploadingVersion(true);
    setVersionError(null);
    let path: string | null = null;
    try {
      // Upload to storage first
      path = await uploadAssetFile(file, `assets/${asset.id}/versions`);

      // Transactional DB-side version creation via trusted RPC
      // This locks the asset row, increments version atomically, inserts version row,
      // and updates the asset – all in one transaction.
      const { data: newVersion, error: rpcError } = await supabase.rpc(
        "create_asset_version",
        {
          p_asset_id: asset.id,
          p_storage_path: path,
          p_notes: "Replacement upload",
          p_actor_id: profile.id,
        },
      );

      if (rpcError) throw rpcError;

      await recordActivity("asset", asset.id, "asset_version_uploaded", {
        version: newVersion,
      });

      await loadVersions();
      await reloadAssets();
    } catch (err) {
      // Roll back storage upload if the DB transaction failed
      if (path && supabase) {
        await supabase.storage.from("brand-assets").remove([path]);
      }
      setVersionError(
        err instanceof Error ? err.message : "The replacement version could not be saved.",
      );
    } finally {
      setUploadingVersion(false);
    }
  }

  async function restoreVersion(version: AssetVersion) {
    if (!supabase || !asset || !profile) return;
    if (version.version === asset.version) return;
    if (
      !window.confirm(
        `Restore version ${version.version}? A new version will be created from this historical copy.`,
      )
    )
      return;

    setRestoringVersion(version.id);
    setVersionError(null);

    try {
      const { data: newVersion, error: rpcError } = await supabase.rpc(
        "restore_asset_version",
        {
          p_asset_id: asset.id,
          p_version_id: version.id,
          p_actor_id: profile.id,
        },
      );

      if (rpcError) throw rpcError;

      await recordActivity("asset", asset.id, "asset_version_restored", {
        restored_from: version.version,
        new_version: newVersion,
      });

      await loadVersions();
      await reloadAssets();
    } catch (err) {
      setVersionError(
        err instanceof Error ? err.message : "The version could not be restored.",
      );
    } finally {
      setRestoringVersion(null);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading asset...</p>;
  if (!asset)
    return (
      <EmptyState
        title="Asset not found."
        description="Only real imported or uploaded assets appear here."
      />
    );

  return (
    <div>
      <PageHeader
        eyebrow="Asset"
        title={asset.name}
        description={asset.usage_guidance ?? undefined}
        action={
          asset.storage_path ? (
            <Button
              onClick={() =>
                void downloadAsset(
                  asset.storage_path!,
                  String(asset.metadata?.original_name ?? asset.name),
                )
              }
            >
              Download
            </Button>
          ) : null
        }
      />

      <div className="mb-6 flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => void toggleSaved()}>
          {saved ? "Saved" : "Save"}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => void toggleFollowing()}>
          {following ? "Watching" : "Watch"}
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid min-h-[420px] place-items-center rounded-xl border border-border bg-surface p-8">
          {previewUrl && !previewError ? (
            <img
              src={previewUrl}
              alt={asset.name}
              className="max-h-[70vh] max-w-full object-contain"
              onError={() => setPreviewError(true)}
            />
          ) : (
            <p className="text-sm text-muted">
              {previewError
                ? "Preview unavailable. Download the file to inspect it."
                : "Loading preview..."}
            </p>
          )}
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

      <section className="mt-8 rounded-xl border border-border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold">Version history</h2>
          {isAdmin ? (
            <label className="inline-flex h-9 cursor-pointer items-center rounded-pill bg-foreground px-4 text-xs font-semibold text-white">
              {uploadingVersion ? "Uploading..." : "Upload replacement"}
              <input
                type="file"
                className="sr-only"
                disabled={uploadingVersion}
                onChange={(event) => void uploadVersion(event.target.files?.[0])}
                aria-label="Upload replacement version"
              />
            </label>
          ) : null}
        </div>

        {versionError ? (
          <p className="mt-3 rounded-md bg-[#fad9db] px-4 py-3 text-sm" role="alert">
            {versionError}
          </p>
        ) : null}

        {versionsLoading ? (
          <p className="mt-4 text-sm text-muted" role="status">
            Loading versions...
          </p>
        ) : versions.length ? (
          <ul className="mt-4 divide-y divide-border">
            {versions.map((version) => (
              <li key={version.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">
                    Version {version.version}{" "}
                    {version.version === asset.version ? (
                      <Badge className="ml-2">Current</Badge>
                    ) : null}
                  </p>
                  <p className="text-sm text-muted">
                    {version.creator?.display_name ?? "Workspace member"} ·{" "}
                    {new Date(version.created_at).toLocaleDateString()}
                    {version.notes ? ` · ${version.notes}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  {version.storage_path ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        void downloadAsset(
                          version.storage_path!,
                          `${asset.name}-v${version.version}`,
                        )
                      }
                    >
                      Download
                    </Button>
                  ) : null}
                  {isAdmin && version.version !== asset.version ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={restoringVersion === version.id}
                      onClick={() => void restoreVersion(version)}
                    >
                      {restoringVersion === version.id ? "Restoring..." : "Restore"}
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted">No version history yet.</p>
        )}
      </section>
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
