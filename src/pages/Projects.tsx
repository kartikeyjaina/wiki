import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useIdeas } from "@/hooks/useIdeas";
import { useProjects } from "@/hooks/useProjects";
import { useProfile } from "@/hooks/useProfile";
import { formatStatus, shortDate } from "@/lib/utils";
import type { ProjectStatus } from "@/types/domain";

const statuses: { label: string; value: "all" | "active" | ProjectStatus }[] = [
  { label: "All", value: "all" }, { label: "Active", value: "active" }, { label: "Completed", value: "shipped" }, { label: "Archived", value: "archived" },
];

export function Projects() {
  const { projects, loading, error, create } = useProjects();
  const { ideas } = useIdeas();
  const { isAdmin } = useProfile();
  const [filter, setFilter] = useState<(typeof statuses)[number]["value"]>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ideaId, setIdeaId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const visible = useMemo(() => projects.filter((project) => filter === "all" || (filter === "active" ? !["shipped", "archived"].includes(project.status) : project.status === filter)), [filter, projects]);

  async function submit() {
    if (creating) return;
    if (title.trim().length < 2) { setFormError("Add a project name."); return; }
    setCreating(true); setFormError(null);
    try {
      await create({ title: title.trim(), description: description.trim(), status: "planned", originating_idea_id: ideaId || null });
      setTitle(""); setDescription(""); setIdeaId(""); setFormOpen(false);
    } catch (createError) { setFormError(createError instanceof Error ? createError.message : "Project could not be created."); }
    finally { setCreating(false); }
  }

  return <div><PageHeader eyebrow="Projects" title="Ideas can become shipped work." description="A focused view of active work and the ideas behind it." action={isAdmin ? <Button onClick={() => setFormOpen((open) => !open)}>+ New Project</Button> : null} />{formOpen ? <section className="mb-6 rounded-xl border border-border bg-white p-6"><h2 className="font-display text-xl font-bold">New project</h2><div className="mt-4 grid gap-3"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Project name" className="h-11 rounded-md border border-border px-3" disabled={creating} /><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What will this project deliver?" rows={3} className="rounded-md border border-border p-3" disabled={creating} /><select value={ideaId} onChange={(event) => setIdeaId(event.target.value)} className="h-11 rounded-md border border-border bg-white px-3" disabled={creating}><option value="">No originating idea</option>{ideas.map((idea) => <option key={idea.id} value={idea.id}>{idea.title}</option>)}</select>{formError ? <p className="text-sm text-[#b42318]" role="alert">{formError}</p> : null}<div className="flex gap-2"><Button onClick={() => void submit()} disabled={creating || !title.trim()}>{creating ? "Creating..." : "Create project"}</Button><Button variant="secondary" onClick={() => setFormOpen(false)} disabled={creating}>Cancel</Button></div></div></section> : null}<div className="mb-6 flex flex-wrap gap-2">{statuses.map((status) => <button key={status.value} type="button" onClick={() => setFilter(status.value)} className={`rounded-pill px-4 py-2 text-sm font-semibold ${filter === status.value ? "bg-foreground text-white" : "bg-surface text-muted"}`}>{status.label}</button>)}</div>{error ? <p className="mb-4 rounded-md bg-[#fad9db] px-4 py-3 text-sm" role="alert">{error}</p> : null}{loading ? <p className="text-sm text-muted">Loading projects...</p> : visible.length ? <div className="grid gap-4 md:grid-cols-2">{visible.map((project) => <Link key={project.id} to={`/projects/${project.id}`} className="rounded-xl border border-border bg-white p-5 hover:shadow-card"><div className="flex items-start justify-between gap-3"><h2 className="font-display text-xl font-bold">{project.title}</h2><Badge>{formatStatus(project.status)}</Badge></div><p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">{project.description || "No description provided."}</p><p className="mt-4 text-xs text-muted">Updated {shortDate(project.updated_at)}</p></Link>)}</div> : <EmptyState title="No projects found." description={projects.length ? "Try another status filter." : isAdmin ? "Create a project from an approved idea or start with a blank project." : "No projects are available to you yet."} />}</div>;
}
