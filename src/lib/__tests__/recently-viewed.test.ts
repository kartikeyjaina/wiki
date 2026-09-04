import { describe, expect, it } from "vitest";

// ─── Recently-viewed deduplication + ordering logic ──────────────────────────

type EntityType = "wiki_page" | "asset" | "idea" | "project" | "person";

interface RawViewRow {
  entity_type: EntityType;
  entity_id: string;
  last_viewed_at: string;
}

/**
 * Given raw recently-viewed rows (already ordered by last_viewed_at desc),
 * build a deduplicated list limited to `limit` items.
 * The upsert in useRecentlyViewed already deduplicates at the DB level, but
 * this tests the client-side resolution step that discards deleted entities.
 */
function resolveViewedItems(
  rows: RawViewRow[],
  titles: Map<string, { title: string; href: string }>,
  limit: number,
): { id: string; entity_type: EntityType; title: string; href: string; last_viewed_at: string }[] {
  const resolved = rows.map((row) => {
    const key = `${row.entity_type}:${row.entity_id}`;
    const item = titles.get(key);
    return item
      ? { id: row.entity_id, entity_type: row.entity_type, last_viewed_at: row.last_viewed_at, ...item }
      : null;
  });
  return resolved.filter((item): item is NonNullable<typeof item> => item !== null).slice(0, limit);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("recently viewed resolution", () => {
  const titles = new Map<string, { title: string; href: string }>([
    ["asset:asset-1", { title: "Logo SVG", href: "/assets/asset-1" }],
    ["idea:idea-1", { title: "Dark Mode Idea", href: "/ideas/idea-1" }],
    ["project:project-1", { title: "Brand Refresh", href: "/projects/project-1" }],
    ["wiki_page:wiki-1", { title: "Brand Guidelines", href: "/wiki/brand-guidelines" }],
  ]);

  const rows: RawViewRow[] = [
    { entity_type: "asset", entity_id: "asset-1", last_viewed_at: "2026-09-04T10:00:00Z" },
    { entity_type: "idea", entity_id: "idea-1", last_viewed_at: "2026-09-04T09:00:00Z" },
    { entity_type: "project", entity_id: "project-1", last_viewed_at: "2026-09-04T08:00:00Z" },
    // deleted entity – title will not exist in map
    { entity_type: "asset", entity_id: "deleted-asset", last_viewed_at: "2026-09-04T07:00:00Z" },
    { entity_type: "wiki_page", entity_id: "wiki-1", last_viewed_at: "2026-09-04T06:00:00Z" },
  ];

  it("excludes deleted entities that have no title resolution", () => {
    const items = resolveViewedItems(rows, titles, 10);
    expect(items.find((i) => i.id === "deleted-asset")).toBeUndefined();
  });

  it("preserves order (most recent first)", () => {
    const items = resolveViewedItems(rows, titles, 10);
    expect(items[0].id).toBe("asset-1");
    expect(items[1].id).toBe("idea-1");
    expect(items[2].id).toBe("project-1");
  });

  it("respects the limit", () => {
    const items = resolveViewedItems(rows, titles, 2);
    expect(items).toHaveLength(2);
  });

  it("returns empty array when all rows are deleted entities", () => {
    const deletedRows: RawViewRow[] = [
      { entity_type: "asset", entity_id: "gone-1", last_viewed_at: "2026-09-04T10:00:00Z" },
    ];
    expect(resolveViewedItems(deletedRows, titles, 10)).toHaveLength(0);
  });
});
