import {
  Archive,
  Code2,
  File,
  FileArchive,
  FileCode2,
  FileJson,
  FileSpreadsheet,
  FileText,
  Presentation,
} from "lucide-react";
import type { Asset } from "@/types/domain";
import {
  getAssetThumbnailType,
  getFilePreviewType,
  getFileTypeLabel,
} from "@/lib/file-preview";

export function AssetThumbnail({ asset }: { asset: Asset }) {
  const isImage = getAssetThumbnailType(asset) === "image";
  return (
    <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-lg bg-surface">
      {isImage && (asset.preview_url || asset.storage_path) ? (
        <ImageThumbnail asset={asset} />
      ) : (
        <FileThumbnail asset={asset} />
      )}
    </div>
  );
}

function ImageThumbnail({ asset }: { asset: Asset }) {
  // Use pre-computed signed preview_url if available (avoids generating a new
  // signed URL per render). Fall back to FileThumbnail on error.
  if (!asset.preview_url) return <FileThumbnail asset={asset} />;

  return (
    <img
      src={asset.preview_url}
      alt={asset.name}
      loading="lazy"
      className="h-full w-full object-contain"
      onError={(event) => {
        // Replace broken image with the file-type icon fallback
        const target = event.currentTarget;
        target.style.display = "none";
      }}
    />
  );
}

function FileThumbnail({ asset }: { asset: Asset }) {
  const type = getFilePreviewType(asset);
  const Icon =
    type === "zip"
      ? FileArchive
      : type === "skill"
      ? Archive
      : type === "json"
      ? FileJson
      : type === "csv" || type === "xlsx"
      ? FileSpreadsheet
      : type === "pptx"
      ? Presentation
      : type === "text" || type === "pdf" || type === "docx"
      ? FileText
      : type === "markdown"
      ? FileCode2
      : type === "unsupported"
      ? File
      : Code2;

  return (
    <div className="flex flex-col items-center gap-3 text-muted">
      <Icon className="h-12 w-12" strokeWidth={1.5} />
      <span className="text-xs font-bold tracking-[0.14em] text-foreground">
        {getFileTypeLabel(asset)}
      </span>
    </div>
  );
}
