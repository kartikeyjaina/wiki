import { describe, expect, it } from "vitest";
import { isValidDomain } from "../env";
import { rankIdeas } from "../ranking";
import { getIdeaTransitions, ideaStatusLabels } from "../idea-workflow";
import type { Idea } from "@/types/domain";

describe("real environment and domain authorization", () => {
  it("accepts the configured Futurelab and Gmail domains", () => {
    expect(isValidDomain("alex@futurelab.com")).toBe(true);
    expect(isValidDomain("guest@gmail.com")).toBe(true);
  });
});

describe("idea ranking and moderation rules", () => {
  it("allows only the next valid decision for each lifecycle state", () => {
    expect(getIdeaTransitions("new").map((item) => item.status)).toEqual(["discussing", "declined"]);
    expect(getIdeaTransitions("planned").map((item) => item.status)).toEqual(["in_progress"]);
    expect(getIdeaTransitions("shipped")).toEqual([]);
    expect(ideaStatusLabels.declined).toBe("Rejected");
  });

  it("keeps ranking deterministic and weighted by score, comments, and status", () => {
    const ideas = [
      {
        id: "a",
        title: "Alpha",
        description: "This is a strong concept with enough description detail.",
        why_it_matters: null,
        category_id: null,
        status: "shipped",
        author_id: "user-1",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
        score: 10,
        comment_count: 3,
      },
      {
        id: "b",
        title: "Beta",
        description: "This idea is also well described and should rank next.",
        why_it_matters: null,
        category_id: null,
        status: "in_progress",
        author_id: "user-2",
        created_at: "2025-01-05T00:00:00Z",
        updated_at: "2025-01-05T00:00:00Z",
        score: 8,
        comment_count: 1,
      },
    ] as Idea[];

    const ranked = rankIdeas(ideas, "trending");
    expect(ranked[0].id).toBe("a");
    expect(ranked[1].id).toBe("b");
  });
});
