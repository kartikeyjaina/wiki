import { describe, expect, it } from "vitest";
import { formatFileSize, getAssetThumbnailType, getFilePreviewType } from "@/lib/file-preview";

function asset(name: string, assetType = "application/octet-stream") {
  return { name, asset_type: assetType, metadata: null };
}

describe("file preview detection", () => {
  it.each([
    ["logo.png", "image"], ["photo.JPG", "image"], ["photo.jpeg", "image"], ["graphic.webp", "image"], ["animation.gif", "image"],
    ["notes.md", "markdown"], ["notes.txt", "text"], ["data.json", "json"], ["data.csv", "csv"], ["guide.pdf", "pdf"],
    ["brief.docx", "docx"], ["deck.pptx", "pptx"], ["budget.xlsx", "xlsx"], ["bundle.zip", "zip"], ["skill.skill", "skill"], ["binary.bin", "unsupported"],
  ])("maps %s to %s", (name, expected) => {
    expect(getFilePreviewType(asset(name))).toBe(expected);
  });

  it("prefers a known MIME type over an unknown extension", () => {
    expect(getFilePreviewType(asset("download.bin", "application/pdf"))).toBe("pdf");
    expect(getFilePreviewType(asset("archive.zip", "application/x-zip-compressed"))).toBe("zip");
    expect(getAssetThumbnailType(asset("futurelab-brand[1].skill"))).toBe("file");
    expect(getAssetThumbnailType(asset("photo.png"))).toBe("image");
  });

  it("formats known and unknown file sizes", () => {
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(null)).toBe("Size unavailable");
  });
});