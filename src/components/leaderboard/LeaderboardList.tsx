import type { Idea } from "@/types/domain";
import { Badge } from "@/components/ui/Badge";
import { formatStatus } from "@/lib/utils";

export function LeaderboardList({ ideas }: { ideas: Idea[] }) {
  return (
    <div className="space-y-3">
      {ideas.map((idea, index) => (
        <article
          key={idea.id}
          className={`grid gap-5 rounded-xl border border-border bg-white p-5 transition hover:border-[#1111112e] ${
            index < 3
              ? "md:grid-cols-[80px_minmax(0,1fr)_140px]"
              : "md:grid-cols-[64px_minmax(0,1fr)_120px]"
          }`}
        >
          <div className="font-display text-4xl font-bold tracking-[-0.03em] text-muted">
            {String(index + 1).padStart(2, "0")}
          </div>
          <div>
            <h2
              className={`${
                index < 3 ? "text-2xl" : "text-xl"
              } font-display font-bold leading-tight tracking-[-0.03em]`}
            >
              {idea.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              {idea.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-muted">
              <span>{idea.comment_count ?? 0} comments</span>
              {idea.author?.display_name ? (
                <span>{idea.author.display_name}</span>
              ) : null}
              <Badge>{formatStatus(idea.status)}</Badge>
            </div>
          </div>
          <div className="font-display text-2xl font-bold tracking-[-0.03em]">
            ▲ {idea.score ?? 0}
          </div>
        </article>
      ))}
    </div>
  );
}
