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

  useEffect(() => {
    if (!supabase || !entityId) return;
    const client = supabase;
    const channel = client
      .channel(`comments:${entityType}:${entityId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `entity_id=eq.${entityId}` }, () => void load())
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [entityId, entityType, load]);

  async function create(body: string, parentId?: string | null) {
    if (!supabase || !entityId) throw new Error("Supabase is not configured.");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Sign in to comment.");
    const { error: insertError } = await supabase.from("comments").insert({
      entity_type: entityType,
      entity_id: entityId,
      parent_id: parentId ?? null,
      author_id: auth.user.id,
      body,
    });
    if (insertError) throw insertError;
    await recordActivity(entityType, entityId, "comment_created", { parent_id: parentId ?? null });
    await load();
  }

  async function update(id: string, body: string) {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error: updateError } = await supabase.from("comments").update({ body, edited_at: new Date().toISOString() }).eq("id", id);
    if (updateError) throw updateError;
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
