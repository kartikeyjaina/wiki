import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Comment, EntityType } from "@/types/domain";
import { recordActivity } from "@/lib/activity";

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

    // Handle @mentions
    if (createdCommentId && mentionUserIds.length) {
      const uniqueIds = [...new Set(mentionUserIds)].filter((uid) => uid !== auth.user!.id);
      if (uniqueIds.length) {
        await supabase
          .from("comment_mentions")
          .insert(uniqueIds.map((uid) => ({ comment_id: createdCommentId, user_id: uid })));
        await supabase.from("notifications").insert(
          uniqueIds.map((uid) => ({
            user_id: uid,
            type: "mention",
            title: "You were mentioned",
            body: `You were mentioned in a ${entityType} comment.`,
            entity_type: entityType,
            entity_id: entityId,
            href: `/${entityType}s/${entityId}`,
          })),
        );
      }
    }

    // If this is a reply, notify the parent commenter (not self)
    if (parentId) {
      const parentComment = comments.find((c) => c.id === parentId);
      if (
        parentComment &&
        parentComment.author_id !== auth.user.id &&
        parentComment.author_id
      ) {
        await supabase.from("notifications").insert({
          user_id: parentComment.author_id,
          type: "reply",
          title: "Someone replied to your comment",
          body: trimmedBody.slice(0, 120),
          entity_type: entityType,
          entity_id: entityId,
          href: `/${entityType}s/${entityId}`,
        });
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

    // Synchronize mention rows: delete old ones, insert new ones
    // This keeps comment_mentions reflecting the current set of @mentions.
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      const uniqueIds = [...new Set(mentionUserIds)].filter((uid) => uid !== auth.user!.id);

      // Delete all existing mention rows for this comment
      await supabase.from("comment_mentions").delete().eq("comment_id", id);

      // Re-insert updated mention rows (no duplicate notifications for edits)
      if (uniqueIds.length) {
        await supabase
          .from("comment_mentions")
          .insert(uniqueIds.map((uid) => ({ comment_id: id, user_id: uid })));
      }
    }

    await load();
  }

  async function remove(id: string) {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error: deleteError } = await supabase.from("comments").delete().eq("id", id);
    if (deleteError) throw deleteError;
    await load();
  }

  return { comments, loading, error, create, update, remove, reload: load };
}
