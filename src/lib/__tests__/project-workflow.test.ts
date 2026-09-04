import { describe, expect, it } from "vitest";
import { getProjectHealth, getProjectTransitions, isProjectTransitionAllowed } from "@/lib/project-workflow";

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

describe("project health", () => {
  it("prioritizes blocked and overdue states", () => {
    expect(getProjectHealth({ status: "blocked", today: "2026-09-04" })).toBe("blocked");
    expect(getProjectHealth({ status: "in_progress", dueDate: "2026-09-03", today: "2026-09-04" })).toBe("overdue");
  });

  it("marks sparse work at risk", () => {
    expect(getProjectHealth({ status: "in_progress", totalTodos: 4, completedTodos: 0, today: "2026-09-04" })).toBe("at_risk");
    expect(getProjectHealth({ status: "in_progress", totalTodos: 4, completedTodos: 4, today: "2026-09-04" })).toBe("on_track");
  });
});