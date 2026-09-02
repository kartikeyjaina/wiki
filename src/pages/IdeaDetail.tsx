import { Link, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { VoteControl } from "@/components/ideas/VoteControl";
import { useIdeas } from "@/hooks/useIdeas";
import { formatStatus } from "@/lib/utils";

export function IdeaDetail() {
  const { id } = useParams();
  const { ideas, loading, reload } = useIdeas();
  const idea = ideas.find((item) => item.id === id);

  if (loading) return <p className="text-sm text-muted">Loading idea...</p>;
  if (!idea) return <EmptyState title="Idea not found." description="Only real submitted ideas appear here." />;

  return (
    <div>
      <Link to="/ideas" className="mb-6 inline-block text-sm font-semibold text-muted hover:text-foreground">← Ideas</Link>
      <div className="grid gap-6 md:grid-cols-[80px_minmax(0,1fr)]">
        <VoteControl ideaId={idea.id} score={idea.score ?? 0} currentVote={idea.user_vote ?? 0} onReconcile={reload} />
        <div>
          <PageHeader eyebrow={idea.category?.name ?? "Idea"} title={idea.title} />
          <div className="mb-8 flex flex-wrap gap-2"><Badge>{formatStatus(idea.status)}</Badge>{idea.author?.display_name ? <Badge>{idea.author.display_name}</Badge> : null}</div>
          <section className="prose max-w-none rounded-xl border border-border bg-white p-6">
            <p className="whitespace-pre-wrap leading-7 text-foreground">{idea.description}</p>
            {idea.why_it_matters ? <><h2 className="mt-8 font-display text-2xl font-bold tracking-[-0.03em]">Why it matters</h2><p className="whitespace-pre-wrap leading-7 text-muted">{idea.why_it_matters}</p></> : null}
          </section>
          <DetailEmpty title="Discussion" description="Comments and replies will appear here when real people add them." />
          <DetailEmpty title="Activity" description="Status changes, owner assignments, and project links will appear as real events." />
          <DetailEmpty title="Related work" description="Related knowledge, assets, and projects will appear through stored relationships." />
        </div>
      </div>
    </div>
  );
}

function DetailEmpty({ title, description }: { title: string; description: string }) {
  return <section className="mt-6 rounded-xl border border-dashed border-border bg-white p-6"><h2 className="font-display text-xl font-bold tracking-[-0.03em]">{title}</h2><p className="mt-2 text-sm text-muted">{description}</p></section>;
}
