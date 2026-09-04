import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAssets } from "@/hooks/useAssets";
import { formatStatus, shortDate } from "@/lib/utils";
import { downloadAsset } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { useEntityFollow, useRecentlyViewed, useSavedAsset } from "@/hooks/useWorkspaceFeatures";

export function AssetDetail() {
  const { id } = useParams();
  const { assets, loading } = useAssets();
  const asset = assets.find((item) => item.id === id);
  const { following, toggle: toggleFollowing } = useEntityFollow("asset", asset?.id);
  const { saved, toggle: toggleSaved } = useSavedAsset(asset?.id);
  useRecentlyViewed("asset", asset?.id);
  const [collectionName, setCollectionName] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !asset?.collection_id) return;
    void supabase.from("asset_collections").select("name").eq("id", asset.collection_id).single().then(({ data }) => setCollectionName(data?.name ?? null));
  }, [asset?.collection_id]);

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
          {asset.preview_url ? <img src={asset.preview_url} alt="" className="max-h-[70vh] max-w-full object-contain" /> : <p className="text-sm text-muted">No preview available.</p>}
        </div>
        <aside className="space-y-4 rounded-xl border border-border bg-white p-5">
          <Badge>{formatStatus(asset.status)}</Badge>
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
