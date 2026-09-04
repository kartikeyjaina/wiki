import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Asset } from "@/types/domain";

export function useCollectionAssets(collectionId: string | undefined) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase && collectionId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !collectionId) {
      setAssets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: loadError } = await supabase
      .from("assets")
      .select("*, collection:asset_collections(id, name, slug)")
      .eq("collection_id", collectionId)
      .order("updated_at", { ascending: false });

    if (loadError) {
      setAssets([]);
      setError(loadError.message);
    } else {
      setAssets((data ?? []) as Asset[]);
    }

    setLoading(false);
  }, [collectionId]);

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