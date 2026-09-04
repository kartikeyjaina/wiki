import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AssetCard } from "@/components/assets/AssetCard";
import { FeaturedKitCard } from "@/components/assets/FeaturedKitCard";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { supabase } from "@/lib/supabase";
import { useAssets } from "@/hooks/useAssets";
import type { AssetCollection, FeaturedKit } from "@/types/domain";

export function Assets() {
  const [collections, setCollections] = useState<AssetCollection[]>([]);
  const [kits, setKits] = useState<FeaturedKit[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const selectedSlug = searchParams.get("collection") ?? "all";
  const selectedCollection = collections.find((collection) => collection.slug === selectedSlug);
  const { assets, loading: assetsLoading, loadingMore, hasMore, loadMore, error: assetsError } = useAssets({
    collectionId: selectedCollection?.id,
    search: query,
  });

  useEffect(() => {
    if (!supabase) return;
    void Promise.all([
      supabase.from("asset_collection_counts").select("*").eq("is_visible", true).is("archived_at", null).order("display_order"),
      supabase.from("featured_kits").select("*").order("display_order"),
    ]).then(([collectionResult, kitResult]) => {
      if (collectionResult.error || kitResult.error) return;
      setCollections((collectionResult.data ?? []) as AssetCollection[]);
      setKits((kitResult.data ?? []) as FeaturedKit[]);
    });
  }, []);

  const filteredAssets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return assets.filter((asset) => {
      const metadata = asset.metadata ? Object.values(asset.metadata).join(" ") : "";
      const searchable = `${asset.name} ${asset.category ?? ""} ${asset.asset_type} ${metadata}`.toLowerCase();
      return !normalizedQuery || searchable.includes(normalizedQuery);
    });
  }, [assets, query]);

  function updateFilter(key: "q" | "collection", value: string) {
    const next = new URLSearchParams(searchParams);
    if (value && !(key === "collection" && value === "all")) next.set(key, value); else next.delete(key);
    setSearchParams(next);
  }

  const loading = assetsLoading;
  return <div>
    <PageHeader eyebrow="Asset Library" title="A considered home for the company’s visual language." description="Search brand files, focused packs, and the guidance behind the brand." />
    <section aria-labelledby="kits-heading" className="mb-14"><div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Curated downloads</p><h2 id="kits-heading" className="mt-2 font-display text-3xl font-bold tracking-[-0.04em]">Featured kits</h2></div>{kits.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{kits.map((kit) => <FeaturedKitCard key={kit.id} kit={kit} />)}</div> : null}</section>
    <section aria-labelledby="assets-heading"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Browse the archive</p><h2 id="assets-heading" className="mt-2 font-display text-3xl font-bold tracking-[-0.04em]">Assets</h2></div><span className="text-sm text-muted">{filteredAssets.length} loaded</span></div>
      <div className="mt-6 flex h-12 items-center gap-3 rounded-md border border-border bg-white px-4"><Search className="h-4 w-4 shrink-0 text-muted" /><input value={query} onChange={(event) => updateFilter("q", event.target.value)} placeholder="Search assets..." aria-label="Search assets" className="min-w-0 flex-1 outline-none" />{query ? <button type="button" onClick={() => updateFilter("q", "")} aria-label="Clear asset search" className="text-muted hover:text-foreground"><X className="h-4 w-4" /></button> : null}</div>
      <div className="mt-5"><div className="mb-2 flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Collections</p>{query || selectedSlug !== "all" ? <button type="button" onClick={() => setSearchParams(new URLSearchParams())} className="text-xs font-semibold text-muted hover:text-foreground">Clear filters</button> : null}</div><div className="flex flex-wrap gap-2" aria-label="Filter assets by collection"><button type="button" aria-pressed={selectedSlug === "all"} onClick={() => updateFilter("collection", "all")} className={`rounded-pill px-3 py-1.5 text-xs font-semibold ${selectedSlug === "all" ? "bg-foreground text-white" : "bg-surface text-muted hover:text-foreground"}`}>All</button>{collections.map((collection) => <button key={collection.id} type="button" aria-pressed={selectedSlug === collection.slug} onClick={() => updateFilter("collection", collection.slug)} className={`rounded-pill px-3 py-1.5 text-xs font-semibold ${selectedSlug === collection.slug ? "bg-foreground text-white" : "bg-surface text-muted hover:text-foreground"}`}>{collection.name}</button>)}</div></div>
      {assetsError ? <p className="mt-5 rounded-md bg-[#fad9db] px-4 py-3 text-sm" role="alert">Assets could not be loaded: {assetsError}</p> : null}
      <div className="mt-8">{loading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-80" />)}</div> : filteredAssets.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{filteredAssets.map((asset) => <AssetCard key={asset.id} asset={asset} />)}</div> : <EmptyState title={query ? "No assets match your search." : "No assets yet."} description={query ? "Try another search phrase or clear the filters." : "Uploaded assets will appear here."} />}</div>
      {hasMore ? <div className="mt-8 flex justify-center"><button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="rounded-pill bg-foreground px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{loadingMore ? "Loading more…" : "Load more assets"}</button></div> : null}
    </section>
  </div>;
}
