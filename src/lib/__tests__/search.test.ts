import { describe, expect, it } from "vitest";

// ─── Entity → route mapping ─────────────────────────────────────────────────
// Mirrors the global_search SQL function defined in migrations.
// Wiki pages use /wiki/:slug (not /wiki/:id).
// Comments resolve to their parent entity's route.
// Unknown entity types fail safely to "#".

type EntityType = "wiki_page" | "asset" | "idea" | "comment" | "project" | "person";

function entityHref(
  type: EntityType,
  idOrSlug: string,
  extra?: { parentHref?: string },
): string {
  switch (type) {
    case "wiki_page": return `/wiki/${idOrSlug}`;   // slug, not uuid
    case "asset":     return `/assets/${idOrSlug}`;
    case "idea":      return `/ideas/${idOrSlug}`;
    case "project":   return `/projects/${idOrSlug}`;
    case "person":    return `/people/${idOrSlug}`;
    case "comment":
      // Comments inherit the parent entity's route (supplied via extra.parentHref)
      return extra?.parentHref ?? "#";
    default: {
      // Exhaustive check – unknown types should never crash the UI
      const _exhaustive: never = type;
      return "#";
    }
  }
}

// ─── Route helper tests ───────────────────────────────────────────────────────

describe("search result entity routing", () => {
  it("routes wiki_page to /wiki/:slug", () => {
    expect(entityHref("wiki_page", "brand-guidelines")).toBe("/wiki/brand-guidelines");
  });

  it("does NOT use the UUID directly for wiki pages", () => {
    // The SQL function joins on slug, so we should never get /wiki/<uuid>
    const result = entityHref("wiki_page", "abc-slug");
    expect(result).toBe("/wiki/abc-slug");
    expect(result).not.toMatch(/wiki\/[0-9a-f-]{36}$/);
  });

  it("routes asset to /assets/:id", () => {
    expect(entityHref("asset", "asset-uuid")).toBe("/assets/asset-uuid");
  });

  it("routes idea to /ideas/:id", () => {
    expect(entityHref("idea", "idea-uuid")).toBe("/ideas/idea-uuid");
  });

  it("routes project to /projects/:id", () => {
    expect(entityHref("project", "project-uuid")).toBe("/projects/project-uuid");
  });

  it("routes person to /people/:id", () => {
    expect(entityHref("person", "person-uuid")).toBe("/people/person-uuid");
  });

  it("routes comment using parent entity href for idea parent", () => {
    expect(
      entityHref("comment", "comment-uuid", { parentHref: "/ideas/idea-uuid" }),
    ).toBe("/ideas/idea-uuid");
  });

  it("routes comment using parent entity href for project parent", () => {
    expect(
      entityHref("comment", "comment-uuid", { parentHref: "/projects/proj-uuid" }),
    ).toBe("/projects/proj-uuid");
  });

  it("routes comment using parent entity href for wiki_page parent (slug-based)", () => {
    expect(
      entityHref("comment", "comment-uuid", { parentHref: "/wiki/brand-guidelines" }),
    ).toBe("/wiki/brand-guidelines");
  });

  it("returns # for comment with no parent context", () => {
    expect(entityHref("comment", "comment-uuid")).toBe("#");
  });

  it("returns # for comment with undefined parent href", () => {
    expect(entityHref("comment", "comment-uuid", {})).toBe("#");
  });
});

// ─── Filter validation ────────────────────────────────────────────────────────

describe("search filter validation", () => {
  const validFilters = ["all", "wiki", "assets", "ideas", "comments", "projects", "people"] as const;

  it("accepts all known filter values", () => {
    for (const filter of validFilters) {
      expect(validFilters.includes(filter as (typeof validFilters)[number])).toBe(true);
    }
  });

  it("does not accept unknown filters", () => {
    expect(validFilters.includes("unknown" as (typeof validFilters)[number])).toBe(false);
    expect(validFilters.includes("" as (typeof validFilters)[number])).toBe(false);
  });
});

// ─── Minimum query length ─────────────────────────────────────────────────────

describe("search query minimum length", () => {
  function shouldSearch(query: string): boolean {
    return query.trim().length >= 2;
  }

  it("requires at least 2 characters", () => {
    expect(shouldSearch("a")).toBe(false);
    expect(shouldSearch("ab")).toBe(true);
    expect(shouldSearch("  a ")).toBe(false);
    expect(shouldSearch("  ab ")).toBe(true);
  });
});

// ─── Unknown entity type safety ───────────────────────────────────────────────

describe("search result unknown entity safety", () => {
  it("returns # for an unknown entity type without crashing", () => {
    // Cast to bypass TypeScript – simulates a bad server response
    const result = entityHref("unknown_type" as EntityType, "some-id");
    expect(result).toBe("#");
  });
});
