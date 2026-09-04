import { Link, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/domain";
import { Badge } from "@/components/ui/Badge";

export function People() {
  const { id } = useParams();
  const [people, setPeople] = useState<Profile[]>([]);
  const [person, setPerson] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<{ id: string; title: string; status: string }[]>([]);
  const [ideas, setIdeas] = useState<{ id: string; title: string; status: string }[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!supabase) { setLoading(false); return; } const client = supabase; void (async () => { const profileResult = await client.from("profiles").select("id, display_name, role, avatar_url").order("display_name"); if (profileResult.error) { setError(profileResult.error.message); setLoading(false); return; } setPeople((profileResult.data ?? []) as Profile[]); if (id) { const selected = (profileResult.data ?? []).find((item) => item.id === id) as Profile | undefined; setPerson(selected ?? null); const [projectResult, ideaResult] = await Promise.all([client.from("projects").select("id, title, status").eq("owner_id", id), client.from("ideas").select("id, title, status").eq("author_id", id)]); setProjects((projectResult.data ?? []) as { id: string; title: string; status: string }[]); setIdeas((ideaResult.data ?? []) as { id: string; title: string; status: string }[]); } setLoading(false); })(); }, [id]);
  if (id) return <div><Link to="/people" className="text-sm font-semibold text-muted hover:text-foreground">← People</Link>{loading ? <p className="mt-8 text-sm text-muted" role="status">Loading profile...</p> : person ? <><PageHeader eyebrow="People" title={person.display_name ?? "Futurelab member"} description={person.role ?? "Workspace member"} /><div className="grid gap-6 md:grid-cols-2"><section className="rounded-xl border border-border bg-white p-6"><h2 className="font-display text-xl font-bold">Projects</h2>{projects.length ? <ul className="mt-4 space-y-3">{projects.map((project) => <li key={project.id}><Link to={`/projects/${project.id}`} className="font-semibold hover:underline">{project.title}</Link><span className="ml-2 text-xs text-muted">{project.status.replace("_", " ")}</span></li>)}</ul> : <p className="mt-4 text-sm text-muted">No owned projects yet.</p>}</section><section className="rounded-xl border border-border bg-white p-6"><h2 className="font-display text-xl font-bold">Ideas</h2>{ideas.length ? <ul className="mt-4 space-y-3">{ideas.map((idea) => <li key={idea.id}><Link to={`/ideas/${idea.id}`} className="font-semibold hover:underline">{idea.title}</Link><span className="ml-2 text-xs text-muted">{idea.status.replace("_", " ")}</span></li>)}</ul> : <p className="mt-4 text-sm text-muted">No ideas yet.</p>}</section></div></> : <EmptyState title="Person not found." description="This workspace member may no longer be available." />}</div>;
  return (
    <div>
      <PageHeader eyebrow="People" title="Profiles are managed in the workspace." description="This legacy route is no longer part of the primary workspace." />
      {error ? <p className="rounded-md bg-[#fad9db] px-4 py-3 text-sm" role="alert">We couldn’t load the people directory: {error}</p> : loading ? <p className="text-sm text-muted" role="status">Loading people...</p> : people.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{people.map((person) => <Link to={`/people/${person.id}`} key={person.id} className="rounded-xl border border-border bg-white p-5 transition hover:shadow-card"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-full bg-surface font-display font-bold">{(person.display_name ?? "?").slice(0, 1).toUpperCase()}</div><div className="min-w-0"><h2 className="truncate font-display text-lg font-bold">{person.display_name ?? "Futurelab member"}</h2><Badge className="mt-1">{person.role ?? "member"}</Badge></div></div></Link>)}</div> : <EmptyState title="No profiles visible." description="Profiles appear here as authenticated workspace members join." />}
    </div>
  );
}
