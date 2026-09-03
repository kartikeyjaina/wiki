import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LeaderboardList } from "@/components/leaderboard/LeaderboardList";
import { rankIdeas, type LeaderboardMode } from "@/lib/ranking";
import { useIdeas } from "@/hooks/useIdeas";

const modes: { label: string; value: LeaderboardMode }[] = [
  { label: "Trending", value: "trending" },
  { label: "Top All Time", value: "top" },
  { label: "This Month", value: "month" },
  { label: "Most Discussed", value: "discussed" },
  { label: "Shipped", value: "shipped" },
];

export function IdeaLeaderboard() {
  const { ideas, loading } = useIdeas();
  const [mode, setMode] = useState<LeaderboardMode>("trending");
  const ranked = useMemo(() => rankIdeas(ideas, mode), [ideas, mode]);

  return (
    <div>
      <PageHeader eyebrow="Idea Leaderboard" title="Discover the ideas getting the most attention." description="The leaderboard ranks ideas, not people. Scores are deterministic and based on actual votes, comments, status, and recency." />
      <div className="mb-8 flex flex-wrap gap-2">
        {modes.map((item) => <button key={item.value} type="button" onClick={() => setMode(item.value)} className={`rounded-pill px-4 py-2 text-sm font-semibold ${mode === item.value ? "bg-foreground text-white" : "bg-surface text-muted"}`}>{item.label}</button>)}
      </div>
      {loading ? <p className="text-sm text-muted">Loading leaderboard...</p> : ranked.length ? <LeaderboardList ideas={ranked} /> : <EmptyState title="No ranked ideas yet." description="Submit an idea to start the ranking." />}
    </div>
  );
}
