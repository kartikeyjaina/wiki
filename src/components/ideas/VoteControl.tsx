import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface VoteControlProps {
  ideaId: string;
  score: number;
  currentVote?: -1 | 0 | 1;
  onReconcile?: () => void;
}

export function VoteControl({
  ideaId,
  score,
  currentVote = 0,
  onReconcile,
}: VoteControlProps) {
  const [optimisticVote, setOptimisticVote] = useState<-1 | 0 | 1>(currentVote);
  const [optimisticScore, setOptimisticScore] = useState(score);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOptimisticVote(currentVote);
  }, [currentVote]);

  useEffect(() => {
    setOptimisticScore(score);
  }, [score]);

  async function vote(nextValue: -1 | 1) {
    if (!supabase) {
      setError("Voting needs Supabase to be connected.");
      return;
    }

    const previousVote = optimisticVote;
    const previousScore = optimisticScore;
    const resolvedVote = optimisticVote === nextValue ? 0 : nextValue;
    setOptimisticVote(resolvedVote);
    setOptimisticScore(previousScore - previousVote + resolvedVote);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setOptimisticVote(previousVote);
      setOptimisticScore(previousScore);
      setError("Sign in to vote.");
      return;
    }

    const request =
      resolvedVote === 0
        ? supabase
            .from("idea_votes")
            .delete()
            .eq("idea_id", ideaId)
            .eq("user_id", user.id)
        : supabase
            .from("idea_votes")
            .upsert(
              { idea_id: ideaId, user_id: user.id, value: resolvedVote },
              { onConflict: "idea_id,user_id" },
            );

    const { error: voteError } = await request;
    if (voteError) {
      setOptimisticVote(previousVote);
      setOptimisticScore(previousScore);
      setError("Your vote wasn't saved.");
    } else {
      onReconcile?.();
    }
  }

  return (
    <div className="flex min-w-[64px] flex-col items-center gap-1 rounded-lg bg-surface p-2 text-center">
      <button
        type="button"
        aria-label="Upvote idea"
        onClick={() => void vote(1)}
        className={cn(
          "grid h-9 w-9 place-items-center rounded-md transition",
          optimisticVote === 1
            ? "bg-[#ccf0dc] text-foreground"
            : "hover:bg-white",
        )}
      >
        <ChevronUp className="h-5 w-5" />
      </button>
      <span className="font-display text-lg font-bold tracking-[-0.03em]">
        {optimisticScore}
      </span>
      <button
        type="button"
        aria-label="Downvote idea"
        onClick={() => void vote(-1)}
        className={cn(
          "grid h-9 w-9 place-items-center rounded-md transition",
          optimisticVote === -1
            ? "bg-[#fad9db] text-foreground"
            : "hover:bg-white",
        )}
      >
        <ChevronDown className="h-5 w-5" />
      </button>
      {error ? (
        <p className="sr-only" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
