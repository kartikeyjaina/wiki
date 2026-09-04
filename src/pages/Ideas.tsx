import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { IdeaCard } from "@/components/ideas/IdeaCard";
import { useIdeas } from "@/hooks/useIdeas";
import { useProfile } from "@/hooks/useProfile";
import { rankIdeas, type LeaderboardMode } from "@/lib/ranking";

const tabs: { label: string; mode: LeaderboardMode | "new" | "mine" }[] = [
  { label: "Trending", mode: "trending" },
  { label: "New", mode: "new" },
  { label: "Top", mode: "top" },
  { label: "Most Discussed", mode: "discussed" },
  { label: "My Ideas", mode: "mine" },
];

export function Ideas() {
  const { ideas, loading, error, reload } = useIdeas();
  const { session } = useProfile();
  const [mode, setMode] = useState<(typeof tabs)[number]["mode"]>("trending");
  const visible = useMemo(() => {
    if (mode === "new") return [...ideas].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (mode === "mine") return ideas.filter((idea) => idea.author_id === session?.user.id);
    return rankIdeas(ideas, mode);
  }, [ideas, mode, session?.user.id]);

  return (
    <div>
      <PageHeader
        eyebrow="Ideas"
        title="Make the best thinking visible."
        description="Submit ideas, discuss them, vote carefully, and let the leaderboard reveal what matters."
        action={<Button asChild><Link to="/ideas/new"><Plus className="h-4 w-4" />Submit Idea</Link></Button>}
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button key={tab.mode} type="button" onClick={() => setMode(tab.mode)} className={`rounded-pill px-4 py-2 text-sm font-semibold ${mode === tab.mode ? "bg-foreground text-white" : "bg-surface text-muted"}`}>
            {tab.label}
          </button>
        ))}
        <Button variant="secondary" size="sm" asChild><Link to="/ideas/leaderboard">Leaderboard</Link></Button>
      </div>
      {error ? <p className="mb-4 rounded-md bg-[#fad9db] px-4 py-3 text-sm font-medium">Ideas could not be loaded: {error}</p> : null}
      {loading ? <p className="text-sm text-muted">Loading ideas...</p> : visible.length ? <div className="space-y-4">{visible.map((idea) => <IdeaCard key={idea.id} idea={idea} onReconcile={reload} />)}</div> : <EmptyState title={mode === "mine" ? "No ideas from you yet." : "No ideas yet."} description={mode === "mine" ? "Create an idea to see it in this list." : "Submit the first idea and start the conversation."} action={<Button asChild><Link to="/ideas/new">Submit an idea</Link></Button>} />}
    </div>
  );
}
