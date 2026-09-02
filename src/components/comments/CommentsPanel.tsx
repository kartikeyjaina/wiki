import { useMemo, useState } from "react";
import type { Comment, EntityType } from "@/types/domain";
import { useComments } from "@/hooks/useComments";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/Button";
import { shortDate } from "@/lib/utils";

export function CommentsPanel({ entityType, entityId }: { entityType: EntityType; entityId: string }) {
  const { comments, create, update, remove, error } = useComments(entityType, entityId);
  const [body, setBody] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const roots = useMemo(() => comments.filter((comment) => !comment.parent_id), [comments]);
  const replies = useMemo(() => comments.filter((comment) => comment.parent_id), [comments]);

  async function submit(parentId?: string) {
    if (body.trim().length < 2) return;
    try {
      await create(body.trim(), parentId);
      setBody("");
      setFailure(null);
    } catch (commentError) {
      setFailure(commentError instanceof Error ? commentError.message : "Your comment wasn't saved.");
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-border bg-white p-6">
      <h2 className="font-display text-xl font-bold tracking-[-0.03em]">Discussion</h2>
      <div className="mt-5 space-y-3">
        <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={3} className="w-full rounded-md border border-border p-4 text-sm outline-none focus:border-foreground" placeholder="Add a comment..." />
        <Button type="button" onClick={() => void submit()}>Post comment</Button>
      </div>
      {failure || error ? <p className="mt-4 rounded-md bg-[#fad9db] px-4 py-3 text-sm font-medium" role="alert">{failure ?? error}</p> : null}
      <div className="mt-6 space-y-4">
        {roots.length ? roots.map((comment) => <CommentItem key={comment.id} comment={comment} replies={replies.filter((reply) => reply.parent_id === comment.id)} onReply={create} onUpdate={update} onDelete={remove} />) : <p className="text-sm text-muted">No comments yet.</p>}
      </div>
    </section>
  );
}

function CommentItem({ comment, replies, onReply, onUpdate, onDelete }: { comment: Comment; replies: Comment[]; onReply: (body: string, parentId?: string | null) => Promise<void>; onUpdate: (id: string, body: string) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const { session, isAdmin } = useProfile();
  const [editing, setEditing] = useState(false);
  const [replying, setReplying] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [reply, setReply] = useState("");
  const canChange = isAdmin || session?.user.id === comment.author_id;

  return (
    <article className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted">
        <span>{comment.author?.display_name ?? "Futurelab member"}</span>
        <span>{shortDate(comment.created_at)}</span>
        {comment.edited_at ? <span>edited</span> : null}
      </div>
      {editing ? (
        <div className="mt-3 space-y-2">
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} className="w-full rounded-md border border-border p-3 text-sm outline-none focus:border-foreground" />
          <div className="flex gap-2"><Button size="sm" onClick={() => void onUpdate(comment.id, draft).then(() => setEditing(false))}>Save</Button><Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button></div>
        </div>
      ) : (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">{comment.body}</p>
      )}
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => setReplying((value) => !value)}>Reply</Button>
        {canChange ? <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button> : null}
        {canChange ? <Button size="sm" variant="ghost" onClick={() => void onDelete(comment.id)}>Delete</Button> : null}
      </div>
      {replying ? <div className="mt-3 space-y-2"><textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={2} className="w-full rounded-md border border-border p-3 text-sm outline-none focus:border-foreground" /><Button size="sm" onClick={() => void onReply(reply, comment.id).then(() => { setReply(""); setReplying(false); })}>Post reply</Button></div> : null}
      {replies.length ? <div className="mt-4 space-y-3 border-l border-border pl-4">{replies.map((item) => <CommentItem key={item.id} comment={item} replies={[]} onReply={onReply} onUpdate={onUpdate} onDelete={onDelete} />)}</div> : null}
    </article>
  );
}
