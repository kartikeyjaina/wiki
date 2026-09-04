import { useEffect, useMemo, useRef, useState } from "react";
import type { Comment, EntityType } from "@/types/domain";
import { useComments } from "@/hooks/useComments";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/Button";
import { shortDate } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

// ─── Mention autocomplete hook ──────────────────────────────────────────────

function useMentionComposer(initialBody = "") {
  const [body, setBody] = useState(initialBody);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionOptions, setMentionOptions] = useState<{ id: string; display_name: string | null }[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentions, setMentions] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!supabase || mentionQuery === null) return;
    const query = mentionQuery.trim();
    if (!query) { setMentionOptions([]); return; }
    void supabase
      .from("profiles")
      .select("id, display_name")
      .ilike("display_name", `${query}%`)
      .limit(6)
      .then(({ data }) =>
        setMentionOptions((data ?? []) as { id: string; display_name: string | null }[]),
      );
  }, [mentionQuery]);

  function updateBody(value: string) {
    setBody(value);
    const match = value.match(/(?:^|\s)@([\w -]*)$/);
    setMentionQuery(match ? match[1] : null);
    setMentionIndex(0);
  }

  function chooseMention(option: { id: string; display_name: string | null }) {
    const name = option.display_name ?? "member";
    setBody((value) => value.replace(/@[\w -]*$/, `@${name} `));
    setMentions((value) => ({ ...value, [name]: option.id }));
    setMentionQuery(null);
    setMentionOptions([]);
  }

  function reset() {
    setBody("");
    setMentions({});
    setMentionQuery(null);
    setMentionOptions([]);
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    onSubmit?: () => void,
  ) {
    if (mentionQuery !== null && mentionOptions.length) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setMentionIndex((i) => Math.min(i + 1, mentionOptions.length - 1));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setMentionIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        chooseMention(mentionOptions[mentionIndex]);
        return;
      }
      if (event.key === "Escape") {
        setMentionQuery(null);
        setMentionOptions([]);
        return;
      }
    }
    if (event.key === "Escape") {
      setMentionQuery(null);
    }
  }

  return {
    body,
    mentionQuery,
    mentionOptions,
    mentionIndex,
    mentions,
    updateBody,
    chooseMention,
    handleKeyDown,
    reset,
  };
}

// ─── Mention-aware textarea ─────────────────────────────────────────────────

