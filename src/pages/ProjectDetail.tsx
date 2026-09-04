import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useProjects } from "@/hooks/useProjects";
import { useProfile } from "@/hooks/useProfile";
import { formatStatus } from "@/lib/utils";
import { CommentsPanel } from "@/components/comments/CommentsPanel";
import { ProjectStageControl } from "@/components/projects/ProjectStageControl";
import { ProjectTodoList } from "@/components/projects/ProjectTodoList";
import { ProjectMilestones } from "@/components/projects/ProjectMilestones";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import { recordActivity } from "@/lib/activity";
import { useEntityFollow, useRecentlyViewed } from "@/hooks/useWorkspaceFeatures";

export function ProjectDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { projects, loading, update } = useProjects();
  const { isAdmin } = useProfile();
  const project = projects.find((item) => item.id === id);
  const { following, toggle: toggleFollowing } = useEntityFollow("project", project?.id);
  useRecentlyViewed("project", project?.id);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (loading) return <p className="text-sm text-muted">Loading project...</p>;
  if (!project) return <EmptyState title="Project not found." description="Only stored projects appear here." />;
  const currentProject = project;
  const tab = searchParams.get("tab") === "discussion" || searchParams.get("tab") === "todo" ? searchParams.get("tab") : "overview";
  function startEditing() { setTitle(currentProject.title); setDescription(currentProject.description ?? ""); setEditing(true); }
  async function save() { try { await update(currentProject.id, { title: title.trim(), description: description.trim() }); setEditing(false); setError(null); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Project could not be updated."); } }
  async function changeStage(nextStatus: typeof currentProject.status) { try { await update(currentProject.id, { status: nextStatus }); await recordActivity("project", currentProject.id, "project_stage_changed", { from: currentProject.status, to: nextStatus }); setError(null); } catch (stageError) { setError(stageError instanceof Error ? stageError.message : "Project stage could not be updated."); } }
  return <div>
    <Link to="/projects" className="mb-6 inline-block text-sm font-semibold text-muted hover:text-foreground">← Projects</Link>
    <PageHeader eyebrow="Project" title={project.title} action={isAdmin ? <Button variant="secondary" onClick={startEditing}>Edit</Button> : null} />
    <div className="mb-6 flex flex-wrap gap-2"><Badge>{formatStatus(project.status)}</Badge>{project.priority ? <Badge>{project.priority}</Badge> : null}{project.due_date ? <Badge>Due {project.due_date}</Badge> : null}{project.originating_idea_id ? <Link to={`/ideas/${project.originating_idea_id}`}><Badge>Originating idea</Badge></Link> : null}<Button size="sm" variant="secondary" onClick={() => void toggleFollowing()}>{following ? "Watching" : "Watch project"}</Button></div>
    <ProjectStageControl status={project.status} canEdit={isAdmin} onChange={changeStage} />
    {error ? <p className="mt-4 rounded-md bg-[#fad9db] px-4 py-3 text-sm" role="alert">{error}</p> : null}
    <nav className="mt-6 flex gap-1 border-b border-border" aria-label="Project sections">{(["overview", "discussion", "todo"] as const).map((item) => <button key={item} type="button" onClick={() => setSearchParams(item === "overview" ? {} : { tab: item })} className={`border-b-2 px-4 py-3 text-sm font-semibold capitalize ${tab === item ? "border-foreground text-foreground" : "border-transparent text-muted"}`}>{item}</button>)}</nav>
    {tab === "overview" ? <div className="mt-6 space-y-6">{editing ? <section className="rounded-xl border border-border bg-white p-6"><div className="grid gap-3"><input value={title} onChange={(event) => setTitle(event.target.value)} className="h-11 rounded-md border border-border px-3" /><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} className="rounded-md border border-border p-3" /><div className="flex gap-2"><Button onClick={() => void save()}>Save changes</Button><Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button></div></div></section> : <section className="rounded-xl border border-border bg-white p-6"><p className="whitespace-pre-wrap leading-7">{project.description || "No description provided."}</p></section>}<ProjectMilestones projectId={project.id} canEdit={isAdmin} /><ActivityTimeline entityType="project" entityId={project.id} /></div> : null}
    {tab === "discussion" ? <CommentsPanel entityType="project" entityId={project.id} /> : null}
    {tab === "todo" ? <ProjectTodoList projectId={project.id} canEdit={isAdmin} /> : null}
  </div>;
}
