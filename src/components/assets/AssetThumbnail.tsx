import { Archive, Code2, File, FileArchive, FileCode2, FileJson, FileSpreadsheet, FileText, Presentation } from "lucide-react";
import { useEffect, useState } from "react";
import type { Asset } from "@/types/domain";
import { getAssetThumbnailType, getFilePreviewType, getFileTypeLabel } from "@/lib/file-preview";
import { getAssetPreviewUrl } from "@/lib/storage";

export function AssetThumbnail({ asset }: { asset: Asset }) {
  const isImage = getAssetThumbnailType(asset) === "image";
  return (
    <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-lg bg-surface">
      {isImage && asset.storage_path ? <ImageThumbnail asset={asset} /> : <FileThumbnail asset={asset} />}
    </div>
  );
}

function ImageThumbnail({ asset }: { asset: Asset }) {
  const [failed, setFailed] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setFailed(false); setUrl(null);
    if (asset.storage_path) void getAssetPreviewUrl(asset.storage_path).then(setUrl).catch(() => setFailed(true));
    else setFailed(true);
  }, [asset.preview_url, asset.storage_path]);
  if (failed) return <FileThumbnail asset={asset} />;
  return url ? <img src={url} alt={asset.name} loading="lazy" className="h-full w-full object-contain" onError={() => setFailed(true)} /> : <FileThumbnail asset={asset} />;
}

function FileThumbnail({ asset }: { asset: Asset }) {
  const type = getFilePreviewType(asset);
  const Icon = type === "zip" ? FileArchive : type === "skill" ? Archive : type === "json" ? FileJson : type === "csv" || type === "xlsx" ? FileSpreadsheet : type === "pptx" ? Presentation : type === "text" || type === "pdf" || type === "docx" ? FileText : type === "markdown" ? FileCode2 : type === "unsupported" ? File : Code2;
  return <div className="flex flex-col items-center gap-3 text-muted"><Icon className="h-12 w-12" strokeWidth={1.5} /><span className="text-xs font-bold tracking-[0.14em] text-foreground">{getFileTypeLabel(asset)}</span></div>;
}