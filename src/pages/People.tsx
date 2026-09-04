import { Link, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/domain";
import { Badge } from "@/components/ui/Badge";
import { formatStatus } from "@/lib/utils";

interface PersonProject { id: string; title: string; status: string }
interface PersonMembership { project_id: string; role: string; project: PersonProject | null }

export function People() {
  const { id } = useParams();
  const [people, setPeople] = useState<Profile[]>([]);
  const [person, setPerson] = useState<Profile | null>(null);
  const [ownedProjects, setOwnedProjects] = useState<PersonProject[]>([]);
  const [memberships, setMemberships] = useState<PersonMembership[]>([]);
  const [ideas, setIdeas] = useState<{ id: string; title: string; status: string }[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    const client = supabase;

    void (async () => {
      if (id) {
        // Parallel loads for person detail
        const [profileResult, projectResult, memberResult, ideaResult] = await Promise.all([
          client.from("profiles").select("id, display_name, role, avatar_url").eq("id", id).single(),
          client.from("projects").select("id, title, status").eq("owner_id", id).order("updated_at", { ascending: false }).limit(12),
          client.from("project_members")
            .select("project_id, role, project:projects!project_members_project_id_fkey(id, title, status)")
            .eq("user_id", id)
            .limit(12),
          client.from("ideas").select("id, title, status").eq("author_id", id).order("created_at", { ascending: false }).limit(12),
        ]);

        if (profileResult.error) { setError("This profile could not be loaded."); setLoading(false); return; }
        setPerson((profileResult.data as Profile) ?? null);
        setOwnedProjects((projectResult.data ?? []) as PersonProject[]);
        setMemberships(
          ((memberResult.data ?? []) as (Omit<PersonMembership, "project"> & {
            project: PersonProject | PersonProject[] | null;
          })[]).map((m) => ({
            ...m,
            project: Array.isArray(m.project) ? (m.project[0] ?? null) : m.project,
          })),
        );
        setIdeas((ideaResult.data ?? []) as { id: string; title: string; status: string }[]);
      } else {
        const profileResult = await client
          .from("profiles")
          .select("id, display_name, role, avatar_url")
          .order("display_name");
        if (profileResult.error) { setError(profileResult.error.message); setLoading(false); return; }
        setPeople((profileResult.data ?? []) as Profile[]);
      }
      setLoading(false);
    })();
  }, [id]);

  // ─── Person detail ───────────────────────────────────────────────────────
  if (id) {
    return (
      <div>
        <Link to="/people" className="text-sm font-semibold text-muted hover:text-foreground">
          ← People
        </Link>

        {loading ? (
          <p className="mt-8 text-sm text-muted" role="status">Loading profile...</p>
        ) : person ? (
          <>
            <PageHeader
              eyebrow="People"
              title={person.display_name ?? "Futurelab member"}
              description={person.role ? formatStatus(person.role) : "Workspace member"}
            />

            <div className="grid gap-6 md:grid-cols-2">
              {/* Owned projects */}
              <section className="rounded-xl border border-border bg-white p-6">
                <h2 className="font-display text-xl font-bold">Owned projects</h2>
                {ownedProjects.length ? (
                  <ul className="mt-4 space-y-3">
                    {ownedProjects.map((project) => (
                      <li key={project.id}>
                        <Link to={`/projects/${project.id}`} className="font-semibold hover:underline">
                          {project.title}
                        </Link>
                        <span className="ml-2">
                          <Badge>{formatStatus(project.status)}</Badge>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-muted">No owned projects yet.</p>
                )}
              </section>

              {/* Ideas */}
              <section className="rounded-xl border border-border bg-white p-6">
                <h2 className="font-display text-xl font-bold">Ideas</h2>
                {ideas.length ? (
                  <ul className="mt-4 space-y-3">
                    {ideas.map((idea) => (
                      <li key={idea.id}>
                        <Link to={`/ideas/${idea.id}`} className="font-semibold hover:underline">
                          {idea.title}
                        </Link>
                        <span className="ml-2">
                          <Badge>{formatStatus(idea.status)}</Badge>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-muted">No ideas yet.</p>
                )}
              </section>

              {/* Project memberships */}
              {memberships.length > 0 && (
                <section className="rounded-xl border border-border bg-white p-6 md:col-span-2">
                  <h2 className="font-display text-xl font-bold">Project memberships</h2>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {memberships.map((m) =>
                      m.project ? (
                        <li key={m.project_id}>
                          <Link
                            to={`/projects/${m.project.id}`}
                            className="block rounded-lg border border-border bg-surface p-4 transition hover:shadow-card"
                          >
                            <p className="font-semibold">{m.project.title}</p>
                            <div className="mt-2 flex gap-2">
                              <Badge>{formatStatus(m.project.status)}</Badge>
                              <Badge className="capitalize">{m.role}</Badge>
                            </div>
                          </Link>
                        </li>
                      ) : null,
                    )}
                  </ul>
                </section>
              )}
            </div>
          </>
        ) : (
          <EmptyState
            title="Person not found."
            description="This workspace member may no longer be available."
          />
        )}
      </div>
    );
  }

  // ─── Directory ───────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        eyebrow="People"
        title="Find the people behind the work."
        description="Browse workspace members, their projects, and their ideas."
      />
      {error ? (
        <p className="rounded-md bg-[#fad9db] px-4 py-3 text-sm" role="alert">
          We couldn't load the people directory: {error}
        </p>
      ) : loading ? (
        <p className="text-sm text-muted" role="status">Loading people...</p>
      ) : people.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((p) => (
            <Link
              to={`/people/${p.id}`}
              key={p.id}
              className="rounded-xl border border-border bg-white p-5 transition hover:shadow-card"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface font-display font-bold text-lg" aria-hidden="true">
                  {(p.display_name ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate font-display text-lg font-bold">
                    {p.display_name ?? "Futurelab member"}
                  </h2>
                  <Badge className="mt-1 capitalize">{p.role ?? "member"}</Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No profiles visible."
          description="Profiles appear here as authenticated workspace members join."
        />
      )}
    </div>
  );
}
