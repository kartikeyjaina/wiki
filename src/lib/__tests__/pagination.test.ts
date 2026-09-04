import { describe, expect, it } from "vitest";
import { clampPageSize, hasNextPage, pageRange } from "@/lib/pagination";

describe("pagination guards", () => {
  it("uses the default size for missing and invalid values", () => {
    expect(clampPageSize(undefined)).toBe(40);
    expect(clampPageSize(Number.NaN)).toBe(40);
    expect(clampPageSize(Number.POSITIVE_INFINITY)).toBe(40);
  });

  it("clamps page sizes to safe integer bounds", () => {
    expect(clampPageSize(0)).toBe(1);
    expect(clampPageSize(-10)).toBe(1);
    expect(clampPageSize(25.9)).toBe(25);
    expect(clampPageSize(1000)).toBe(100);
  });

  it("calculates inclusive ranges without negative offsets", () => {
    expect(pageRange(0, 40)).toEqual({ from: 0, to: 39 });
    expect(pageRange(40, 40)).toEqual({ from: 40, to: 79 });
    expect(pageRange(-5, 3)).toEqual({ from: 0, to: 2 });
  });

  it("detects a full page that may have another page", () => {
    expect(hasNextPage(39, 40)).toBe(false);
    expect(hasNextPage(40, 40)).toBe(true);
    expect(hasNextPage(100, 40)).toBe(true);
  });
});
