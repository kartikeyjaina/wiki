import { ArrowLeft, Search, X } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { AssetCard } from "@/components/assets/AssetCard";
import { AssetUploadPanel } from "@/components/assets/AssetUploadPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { useCollectionAssets } from "@/hooks/useCollectionAssets";
import type { AssetCollection } from "@/types/domain";

export function CollectionDetail() {
  const { slug } = useParams();
  const { isAdmin } = useProfile();
  const [collection, setCollection] = useState<AssetCollection | null>(null);
  const [collectionLoading, setCollectionLoading] = useState(true);
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const {
    assets,
    loading: assetsLoading,
    error: assetsError,
  } = useCollectionAssets(collection?.id);
  
  useEffect(() => {
    if (!supabase || !slug) { setCollectionLoading(false); return; }
    void supabase.from("asset_collections").select("*").eq("slug", slug).single().then(({ data, error }) => {
      if (error) setCollectionError(error.message); else setCollection(data as AssetCollection);
      setCollectionLoading(false);
    });
  }, [slug]);

  const collectionAssets = useMemo(() => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) return assets;

  return assets.filter((asset) => {
    const metadata = asset.metadata
      ? Object.values(asset.metadata).join(" ")
      : "";

    const searchable = `${asset.name} ${
      asset.category ?? ""
    } ${asset.asset_type} ${metadata}`.toLowerCase();

    return searchable.includes(normalizedQuery);
  });
}, [assets, query]);

  function updateQuery(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("q", value); else next.delete("q");
    setSearchParams(next);
  }

  if (collectionLoading || assetsLoading) return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-80" />)}</div>;
  if (collectionError || !collection) return <EmptyState title="Collection unavailable." description={collectionError ?? "This collection may have been archived."} />;
  return <div><Link to="/assets" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Asset library</Link><header className="mt-8 border-b border-border pb-8"><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Collection {String(collection.display_order).padStart(2, "0")} · {collectionAssets.length} assets</p><h1 className="mt-3 font-display text-5xl font-bold tracking-[-0.055em]">{collection.name}</h1><p className="mt-4 max-w-2xl text-base leading-7 text-muted">{collection.description}</p></header><section className="mt-8" aria-labelledby="collection-assets-heading"><div className="flex flex-wrap items-center justify-between gap-4"><h2 id="collection-assets-heading" className="font-display text-2xl font-bold tracking-[-0.035em]">Assets</h2><span className="text-sm text-muted">{collectionAssets.length} asset{collectionAssets.length === 1 ? "" : "s"}</span></div><div className="mt-5 flex h-11 items-center gap-3 rounded-md border border-border bg-white px-4"><Search className="h-4 w-4 shrink-0 text-muted" /><input value={query} onChange={(event) => updateQuery(event.target.value)} placeholder={`Search ${collection.name.toLowerCase()}...`} aria-label={`Search ${collection.name}`} className="min-w-0 flex-1 outline-none" />{query ? <button type="button" onClick={() => updateQuery("")} aria-label="Clear collection search" className="text-muted hover:text-foreground"><X className="h-4 w-4" /></button> : null}</div>{assetsError ? <p className="mt-5 rounded-md bg-[#fad9db] px-4 py-3 text-sm">Assets could not be loaded: {assetsError}</p> : null}<div className="mt-6">{collectionAssets.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{collectionAssets.map((asset) => <AssetCard key={asset.id} asset={asset} />)}</div> : <EmptyState title={query ? "No assets match your search." : "No assets in this collection yet."} description={query ? "Try another search term." : "Assets assigned to this collection will appear here."} />}</div></section>{isAdmin ? <AssetUploadPanel initialCollectionId={collection.id} collectionLabel={collection.name} /> : null}</div>;
}
