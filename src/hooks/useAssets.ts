import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Asset } from "@/types/domain";

interface UseAssetsOptions {
  limit?: number;
  collectionId?: string;
}

export function useAssets(options: UseAssetsOptions = {}) {
  const { limit, collectionId } = options;

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let query = supabase
      .from("assets")
      .select("*, collection:asset_collections(id, name, slug)")
      .order("updated_at", { ascending: false });

    if (collectionId) {
      query = query.eq("collection_id", collectionId);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error: loadError } = await query;

    if (loadError) {
      setAssets([]);
      setError(loadError.message);
      setLoading(false);
      return;
    }

    setAssets((data ?? []) as Asset[]);
    setLoading(false);
  }, [collectionId, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    assets,
    loading,
    error,
    reload: load,
  };
}