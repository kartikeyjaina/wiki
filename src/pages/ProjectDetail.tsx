import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useProjects } from "@/hooks/useProjects";
import { useProfile } from "@/hooks/useProfile";
import { formatStatus } from "@/lib/utils";
import type { ProjectStatus } from "@/types/domain";

const projectStatuses: ProjectStatus[] = ["planned", "in_progress", "blocked", "shipped", "archived"];

export function ProjectDetail() {
  const { id } = useParams();
  const { projects, loading, update } = useProjects();
  const { isAdmin } = useProfile();
  const project = projects.find((item) => item.id === id);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("planned");
  const [error, setError] = useState<string | null>(null);

  if (loading) return <p className="text-sm text-muted">Loading project...</p>;
  if (!project) return <EmptyState title="Project not found." description="Only stored projects appear here." />;
  const currentProject = project;

  function startEditing() { setTitle(currentProject.title); setDescription(currentProject.description ?? ""); setStatus(currentProject.status); setEditing(true); }
  async function save() { try { await update(currentProject.id, { title: title.trim(), description: description.trim(), status }); setEditing(false); setError(null); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Project could not be updated."); } }

  return <div><Link to="/projects" className="mb-6 inline-block text-sm font-semibold text-muted hover:text-foreground">← Projects</Link><PageHeader eyebrow="Project" title={project.title} action={isAdmin ? <Button variant="secondary" onClick={startEditing}>Edit</Button> : null} /><div className="mb-6 flex flex-wrap gap-2"><Badge>{formatStatus(project.status)}</Badge>{project.originating_idea_id ? <Link to={`/ideas/${project.originating_idea_id}`}><Badge>Originating idea</Badge></Link> : null}</div>{editing ? <section className="rounded-xl border border-border bg-white p-6"><div className="grid gap-3"><input value={title} onChange={(event) => setTitle(event.target.value)} className="h-11 rounded-md border border-border px-3" /><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} className="rounded-md border border-border p-3" /><select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)} className="h-11 rounded-md border border-border bg-white px-3">{projectStatuses.map((item) => <option key={item} value={item}>{formatStatus(item)}</option>)}</select>{error ? <p className="text-sm text-[#b42318]">{error}</p> : null}<div className="flex gap-2"><Button onClick={() => void save()}>Save changes</Button><Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button></div></div></section> : <section className="rounded-xl border border-border bg-white p-6"><p className="whitespace-pre-wrap leading-7">{project.description || "No description provided."}</p></section>}</div>;
}