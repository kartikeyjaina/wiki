import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ActivityEvent, EntityType } from "@/types/domain";

export function useActivity(entityType: EntityType, entityId?: string) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase && entityId));

  const load = useCallback(async () => {
    if (!supabase || !entityId) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("activity_events")
      .select("*, actor:profiles(id, display_name, role, avatar_url)")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false });
    setEvents((data ?? []) as ActivityEvent[]);
    setLoading(false);
  }, [entityId, entityType]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!supabase || !entityId) return;
    const channel = supabase
      .channel(`activity:${entityType}:${entityId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_events", filter: `entity_id=eq.${entityId}` }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [entityId, entityType, load]);

  return { events, loading, reload: load };
}
