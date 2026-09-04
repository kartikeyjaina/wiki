import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ProjectTodo } from "@/types/domain";

export function useProjectTodos(projectId: string) {
  const [todos, setTodos] = useState<ProjectTodo[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data, error: loadError } = await supabase.from("project_todos").select("*").eq("project_id", projectId).order("completed").order("created_at");
    setTodos((data ?? []) as ProjectTodo[]);
    setError(loadError?.message ?? null);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  async function create(title: string) {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error: createError } = await supabase.from("project_todos").insert({ project_id: projectId, title: title.trim() });
    if (createError) throw createError;
    await load();
  }

  async function update(id: string, input: Partial<Pick<ProjectTodo, "title" | "completed">>) {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error: updateError } = await supabase.from("project_todos").update({ ...input, updated_at: new Date().toISOString() }).eq("id", id).eq("project_id", projectId);
    if (updateError) throw updateError;
    await load();
  }

  async function remove(id: string) {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error: deleteError } = await supabase.from("project_todos").delete().eq("id", id).eq("project_id", projectId);
    if (deleteError) throw deleteError;
    await load();
  }

  return { todos, loading, error, create, update, remove, reload: load };
}