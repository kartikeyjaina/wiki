import { describe, expect, it } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Security and authorization tests
// These test the logic that mirrors DB-enforced rules.
// Actual RPC enforcement is at the DB layer; these tests cover:
//   - notification authorization rules
//   - activity event type allow-list
//   - workflow transition enforcement
//   - self-notification prevention
// ─────────────────────────────────────────────────────────────────────────────

// ─── Notification allowed types ──────────────────────────────────────────────

const ALLOWED_NOTIFICATION_TYPES = [
  "comment_reply",
  "mention",
  "project_member_added",
  "project_member_role_changed",
  "project_member_removed",
  "project_stage_changed",
  "milestone_completed",
  "milestone_reopened",
  "asset_version_uploaded",
  "asset_version_restored",
  "wiki_revision_restored",
  "idea_status_changed",
] as const;

type AllowedNotificationType = typeof ALLOWED_NOTIFICATION_TYPES[number];

function isAllowedNotificationType(type: string): type is AllowedNotificationType {
  return (ALLOWED_NOTIFICATION_TYPES as readonly string[]).includes(type);
}

describe("notification type allowlist", () => {
  it("accepts all whitelisted notification types", () => {
    for (const type of ALLOWED_NOTIFICATION_TYPES) {
      expect(isAllowedNotificationType(type)).toBe(true);
    }
  });

  it("rejects arbitrary notification types", () => {
    expect(isAllowedNotificationType("arbitrary_type")).toBe(false);
    expect(isAllowedNotificationType("admin_alert")).toBe(false);
    expect(isAllowedNotificationType("")).toBe(false);
    expect(isAllowedNotificationType("hack_attempt")).toBe(false);
  });
});

// ─── Self-notification prevention ────────────────────────────────────────────

function shouldSendNotification(recipientId: string, actorId: string): boolean {
  return recipientId !== actorId;
}

describe("self-notification prevention", () => {
  it("prevents self-notification", () => {
    expect(shouldSendNotification("user-a", "user-a")).toBe(false);
  });

  it("allows notification to a different user", () => {
    expect(shouldSendNotification("user-a", "user-b")).toBe(true);
  });

  it("prevents self reply notification", () => {
    const parentAuthorId = "user-a";
    const actorId = "user-a";
    expect(shouldSendNotification(parentAuthorId, actorId)).toBe(false);
  });

  it("allows reply notification to another user", () => {
    const parentAuthorId = "user-b";
    const actorId = "user-a";
    expect(shouldSendNotification(parentAuthorId, actorId)).toBe(true);
  });
});

// ─── Activity event type allowlist ───────────────────────────────────────────

const ALLOWED_ACTIVITY_EVENTS = [
  "created",
  "comment_created",
  "status_changed",
  "project_stage_changed",
  "project_created",
  "assets_uploaded",
  "asset_version_uploaded",
  "asset_version_restored",
  "project_member_added",
  "project_member_role_changed",
  "project_member_removed",
  "project_attachment_added",
  "project_attachment_removed",
  "wiki_page_created",
  "wiki_page_updated",
  "wiki_revision_restored",
  "milestone_completed",
  "milestone_reopened",
  "idea_status_changed",
  "project_metadata_updated",
] as const;

function isAllowedActivityEvent(eventType: string): boolean {
  return (ALLOWED_ACTIVITY_EVENTS as readonly string[]).includes(eventType);
}

describe("activity event type allowlist", () => {
  it("accepts all whitelisted activity event types", () => {
    for (const event of ALLOWED_ACTIVITY_EVENTS) {
      expect(isAllowedActivityEvent(event)).toBe(true);
    }
  });

  it("rejects arbitrary event types", () => {
    expect(isAllowedActivityEvent("arbitrary_event")).toBe(false);
    expect(isAllowedActivityEvent("delete_user")).toBe(false);
    expect(isAllowedActivityEvent("")).toBe(false);
    expect(isAllowedActivityEvent("status_hacked")).toBe(false);
  });
});

// ─── Workflow transition enforcement ─────────────────────────────────────────

type IdeaStatus =
  | "new" | "discussing" | "under_review" | "planned"
  | "in_progress" | "shipped" | "parked" | "declined" | "duplicate";

type ProjectStatus = "planned" | "in_progress" | "blocked" | "shipped" | "archived";

