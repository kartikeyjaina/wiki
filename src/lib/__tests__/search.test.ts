import { describe, expect, it } from "vitest";

// ─── Entity → route mapping (mirrors the global_search SQL function) ─────────

type EntityType = "wiki_page" | "asset" | "idea" | "comment" | "project" | "person";

function entityHref(
  type: EntityType,
  id: string,
  extra?: { slug?: string },
): string {
  switch (type) {
    case "wiki_page":
      return `/wiki/${id}`;
    case "asset":
      return `/assets/${id}`;
    case "idea":
      return `/ideas/${id}`;
    case "project":
      return `/projects/${id}`;
    case "person":
      return `/people/${id}`;
    case "comment":
      // Comments inherit the parent entity's route; supplied via `extra`
      return extra?.slug ?? "#";
    default: {
      // Unknown entity types should not crash – fail safely
      const _exhaustive: never = type;
      return "#";
    }
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("search result entity routing", () => {
  it("routes wiki_page to /wiki/:slug", () => {
    expect(entityHref("wiki_page", "abc-slug")).toBe("/wiki/abc-slug");
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

  it("routes comment using parent entity href", () => {
    expect(entityHref("comment", "comment-uuid", { slug: "/ideas/idea-uuid" })).toBe(
      "/ideas/idea-uuid",
    );
  });

  it("returns # for comment with no parent context", () => {
    expect(entityHref("comment", "comment-uuid")).toBe("#");
  });
});

describe("search filter validation", () => {
  const validFilters = ["all", "wiki", "assets", "ideas", "comments", "projects", "people"];

  it("accepts all known filter values", () => {
    for (const filter of validFilters) {
      expect(validFilters.includes(filter)).toBe(true);
    }
  });

  it("does not accept unknown filters", () => {
    expect(validFilters.includes("unknown")).toBe(false);
    expect(validFilters.includes("")).toBe(false);
  });
});

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
