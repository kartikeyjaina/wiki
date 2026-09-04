import type { ProjectStatus } from "@/types/domain";

export type ProjectHealth = "on_track" | "at_risk" | "overdue" | "blocked";

export function getProjectHealth(input: { status: ProjectStatus; dueDate?: string | null; completedTodos?: number; totalTodos?: number; completedMilestones?: number; totalMilestones?: number; today?: string }): ProjectHealth {
  if (input.status === "blocked") return "blocked";
  if (input.status === "shipped" || input.status === "archived") return "on_track";
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  if (input.dueDate && input.dueDate < today) return "overdue";
  const todoRisk = input.totalTodos ? (input.completedTodos ?? 0) / input.totalTodos < 0.25 : false;
  const milestoneRisk = input.totalMilestones ? (input.completedMilestones ?? 0) / input.totalMilestones < 0.25 : false;
  return todoRisk || milestoneRisk ? "at_risk" : "on_track";
}

export const projectHealthLabels: Record<ProjectHealth, string> = { on_track: "On track", at_risk: "At risk", overdue: "Overdue", blocked: "Blocked" };

export const projectStatusLabels: Record<ProjectStatus, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  blocked: "Blocked",
  shipped: "Shipped",
  archived: "Archived",
};

export function getProjectTransitions(status: ProjectStatus) {
  if (status === "planned") return [{ label: "Start project", status: "in_progress" as ProjectStatus }, { label: "Archive", status: "archived" as ProjectStatus }];
  if (status === "in_progress") return [{ label: "Mark blocked", status: "blocked" as ProjectStatus }, { label: "Mark shipped", status: "shipped" as ProjectStatus }, { label: "Archive", status: "archived" as ProjectStatus }];
  if (status === "blocked") return [{ label: "Resume work", status: "in_progress" as ProjectStatus }, { label: "Archive", status: "archived" as ProjectStatus }];
  if (status === "shipped") return [{ label: "Archive", status: "archived" as ProjectStatus }];
  return [];
}

export function isProjectTransitionAllowed(from: ProjectStatus, to: ProjectStatus) {
  return getProjectTransitions(from).some((transition) => transition.status === to);
}