function allowedIdeaTransitions(from: IdeaStatus): IdeaStatus[] {
  switch (from) {
    case "new":          return ["discussing", "declined"];
    case "discussing":   return ["planned", "declined", "parked", "duplicate"];
    case "under_review": return ["planned", "declined", "parked", "duplicate"];
    case "planned":      return ["in_progress", "declined", "parked"];
    case "in_progress":  return ["shipped", "parked"];
    default:             return [];
  }
}

function isIdeaTransitionAllowed(from: IdeaStatus, to: IdeaStatus): boolean {
  return allowedIdeaTransitions(from).includes(to);
}

function allowedProjectTransitions(from: ProjectStatus): ProjectStatus[] {
  switch (from) {
    case "planned":     return ["in_progress", "archived"];
    case "in_progress": return ["blocked", "shipped", "archived"];
    case "blocked":     return ["in_progress", "archived"];
    case "shipped":     return ["archived"];
    default:            return [];
  }
}

function isProjectTransitionAllowed(from: ProjectStatus, to: ProjectStatus): boolean {
  return allowedProjectTransitions(from).includes(to);
}

describe("idea workflow transition enforcement", () => {
  it("allows valid transitions from new", () => {
    expect(isIdeaTransitionAllowed("new", "discussing")).toBe(true);
    expect(isIdeaTransitionAllowed("new", "declined")).toBe(true);
  });

  it("rejects invalid transitions from new", () => {
    expect(isIdeaTransitionAllowed("new", "shipped")).toBe(false);
    expect(isIdeaTransitionAllowed("new", "in_progress")).toBe(false);
    expect(isIdeaTransitionAllowed("new", "planned")).toBe(false);
  });

  it("allows transitions from discussing/under_review", () => {
    expect(isIdeaTransitionAllowed("discussing", "planned")).toBe(true);
    expect(isIdeaTransitionAllowed("discussing", "declined")).toBe(true);
    expect(isIdeaTransitionAllowed("under_review", "planned")).toBe(true);
  });

  it("rejects backwards transitions", () => {
    expect(isIdeaTransitionAllowed("shipped", "new")).toBe(false);
    expect(isIdeaTransitionAllowed("shipped", "in_progress")).toBe(false);
    expect(isIdeaTransitionAllowed("planned", "new")).toBe(false);
  });

  it("shipped is a terminal state", () => {
    expect(allowedIdeaTransitions("shipped")).toHaveLength(0);
    expect(allowedIdeaTransitions("declined")).toHaveLength(0);
  });
});

describe("project workflow transition enforcement", () => {
  it("allows valid transitions from planned", () => {
    expect(isProjectTransitionAllowed("planned", "in_progress")).toBe(true);
    expect(isProjectTransitionAllowed("planned", "archived")).toBe(true);
  });

  it("rejects jumping from planned to shipped", () => {
    expect(isProjectTransitionAllowed("planned", "shipped")).toBe(false);
  });

  it("allows in_progress branching", () => {
    expect(isProjectTransitionAllowed("in_progress", "blocked")).toBe(true);
    expect(isProjectTransitionAllowed("in_progress", "shipped")).toBe(true);
    expect(isProjectTransitionAllowed("in_progress", "archived")).toBe(true);
  });

  it("rejects backwards transition from in_progress", () => {
    expect(isProjectTransitionAllowed("in_progress", "planned")).toBe(false);
  });

  it("allows resuming from blocked", () => {
    expect(isProjectTransitionAllowed("blocked", "in_progress")).toBe(true);
    expect(isProjectTransitionAllowed("blocked", "archived")).toBe(true);
  });

  it("archived is a terminal state", () => {
    expect(allowedProjectTransitions("archived")).toHaveLength(0);
  });

  it("shipped can only archive", () => {
    expect(allowedProjectTransitions("shipped")).toEqual(["archived"]);
    expect(isProjectTransitionAllowed("shipped", "in_progress")).toBe(false);
  });
});

// ─── Notification recipient must not be null ──────────────────────────────────

describe("notification recipient validation", () => {
  function isValidRecipient(recipientId: string | null | undefined): boolean {
    return typeof recipientId === "string" && recipientId.trim().length > 0;
  }

  it("rejects null recipient", () => {
    expect(isValidRecipient(null)).toBe(false);
  });

  it("rejects undefined recipient", () => {
    expect(isValidRecipient(undefined)).toBe(false);
  });

  it("rejects empty string recipient", () => {
    expect(isValidRecipient("")).toBe(false);
    expect(isValidRecipient("   ")).toBe(false);
  });

  it("accepts valid UUID-like recipient", () => {
    expect(isValidRecipient("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });
});
