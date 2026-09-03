import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Project, ProjectStatus } from "@/types/domain";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: loadError } = await supabase.from("projects").select("*").order("updated_at", { ascending: false });
    setProjects((data ?? []) as Project[]);
    setError(loadError?.message ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function create(input: { title: string; description: string; status: ProjectStatus; originating_idea_id: string | null }) {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error: createError } = await supabase.from("projects").insert(input);
    if (createError) throw createError;
    await load();
  }

  async function update(id: string, input: Partial<Pick<Project, "title" | "description" | "status" | "originating_idea_id">>) {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error: updateError } = await supabase.from("projects").update({ ...input, updated_at: new Date().toISOString() }).eq("id", id);
    if (updateError) throw updateError;
    await load();
  }

  return { projects, loading, error, create, update, reload: load };
}