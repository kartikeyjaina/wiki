import { useEffect, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useProjectMembers } from "@/hooks/useProjectMembers";
import { supabase } from "@/lib/supabase";
import type { Project } from "@/types/domain";

export function ProjectMembers({
  project,
  canManage,
}: {
  project: Project;
  canManage: boolean;
}) {
  const { members, loading, error, add, updateRole, remove } = useProjectMembers(project.id);
  const [profiles, setProfiles] = useState<{ id: string; display_name: string | null }[]>([]);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  const [role, setRole] = useState<"member" | "manager">("member");
  const [actionError, setActionError] = useState<string | null>(null);

  // Load all profiles for the add-member picker (owners only)
  useEffect(() => {
    if (!supabase || !canManage) return;
    void supabase
      .from("profiles")
      .select("id, display_name")
      .order("display_name")
      .then(({ data }) => setProfiles((data ?? []) as { id: string; display_name: string | null }[]));
  }, [canManage]);

  // Resolve owner display name separately
  useEffect(() => {
    if (!supabase || !project.owner_id) return;
    void supabase
      .from("profiles")
      .select("display_name")
      .eq("id", project.owner_id)
      .single()
      .then(({ data }) => setOwnerName(data?.display_name ?? null));
  }, [project.owner_id]);

  const memberIds = new Set(members.map((m) => m.user_id));

  async function addMember() {
    if (!selected) return;
    try {
      await add(selected, role);
      setSelected("");
      setActionError(null);
    } catch {
      setActionError("This member could not be added.");
    }
  }

  async function removeMember(userId: string, displayName: string | null) {
    if (!window.confirm(`Remove ${displayName ?? "this member"} from the project?`)) return;
    try {
      await remove(userId);
      setActionError(null);
    } catch {
      setActionError("This member could not be removed.");
    }
  }

  // Profiles eligible to be added (not already a member, not the owner)
  const eligibleProfiles = profiles.filter(
    (p) => !memberIds.has(p.id) && p.id !== project.owner_id,
  );

  return (
    <section className="rounded-xl border border-border bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">People</h2>
        <Badge>{members.length + (project.owner_id ? 1 : 0)} members</Badge>
      </div>

      {error || actionError ? (
        <p className="mt-3 rounded-md bg-[#fad9db] px-4 py-3 text-sm" role="alert">
          {error ?? actionError}
        </p>
      ) : null}

      {canManage ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            aria-label="Choose a workspace member to add"
            className="h-10 min-w-48 rounded-md border border-border px-3 text-sm"
          >
            <option value="">Add a member...</option>
            {eligibleProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name ?? "Workspace member"}
              </option>
            ))}
          </select>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as "member" | "manager")}
            aria-label="Role for new member"
            className="h-10 rounded-md border border-border px-3 text-sm"
          >
            <option value="member">Member</option>
            <option value="manager">Manager</option>
          </select>
          <Button size="sm" disabled={!selected} onClick={() => void addMember()}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-muted" role="status">Loading members...</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {/* Owner row */}
          {project.owner_id ? (
            <li className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-semibold">{ownerName ?? "Project owner"}</p>
                <p className="text-sm text-muted">Owner</p>
              </div>
              <Badge>Owner</Badge>
            </li>
          ) : null}

          {/* Member rows */}
          {members.length ? (
            members.map((member) => (
              <li key={member.user_id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {member.profile?.display_name ?? "Workspace member"}
                  </p>
                  <p className="text-sm text-muted capitalize">{member.role}</p>
                </div>
                <div className="flex items-center gap-1">
                  {canManage ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void updateRole(
                          member.user_id,
                          member.role === "manager" ? "member" : "manager",
                        )
                      }
                    >
                      {member.role === "manager" ? "Make member" : "Make manager"}
                    </Button>
                  ) : null}
                  {canManage ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        void removeMember(member.user_id, member.profile?.display_name ?? null)
                      }
                      aria-label={`Remove ${member.profile?.display_name ?? "member"}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </li>
            ))
          ) : !project.owner_id ? (
            <li>
              <EmptyState
                title="No collaborators yet."
                description="Add people who will help move this project forward."
              />
            </li>
          ) : null}

          {/* Empty members (owner exists but no other members) */}
          {members.length === 0 && project.owner_id ? (
            <li className="py-4 text-sm text-muted">No additional collaborators yet.</li>
          ) : null}
        </ul>
      )}
    </section>
  );
}
