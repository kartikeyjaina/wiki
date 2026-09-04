import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/domain";
import { Badge } from "@/components/ui/Badge";

export function People() {
  const [people, setPeople] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!supabase) { setLoading(false); return; } void supabase.from("profiles").select("id, display_name, role, avatar_url").order("display_name").then(({ data, error: loadError }) => { setPeople((data ?? []) as Profile[]); setError(loadError?.message ?? null); setLoading(false); }); }, []);
  return (
    <div>
      <PageHeader eyebrow="People" title="Profiles are managed in the workspace." description="This legacy route is no longer part of the primary workspace." />
      {error ? <p className="rounded-md bg-[#fad9db] px-4 py-3 text-sm" role="alert">We couldn’t load the people directory: {error}</p> : loading ? <p className="text-sm text-muted" role="status">Loading people...</p> : people.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{people.map((person) => <article key={person.id} className="rounded-xl border border-border bg-white p-5 transition hover:shadow-card"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-full bg-surface font-display font-bold">{(person.display_name ?? "?").slice(0, 1).toUpperCase()}</div><div className="min-w-0"><h2 className="truncate font-display text-lg font-bold">{person.display_name ?? "Futurelab member"}</h2><Badge className="mt-1">{person.role ?? "member"}</Badge></div></div></article>)}</div> : <EmptyState title="No profiles visible." description="Profiles appear here as authenticated workspace members join." />}
    </div>
  );
}
