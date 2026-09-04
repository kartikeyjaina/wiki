import { useEffect, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useProjectMembers } from "@/hooks/useProjectMembers";
import { supabase } from "@/lib/supabase";
import type { Project } from "@/types/domain";

export function ProjectMembers({ project, canManage }: { project: Project; canManage: boolean }) {
  const { members, loading, error, add, updateRole, remove } = useProjectMembers(project.id);
  const [profiles, setProfiles] = useState<{ id: string; display_name: string | null }[]>([]);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [ownerError, setOwnerError] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  const [role, setRole] = useState<"member" | "manager">("member");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client || !canManage) return;
    let cancelled = false;
    setProfilesError(null);
    void client.from("profiles").select("id, display_name").order("display_name").then(({ data, error: loadError }) => {
      if (cancelled) return;
      if (loadError) setProfilesError("Workspace members could not be loaded.");
      else setProfiles((data ?? []) as { id: string; display_name: string | null }[]);
    });
    return () => { cancelled = true; };
  }, [canManage]);

  useEffect(() => {
    const client = supabase;
    if (!client || !project.owner_id) return;
    let cancelled = false;
    setOwnerError(null);
    void client.from("profiles").select("display_name").eq("id", project.owner_id).single().then(({ data, error: loadError }) => {
      if (cancelled) return;
      if (loadError) setOwnerError("Owner details could not be loaded.");
      else setOwnerName(data?.display_name ?? null);
    });
    return () => { cancelled = true; };
  }, [project.owner_id]);

  const memberIds = new Set(members.map((m) => m.user_id));
  const eligibleProfiles = profiles.filter((p) => !memberIds.has(p.id) && p.id !== project.owner_id);
  const anyBusy = busyAction !== null;

  async function addMember() {
    if (!selected || anyBusy) return;
    setBusyAction("add"); setActionError(null);
    try { await add(selected, role); setSelected(""); }
    catch (error) { setActionError(error instanceof Error ? error.message : "This member could not be added."); }
    finally { setBusyAction(null); }
  }

  async function changeRole(userId: string, nextRole: "member" | "manager") {
    if (anyBusy) return;
    setBusyAction(`role:${userId}`); setActionError(null);
    try { await updateRole(userId, nextRole); }
    catch (error) { setActionError(error instanceof Error ? error.message : "The member role could not be changed."); }
    finally { setBusyAction(null); }
  }

  async function removeMember(userId: string, displayName: string | null) {
    if (anyBusy || !window.confirm(`Remove ${displayName ?? "this member"} from the project?`)) return;
    setBusyAction(`remove:${userId}`); setActionError(null);
    try { await remove(userId); }
    catch (error) { setActionError(error instanceof Error ? error.message : "This member could not be removed."); }
    finally { setBusyAction(null); }
  }

  const visibleError = error ?? profilesError ?? ownerError ?? actionError;

  return (
    <section className="rounded-xl border border-border bg-white p-5 sm:p-6" aria-labelledby="project-people-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="project-people-heading" className="font-display text-xl font-bold tracking-[-0.02em]">People</h2>
          <p className="mt-1 text-sm text-muted">Project owners and collaborators.</p>
        </div>
        <Badge>{members.length + (project.owner_id ? 1 : 0)} members</Badge>
      </div>

      {visibleError ? <p className="mt-4 rounded-lg border border-black/5 bg-[#FAD9DB] px-4 py-3 text-sm" role="alert">{visibleError}</p> : null}

      {canManage ? (
        <div className="mt-5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <select value={selected} onChange={(event) => setSelected(event.target.value)} aria-label="Choose a workspace member to add" disabled={anyBusy || !!profilesError} className="h-11 min-w-0 rounded-md border border-border bg-white px-3 text-sm">
            <option value="">Add a member...</option>
            {eligibleProfiles.map((p) => <option key={p.id} value={p.id}>{p.display_name ?? "Workspace member"}</option>)}
          </select>
          <select value={role} onChange={(event) => setRole(event.target.value as "member" | "manager")} aria-label="Role for new member" disabled={anyBusy} className="h-11 rounded-md border border-border bg-white px-3 text-sm">
            <option value="member">Member</option>
            <option value="manager">Manager</option>
          </select>
          <Button size="sm" disabled={!selected || anyBusy} onClick={() => void addMember()} className="h-11">
            <UserPlus className="mr-2 h-4 w-4" />
            {busyAction === "add" ? "Adding..." : "Add"}
          </Button>
        </div>
      ) : null}

      {loading ? (
        <p className="mt-5 text-sm text-muted" role="status">Loading members...</p>
      ) : (
        <ul className="mt-5 divide-y divide-border">
          {project.owner_id ? <li className="flex min-w-0 items-center justify-between gap-4 py-3"><div className="min-w-0"><p className="truncate font-semibold">{ownerName ?? "Project owner"}</p><p className="text-sm text-muted">Owner</p></div><Badge>Owner</Badge></li> : null}
          {members.length ? members.map((member) => {
            const roleBusy = busyAction === `role:${member.user_id}`;
            const removeBusy = busyAction === `remove:${member.user_id}`;
            return <li key={member.user_id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate font-semibold">{member.profile?.display_name ?? "Workspace member"}</p><p className="text-sm capitalize text-muted">{member.role}</p></div><div className="ml-auto flex shrink-0 items-center gap-1">{canManage ? <Button size="sm" variant="ghost" disabled={anyBusy} onClick={() => void changeRole(member.user_id, member.role === "manager" ? "member" : "manager")}>{roleBusy ? "Saving..." : member.role === "manager" ? "Make member" : "Make manager"}</Button> : null}{canManage ? <Button size="icon" variant="ghost" disabled={anyBusy} onClick={() => void removeMember(member.user_id, member.profile?.display_name ?? null)} aria-label={`Remove ${member.profile?.display_name ?? "member"}`}>{removeBusy ? "…" : <X className="h-4 w-4" />}</Button> : null}</div></li>;
          }) : !project.owner_id ? <li><EmptyState title="No collaborators yet." description="Add people who will help move this project forward." /></li> : <li className="py-4 text-sm text-muted">No additional collaborators yet.</li>}
        </ul>
      )}
    </section>
  );
}
