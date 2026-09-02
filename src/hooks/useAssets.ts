import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Asset } from "@/types/domain";

export function useAssets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error: loadError } = await supabase
      .from("assets")
      .select("*")
      .order("updated_at", { ascending: false });

    if (loadError) {
      setError(loadError.message);
      setAssets([]);
    } else {
      setError(null);
      setAssets((data ?? []) as Asset[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { assets, loading, error, reload: load };
}
