import type { ProjectStatus } from "@/types/domain";

export const projectStatusLabels: Record<ProjectStatus, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  blocked: "Blocked",
  shipped: "Shipped",
  parked: "Parked",
  archived: "Archived",
};

export function getProjectTransitions(status: ProjectStatus) {
  if (status === "planned") return [{ label: "Start project", status: "in_progress" as ProjectStatus }, { label: "Archive", status: "archived" as ProjectStatus }];
  if (status === "in_progress") return [{ label: "Mark blocked", status: "blocked" as ProjectStatus }, { label: "Mark shipped", status: "shipped" as ProjectStatus }, { label: "Archive", status: "archived" as ProjectStatus }];
  if (status === "blocked") return [{ label: "Resume work", status: "in_progress" as ProjectStatus }, { label: "Archive", status: "archived" as ProjectStatus }];
  if (status === "shipped" || status === "parked") return [{ label: "Archive", status: "archived" as ProjectStatus }];
  return [];
}

export function isProjectTransitionAllowed(from: ProjectStatus, to: ProjectStatus) {
  return getProjectTransitions(from).some((transition) => transition.status === to);
}