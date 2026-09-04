import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ProjectMilestone } from "@/types/domain";

export type MilestoneInput = Partial<Pick<ProjectMilestone, "title" | "description" | "status" | "due_date" | "completed_at" | "display_order">>;

export function useProjectMilestones(projectId?: string) {
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase && projectId));
  const [error, setError] = useState<string | null>(null);
  const mutationRef = useRef(false);

  const load = useCallback(async () => {
    if (!supabase || !projectId) { setLoading(false); return; }
    setLoading(true);
    const { data, error: loadError } = await supabase.from("project_milestones").select("*").eq("project_id", projectId).order("display_order").order("created_at");
    if (!loadError) setMilestones((data ?? []) as ProjectMilestone[]);
    setError(loadError?.message ?? null);
    setLoading(false);
  }, [projectId]);
  useEffect(() => { void load(); }, [load]);

  async function runMutation(action: () => Promise<void>) {
    if (mutationRef.current) throw new Error("A milestone change is already in progress.");
    mutationRef.current = true;
    setError(null);
    try { await action(); } catch (mutationError) { setError(mutationError instanceof Error ? mutationError.message : "The milestone could not be changed."); throw mutationError; }
    finally { mutationRef.current = false; }
  }

  async function create(title: string, input: Omit<MilestoneInput, "title" | "display_order"> = {}) {
    if (!supabase || !projectId) throw new Error("Supabase is not configured.");
    await runMutation(async () => {
      const { error: createError } = await supabase.rpc("create_project_milestone", {
        p_project_id: projectId,
        p_title: title.trim(),
        p_description: input.description ?? null,
        p_status: input.status ?? null,
        p_due_date: input.due_date ?? null,
        p_completed_at: input.completed_at ?? null,
      });
      if (createError) throw createError;
      await load();
    });
  }

  async function update(id: string, input: MilestoneInput) {
    if (!supabase) throw new Error("Supabase is not configured.");
    await runMutation(async () => {
      const payload = { ...input, ...(input.title !== undefined ? { title: input.title.trim() } : {}), updated_at: new Date().toISOString() };
      const { error: updateError } = await supabase.from("project_milestones").update(payload).eq("id", id).eq("project_id", projectId ?? "");
      if (updateError) throw updateError;
      await load();
    });
  }

  async function move(id: string, direction: "up" | "down") {
    if (!supabase || !projectId) throw new Error("Supabase is not configured.");
    const index = milestones.findIndex((item) => item.id === id); const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || swapIndex < 0 || swapIndex >= milestones.length) return;
    const current = milestones[index]; const other = milestones[swapIndex];
    await runMutation(async () => {
      const { error: moveError } = await supabase.rpc("swap_project_milestones", { p_project_id: projectId, p_current_id: current.id, p_other_id: other.id, p_actor_id: null });
      if (moveError) throw moveError;
      await load();
    });
  }

  async function remove(id: string) {
    if (!supabase || !projectId) throw new Error("Supabase is not configured.");
    await runMutation(async () => {
      const { error: deleteError } = await supabase.from("project_milestones").delete().eq("id", id).eq("project_id", projectId);
      if (deleteError) throw deleteError;
      await load();
    });
  }

  return { milestones, loading, error, create, update, move, remove, reload: load };
}
