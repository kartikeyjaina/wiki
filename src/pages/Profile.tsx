import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useProfile } from "@/hooks/useProfile";
import { useNotifications } from "@/hooks/useWorkspaceFeatures";

export function Profile() {
  const { profile, session } = useProfile();
  const { unreadCount } = useNotifications();
  return <div><PageHeader eyebrow="Your workspace" title={profile?.display_name ?? session?.user.email ?? "Profile"} description="Your personal view of ideas, projects, saved assets, and workspace attention." action={<Button variant="secondary" onClick={() => void import("@/lib/supabase").then(({ supabase }) => supabase?.auth.signOut())}>Sign out</Button>} /><section className="grid gap-4 md:grid-cols-3"><div className="rounded-xl border border-border bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Role</p><p className="mt-3 font-display text-xl font-bold">{profile?.role ?? "Member"}</p></div><Link to="/saved" className="rounded-xl border border-border bg-white p-5 transition hover:shadow-card"><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Saved assets</p><p className="mt-3 font-display text-xl font-bold">Open your shortlist</p></Link><div className="rounded-xl border border-border bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Attention</p><p className="mt-3 font-display text-xl font-bold">{unreadCount} unread notifications</p></div></section><section className="mt-8 rounded-xl border border-border bg-white p-6"><h2 className="font-display text-xl font-bold">Keep moving</h2><div className="mt-4 flex flex-wrap gap-2"><Button asChild size="sm"><Link to="/ideas/new">New idea</Link></Button><Button asChild size="sm" variant="secondary"><Link to="/projects">View projects</Link></Button><Button asChild size="sm" variant="secondary"><Link to="/assets">Browse assets</Link></Button></div><Badge className="mt-6">Personal workspace</Badge></section></div>;
}
