import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/domain";
import { recordActivity } from "@/lib/activity";

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: "member" | "manager";
  created_at: string;
  profile: Profile | null;
}

async function notify(recipientId: string, type: string, title: string, body: string | null, projectId: string): Promise<void> {
  const client = supabase;
  if (!client) return;
  try {
    const { error } = await client.rpc("create_notification", {
      p_recipient_id: recipientId,
      p_type: type,
      p_title: title,
      p_body: body,
      p_entity_type: "project",
      p_entity_id: projectId,
      p_href: `/projects/${projectId}`,
    });
    if (error) console.warn("[project-members] notification failed:", error.message);
  } catch (error) {
    console.warn("[project-members] notification failed:", error);
  }
}

export function useProjectMembers(projectId: string) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);
  const mutationRef = useRef(false);

  const load = useCallback(async () => {
    const client = supabase;
    if (!client) { setLoading(false); return; }
    setLoading(true);
    const result = await client
      .from("project_members")
      .select("project_id, user_id, role, created_at, profile:profiles!project_members_user_id_fkey(id, display_name, role, avatar_url)")
      .eq("project_id", projectId)
      .order("created_at");
    if (!result.error) {
      setMembers(((result.data ?? []) as (Omit<ProjectMember, "profile"> & { profile: Profile | Profile[] | null })[]).map((member) => ({
        ...member,
        profile: Array.isArray(member.profile) ? (member.profile[0] ?? null) : member.profile,
      })));
    }
    setError(result.error ? "We couldn't load project members." : null);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  async function runMutation(action: () => Promise<void>) {
    if (mutationRef.current) throw new Error("A project member change is already in progress.");
    mutationRef.current = true;
    setError(null);
    try { await action(); }
    catch (mutationError) {
      const message = mutationError instanceof Error ? mutationError.message : "The project member change failed.";
      setError(message);
      throw mutationError;
    } finally { mutationRef.current = false; }
  }

  async function add(userId: string, role: "member" | "manager") {
    const client = supabase;
    if (!client) throw new Error("Supabase is not configured.");
    await runMutation(async () => {
      const result = await client.from("project_members").insert({ project_id: projectId, user_id: userId, role });
      if (result.error) throw result.error;
      const { data: profileData } = await client.from("profiles").select("display_name").eq("id", userId).single();
      try { await recordActivity("project", projectId, "project_member_added", { user_id: userId, role, display_name: profileData?.display_name ?? null }); } catch (activityError) { console.warn("[project-members] activity failed:", activityError); }
      await notify(userId, "project_member_added", "You were added to a project", null, projectId);
      await load();
    });
  }

  async function updateRole(userId: string, role: "member" | "manager") {
    const client = supabase;
    if (!client) throw new Error("Supabase is not configured.");
    await runMutation(async () => {
      const result = await client.from("project_members").update({ role }).eq("project_id", projectId).eq("user_id", userId);
      if (result.error) throw result.error;
      const { data: profileData } = await client.from("profiles").select("display_name").eq("id", userId).single();
      try { await recordActivity("project", projectId, "project_member_role_changed", { user_id: userId, role, display_name: profileData?.display_name ?? null }); } catch (activityError) { console.warn("[project-members] activity failed:", activityError); }
      await notify(userId, "project_member_role_changed", "Your project role changed", `You are now a ${role} on this project.`, projectId);
      await load();
    });
  }

  async function remove(userId: string) {
    const client = supabase;
    if (!client) throw new Error("Supabase is not configured.");
    await runMutation(async () => {
      const member = members.find((item) => item.user_id === userId);
      const result = await client.from("project_members").delete().eq("project_id", projectId).eq("user_id", userId);
      if (result.error) throw result.error;
      try { await recordActivity("project", projectId, "project_member_removed", { user_id: userId, display_name: member?.profile?.display_name ?? null }); } catch (activityError) { console.warn("[project-members] activity failed:", activityError); }
      await notify(userId, "project_member_removed", "You were removed from a project", null, projectId);
      await load();
    });
  }

  return { members, loading, error, add, updateRole, remove, reload: load };
}
