import { AssetCard } from "@/components/assets/AssetCard";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { supabase } from "@/lib/supabase";
import type { Asset } from "@/types/domain";
import { useEffect, useState } from "react";

interface SavedAssetRow {
  asset: Asset | null;
}

export function SavedAssets() {
  const [saved, setSaved] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    void supabase
      .from("user_asset_saves")
      .select("asset:assets(*, collection:asset_collections(id, name, slug))")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Could not load saved assets:", error);
          setSaved([]);
        } else {
          const rows = (data ?? []) as unknown as SavedAssetRow[];
          setSaved(rows.flatMap(({ asset }) => (asset ? [asset] : [])));
        }
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Your workspace"
        title="Saved assets"
        description="Keep the files you reach for most close at hand."
      />
      {loading ? (
        <p className="text-sm text-muted">Loading saved assets...</p>
      ) : saved.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {saved.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No saved assets yet."
          description="Save an asset from its detail page to build your personal shortlist."
        />
      )}
    </div>
  );
}