function MentionTextarea({
  placeholder,
  rows = 3,
  composer,
  onSubmit,
  disabled,
}: {
  placeholder: string;
  rows?: number;
  composer: ReturnType<typeof useMentionComposer>;
  onSubmit?: () => void;
  disabled?: boolean;
}) {
  const { body, mentionOptions, mentionIndex, updateBody, chooseMention, handleKeyDown } = composer;
  return (
    <div className="relative">
      <textarea
        value={body}
        onChange={(event) => updateBody(event.target.value)}
        onKeyDown={(event) => handleKeyDown(event, onSubmit)}
        rows={rows}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full rounded-md border border-border p-4 text-sm outline-none focus:border-foreground disabled:opacity-60"
      />
      {mentionOptions.length ? (
        <ul
          className="absolute bottom-3 left-3 z-10 w-64 rounded-md border border-border bg-white p-1 shadow-soft"
          role="listbox"
          aria-label="Mention suggestions"
        >
          {mentionOptions.map((option, index) => (
            <li key={option.id} role="option" aria-selected={index === mentionIndex}>
              <button
                type="button"
                className={`w-full rounded px-3 py-2 text-left text-sm ${index === mentionIndex ? "bg-surface" : ""}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  chooseMention(option);
                }}
              >
                {option.display_name ?? "Workspace member"}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// ─── Render @mentions as styled spans ──────────────────────────────────────

function renderMentions(text: string) {
  const parts = text.split(/(@\w[\w -]*\w)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="font-semibold text-foreground">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

// ─── CommentsPanel ──────────────────────────────────────────────────────────

export function CommentsPanel({ entityType, entityId }: { entityType: EntityType; entityId: string }) {
  const { comments, loading, create, update, remove, error } = useComments(entityType, entityId);
  const composer = useMentionComposer();
  const [failure, setFailure] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const roots = useMemo(() => comments.filter((comment) => !comment.parent_id), [comments]);
  const replies = useMemo(() => comments.filter((comment) => comment.parent_id), [comments]);

  async function submit(parentId?: string) {
    if (composer.body.trim().length < 2) return;
    if (submitting) return;
    setSubmitting(true);
    try {
      await create(composer.body.trim(), parentId, Object.values(composer.mentions));
      composer.reset();
      setFailure(null);
    } catch (commentError) {
      setFailure(
        commentError instanceof Error ? commentError.message : "Your comment wasn't saved.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-border bg-white p-6">
      <h2 className="font-display text-xl font-bold tracking-[-0.03em]">Discussion</h2>
      <div className="mt-5 space-y-3">
        <MentionTextarea
          placeholder="Add a comment... use @ to mention someone"
          composer={composer}
          disabled={submitting}
        />
        <Button type="button" disabled={submitting} onClick={() => void submit()}>
          {submitting ? "Posting..." : "Post comment"}
        </Button>
      </div>
      {failure || error ? (
        <p className="mt-4 rounded-md bg-[#fad9db] px-4 py-3 text-sm font-medium" role="alert">
          {failure ?? error}
        </p>
      ) : null}
      <div className="mt-6 space-y-4">
        {loading ? (
          <p className="text-sm text-muted">Loading comments...</p>
        ) : roots.length ? (
          roots.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              replies={replies.filter((reply) => reply.parent_id === comment.id)}
              onCreate={create}
              onUpdate={update}
              onDelete={remove}
            />
          ))
        ) : (
          <p className="text-sm text-muted">No comments yet.</p>
        )}
      </div>
    </section>
  );
}

// ─── CommentItem ────────────────────────────────────────────────────────────

function CommentItem({
  comment,
  replies,
  onCreate,
  onUpdate,
  onDelete,
}: {
  comment: Comment;
  replies: Comment[];
  onCreate: (body: string, parentId?: string | null, mentionIds?: string[]) => Promise<void>;
  onUpdate: (id: string, body: string, mentionIds?: string[]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const { session, isAdmin } = useProfile();
  const [editing, setEditing] = useState(false);
  const [replying, setReplying] = useState(false);
  const editComposer = useMentionComposer(comment.body);
  const replyComposer = useMentionComposer();
  const canChange = isAdmin || session?.user.id === comment.author_id;

  function startEditing() {
    editComposer.reset();
    // re-initialize with current body
    editComposer.updateBody(comment.body);
    setEditing(true);
  }

  async function saveEdit() {
    if (editComposer.body.trim().length < 2) return;
    await onUpdate(comment.id, editComposer.body.trim(), Object.values(editComposer.mentions));
    setEditing(false);
  }

  async function postReply() {
    if (replyComposer.body.trim().length < 2) return;
    await onCreate(replyComposer.body.trim(), comment.id, Object.values(replyComposer.mentions));
    replyComposer.reset();
    setReplying(false);
  }

  return (
    <article className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted">
        <span>{comment.author?.display_name ?? "Futurelab member"}</span>
        <span>{shortDate(comment.created_at)}</span>
        {comment.edited_at ? <span>(edited)</span> : null}
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <MentionTextarea
            placeholder="Edit your comment..."
            rows={3}
            composer={editComposer}
            onSubmit={() => void saveEdit()}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void saveEdit()}>Save</Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
          {renderMentions(comment.body)}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => setReplying((value) => !value)}>
          Reply
        </Button>
        {canChange ? (
          <Button size="sm" variant="ghost" onClick={startEditing}>
            Edit
          </Button>
        ) : null}
        {canChange ? (
          <Button size="sm" variant="ghost" onClick={() => void onDelete(comment.id)}>
            Delete
          </Button>
        ) : null}
      </div>

      {replying ? (
        <div className="mt-3 space-y-2">
          <MentionTextarea
            placeholder="Reply... use @ to mention someone"
            rows={2}
            composer={replyComposer}
            onSubmit={() => void postReply()}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void postReply()}>
              Post reply
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                replyComposer.reset();
                setReplying(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {replies.length ? (
        <div className="mt-4 space-y-3 border-l border-border pl-4">
          {replies.map((item) => (
            <CommentItem
              key={item.id}
              comment={item}
              replies={[]}
              onCreate={onCreate}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}
