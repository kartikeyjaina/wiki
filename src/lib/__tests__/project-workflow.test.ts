import { describe, expect, it } from "vitest";
import { getProjectTransitions, isProjectTransitionAllowed } from "@/lib/project-workflow";

describe("project workflow", () => {
  it("exposes the valid lifecycle transitions", () => {
    expect(getProjectTransitions("planned").map((item) => item.status)).toEqual(["in_progress", "archived"]);
    expect(getProjectTransitions("in_progress").map((item) => item.status)).toEqual(["blocked", "shipped", "archived"]);
    expect(getProjectTransitions("blocked").map((item) => item.status)).toEqual(["in_progress", "archived"]);
    expect(getProjectTransitions("shipped").map((item) => item.status)).toEqual(["archived"]);
  });

  it("rejects invalid or backwards transitions", () => {
    expect(isProjectTransitionAllowed("planned", "shipped")).toBe(false);
    expect(isProjectTransitionAllowed("archived", "in_progress")).toBe(false);
    expect(isProjectTransitionAllowed("in_progress", "blocked")).toBe(true);
  });
});