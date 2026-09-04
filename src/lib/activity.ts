import { supabase } from "./supabase";
import type { EntityType } from "@/types/domain";

/**
 * Records an activity event via the trusted `record_activity` RPC.
 * Actor identity is pinned server-side to auth.uid() – the client
 * cannot spoof it.  Allowed event types are validated server-side.
 * Fails silently so activity recording never breaks the main flow.
 */
export async function recordActivity(
  entityType: EntityType,
  entityId: string,
  eventType: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.rpc("record_activity", {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_event_type: eventType,
      p_metadata: metadata,
    });
    if (error) {
      console.warn("[activity] Failed to record event:", eventType, error.message);
    }
  } catch (err) {
    console.warn("[activity] Unexpected error recording event:", eventType, err);
  }
}
