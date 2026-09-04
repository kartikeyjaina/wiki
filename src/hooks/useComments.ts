import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Comment, EntityType } from "@/types/domain";
import { recordActivity } from "@/lib/activity";

async function notify(recipientId: string, type: string, title: string, body: string | null, entityType: EntityType, entityId: string, href: string) {
  if (!supabase) return;
  try { const { error } = await supabase.rpc("create_notification", { p_recipient_id: recipientId, p_type: type, p_title: title, p_body: body, p_entity_type: entityType, p_entity_id: entityId, p_href: href }); if (error) console.error("Notification delivery failed", error); } catch (error) { console.error("Notification delivery failed", error); }
}
async function entityHref(entityType: EntityType, entityId: string) {
  if (entityType === "wiki_page" && supabase) { const { data } = await supabase.from("wiki_pages").select("slug").eq("id", entityId).maybeSingle(); return data?.slug ? `/wiki/${data.slug}` : "/wiki"; }
  switch (entityType) { case "idea": return `/ideas/${entityId}`; case "project": return `/projects/${entityId}`; case "asset": return `/assets/${entityId}`; default: return `/${entityType}s/${entityId}`; }
}

export function useComments(entityType: EntityType, entityId?: string) {
  const [comments, setComments] = useState<Comment[]>([]); const [loading, setLoading] = useState(Boolean(supabase && entityId)); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { if (!supabase || !entityId) { setLoading(false); return; } setLoading(true); const { data, error: loadError } = await supabase.from("comments").select("*, author:profiles!comments_author_id_fkey(id, display_name, role, avatar_url)").eq("entity_type", entityType).eq("entity_id", entityId).order("created_at", { ascending: true }); setComments((data ?? []) as Comment[]); setError(loadError?.message ?? null); setLoading(false); }, [entityId, entityType]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!supabase || !entityId) return; const client = supabase; const channel = client.channel(`comments:${entityType}:${entityId}`).on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `entity_id=eq.${entityId}` }, () => void load()).subscribe(); return () => { void client.removeChannel(channel); }; }, [entityId, entityType, load]);
  async function create(body: string, parentId?: string | null, mentionUserIds: string[] = []) {
    if (!supabase || !entityId) throw new Error("Supabase is not configured."); const trimmedBody = body.trim(); if (trimmedBody.length < 2) throw new Error("Comments must be at least two characters."); const { data: auth } = await supabase.auth.getUser(); if (!auth.user) throw new Error("Sign in to comment."); const uniqueIds = [...new Set(mentionUserIds)].filter((uid) => uid !== auth.user!.id);
    const { data: createdCommentId, error: insertError } = await supabase.rpc("create_comment_with_mentions", { p_entity_type: entityType, p_entity_id: entityId, p_parent_id: parentId ?? null, p_body: trimmedBody, p_mention_user_ids: uniqueIds, p_author_id: auth.user.id }); if (insertError) throw insertError;
    const href = await entityHref(entityType, entityId); await Promise.allSettled(uniqueIds.map((uid) => notify(uid, "mention", "You were mentioned", trimmedBody.slice(0, 120), entityType, entityId, href)));
    if (parentId) { const parentComment = comments.find((c) => c.id === parentId); if (parentComment?.author_id && parentComment.author_id !== auth.user.id) await notify(parentComment.author_id, "comment_reply", "Someone replied to your comment", trimmedBody.slice(0, 120), entityType, entityId, href); }
    await recordActivity(entityType, entityId, "comment_created", { comment_id: createdCommentId, parent_id: parentId ?? null }); await load();
  }
  async function update(id: string, body: string, mentionUserIds: string[] = []) { if (!supabase) throw new Error("Supabase is not configured."); const trimmedBody = body.trim(); if (trimmedBody.length < 2) throw new Error("Comments must be at least two characters."); const { error: updateError } = await supabase.rpc("update_comment_with_mentions", { p_comment_id: id, p_body: trimmedBody, p_mention_user_ids: [...new Set(mentionUserIds)] }); if (updateError) throw updateError; await load(); }
  async function remove(id: string) { if (!supabase) throw new Error("Supabase is not configured."); const { error: deleteError } = await supabase.from("comments").delete().eq("id", id); if (deleteError) throw deleteError; await load(); }
  return { comments, loading, error, create, update, remove, reload: load };
}
