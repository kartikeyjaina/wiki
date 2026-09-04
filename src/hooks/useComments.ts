import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Comment, EntityType } from "@/types/domain";
import { recordActivity } from "@/lib/activity";

/**
 * Send a notification via the trusted server-side RPC.
 * Prevents direct client inserts into the notifications table.
 * Self-notification is silently skipped by the RPC.
 */
async function notify(
  recipientId: string,
  type: string,
  title: string,
  body: string | null,
  entityType: EntityType,
  entityId: string,
  href: string,
): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.rpc("create_notification", {
      p_recipient_id: recipientId,
      p_type: type,
      p_title: title,
      p_body: body,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_href: href,
    });
  } catch {
    // Notification failures must never break the main comment flow
  }
}

/** Build a valid entity href for comments. */
function entityHref(entityType: EntityType, entityId: string): string {
  switch (entityType) {
    case "idea":    return `/ideas/${entityId}`;
    case "project": return `/projects/${entityId}`;
    case "asset":   return `/assets/${entityId}`;
    default:        return `/${entityType}s/${entityId}`;
  }
}

export function useComments(entityType: EntityType, entityId?: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase && entityId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !entityId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from("comments")
      .select(`
        *,
        author:profiles!comments_author_id_fkey(
          id,
          display_name,
          role,
          avatar_url
        )
      `)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: true });
    setComments((data ?? []) as Comment[]);
    setError(loadError?.message ?? null);
    setLoading(false);
  }, [entityId, entityType]);

  useEffect(() => {
    void load();
  }, [load]);

  // Real-time subscription
  useEffect(() => {
    if (!supabase || !entityId) return;
    const client = supabase;
    const channel = client
      .channel(`comments:${entityType}:${entityId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `entity_id=eq.${entityId}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [entityId, entityType, load]);

  async function create(
    body: string,
    parentId?: string | null,
    mentionUserIds: string[] = [],
  ) {
    if (!supabase || !entityId) throw new Error("Supabase is not configured.");
    const trimmedBody = body.trim();
    if (trimmedBody.length < 2) throw new Error("Comments must be at least two characters.");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Sign in to comment.");

    const { data: createdComment, error: insertError } = await supabase
      .from("comments")
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        parent_id: parentId ?? null,
        author_id: auth.user.id,
        body: trimmedBody,
      })
      .select("id")
      .single();

    if (insertError) throw insertError;
    const createdCommentId = createdComment.id;

    const href = entityHref(entityType, entityId);

    // Handle @mentions – notify each mentioned user via secure RPC
    if (createdCommentId && mentionUserIds.length) {
      const uniqueIds = [...new Set(mentionUserIds)].filter((uid) => uid !== auth.user!.id);
      if (uniqueIds.length) {
        // Insert mention rows (DB policy already enforces author_id = auth.uid())
        await supabase
          .from("comment_mentions")
          .insert(uniqueIds.map((uid) => ({ comment_id: createdCommentId, user_id: uid })));

        // Notify via trusted RPC (self-notification silently skipped server-side)
        await Promise.allSettled(
          uniqueIds.map((uid) =>
            notify(
              uid,
              "mention",
              "You were mentioned",
              trimmedBody.slice(0, 120),
              entityType,
              entityId,
              href,
            ),
          ),
        );
      }
    }

    // Reply notification: notify parent comment author (not self)
    if (parentId) {
      const parentComment = comments.find((c) => c.id === parentId);
      if (parentComment?.author_id && parentComment.author_id !== auth.user.id) {
        await notify(
          parentComment.author_id,
          "comment_reply",
          "Someone replied to your comment",
          trimmedBody.slice(0, 120),
          entityType,
          entityId,
          href,
        );
      }
    }

    await recordActivity(entityType, entityId, "comment_created", {
      parent_id: parentId ?? null,
    });
    await load();
  }

  async function update(id: string, body: string, mentionUserIds: string[] = []) {
    if (!supabase) throw new Error("Supabase is not configured.");
    const trimmedBody = body.trim();
    if (trimmedBody.length < 2) throw new Error("Comments must be at least two characters.");

    const { error: updateError } = await supabase
      .from("comments")
      .update({ body: trimmedBody, edited_at: new Date().toISOString() })
      .eq("id", id);
    if (updateError) throw updateError;

    // Synchronize mention rows: delete old, insert new set derived from edited body
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      const uniqueIds = [...new Set(mentionUserIds)].filter((uid) => uid !== auth.user!.id);

      await supabase.from("comment_mentions").delete().eq("comment_id", id);

      if (uniqueIds.length) {
        await supabase
          .from("comment_mentions")
          .insert(uniqueIds.map((uid) => ({ comment_id: id, user_id: uid })));
        // Do NOT re-notify on edits to avoid spam
      }
    }

    await load();
  }

  async function remove(id: string) {
    if (!supabase) throw new Error("Supabase is not configured.");
    // comment_mentions cascade-deletes via FK
    const { error: deleteError } = await supabase.from("comments").delete().eq("id", id);
    if (deleteError) throw deleteError;
    await load();
  }

  return { comments, loading, error, create, update, remove, reload: load };
}
