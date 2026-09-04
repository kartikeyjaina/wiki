import { useMemo, useState } from "react";
import { AssetCard } from "@/components/assets/AssetCard";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAssets } from "@/hooks/useAssets";
import { FilePreviewModal } from "@/components/assets/FilePreviewModal";
import type { Asset } from "@/types/domain";

export function Assets() {
  const { assets, loading, error } = useAssets();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const categories = useMemo(() => ["all", ...Array.from(new Set(assets.map((asset) => asset.category?.trim().toLowerCase()).filter((value): value is string => Boolean(value)))).sort()], [assets]);

  const filtered = useMemo(() => {
    return assets.filter((asset) => {
      const matchesQuery = asset.name.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === "all" || asset.category?.toLowerCase() === category;
      return matchesQuery && matchesCategory;
    });
  }, [assets, category, query]);

  return (
    <div>
      <PageHeader eyebrow="Asset Library" title="Find the right brand asset fast." description="Search, filter, preview, and download approved files without inventing metadata around them." />
      <div className="mb-4 flex flex-col gap-3 md:flex-row">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search assets..." className="h-12 flex-1 rounded-md border border-border px-4 outline-none focus:border-foreground" />
      </div>
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1" aria-label="Asset categories">
        {categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`shrink-0 rounded-pill px-4 py-2 text-sm font-semibold capitalize ${category === item ? "bg-foreground text-white" : "bg-surface text-muted"}`}>{item}</button>)}
      </div>
      {error ? <p className="mb-4 rounded-md bg-[#fad9db] px-4 py-3 text-sm font-medium">Assets could not be loaded: {error}</p> : null}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-72" />)}</div>
      ) : filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((asset) => <AssetCard key={asset.id} asset={asset} onPreview={setPreviewAsset} />)}</div>
      ) : (
        <EmptyState title={assets.length ? "No assets found." : "No assets yet."} description={assets.length ? "Try changing your filters." : "Import the existing repository or upload real assets through the admin workflow."} />
      )}
      <FilePreviewModal asset={previewAsset} onClose={() => setPreviewAsset(null)} />
    </div>
  );
}
