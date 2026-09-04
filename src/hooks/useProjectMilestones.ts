import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ProjectMilestone } from "@/types/domain";

export function useProjectMilestones(projectId?: string) {
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase && projectId));
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!supabase || !projectId) { setLoading(false); return; }
    const { data, error: loadError } = await supabase.from("project_milestones").select("*").eq("project_id", projectId).order("display_order");
    setMilestones((data ?? []) as ProjectMilestone[]); setError(loadError?.message ?? null); setLoading(false);
  }, [projectId]);
  useEffect(() => { void load(); }, [load]);
  async function create(title: string) { if (!supabase || !projectId) throw new Error("Supabase is not configured."); const { error: createError } = await supabase.from("project_milestones").insert({ project_id: projectId, title, display_order: milestones.length }); if (createError) throw createError; await load(); }
  async function update(id: string, input: Partial<Pick<ProjectMilestone, "title" | "description" | "status" | "due_date" | "completed_at">>) { if (!supabase) throw new Error("Supabase is not configured."); const { error: updateError } = await supabase.from("project_milestones").update({ ...input, updated_at: new Date().toISOString() }).eq("id", id); if (updateError) throw updateError; await load(); }
  async function remove(id: string) { if (!supabase) throw new Error("Supabase is not configured."); const { error: deleteError } = await supabase.from("project_milestones").delete().eq("id", id); if (deleteError) throw deleteError; await load(); }
  return { milestones, loading, error, create, update, remove };
}
