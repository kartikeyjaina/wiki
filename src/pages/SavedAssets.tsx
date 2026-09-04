import { useEffect, useState } from "react";
import { AssetCard } from "@/components/assets/AssetCard";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAssets } from "@/hooks/useAssets";
import { supabase } from "@/lib/supabase";
import type { Asset } from "@/types/domain";

export function SavedAssets() {
  const { assets, loading: assetsLoading } = useAssets();
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (!supabase) { setLoading(false); return; } void supabase.from("user_asset_saves").select("asset_id").then(({ data }) => { setSavedIds((data ?? []).map((item) => item.asset_id as string)); setLoading(false); }); }, []);
  const saved = assets.filter((asset) => savedIds.includes(asset.id));
  return <div><PageHeader eyebrow="Your workspace" title="Saved assets" description="Keep the files you reach for most close at hand." />{loading || assetsLoading ? <p className="text-sm text-muted">Loading saved assets...</p> : saved.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{saved.map((asset: Asset) => <AssetCard key={asset.id} asset={asset} />)}</div> : <EmptyState title="No saved assets yet." description="Save an asset from its detail page to build your personal shortlist." />}</div>;
}
