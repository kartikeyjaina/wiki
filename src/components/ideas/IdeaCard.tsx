import { Link } from "react-router-dom";
import type { Idea } from "@/types/domain";
import { Badge } from "@/components/ui/Badge";
import { VoteControl } from "./VoteControl";
import { formatStatus, shortDate } from "@/lib/utils";

export function IdeaCard({ idea, onReconcile }: { idea: Idea; onReconcile?: () => void }) {
  return (
    <article className="flex gap-4 rounded-xl border border-border bg-white p-4 transition hover:border-[#1111112e] hover:shadow-card">
      <VoteControl ideaId={idea.id} score={idea.score ?? 0} currentVote={idea.user_vote ?? 0} onReconcile={onReconcile} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {idea.category?.name ? <Badge>{idea.category.name}</Badge> : null}
          <Badge className="bg-[#d6e8f8]">{formatStatus(idea.status)}</Badge>
        </div>
        <Link to={`/ideas/${idea.id}`} className="mt-3 block font-display text-xl font-bold leading-tight tracking-[-0.03em] hover:underline">
          {idea.title}
        </Link>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{idea.description}</p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium text-muted">
          {idea.author?.display_name ? <span>{idea.author.display_name}</span> : null}
          <span>{idea.comment_count ?? 0} comments</span>
          {shortDate(idea.created_at) ? <span>{shortDate(idea.created_at)}</span> : null}
        </div>
      </div>
    </article>
  );
}
