import { supabase } from "./supabase";
import type { EntityType } from "@/types/domain";

export async function recordActivity(entityType: EntityType, entityId: string, eventType: string, metadata: Record<string, unknown> = {}) {
  if (!supabase) return;
  const { data } = await supabase.auth.getUser();
  await supabase.from("activity_events").insert({
    entity_type: entityType,
    entity_id: entityId,
    actor_id: data.user?.id ?? null,
    event_type: eventType,
    metadata,
  });
}
