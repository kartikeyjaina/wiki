import { describe, expect, it } from "vitest";
import { cleanAssetTitle } from "@/lib/asset-title";

describe("cleanAssetTitle", () => {
  it("removes extensions and filename separators", () => {
    expect(cleanAssetTitle("futurelab_logo_02-final-final.svg")).toBe("Futurelab Logo Final Final");
  });

  it("removes numbering, dimensions, and date suffixes", () => {
    expect(cleanAssetTitle("futurelab-logo-01-final.png")).toBe("Futurelab Logo Final");
    expect(cleanAssetTitle("meeting-background-1920x1080-02.jpg")).toBe("Meeting Background");
    expect(cleanAssetTitle("Futurelab-Brand-2025-03.pdf")).toBe("Futurelab Brand");
  });

  it("preserves meaningful embedded digits", () => {
    expect(cleanAssetTitle("Office365-logo.png")).toBe("Office365 Logo");
  });

  it("never returns an empty title", () => {
    expect(cleanAssetTitle("001.png")).toBe("001");
    expect(cleanAssetTitle(".png")).toBe("Untitled asset");
  });
});
