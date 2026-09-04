import type { Asset } from "@/types/domain";

export type FilePreviewType = "image" | "text" | "markdown" | "json" | "csv" | "pdf" | "docx" | "pptx" | "xlsx" | "zip" | "skill" | "unsupported";

const extensionMap: Record<string, FilePreviewType> = {
  png: "image", jpg: "image", jpeg: "image", webp: "image", gif: "image", svg: "image",
  txt: "text", md: "markdown", markdown: "markdown", json: "json", csv: "csv",
  pdf: "pdf", docx: "docx", pptx: "pptx", xlsx: "xlsx", zip: "zip", skill: "skill",
};

const mimeMap: Record<string, FilePreviewType> = {
  "image/png": "image", "image/jpeg": "image", "image/webp": "image", "image/gif": "image", "image/svg+xml": "image",
  "text/plain": "text", "text/markdown": "markdown", "application/json": "json", "text/csv": "csv",
  "application/pdf": "pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx", "application/zip": "zip", "application/x-zip-compressed": "zip",
};

export function getFilePreviewType(file: Pick<Asset, "name" | "asset_type" | "metadata">): FilePreviewType {
  const mimeType = typeof file.metadata?.mime_type === "string" ? file.metadata.mime_type.toLowerCase() : file.asset_type.toLowerCase();
  if (mimeMap[mimeType] && mimeType !== "application/octet-stream") return mimeMap[mimeType];
  const extension = file.name.split(".").at(-1)?.toLowerCase() ?? "";
  return extensionMap[extension] ?? "unsupported";
}

export function getAssetThumbnailType(file: Pick<Asset, "name" | "asset_type" | "metadata">) {
  return getFilePreviewType(file) === "image" ? "image" : "file";
}

export function getFileTypeLabel(file: Pick<Asset, "name" | "asset_type" | "metadata">) {
  const type = getFilePreviewType(file);
  if (type === "unsupported") return "FILE";
  if (type === "markdown") return "MD";
  return type.toUpperCase();
}

export function getAssetSize(asset: Pick<Asset, "metadata">) {
  const size = asset.metadata?.size;
  return typeof size === "number" ? size : null;
}

export function formatFileSize(size: number | null) {
  if (size === null) return "Size unavailable";
  if (size < 1024) return `${size} B`;
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 ** 2).toFixed(1)} MB`;
}