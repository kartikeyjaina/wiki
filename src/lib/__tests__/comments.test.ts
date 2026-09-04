import { describe, expect, it } from "vitest";

// ─── Mention extraction helper ──────────────────────────────────────────────

/**
 * Extract known @mentioned display names from a comment body.
 * Matching against the known names avoids treating ordinary words after @ as
 * part of a mention, while still supporting multi-word display names.
 */
function extractMentionIds(body: string, nameToId: Record<string, string>): string[] {
  const ids: string[] = [];
  const names = Object.keys(nameToId).sort((a, b) => b.length - a.length);
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(^|\\s)@${escaped}(?=\\s|$|[.,!?])`, "gi");
    if (pattern.test(body)) ids.push(nameToId[name]);
  }
  return ids;
}

function resolveEditedMentions(
  _oldBody: string,
  newBody: string,
  nameToId: Record<string, string>,
): string[] {
  return extractMentionIds(newBody, nameToId);
}

function shouldNotifyMention(mentionedUserId: string, actorUserId: string): boolean {
  return mentionedUserId !== actorUserId;
}

function shouldNotifyReply(parentCommentAuthorId: string | null, actorUserId: string): boolean {
  if (!parentCommentAuthorId) return false;
  return parentCommentAuthorId !== actorUserId;
}

describe("mention extraction", () => {
  const nameToId: Record<string, string> = {
    Alice: "user-alice",
    "Bob Smith": "user-bob",
    Charlie: "user-charlie",
  };

  it("extracts a single mention", () => {
    expect(extractMentionIds("Hey @Alice please review", nameToId)).toEqual(["user-alice"]);
  });

  it("extracts multiple distinct mentions", () => {
    const ids = extractMentionIds("@Alice and @Bob Smith should know", nameToId);
    expect(ids).toContain("user-alice");
    expect(ids).toContain("user-bob");
    expect(ids).toHaveLength(2);
  });

  it("deduplicates repeated mentions of the same person", () => {
    expect(extractMentionIds("@Alice can you check? @Alice see above", nameToId)).toEqual(["user-alice"]);
  });

  it("ignores unknown handles", () => {
    expect(extractMentionIds("@Unknown please help", nameToId)).toEqual([]);
  });

  it("does not consume words following a known mention", () => {
    expect(extractMentionIds("@Alice please review", nameToId)).toEqual(["user-alice"]);
  });

  it("returns empty array when no mentions are present", () => {
    expect(extractMentionIds("No mentions here", nameToId)).toEqual([]);
  });
});

describe("edited mention synchronization", () => {
  const nameToId: Record<string, string> = {
    Alice: "user-alice",
    Bob: "user-bob",
  };

  it("replaces removed mentions with new ones after edit", () => {
    expect(resolveEditedMentions("@Alice please review", "@Bob please review", nameToId)).toEqual(["user-bob"]);
  });

  it("reflects cleared mentions when body has none", () => {
    expect(resolveEditedMentions("@Alice look here", "Updated without mentions", nameToId)).toEqual([]);
  });

  it("adds new mentions on top of existing", () => {
    expect(resolveEditedMentions("@Alice check this", "@Alice and @Bob check this", nameToId)).toEqual(["user-alice", "user-bob"]);
  });
});

describe("self-notification prevention", () => {
  it("does not notify actor about their own mention", () => {
    expect(shouldNotifyMention("user-alice", "user-alice")).toBe(false);
  });

  it("notifies other users about mentions", () => {
    expect(shouldNotifyMention("user-bob", "user-alice")).toBe(true);
  });

  it("does not send reply notification to the actor", () => {
    expect(shouldNotifyReply("user-alice", "user-alice")).toBe(false);
  });

  it("notifies parent commenter about a reply from someone else", () => {
    expect(shouldNotifyReply("user-alice", "user-bob")).toBe(true);
  });

  it("skips reply notification when parent commenter is unknown", () => {
    expect(shouldNotifyReply(null, "user-bob")).toBe(false);
  });
});
