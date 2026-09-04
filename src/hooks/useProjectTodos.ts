import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ProjectTodo } from "@/types/domain";

export function useProjectTodos(projectId: string) {
  const [todos, setTodos] = useState<ProjectTodo[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);
  const mutationRef = useRef(false);

  const load = useCallback(async () => {
    const client = supabase;
    if (!client) { setLoading(false); return false; }
    setLoading(true);
    const { data, error: loadError } = await client.from("project_todos").select("*").eq("project_id", projectId).order("completed").order("created_at");
    if (!loadError) setTodos((data ?? []) as ProjectTodo[]);
    setError(loadError?.message ?? null);
    setLoading(false);
    return !loadError;
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  async function runMutation(action: () => Promise<void>) {
    if (mutationRef.current) throw new Error("A todo change is already in progress.");
    mutationRef.current = true;
    setError(null);
    try { await action(); }
    catch (mutationError) { setError(mutationError instanceof Error ? mutationError.message : "The todo could not be changed."); throw mutationError; }
    finally { mutationRef.current = false; }
  }

  async function create(title: string) {
    const client = supabase;
    if (!client) throw new Error("Supabase is not configured.");
    if (!title.trim()) return;
    await runMutation(async () => {
      const { error: createError } = await client.from("project_todos").insert({ project_id: projectId, title: title.trim() });
      if (createError) throw createError;
      await load();
    });
  }

  async function update(id: string, input: Partial<Pick<ProjectTodo, "title" | "completed">>) {
    const client = supabase;
    if (!client) throw new Error("Supabase is not configured.");
    await runMutation(async () => {
      const payload = { ...input, ...(input.title !== undefined ? { title: input.title.trim() } : {}), updated_at: new Date().toISOString() };
      if (input.title !== undefined && !input.title.trim()) return;
      const { error: updateError } = await client.from("project_todos").update(payload).eq("id", id).eq("project_id", projectId);
      if (updateError) throw updateError;
      await load();
    });
  }

  async function remove(id: string) {
    const client = supabase;
    if (!client) throw new Error("Supabase is not configured.");
    await runMutation(async () => {
      const { error: deleteError } = await client.from("project_todos").delete().eq("id", id).eq("project_id", projectId);
      if (deleteError) throw deleteError;
      await load();
    });
  }

  return { todos, loading, error, create, update, remove, reload: load };
}