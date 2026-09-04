import { useCallback, useEffect, useState } from "react";
import type { EntityType } from "@/types/domain";
import { supabase } from "@/lib/supabase";

export interface Notification { id: string; type: string; title: string; body: string | null; href: string | null; read_at: string | null; created_at: string; }

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    const { data, error } = await supabase.from("notifications").select("id, type, title, body, href, read_at, created_at").order("created_at", { ascending: false }).limit(20);
    if (error) console.error("Unable to load notifications", error);
    setNotifications((data ?? []) as Notification[]); setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function markRead(id: string) { if (!supabase) return; await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id); setNotifications((items) => items.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item)); }
  async function markAllRead() { if (!supabase) return; await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null); setNotifications((items) => items.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() }))); }
  return { notifications, unreadCount: notifications.filter((item) => !item.read_at).length, loading, markRead, markAllRead, reload: load };
}

export function useEntityFollow(entityType: EntityType, entityId?: string) {
  const [following, setFollowing] = useState(false);
  useEffect(() => { if (!supabase || !entityId) return; void supabase.from("entity_follows").select("id").eq("entity_type", entityType).eq("entity_id", entityId).maybeSingle().then(({ data }) => setFollowing(Boolean(data))); }, [entityId, entityType]);
  async function toggle() { if (!supabase || !entityId) return; const result = following ? await supabase.from("entity_follows").delete().eq("entity_type", entityType).eq("entity_id", entityId) : await supabase.from("entity_follows").insert({ entity_type: entityType, entity_id: entityId }); if (!result.error) setFollowing((value) => !value); }
  return { following, toggle };
}

export function useSavedAsset(assetId?: string) {
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (!supabase || !assetId) return; void supabase.from("user_asset_saves").select("asset_id").eq("asset_id", assetId).maybeSingle().then(({ data }) => setSaved(Boolean(data))); }, [assetId]);
  async function toggle() { if (!supabase || !assetId) return; const result = saved ? await supabase.from("user_asset_saves").delete().eq("asset_id", assetId) : await supabase.from("user_asset_saves").insert({ asset_id: assetId }); if (!result.error) setSaved((value) => !value); }
  return { saved, toggle };
}

export function useRecentlyViewed(entityType: EntityType, entityId?: string) {
  useEffect(() => { if (!supabase || !entityId) return; const client = supabase; const timer = window.setTimeout(() => { void client.auth.getUser().then(({ data }) => { if (data.user) void client.from("recently_viewed").upsert({ user_id: data.user.id, entity_type: entityType, entity_id: entityId, last_viewed_at: new Date().toISOString() }, { onConflict: "user_id,entity_type,entity_id" }); }); }, 700); return () => window.clearTimeout(timer); }, [entityId, entityType]);
}
