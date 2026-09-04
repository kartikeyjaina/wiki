import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CommentsPanel } from "@/components/comments/CommentsPanel";
import { VoteControl } from "@/components/ideas/VoteControl";
import { useIdeas } from "@/hooks/useIdeas";
import { useProfile } from "@/hooks/useProfile";
import { useActivity } from "@/hooks/useActivity";
import { useProjects } from "@/hooks/useProjects";
import { ideaStatusLabels, getIdeaTransitions } from "@/lib/idea-workflow";
import { recordActivity } from "@/lib/activity";
import { supabase } from "@/lib/supabase";
import { useEntityFollow, useRecentlyViewed } from "@/hooks/useWorkspaceFeatures";
import { RelationshipPanel } from "@/components/relationships/RelationshipPanel";

export function IdeaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { ideas, loading, reload } = useIdeas();
  const { profile, session } = useProfile();
  const { events } = useActivity("idea", id);
  const { projects } = useProjects();
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const idea = ideas.find((item) => item.id === id);
  const { following, toggle: toggleFollowing } = useEntityFollow("idea", idea?.id);
  useRecentlyViewed("idea", idea?.id);

  if (loading) return <p className="text-sm text-muted">Loading idea...</p>;
  if (!idea) return <EmptyState title="Idea not found." description="Only real submitted ideas appear here." />;
  const currentIdea = idea;

  const transitions = getIdeaTransitions(currentIdea.status);
  const canDecide = profile?.role === "admin" || session?.user.id === idea.author_id;
  const statusEvent = events.find((event) => event.event_type === "status_changed");
  const relatedProject = projects.find((project) => project.originating_idea_id === idea.id);

  async function changeStatus(nextStatus: typeof currentIdea.status) {
    if (!supabase || !canDecide) return;
    setUpdating(true);
    setUpdateError(null);
    const { error } = await supabase.from("ideas").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", currentIdea.id);
    if (error) {
      setUpdateError(error.message);
    } else {
      await recordActivity("idea", currentIdea.id, "status_changed", { from: currentIdea.status, to: nextStatus });
      await reload();
    }
    setUpdating(false);
  }

  async function startProject() {
    if (!supabase || !canDecide) return;
    const existing = projects.find((project) => project.originating_idea_id === currentIdea.id);
    if (existing) { navigate(`/projects/${existing.id}`); return; }
    setUpdating(true);
    const result = await supabase.from("projects").insert({ title: currentIdea.title, description: currentIdea.description, status: "planned", originating_idea_id: currentIdea.id, owner_id: session?.user.id ?? null }).select("id").single();
    if (result.error) {
      if (result.error.code === "23505") {
        const existingResult = await supabase.from("projects").select("id").eq("originating_idea_id", currentIdea.id).maybeSingle();
        if (existingResult.data?.id) { navigate(`/projects/${existingResult.data.id}`); return; }
      }
      setUpdateError("The project could not be created. Please try again."); setUpdating(false); return;
    }
    await supabase.from("ideas").update({ status: "in_progress", updated_at: new Date().toISOString() }).eq("id", currentIdea.id);
    await recordActivity("idea", currentIdea.id, "project_created", { project_id: result.data.id });
    navigate(`/projects/${result.data.id}`);
  }

  return (
    <div>
      <Link to="/ideas" className="mb-6 inline-block text-sm font-semibold text-muted hover:text-foreground">← Ideas</Link>
      <div className="grid gap-6 md:grid-cols-[80px_minmax(0,1fr)]">
        <VoteControl ideaId={idea.id} score={idea.score ?? 0} currentVote={idea.user_vote ?? 0} onReconcile={reload} />
        <div>
          <PageHeader eyebrow={idea.category?.name ?? "Idea"} title={idea.title} />
          <div className="mb-5"><Button size="sm" variant="secondary" onClick={() => void toggleFollowing()}>{following ? "Watching" : "Watch idea"}</Button></div>
          <div className="mb-5 flex flex-wrap items-center gap-2"><Badge>{ideaStatusLabels[idea.status]}</Badge>{idea.author?.display_name ? <Badge>{idea.author.display_name}</Badge> : null}</div>
          {canDecide && transitions.length ? <div className="mb-8 flex flex-wrap gap-2">{transitions.map((transition) => <Button key={transition.status} size="sm" variant={transition.status === "declined" ? "secondary" : "primary"} disabled={updating} onClick={() => transition.status === "in_progress" && currentIdea.status === "planned" ? void startProject() : void changeStatus(transition.status)}>{transition.label}</Button>)}</div> : null}
          {updateError ? <p className="mb-5 rounded-md bg-[#fad9db] px-4 py-3 text-sm font-medium" role="alert">{updateError}</p> : null}
          <section className="prose max-w-none rounded-xl border border-border bg-white p-6">
            <p className="whitespace-pre-wrap leading-7 text-foreground">{idea.description}</p>
            {idea.why_it_matters ? <><h2 className="mt-8 font-display text-2xl font-bold tracking-[-0.03em]">Why it matters</h2><p className="whitespace-pre-wrap leading-7 text-muted">{idea.why_it_matters}</p></> : null}
          </section>
          <CommentsPanel entityType="idea" entityId={idea.id} />
                    <RelationshipPanel entityType="idea" entityId={idea.id} />
          {statusEvent ? <p className="mt-4 text-xs text-muted">Status changed to {ideaStatusLabels[idea.status]} by {statusEvent.actor?.display_name ?? "a workspace member"} on {new Date(statusEvent.created_at).toLocaleDateString()}</p> : null}
          {relatedProject ? <section className="mt-6 rounded-xl border border-border bg-white p-6"><h2 className="font-display text-xl font-bold">Related project</h2><Link to={`/projects/${relatedProject.id}`} className="mt-3 block font-semibold hover:underline">{relatedProject.title}</Link><p className="mt-1 text-sm text-muted">{relatedProject.description || "No description provided."}</p></section> : null}
        </div>
      </div>
    </div>
  );
}

function DetailEmpty({ title, description }: { title: string; description: string }) {
  return <section className="mt-6 rounded-xl border border-dashed border-border bg-white p-6"><h2 className="font-display text-xl font-bold tracking-[-0.03em]">{title}</h2><p className="mt-2 text-sm text-muted">{description}</p></section>;
}
