import { useCallback, useEffect, useState } from "react";
import type { EntityType } from "@/types/domain";
import { supabase } from "@/lib/supabase";

export interface Notification { id: string; type: string; title: string; body: string | null; href: string | null; read_at: string | null; created_at: string; }

function reportActionError(message: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("workspace-action-error", { detail: message }));
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setError(null);
    const { data, error: loadError } = await supabase.from("notifications").select("id, type, title, body, href, read_at, created_at").order("created_at", { ascending: false }).limit(20);
    if (loadError) setError("Unable to load notifications.");
    setNotifications((data ?? []) as Notification[]);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function markRead(id: string) {
    if (!supabase) return;
    setError(null);
    const readAt = new Date().toISOString();
    const { error: updateError } = await supabase.from("notifications").update({ read_at: readAt }).eq("id", id);
    if (updateError) { const message = "The notification could not be marked as read."; setError(message); reportActionError(message); return; }
    setNotifications((items) => items.map((item) => item.id === id ? { ...item, read_at: readAt } : item));
  }
  async function markAllRead() {
    if (!supabase) return;
    setError(null);
    const readAt = new Date().toISOString();
    const { error: updateError } = await supabase.from("notifications").update({ read_at: readAt }).is("read_at", null);
    if (updateError) { const message = "Notifications could not be marked as read."; setError(message); reportActionError(message); return; }
    setNotifications((items) => items.map((item) => ({ ...item, read_at: item.read_at ?? readAt })));
  }
  return { notifications, unreadCount: notifications.filter((item) => !item.read_at).length, loading, error, markRead, markAllRead, reload: load };
}

export function useEntityFollow(entityType: EntityType, entityId?: string) {
  const [following, setFollowing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!supabase || !entityId) return;
    setError(null);
    void supabase.from("entity_follows").select("id").eq("entity_type", entityType).eq("entity_id", entityId).maybeSingle().then(({ data, error: loadError }) => {
      if (loadError) setError("Follow status could not be loaded."); else setFollowing(Boolean(data));
    });
  }, [entityId, entityType]);
  async function toggle() {
    if (!supabase || !entityId) return;
    setError(null);
    const result = following
      ? await supabase.from("entity_follows").delete().eq("entity_type", entityType).eq("entity_id", entityId)
      : await supabase.from("entity_follows").insert({ entity_type: entityType, entity_id: entityId });
    if (result.error) { const message = "The follow change could not be saved."; setError(message); reportActionError(message); return; }
    setFollowing((value) => !value);
  }
  return { following, error, toggle };
}

export function useSavedAsset(assetId?: string) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!supabase || !assetId) return;
    setError(null);
    void supabase.from("user_asset_saves").select("asset_id").eq("asset_id", assetId).maybeSingle().then(({ data, error: loadError }) => {
      if (loadError) setError("Saved status could not be loaded."); else setSaved(Boolean(data));
    });
  }, [assetId]);
  async function toggle() {
    if (!supabase || !assetId) return;
    setError(null);
    const result = saved
      ? await supabase.from("user_asset_saves").delete().eq("asset_id", assetId)
      : await supabase.from("user_asset_saves").insert({ asset_id: assetId });
    if (result.error) { const message = "The saved-asset change could not be saved."; setError(message); reportActionError(message); return; }
    setSaved((value) => !value);
  }
  return { saved, error, toggle };
}

export function useRecentlyViewed(entityType: EntityType, entityId?: string) {
  useEffect(() => {
    if (!supabase || !entityId) return;
    const client = supabase;
    const timer = window.setTimeout(() => {
      void client.auth.getUser().then(({ data }) => {
        if (data.user) void client.from("recently_viewed").upsert({ user_id: data.user.id, entity_type: entityType, entity_id: entityId, last_viewed_at: new Date().toISOString() }, { onConflict: "user_id,entity_type,entity_id" });
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [entityId, entityType]);
}
