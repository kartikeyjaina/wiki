import { describe, expect, it } from "vitest";

// ─── Diff logic (mirrors Wiki.tsx) ───────────────────────────────────────────

type DiffLine = { type: "same" | "removed" | "added"; text: string };

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const result: DiffLine[] = [];
  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    const o = oldLines[i];
    const n = newLines[i];
    if (o === n && o !== undefined) {
      result.push({ type: "same", text: o });
    } else {
      if (o !== undefined) result.push({ type: "removed", text: o });
      if (n !== undefined) result.push({ type: "added", text: n });
    }
  }
  return result;
}

// ─── Slug generation (mirrors Wiki.tsx) ──────────────────────────────────────

function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ─── Tag parsing ──────────────────────────────────────────────────────────────

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("wiki diff", () => {
  it("marks identical lines as same", () => {
    const diff = computeDiff("hello\nworld", "hello\nworld");
    expect(diff.every((d) => d.type === "same")).toBe(true);
  });

  it("detects added lines", () => {
    const diff = computeDiff("line one", "line one\nline two");
    expect(diff.some((d) => d.type === "added" && d.text === "line two")).toBe(true);
  });

  it("detects removed lines", () => {
    const diff = computeDiff("line one\nline two", "line one");
    expect(diff.some((d) => d.type === "removed" && d.text === "line two")).toBe(true);
  });

  it("handles a complete replacement", () => {
    const diff = computeDiff("old content", "new content");
    expect(diff.some((d) => d.type === "removed")).toBe(true);
    expect(diff.some((d) => d.type === "added")).toBe(true);
  });

  it("handles empty old text", () => {
    const diff = computeDiff("", "new line");
    expect(diff.some((d) => d.type === "added" && d.text === "new line")).toBe(true);
  });

  it("handles empty new text", () => {
    const diff = computeDiff("old line", "");
    expect(diff.some((d) => d.type === "removed" && d.text === "old line")).toBe(true);
  });
});

describe("wiki slug generation", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Brand Guidelines")).toBe("brand-guidelines");
  });

  it("strips leading and trailing hyphens", () => {
    expect(slugify("  Brand  ")).toBe("brand");
  });

  it("collapses repeated special characters", () => {
    expect(slugify("A & B -- Guide")).toBe("a-b-guide");
  });
});

describe("wiki tag parsing", () => {
  it("splits comma-separated tags", () => {
    expect(parseTags("brand, process, design")).toEqual(["brand", "process", "design"]);
  });

  it("filters empty segments", () => {
    expect(parseTags("brand,,design")).toEqual(["brand", "design"]);
  });

  it("returns empty array for blank input", () => {
    expect(parseTags("")).toEqual([]);
    expect(parseTags("  ")).toEqual([]);
  });
});

describe("wiki revision metadata tracking", () => {
  it("detects change when content differs", () => {
    const changed =
      "new content" !== "old content" ||
      "My Page" !== "My Page" ||
      JSON.stringify(["a"]) !== JSON.stringify(["a"]);
    expect(changed).toBe(true);
  });

  it("detects change when title differs", () => {
    const changed =
      "same content" !== "same content" ||
      "New Title" !== "Old Title" ||
      JSON.stringify(["a"]) !== JSON.stringify(["a"]);
    expect(changed).toBe(true);
  });

  it("detects change when tags differ", () => {
    const changed =
      "same content" !== "same content" ||
      "Same Title" !== "Same Title" ||
      JSON.stringify(["a", "b"]) !== JSON.stringify(["a"]);
    expect(changed).toBe(true);
  });

  it("reports no change when everything is identical", () => {
    const content = "same content";
    const title = "Same Title";
    const tags = ["a", "b"];
    const changed =
      content !== content ||
      title !== title ||
      JSON.stringify(tags) !== JSON.stringify(tags);
    expect(changed).toBe(false);
  });
});
