import { Download } from "lucide-react";
import { Link } from "react-router-dom";
import type { Asset } from "@/types/domain";
import { Badge } from "@/components/ui/Badge";
import { AssetThumbnail } from "@/components/assets/AssetThumbnail";
import { downloadAsset } from "@/lib/storage";

export function AssetCard({ asset, onPreview }: { asset: Asset; onPreview?: (asset: Asset) => void }) {
  const filename = String(asset.metadata?.original_name ?? asset.name);
  return (
    <article className="group rounded-xl border border-border bg-white p-4 transition hover:border-[#1111112e] hover:bg-[#eff1f3] hover:shadow-card">
      <Link to={`/assets/${asset.id}`} onClick={onPreview ? (event) => { event.preventDefault(); onPreview(asset); } : undefined} className="block">
      <AssetThumbnail asset={asset} />
      <div className="mt-4 flex flex-wrap gap-2">
        {asset.category ? <Badge>{asset.category}</Badge> : null}
      </div>
      <h2 className="mt-3 font-display text-lg font-bold tracking-[-0.03em]">{asset.name}</h2>
      <p className="mt-1 text-sm text-muted">{asset.collection?.name ?? "Unclassified"} · {asset.asset_type}</p>
      </Link>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3"><span className="truncate pr-3 text-xs text-muted">{filename}</span>{asset.storage_path ? <button type="button" onClick={() => void downloadAsset(asset.storage_path!, filename)} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-muted hover:text-foreground" aria-label={`Download ${asset.name}`}><Download className="h-3.5 w-3.5" /> Download</button> : null}</div>
    </article>
  );
}
