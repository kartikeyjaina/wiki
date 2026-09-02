import { useMemo, useState } from "react";
import { AssetCard } from "@/components/assets/AssetCard";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAssets } from "@/hooks/useAssets";

const categories = ["all", "logos", "typography", "colours", "imagery", "templates", "social", "product & web", "events", "people", "governance"];

export function Assets() {
  const { assets, loading, error } = useAssets();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

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
      <div className="mb-6 flex flex-col gap-3 md:flex-row">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search assets..." className="h-12 flex-1 rounded-md border border-border px-4 outline-none focus:border-foreground" />
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-12 rounded-md border border-border bg-white px-4 capitalize outline-none focus:border-foreground">
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      {error ? <p className="mb-4 rounded-md bg-[#fad9db] px-4 py-3 text-sm font-medium">Assets could not be loaded: {error}</p> : null}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-72" />)}</div>
      ) : filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((asset) => <AssetCard key={asset.id} asset={asset} />)}</div>
      ) : (
        <EmptyState title={assets.length ? "No assets found." : "No assets yet."} description={assets.length ? "Try changing your filters." : "Import the existing repository or upload real assets through the admin workflow."} />
      )}
    </div>
  );
}
