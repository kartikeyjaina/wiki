import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useProjects } from "@/hooks/useProjects";
import { useProfile } from "@/hooks/useProfile";
import { useProjectMembers } from "@/hooks/useProjectMembers";
import { formatStatus } from "@/lib/utils";
import { CommentsPanel } from "@/components/comments/CommentsPanel";
import { ProjectStageControl } from "@/components/projects/ProjectStageControl";
import { ProjectTodoList } from "@/components/projects/ProjectTodoList";
import { ProjectMilestones } from "@/components/projects/ProjectMilestones";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import { recordActivity } from "@/lib/activity";
import { useEntityFollow, useRecentlyViewed } from "@/hooks/useWorkspaceFeatures";
import { RelationshipPanel } from "@/components/relationships/RelationshipPanel";
import { ProjectAttachments } from "@/components/projects/ProjectAttachments";
import { getProjectHealth, projectHealthLabels, isProjectTransitionAllowed } from "@/lib/project-workflow";
import { getProjectPermissions } from "@/lib/project-permissions";
import { ProjectMembers } from "@/components/projects/ProjectMembers";
import { useProjectTodos } from "@/hooks/useProjectTodos";
import { useProjectMilestones } from "@/hooks/useProjectMilestones";
import { supabase } from "@/lib/supabase";
import type { ProjectStatus, ProjectPriority } from "@/types/domain";

const PRIORITY_OPTIONS: { value: ProjectPriority; label: string }[] = [
  { value: "low",    label: "Low"    },
  { value: "medium", label: "Medium" },
  { value: "high",   label: "High"   },
  { value: "urgent", label: "Urgent" },
];

