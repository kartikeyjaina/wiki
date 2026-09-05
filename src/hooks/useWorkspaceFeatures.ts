import { useCallback, useEffect, useRef, useState } from "react";
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
  const mutationRef = useRef(false);
  useEffect(() => {
    let active = true;
    if (!supabase || !entityId) { setFollowing(false); return () => { active = false; }; }
    setError(null);
    const client = supabase;
    void client.from("entity_follows").select("id").eq("entity_type", entityType).eq("entity_id", entityId).maybeSingle().then(({ data, error: loadError }) => {
      if (!active) return;
      if (loadError) setError("Follow status could not be loaded."); else setFollowing(Boolean(data));
    });
    return () => { active = false; };
  }, [entityId, entityType]);
  async function toggle() {
    if (!supabase || !entityId || mutationRef.current) return;
    mutationRef.current = true;
    setError(null);
    try {
      const result = following
        ? await supabase.from("entity_follows").delete().eq("entity_type", entityType).eq("entity_id", entityId)
        : await supabase.from("entity_follows").insert({ entity_type: entityType, entity_id: entityId });
      if (result.error) { const message = "The follow change could not be saved."; setError(message); reportActionError(message); return; }
      setFollowing(!following);
    } finally { mutationRef.current = false; }
  }
  return { following, error, toggle };
}

export function useSavedAsset(assetId?: string) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutationRef = useRef(false);
  useEffect(() => {
    let active = true;
    if (!supabase || !assetId) { setSaved(false); return () => { active = false; }; }
    setError(null);
    const client = supabase;
    void client.from("user_asset_saves").select("asset_id").eq("asset_id", assetId).maybeSingle().then(({ data, error: loadError }) => {
      if (!active) return;
      if (loadError) setError("Saved status could not be loaded."); else setSaved(Boolean(data));
    });
    return () => { active = false; };
  }, [assetId]);
  async function toggle() {
    if (!supabase || !assetId || mutationRef.current) return;
    mutationRef.current = true;
    setError(null);
    try {
      const result = saved
        ? await supabase.from("user_asset_saves").delete().eq("asset_id", assetId)
        : await supabase.from("user_asset_saves").insert({ asset_id: assetId });
      if (result.error) { const message = "The saved-asset change could not be saved."; setError(message); reportActionError(message); return; }
      setSaved(!saved);
    } finally { mutationRef.current = false; }
  }
  return { saved, error, toggle };
}
