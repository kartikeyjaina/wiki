import type { Profile, Project } from "@/types/domain";
import type { ProjectMember } from "@/hooks/useProjectMembers";

export function getProjectPermissions(project: Project, profile: Profile | null, members: ProjectMember[]) {
  const isAdmin = profile?.role === "admin";
  const isOwner = Boolean(profile?.id && project.owner_id === profile.id);
  const membership = members.find((member) => member.user_id === profile?.id);
  const isManager = membership?.role === "manager";
  return { isAdmin, isOwner, isManager, canEdit: isAdmin || isOwner || isManager, canManageMembers: isAdmin || isOwner, canView: true };
}