import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useTable<T>(table: string, orderColumn = "updated_at", ascending = false) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: loadError } = await supabase.from(table).select("*").order(orderColumn, { ascending });
    setRows((data ?? []) as T[]);
    setError(loadError?.message ?? null);
    setLoading(false);
  }, [ascending, orderColumn, table]);

  useEffect(() => {
    void load();
  }, [load]);

  return { rows, loading, error, reload: load };
}