export function ProjectDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { projects, loading, update, reload } = useProjects();
  const { profile, isAdmin } = useProfile();
  const project = projects.find((item) => item.id === id);
  const { members } = useProjectMembers(project?.id ?? "");
  const { todos } = useProjectTodos(project?.id ?? "");
  const { milestones } = useProjectMilestones(project?.id);
  const { following, toggle: toggleFollowing } = useEntityFollow("project", project?.id);
  useRecentlyViewed("project", project?.id);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<ProjectPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (loading) return <p className="text-sm text-muted">Loading project...</p>;
  if (!project) return <EmptyState title="Project not found." description="Only stored projects appear here." />;

  const currentProject = project;
  const health = getProjectHealth({
    status: project.status,
    dueDate: project.due_date,
    completedTodos: todos.filter((t) => t.completed).length,
    totalTodos: todos.length,
    completedMilestones: milestones.filter((m) => m.status === "completed").length,
    totalMilestones: milestones.length,
  });
  const permissions = getProjectPermissions(project, profile, members);
  const tab =
    searchParams.get("tab") === "discussion" || searchParams.get("tab") === "todo"
      ? searchParams.get("tab")
      : "overview";

  function startEditing() {
    setTitle(currentProject.title);
    setDescription(currentProject.description ?? "");
    setPriority((currentProject.priority as ProjectPriority) ?? "medium");
    setDueDate(currentProject.due_date ?? "");
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    try {
      await update(currentProject.id, {
        title: title.trim(),
        description: description.trim(),
        priority: priority,
        due_date: dueDate || null,
      });
      await recordActivity("project", currentProject.id, "project_metadata_updated", {
        title: title.trim(),
        priority,
        due_date: dueDate || null,
      });
      setEditing(false);
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Project could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStage(nextStatus: ProjectStatus) {
    if (!supabase) return;
    // Validate on client first (fast feedback), enforce on server via RPC
    if (!isProjectTransitionAllowed(currentProject.status, nextStatus)) {
      setError(`Cannot move from ${currentProject.status} to ${nextStatus}.`);
      return;
    }
    try {
      // Use the trusted server-side workflow RPC which enforces transitions at DB level
      const { error: rpcError } = await supabase.rpc("transition_project_status", {
        p_project_id: currentProject.id,
        p_new_status: nextStatus,
      });
      if (rpcError) throw rpcError;
      await recordActivity("project", currentProject.id, "project_stage_changed", {
        from: currentProject.status,
        to: nextStatus,
      });
      await reload();
      setError(null);
    } catch (stageError) {
      setError(stageError instanceof Error ? stageError.message : "Project stage could not be updated.");
    }
  }

  return (
    <div>
      <Link to="/projects" className="mb-6 inline-block text-sm font-semibold text-muted hover:text-foreground">
        ← Projects
      </Link>

      <PageHeader
        eyebrow="Project"
        title={project.title}
        action={
          permissions.canEdit ? (
            <Button variant="secondary" onClick={startEditing}>Edit</Button>
          ) : null
        }
      />

      {/* Meta badges */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Badge>{formatStatus(project.status)}</Badge>
        <Badge>{projectHealthLabels[health]}</Badge>
        {project.priority ? <Badge className="capitalize">{project.priority}</Badge> : null}
        {project.due_date ? <Badge>Due {project.due_date}</Badge> : null}
        {project.originating_idea_id ? (
          <Link to={`/ideas/${project.originating_idea_id}`}>
            <Badge>Originating idea</Badge>
          </Link>
        ) : null}
        <Button size="sm" variant="secondary" onClick={() => void toggleFollowing()}>
          {following ? "Watching" : "Watch project"}
        </Button>
      </div>

      <ProjectStageControl
        status={project.status}
        canEdit={permissions.canEdit}
        onChange={changeStage}
      />

      {error ? (
        <p className="mt-4 rounded-md bg-[#fad9db] px-4 py-3 text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {/* Tab nav */}
      <nav className="mt-6 flex gap-1 border-b border-border" aria-label="Project sections">
        {(["overview", "discussion", "todo"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setSearchParams(item === "overview" ? {} : { tab: item })}
            className={`border-b-2 px-4 py-3 text-sm font-semibold capitalize ${
              tab === item
                ? "border-foreground text-foreground"
                : "border-transparent text-muted"
            }`}
          >
            {item}
          </button>
        ))}
      </nav>

      {/* Overview tab */}
      {tab === "overview" ? (
        <div className="mt-6 space-y-6">
          {editing ? (
            <section className="rounded-xl border border-border bg-white p-6">
              <h2 className="mb-4 font-display text-xl font-bold">Edit project</h2>
              <div className="grid gap-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold" htmlFor="proj-title">Title</label>
                  <input
                    id="proj-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 h-11 w-full rounded-md border border-border px-3"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold" htmlFor="proj-desc">Description</label>
                  <textarea
                    id="proj-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    className="mt-1 w-full rounded-md border border-border p-3"
                  />
                </div>

                {/* Priority + Due date (row) */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold" htmlFor="proj-priority">Priority</label>
                    <select
                      id="proj-priority"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as ProjectPriority)}
                      className="mt-1 h-11 w-full rounded-md border border-border px-3"
                    >
                      {PRIORITY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold" htmlFor="proj-due">Due date</label>
                    <input
                      id="proj-due"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="mt-1 h-11 w-full rounded-md border border-border px-3"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => void save()} disabled={saving}>
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                  <Button variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
                    Cancel
                  </Button>
                </div>
              </div>
            </section>
          ) : (
            <section className="rounded-xl border border-border bg-white p-6">
              <p className="whitespace-pre-wrap leading-7">
                {project.description || "No description provided."}
              </p>
            </section>
          )}

          <ProjectMembers project={project} canManage={permissions.canManageMembers} />
          <ProjectMilestones projectId={project.id} canEdit={permissions.canEdit} />
          <ProjectAttachments projectId={project.id} canEdit={permissions.canEdit} />
          <RelationshipPanel entityType="project" entityId={project.id} />
          <ActivityTimeline entityType="project" entityId={project.id} />
        </div>
      ) : null}

      {tab === "discussion" ? (
        <CommentsPanel entityType="project" entityId={project.id} />
      ) : null}

      {tab === "todo" ? (
        <ProjectTodoList projectId={project.id} canEdit={permissions.canEdit} />
      ) : null}
    </div>
  );
}
