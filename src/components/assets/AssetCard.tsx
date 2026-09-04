import { Link } from "react-router-dom";
import type { Asset } from "@/types/domain";
import { Badge } from "@/components/ui/Badge";
import { formatStatus } from "@/lib/utils";
import { AssetThumbnail } from "@/components/assets/AssetThumbnail";

export function AssetCard({ asset, onPreview }: { asset: Asset; onPreview?: (asset: Asset) => void }) {
  return (
    <Link to={`/assets/${asset.id}`} onClick={onPreview ? (event) => { event.preventDefault(); onPreview(asset); } : undefined} className="group block rounded-xl border border-border bg-white p-4 transition hover:border-[#1111112e] hover:bg-[#eff1f3] hover:shadow-card">
      <AssetThumbnail asset={asset} />
      <div className="mt-4 flex flex-wrap gap-2">
        {asset.category ? <Badge>{asset.category}</Badge> : null}
        <Badge>{formatStatus(asset.status)}</Badge>
      </div>
      <h2 className="mt-3 font-display text-lg font-bold tracking-[-0.03em]">{asset.name}</h2>
      <p className="mt-1 text-sm text-muted">{asset.asset_type}</p>
    </Link>
  );
}
