import type { IdeaStatus } from "@/types/domain";

export const ideaStatusLabels: Record<IdeaStatus, string> = {
  new: "New",
  discussing: "Under Consideration",
  under_review: "Under Consideration",
  planned: "Approved",
  in_progress: "In Progress",
  shipped: "Implemented",
  parked: "Not Pursuing",
  declined: "Rejected",
  duplicate: "Duplicate",
};

export function getIdeaTransitions(status: IdeaStatus): { label: string; status: IdeaStatus }[] {
  if (status === "new") return [{ label: "Consider", status: "discussing" }, { label: "Reject", status: "declined" }];
  if (status === "discussing" || status === "under_review") return [{ label: "Approve", status: "planned" }, { label: "Reject", status: "declined" }];
  if (status === "planned") return [{ label: "Start Project", status: "in_progress" }];
  if (status === "in_progress") return [{ label: "Mark Implemented", status: "shipped" }];
  return [];
}