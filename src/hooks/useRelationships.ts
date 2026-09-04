import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { EntityRelationship, EntityType } from "@/types/domain";

export function useRelationships(entityType: EntityType, entityId?: string) {
  const [relationships, setRelationships] = useState<EntityRelationship[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase && entityId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !entityId) {
      setLoading(false);
      return;
    }
    const { data, error: loadError } = await supabase.rpc("entity_relationship_details", { entity_type_input: entityType, entity_id_input: entityId });
    setRelationships((data ?? []) as EntityRelationship[]);
    setError(loadError?.message ?? null);
    setLoading(false);
  }, [entityId, entityType]);

  useEffect(() => {
    void load();
  }, [load]);

  return { relationships, loading, error, reload: load };
}
