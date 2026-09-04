import { describe, expect, it } from "vitest";

// ─── Mention extraction helper (mirrors logic in useComments) ────────────────

/**
 * Extract @mentioned names from a comment body and map them to user IDs
 * using a provided name→id dictionary.
 */
function extractMentionIds(
  body: string,
  nameToId: Record<string, string>,
): string[] {
  const matches = body.match(/@([\w ]+)/g) ?? [];
  const ids: string[] = [];
  for (const match of matches) {
    const name = match.slice(1).trim();
    if (nameToId[name]) ids.push(nameToId[name]);
  }
  return [...new Set(ids)];
}

/**
 * Given the old and new body of an edited comment plus the full name→id map,
 * return the set of user IDs that should be stored in comment_mentions after
 * the edit.
 */
function resolveEditedMentions(
  _oldBody: string,
  newBody: string,
  nameToId: Record<string, string>,
): string[] {
  // After an edit the current mention set is derived entirely from the new body.
  // Old mention rows are deleted and replaced with the new set.
  return extractMentionIds(newBody, nameToId);
}

// ─── Self-notification prevention ───────────────────────────────────────────

function shouldNotifyMention(mentionedUserId: string, actorUserId: string): boolean {
  return mentionedUserId !== actorUserId;
}

function shouldNotifyReply(
  parentCommentAuthorId: string | null,
  actorUserId: string,
): boolean {
  if (!parentCommentAuthorId) return false;
  return parentCommentAuthorId !== actorUserId;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("mention extraction", () => {
  const nameToId: Record<string, string> = {
    "Alice": "user-alice",
    "Bob Smith": "user-bob",
    "Charlie": "user-charlie",
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
    expect(
      extractMentionIds("@Alice can you check? @Alice see above", nameToId),
    ).toHaveLength(1);
  });

  it("ignores unknown handles", () => {
    expect(extractMentionIds("@Unknown please help", nameToId)).toEqual([]);
  });

  it("returns empty array when no mentions present", () => {
    expect(extractMentionIds("No mentions here", nameToId)).toEqual([]);
  });
});

describe("edited mention synchronization", () => {
  const nameToId: Record<string, string> = {
    "Alice": "user-alice",
    "Bob": "user-bob",
  };

  it("replaces removed mentions with new ones after edit", () => {
    const result = resolveEditedMentions(
      "@Alice please review",
      "@Bob please review",
      nameToId,
    );
    expect(result).toEqual(["user-bob"]);
    expect(result).not.toContain("user-alice");
  });

  it("reflects cleared mentions when body has none", () => {
    expect(
      resolveEditedMentions("@Alice look here", "Updated without mentions", nameToId),
    ).toEqual([]);
  });

  it("adds new mentions on top of existing", () => {
    const result = resolveEditedMentions(
      "@Alice check this",
      "@Alice and @Bob check this",
      nameToId,
    );
    expect(result).toContain("user-alice");
    expect(result).toContain("user-bob");
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
