import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Idea } from "@/types/domain";

export function useIdeas() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error: loadError } = await supabase
      .from("idea_feed")
      .select("*")
      .order("created_at", { ascending: false });

    if (loadError) {
      setError(loadError.message);
      setIdeas([]);
    } else {
      setError(null);
      setIdeas((data ?? []) as Idea[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { ideas, loading, error, reload: load };
}
