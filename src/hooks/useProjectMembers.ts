import { useCallback, useEffect, useState } from "react";
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

/** Send a notification via the trusted server-side RPC. */
async function notify(
  recipientId: string,
  type: string,
  title: string,
  body: string | null,
  projectId: string,
): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.rpc("create_notification", {
      p_recipient_id: recipientId,
      p_type: type,
      p_title: title,
      p_body: body,
      p_entity_type: "project",
      p_entity_id: projectId,
      p_href: `/projects/${projectId}`,
    });
  } catch {
    // Notification failures must not break the main operation
  }
}

export function useProjectMembers(projectId: string) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    const result = await supabase
      .from("project_members")
      .select(
        "project_id, user_id, role, created_at, profile:profiles!project_members_user_id_fkey(id, display_name, role, avatar_url)",
      )
      .eq("project_id", projectId)
      .order("created_at");
    setMembers(
      (
        (result.data ?? []) as (Omit<ProjectMember, "profile"> & {
          profile: Profile | Profile[] | null;
        })[]
      ).map((member) => ({
        ...member,
        profile: Array.isArray(member.profile)
          ? (member.profile[0] ?? null)
          : member.profile,
      })),
    );
    setError(result.error ? "We couldn't load project members." : null);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  async function add(userId: string, role: "member" | "manager") {
    if (!supabase) throw new Error("Supabase is not configured.");
    const result = await supabase
      .from("project_members")
      .insert({ project_id: projectId, user_id: userId, role });
    if (result.error) throw result.error;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single();
    const displayName = profileData?.display_name ?? null;

    await recordActivity("project", projectId, "project_member_added", {
      user_id: userId,
      role,
      display_name: displayName,
    });

    // Notify the added user via secure RPC (skips self-notification automatically)
    await notify(userId, "project_member_added", "You were added to a project", null, projectId);

    await load();
  }

  async function updateRole(userId: string, role: "member" | "manager") {
    if (!supabase) throw new Error("Supabase is not configured.");
    const result = await supabase
      .from("project_members")
      .update({ role })
      .eq("project_id", projectId)
      .eq("user_id", userId);
    if (result.error) throw result.error;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single();
    const displayName = profileData?.display_name ?? null;

    await recordActivity("project", projectId, "project_member_role_changed", {
      user_id: userId,
      role,
      display_name: displayName,
    });

    await notify(
      userId,
      "project_member_role_changed",
      "Your project role changed",
      `You are now a ${role} on this project.`,
      projectId,
    );

    await load();
  }

  async function remove(userId: string) {
    if (!supabase) throw new Error("Supabase is not configured.");

    const member = members.find((m) => m.user_id === userId);
    const displayName = member?.profile?.display_name ?? null;

    const result = await supabase
      .from("project_members")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", userId);
    if (result.error) throw result.error;

    await recordActivity("project", projectId, "project_member_removed", {
      user_id: userId,
      display_name: displayName,
    });

    await notify(
      userId,
      "project_member_removed",
      "You were removed from a project",
      null,
      projectId,
    );

    await load();
  }

  return { members, loading, error, add, updateRole, remove, reload: load };
}
