import { useEffect, useState } from "react";
import { CollectionCard } from "@/components/assets/CollectionCard";
import { FeaturedKitCard } from "@/components/assets/FeaturedKitCard";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { supabase } from "@/lib/supabase";
import type { AssetCollection, FeaturedKit } from "@/types/domain";

export function Assets() {
  const [collections, setCollections] = useState<AssetCollection[]>([]);
  const [kits, setKits] = useState<FeaturedKit[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    void Promise.all([supabase.from("asset_collection_counts").select("*"), supabase.from("featured_kits").select("*").order("display_order")]).then(([collectionsResult, kitsResult]) => {
      const queryError = collectionsResult.error ?? kitsResult.error;
      if (queryError) { setError(queryError.message); setLoading(false); return; }
      setCollections((collectionsResult.data ?? []) as AssetCollection[]);
      setKits((kitsResult.data ?? []) as FeaturedKit[]);
      setLoading(false);
    });
  }, []);

  const skeletons = <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-64" />)}</div>;
  return <div><PageHeader eyebrow="Asset Library" title="A considered home for the company’s visual language." description="Find approved files, focused packs, and the guidance behind the brand." />{error ? <p className="mb-6 rounded-md bg-[#fad9db] px-4 py-3 text-sm">The asset library could not be loaded: {error}</p> : null}<section aria-labelledby="kits-heading"><div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Curated downloads</p><h2 id="kits-heading" className="mt-2 font-display text-3xl font-bold tracking-[-0.04em]">Featured kits</h2></div>{loading ? skeletons : kits.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{kits.map((kit) => <FeaturedKitCard key={kit.id} kit={kit} />)}</div> : <EmptyState title="No featured kits yet." description="Published download packs will appear here." />}</section><section aria-labelledby="collections-heading" className="mt-16"><div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">The archive</p><h2 id="collections-heading" className="mt-2 font-display text-3xl font-bold tracking-[-0.04em]">Collections</h2></div>{loading ? skeletons : collections.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{collections.map((collection) => <CollectionCard key={collection.id} collection={collection} />)}</div> : <EmptyState title="No collections yet." description="Admins can create the first library collection." />}</section></div>;
}
