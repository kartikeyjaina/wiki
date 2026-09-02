import { Link } from "react-router-dom";
import type { Asset } from "@/types/domain";
import { Badge } from "@/components/ui/Badge";
import { formatStatus } from "@/lib/utils";
import { IngredientGrid } from "@/components/ingredients/IngredientGrid";

export function AssetCard({ asset }: { asset: Asset }) {
  return (
    <Link to={`/assets/${asset.id}`} className="group block rounded-xl border border-border bg-white p-4 transition hover:border-[#1111112e] hover:bg-[#eff1f3] hover:shadow-card">
      <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-lg bg-surface">
        {asset.preview_url ? (
          <img src={asset.preview_url} alt="" loading="lazy" className="h-full w-full object-contain" />
        ) : (
          <IngredientGrid />
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {asset.category ? <Badge>{asset.category}</Badge> : null}
        <Badge>{formatStatus(asset.status)}</Badge>
      </div>
      <h2 className="mt-3 font-display text-lg font-bold tracking-[-0.03em]">{asset.name}</h2>
      <p className="mt-1 text-sm text-muted">{asset.asset_type}</p>
    </Link>
  );
}
