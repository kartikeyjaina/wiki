import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/domain";

export interface ProjectMember { project_id: string; user_id: string; role: "member" | "manager"; created_at: string; profile: Profile | null; }

export function useProjectMembers(projectId: string) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    const result = await supabase.from("project_members").select("project_id, user_id, role, created_at, profile:profiles!project_members_user_id_fkey(id, display_name, role, avatar_url)").eq("project_id", projectId).order("created_at");
    setMembers(((result.data ?? []) as (Omit<ProjectMember, "profile"> & { profile: Profile | Profile[] | null })[]).map((member) => ({ ...member, profile: Array.isArray(member.profile) ? member.profile[0] ?? null : member.profile })));
    setError(result.error ? "We couldn’t load project members." : null);
    setLoading(false);
  }, [projectId]);
  useEffect(() => { void load(); }, [load]);
  async function add(userId: string, role: "member" | "manager") {
    if (!supabase) throw new Error("Supabase is not configured.");
    const result = await supabase.from("project_members").insert({ project_id: projectId, user_id: userId, role });
    if (result.error) throw result.error;
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      await supabase.from("activity_events").insert({ entity_type: "project", entity_id: projectId, actor_id: auth.user.id, event_type: "project_member_added", metadata: { user_id: userId, role } });
      if (userId !== auth.user.id) await supabase.from("notifications").insert({ user_id: userId, type: "project_member_added", title: "You were added to a project", entity_type: "project", entity_id: projectId, href: `/projects/${projectId}` });
    }
    await load();
  }
  async function updateRole(userId: string, role: "member" | "manager") {
    if (!supabase) throw new Error("Supabase is not configured.");
    const result = await supabase.from("project_members").update({ role }).eq("project_id", projectId).eq("user_id", userId);
    if (result.error) throw result.error;
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      await supabase.from("activity_events").insert({ entity_type: "project", entity_id: projectId, actor_id: auth.user.id, event_type: "project_member_role_changed", metadata: { user_id: userId, role } });
      if (userId !== auth.user.id) await supabase.from("notifications").insert({ user_id: userId, type: "project_member_role_changed", title: "Your project role changed", entity_type: "project", entity_id: projectId, href: `/projects/${projectId}` });
    }
    await load();
  }
  async function remove(userId: string) {
    if (!supabase) throw new Error("Supabase is not configured.");
    const result = await supabase.from("project_members").delete().eq("project_id", projectId).eq("user_id", userId);
    if (result.error) throw result.error;
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      await supabase.from("activity_events").insert({ entity_type: "project", entity_id: projectId, actor_id: auth.user.id, event_type: "project_member_removed", metadata: { user_id: userId } });
      if (userId !== auth.user.id) await supabase.from("notifications").insert({ user_id: userId, type: "project_member_removed", title: "You were removed from a project", entity_type: "project", entity_id: projectId, href: `/projects/${projectId}` });
    }
    await load();
  }
  return { members, loading, error, add, updateRole, remove, reload: load };
}