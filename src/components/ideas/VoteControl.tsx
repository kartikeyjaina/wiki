import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface VoteControlProps { ideaId: string; score: number; currentVote?: -1 | 0 | 1; onReconcile?: () => void; }

export function VoteControl({ ideaId, score, currentVote = 0, onReconcile }: VoteControlProps) {
  const [optimisticVote, setOptimisticVote] = useState<-1 | 0 | 1>(currentVote);
  const [optimisticScore, setOptimisticScore] = useState(score);
  const [error, setError] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);

  useEffect(() => setOptimisticVote(currentVote), [currentVote]);
  useEffect(() => setOptimisticScore(score), [score]);

  async function vote(nextValue: -1 | 1) {
    const client = supabase;
    if (!client) { setError("Voting needs Supabase to be connected."); return; }
    if (voting) return;
    setVoting(true);
    const previousVote = optimisticVote;
    const previousScore = optimisticScore;
    const resolvedVote = optimisticVote === nextValue ? 0 : nextValue;
    setOptimisticVote(resolvedVote);
    setOptimisticScore(previousScore - previousVote + resolvedVote);
    setError(null);
    try {
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error("Sign in to vote.");
      const request = resolvedVote === 0
        ? client.from("idea_votes").delete().eq("idea_id", ideaId).eq("user_id", user.id)
        : client.from("idea_votes").upsert({ idea_id: ideaId, user_id: user.id, value: resolvedVote }, { onConflict: "idea_id,user_id" });
      const { error: voteError } = await request;
      if (voteError) throw voteError;
      onReconcile?.();
    } catch (voteError) {
      setOptimisticVote(previousVote);
      setOptimisticScore(previousScore);
      setError(voteError instanceof Error && voteError.message === "Sign in to vote." ? voteError.message : "Your vote wasn't saved.");
    } finally { setVoting(false); }
  }

  return <div className="flex min-w-[64px] flex-col items-center gap-1 rounded-lg bg-surface p-2 text-center"><button type="button" aria-label="Upvote idea" disabled={voting} onClick={() => void vote(1)} className={cn("grid h-9 w-9 place-items-center rounded-md transition disabled:opacity-50", optimisticVote === 1 ? "bg-[#CCF0DC] text-foreground" : "hover:bg-white")}><ChevronUp className="h-5 w-5" /></button><span className="font-display text-lg font-bold tracking-[-0.03em]">{optimisticScore}</span><button type="button" aria-label="Downvote idea" disabled={voting} onClick={() => void vote(-1)} className={cn("grid h-9 w-9 place-items-center rounded-md transition disabled:opacity-50", optimisticVote === -1 ? "bg-[#FAD9DB] text-foreground" : "hover:bg-white")}><ChevronDown className="h-5 w-5" /></button>{error ? <p className="max-w-16 text-[10px] font-medium leading-tight text-muted" role="alert">{error}</p> : null}</div>;
}
