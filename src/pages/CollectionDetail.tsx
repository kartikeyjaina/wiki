import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { AssetCard } from "@/components/assets/AssetCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { supabase } from "@/lib/supabase";
import type { Asset, AssetCollection } from "@/types/domain";

export function CollectionDetail() {
  const { slug } = useParams();
  const [collection, setCollection] = useState<AssetCollection | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!supabase || !slug) { setLoading(false); return; }
    const client = supabase;
    void client.from("asset_collections").select("*").eq("slug", slug).single().then(async ({ data, error: collectionError }) => {
      if (collectionError) { setError(collectionError.message); setLoading(false); return; }
      setCollection(data as AssetCollection);
      const result = await client.from("assets").select("*").eq("collection_id", data.id).order("updated_at", { ascending: false });
      if (result.error) setError(result.error.message); else setAssets((result.data ?? []) as Asset[]);
      setLoading(false);
    });
  }, [slug]);
  if (loading) return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-72" />)}</div>;
  if (error || !collection) return <EmptyState title="Collection unavailable." description={error ?? "This collection may have been archived."} />;
  return <div><Link to="/assets" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Asset library</Link><header className="mt-8 border-b border-border pb-8"><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Collection {String(collection.display_order).padStart(2, "0")} · {assets.length} files</p><h1 className="mt-3 font-display text-5xl font-bold tracking-[-0.055em]">{collection.name}</h1><p className="mt-4 max-w-2xl text-base leading-7 text-muted">{collection.description}</p></header><section className="mt-8" aria-labelledby="files-heading"><h2 id="files-heading" className="mb-5 font-display text-2xl font-bold tracking-[-0.035em]">Files</h2>{assets.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{assets.map((asset) => <AssetCard key={asset.id} asset={asset} />)}</div> : <EmptyState title="Nothing has been added to this collection yet." description="New assets will appear here when they are assigned to this collection." />}</section></div>;
}
