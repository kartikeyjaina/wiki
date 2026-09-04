import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useProfile } from "@/hooks/useProfile";
import { useNotifications } from "@/hooks/useWorkspaceFeatures";
import { useRecentlyViewedItems } from "@/hooks/useRecentlyViewedItems";
import { supabase } from "@/lib/supabase";
import { formatStatus, shortDate } from "@/lib/utils";

interface OwnedProject { id: string; title: string; status: string; updated_at: string; }
interface AuthoredIdea { id: string; title: string; status: string; }
interface ProjectMembership { project_id: string; role: string; project: { id: string; title: string; status: string } | null; }

export function Profile() {
  const { profile, session } = useProfile();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const { items: recentItems, loading: recentLoading } = useRecentlyViewedItems(8);
  const [ownedProjects, setOwnedProjects] = useState<OwnedProject[]>([]);
  const [memberships, setMemberships] = useState<ProjectMembership[]>([]);
  const [authoredIdeas, setAuthoredIdeas] = useState<AuthoredIdea[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (!supabase || !session?.user.id) return;
    const uid = session.user.id;
    setDataLoading(true);
    void Promise.all([
      supabase
        .from("projects")
        .select("id, title, status, updated_at")
        .eq("owner_id", uid)
        .order("updated_at", { ascending: false })
        .limit(8),
      supabase
        .from("project_members")
        .select("project_id, role, project:projects!project_members_project_id_fkey(id, title, status)")
        .eq("user_id", uid)
        .limit(8),
      supabase
        .from("ideas")
        .select("id, title, status")
        .eq("author_id", uid)
        .order("created_at", { ascending: false })
        .limit(8),
    ]).then(([projectsResult, membershipsResult, ideasResult]) => {
      setOwnedProjects((projectsResult.data ?? []) as OwnedProject[]);
      setMemberships(
        ((membershipsResult.data ?? []) as (Omit<ProjectMembership, "project"> & {
          project: { id: string; title: string; status: string } | { id: string; title: string; status: string }[] | null;
        })[]).map((m) => ({
          ...m,
          project: Array.isArray(m.project) ? (m.project[0] ?? null) : m.project,
        })),
      );
      setAuthoredIdeas((ideasResult.data ?? []) as AuthoredIdea[]);
      setDataLoading(false);
    });
  }, [session?.user.id]);

  async function signOut() {
    const { supabase: sb } = await import("@/lib/supabase");
    await sb?.auth.signOut();
  }

  const unreadNotifications = notifications.filter((n) => !n.read_at);
  const readNotifications = notifications.filter((n) => n.read_at);

  return (
    <div>
      <PageHeader
        eyebrow="Your workspace"
        title={profile?.display_name ?? session?.user.email ?? "Profile"}
        description="Your personal view of ideas, projects, saved assets, and workspace attention."
        action={
          <Button variant="secondary" onClick={() => void signOut()}>
            Sign out
          </Button>
        }
      />

      {/* Summary row */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Role</p>
          <p className="mt-3 font-display text-xl font-bold capitalize">
            {profile?.role ?? "Member"}
          </p>
        </div>
        <Link
          to="/saved"
          className="rounded-xl border border-border bg-white p-5 transition hover:shadow-card"
        >
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Saved assets</p>
          <p className="mt-3 font-display text-xl font-bold">Open your shortlist</p>
        </Link>
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Notifications</p>
          <p className="mt-3 font-display text-xl font-bold">{unreadCount} unread</p>
        </div>
      </section>

      {/* Notifications */}
      {unreadNotifications.length > 0 && (
        <section className="mt-8 rounded-xl border border-border bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold">Needs attention</h2>
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="text-xs font-semibold text-muted hover:text-foreground"
            >
              Mark all read
            </button>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {unreadNotifications.map((n) => {
              const inner = (
                <div className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-semibold">{n.title}</p>
                    {n.body ? <p className="mt-1 text-xs text-muted">{n.body}</p> : null}
                    <p className="mt-1 text-xs text-muted">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge className="bg-[#d6e8f8] shrink-0">New</Badge>
                </div>
              );
              return n.href ? (
                <li key={n.id}>
                  <Link to={n.href} onClick={() => void markRead(n.id)}>
                    {inner}
                  </Link>
                </li>
              ) : (
                <li key={n.id}>
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => void markRead(n.id)}
                  >
                    {inner}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Recent activity */}
      {!recentLoading && recentItems.length > 0 && (
        <section className="mt-8 rounded-xl border border-border bg-white p-6">
          <h2 className="font-display text-xl font-bold">Continue where you left off</h2>
          <ul className="mt-4 divide-y divide-border">
            {recentItems.map((item) => (
              <li key={`${item.entity_type}-${item.id}`}>
                <Link
                  to={item.href}
                  className="flex items-center justify-between gap-3 py-3 hover:opacity-80"
                >
                  <span className="font-semibold">{item.title}</span>
                  <span className="text-xs capitalize text-muted">
                    {item.entity_type.replace("_", " ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Owned projects + memberships */}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-white p-6">
          <h2 className="font-display text-xl font-bold">Your projects</h2>
          {dataLoading ? (
            <p className="mt-4 text-sm text-muted">Loading...</p>
          ) : ownedProjects.length ? (
            <ul className="mt-4 divide-y divide-border">
              {ownedProjects.map((project) => (
                <li key={project.id} className="py-3">
                  <Link
                    to={`/projects/${project.id}`}
                    className="font-semibold hover:underline"
                  >
                    {project.title}
                  </Link>
                  <div className="mt-1 flex gap-2">
                    <Badge>{formatStatus(project.status)}</Badge>
                    <span className="text-xs text-muted">{shortDate(project.updated_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">No projects owned yet.</p>
          )}
        </section>

        <section className="rounded-xl border border-border bg-white p-6">
          <h2 className="font-display text-xl font-bold">Project memberships</h2>
          {dataLoading ? (
            <p className="mt-4 text-sm text-muted">Loading...</p>
          ) : memberships.length ? (
            <ul className="mt-4 divide-y divide-border">
              {memberships.map((m) =>
                m.project ? (
                  <li key={m.project_id} className="py-3">
                    <Link
                      to={`/projects/${m.project.id}`}
                      className="font-semibold hover:underline"
                    >
                      {m.project.title}
                    </Link>
                    <div className="mt-1 flex gap-2">
                      <Badge>{formatStatus(m.project.status)}</Badge>
                      <Badge className="capitalize">{m.role}</Badge>
                    </div>
                  </li>
                ) : null,
              )}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">No project memberships yet.</p>
          )}
        </section>
      </div>

      {/* Authored ideas */}
      <section className="mt-8 rounded-xl border border-border bg-white p-6">
        <h2 className="font-display text-xl font-bold">Your ideas</h2>
        {dataLoading ? (
          <p className="mt-4 text-sm text-muted">Loading...</p>
        ) : authoredIdeas.length ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {authoredIdeas.map((idea) => (
              <li key={idea.id}>
                <Link
                  to={`/ideas/${idea.id}`}
                  className="block rounded-lg border border-border bg-surface p-4 transition hover:shadow-card"
                >
                  <p className="font-semibold">{idea.title}</p>
                  <Badge className="mt-2">{formatStatus(idea.status)}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No ideas yet."
            description="Submit your first idea and it will appear here."
            action={
              <Button asChild size="sm">
                <Link to="/ideas/new">Submit an idea</Link>
              </Button>
            }
          />
        )}
      </section>

      {/* Past notifications (read) */}
      {readNotifications.length > 0 && (
        <section className="mt-8 rounded-xl border border-border bg-white p-6">
          <h2 className="font-display text-xl font-bold">Past notifications</h2>
          <ul className="mt-4 divide-y divide-border">
            {readNotifications.slice(0, 10).map((n) => (
              <li key={n.id} className="py-3">
                {n.href ? (
                  <Link to={n.href} className="hover:opacity-80">
                    <p className="text-sm text-muted">{n.title}</p>
                    <p className="mt-1 text-xs text-muted">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </Link>
                ) : (
                  <div>
                    <p className="text-sm text-muted">{n.title}</p>
                    <p className="mt-1 text-xs text-muted">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Quick actions */}
      <section className="mt-8 rounded-xl border border-border bg-white p-6">
        <h2 className="font-display text-xl font-bold">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link to="/ideas/new">New idea</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link to="/projects">View projects</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link to="/assets">Browse assets</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link to="/wiki">Wiki</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
