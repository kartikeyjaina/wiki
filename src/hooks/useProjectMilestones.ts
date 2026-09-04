import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ProjectMilestone } from "@/types/domain";

export type MilestoneInput = Partial<
  Pick<
    ProjectMilestone,
    "title" | "description" | "status" | "due_date" | "completed_at" | "display_order"
  >
>;

export function useProjectMilestones(projectId?: string) {
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase && projectId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !projectId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error: loadError } = await supabase
      .from("project_milestones")
      .select("*")
      .eq("project_id", projectId)
      .order("display_order")
      .order("created_at");

    setMilestones((data ?? []) as ProjectMilestone[]);
    setError(loadError?.message ?? null);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(title: string, input: Omit<MilestoneInput, "title" | "display_order"> = {}) {
    if (!supabase || !projectId) throw new Error("Supabase is not configured.");

    const nextOrder = milestones.length
      ? Math.max(...milestones.map((item) => item.display_order)) + 1
      : 0;

    const { error: createError } = await supabase.from("project_milestones").insert({
      project_id: projectId,
      title: title.trim(),
      display_order: nextOrder,
      ...input,
    });

    if (createError) throw createError;
    await load();
  }

  async function update(id: string, input: MilestoneInput) {
    if (!supabase) throw new Error("Supabase is not configured.");

    const payload = {
      ...input,
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("project_milestones")
      .update(payload)
      .eq("id", id)
      .eq("project_id", projectId ?? "");

    if (updateError) throw updateError;
    await load();
  }

  async function move(id: string, direction: "up" | "down") {
    if (!supabase || !projectId) throw new Error("Supabase is not configured.");

    const index = milestones.findIndex((item) => item.id === id);
    if (index < 0) return;

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= milestones.length) return;

    const current = milestones[index];
    const other = milestones[swapIndex];

    const [first, second] = await Promise.all([
      supabase
        .from("project_milestones")
        .update({ display_order: other.display_order, updated_at: new Date().toISOString() })
        .eq("id", current.id)
        .eq("project_id", projectId),
      supabase
        .from("project_milestones")
        .update({ display_order: current.display_order, updated_at: new Date().toISOString() })
        .eq("id", other.id)
        .eq("project_id", projectId),
    ]);

    if (first.error) throw first.error;
    if (second.error) throw second.error;
    await load();
  }

  async function remove(id: string) {
    if (!supabase || !projectId) throw new Error("Supabase is not configured.");

    const { error: deleteError } = await supabase
      .from("project_milestones")
      .delete()
      .eq("id", id)
      .eq("project_id", projectId);

    if (deleteError) throw deleteError;
    await load();
  }

  return { milestones, loading, error, create, update, move, remove, reload: load };
}
