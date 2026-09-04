import { useEffect, useState, type ComponentType } from "react";
import { Link, useParams } from "react-router-dom";
import { Activity, FolderKanban, Lightbulb, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/domain";
import { formatStatus, shortDate } from "@/lib/utils";

interface PersonProject { id: string; title: string; status: string; updated_at: string; }
interface PersonMembership { project_id: string; role: string; project: PersonProject | null; }
interface PersonIdea { id: string; title: string; status: string; created_at: string; }
interface PersonActivity { id: string; event_type: string; entity_type: string; entity_id: string; created_at: string; }

function activityLabel(event: PersonActivity) {
  return event.event_type.replaceAll("_", " ");
}

export function People() {
  const { id } = useParams();
  const [people, setPeople] = useState<Profile[]>([]);
  const [person, setPerson] = useState<Profile | null>(null);
  const [ownedProjects, setOwnedProjects] = useState<PersonProject[]>([]);
  const [memberships, setMemberships] = useState<PersonMembership[]>([]);
  const [ideas, setIdeas] = useState<PersonIdea[]>([]);
  const [activity, setActivity] = useState<PersonActivity[]>([]);
  const [stats, setStats] = useState({ comments: 0, assets: 0, projects: 0, ideas: 0 });
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const client = supabase;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        if (id) {
          const [profileResult, projectResult, memberResult, ideaResult, activityResult, commentsCount, assetsCount] = await Promise.all([
            client.from("profiles").select("id, display_name, role, avatar_url").eq("id", id).single(),
            client.from("projects").select("id, title, status, updated_at").eq("owner_id", id).order("updated_at", { ascending: false }).limit(12),
            client.from("project_members").select("project_id, role, project:projects!project_members_project_id_fkey(id, title, status, updated_at)").eq("user_id", id).limit(12),
            client.from("ideas").select("id, title, status, created_at").eq("author_id", id).order("created_at", { ascending: false }).limit(12),
            client.from("activity_events").select("id, event_type, entity_type, entity_id, created_at").eq("actor_id", id).order("created_at", { ascending: false }).limit(10),
            client.from("comments").select("id", { count: "exact", head: true }).eq("author_id", id),
            client.from("assets").select("id", { count: "exact", head: true }).eq("owner_id", id),
          ]);

          if (profileResult.error) throw profileResult.error;

          const membershipsData = ((memberResult.data ?? []) as (Omit<PersonMembership, "project"> & {
            project: PersonProject | PersonProject[] | null;
          })[]).map((m) => ({
            ...m,
            project: Array.isArray(m.project) ? (m.project[0] ?? null) : m.project,
          }));

          setPerson((profileResult.data as Profile) ?? null);
          setOwnedProjects((projectResult.data ?? []) as PersonProject[]);
          setMemberships(membershipsData);
          setIdeas((ideaResult.data ?? []) as PersonIdea[]);
          setActivity((activityResult.data ?? []) as PersonActivity[]);
          setStats({
            comments: commentsCount.count ?? 0,
            assets: assetsCount.count ?? 0,
            projects: projectResult.data?.length ?? 0,
            ideas: ideaResult.data?.length ?? 0,
          });
        } else {
          const profileResult = await client
            .from("profiles")
            .select("id, display_name, role, avatar_url")
            .order("display_name");
          if (profileResult.error) throw profileResult.error;
          setPeople((profileResult.data ?? []) as Profile[]);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "People could not be loaded.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (id) {
    return (
      <div>
        <Link to="/people" className="text-sm font-semibold text-muted hover:text-foreground">← People</Link>

        {loading ? (
          <div className="mt-8 space-y-4">
            <Skeleton className="h-10 w-80" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error ? (
          <p className="mt-6 rounded-md bg-[#fad9db] px-4 py-3 text-sm" role="alert">{error}</p>
        ) : person ? (
          <>
            <PageHeader
              eyebrow="People"
              title={person.display_name ?? "Futurelab member"}
              description={person.role ? formatStatus(person.role) : "Workspace member"}
            />

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
  {[
    { Icon: FolderKanban, label: "Owned projects", value: stats.projects },
    { Icon: Lightbulb, label: "Ideas", value: stats.ideas },
    { Icon: Users, label: "Comments", value: stats.comments },
    { Icon: Activity, label: "Assets", value: stats.assets },
  ].map(({ Icon, label, value }) => (
    <div key={label} className="rounded-xl border border-border bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
          {label}
        </span>
        <Icon className="h-4 w-4 text-muted" />
      </div>
      <p className="mt-3 font-display text-2xl font-bold">{value}</p>
    </div>
  ))}
</section>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <section className="rounded-xl border border-border bg-white p-6">
                <h2 className="font-display text-xl font-bold">Owned projects</h2>
                {ownedProjects.length ? (
                  <ul className="mt-4 space-y-3">
                    {ownedProjects.map((project) => (
                      <li key={project.id}>
                        <Link to={`/projects/${project.id}`} className="font-semibold hover:underline">{project.title}</Link>
                        <div className="mt-1 flex gap-2"><Badge>{formatStatus(project.status)}</Badge><span className="text-xs text-muted">{shortDate(project.updated_at)}</span></div>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-4 text-sm text-muted">No owned projects yet.</p>}
              </section>

              <section className="rounded-xl border border-border bg-white p-6">
                <h2 className="font-display text-xl font-bold">Ideas</h2>
                {ideas.length ? (
                  <ul className="mt-4 space-y-3">
                    {ideas.map((idea) => (
                      <li key={idea.id}>
                        <Link to={`/ideas/${idea.id}`} className="font-semibold hover:underline">{idea.title}</Link>
                        <div className="mt-1 flex gap-2"><Badge>{formatStatus(idea.status)}</Badge><span className="text-xs text-muted">{shortDate(idea.created_at)}</span></div>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-4 text-sm text-muted">No ideas yet.</p>}
              </section>

              <section className="rounded-xl border border-border bg-white p-6 md:col-span-2">
                <h2 className="font-display text-xl font-bold">Project memberships</h2>
                {memberships.length ? (
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {memberships.map((m) => m.project ? (
                      <li key={m.project_id}>
                        <Link to={`/projects/${m.project.id}`} className="block rounded-lg border border-border bg-surface p-4 transition hover:shadow-card">
                          <p className="font-semibold">{m.project.title}</p>
                          <div className="mt-2 flex gap-2"><Badge>{formatStatus(m.project.status)}</Badge><Badge className="capitalize">{m.role}</Badge></div>
                        </Link>
                      </li>
                    ) : null)}
                  </ul>
                ) : <p className="mt-4 text-sm text-muted">No project memberships yet.</p>}
              </section>

              <section className="rounded-xl border border-border bg-white p-6 md:col-span-2">
                <h2 className="font-display text-xl font-bold">Recent activity</h2>
                {activity.length ? (
                  <ul className="mt-4 divide-y divide-border">
                    {activity.map((event) => (
                      <li key={event.id} className="py-3">
                        <p className="text-sm font-semibold capitalize">{activityLabel(event)}</p>
                        <p className="mt-1 text-xs text-muted">{event.entity_type.replace("_", " ")} · {shortDate(event.created_at)}</p>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-4 text-sm text-muted">No recent activity recorded.</p>}
              </section>
            </div>
          </>
        ) : (
          <EmptyState title="Person not found." description="This workspace member may no longer be available." />
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="People" title="Find the people behind the work." description="Browse workspace members, their projects, their ideas, and what they have been doing lately." />
      {error ? <p className="rounded-md bg-[#fad9db] px-4 py-3 text-sm" role="alert">{error}</p> : null}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => <Skeleton key={item} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : people.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((p) => (
            <Link to={`/people/${p.id}`} key={p.id} className="rounded-xl border border-border bg-white p-5 transition hover:shadow-card">
              <div className="flex items-center gap-3">
                {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" /> : <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface font-display font-bold text-lg" aria-hidden="true">{(p.display_name ?? "?").slice(0, 1).toUpperCase()}</div>}
                <div className="min-w-0">
                  <h2 className="truncate font-display text-lg font-bold">{p.display_name ?? "Futurelab member"}</h2>
                  <Badge className="mt-1 capitalize">{p.role ?? "member"}</Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="No profiles visible." description="Profiles appear here as authenticated workspace members join." />
      )}
    </div>
  );
}
