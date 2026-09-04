import { describe, expect, it } from "vitest";
import { nextAssetVersion } from "@/lib/asset-version";

describe("asset versions", () => {
  it("starts at version one", () => {
    expect(nextAssetVersion([])).toBe("1");
  });

  it("increments the highest numeric version", () => {
    expect(nextAssetVersion([{ version: "1" }, { version: "3" }, { version: "2" }])).toBe("4");
  });

  it("ignores non-numeric labels without losing the sequence", () => {
    expect(nextAssetVersion([{ version: "draft" }, { version: "2" }])).toBe("3");
  });
});