import type { Idea } from "@/types/domain";

export type LeaderboardMode = "trending" | "top" | "month" | "discussed" | "shipped";

const DAY_MS = 24 * 60 * 60 * 1000;

export function ideaScore(idea: Pick<Idea, "score">) {
  return idea.score ?? 0;
}

export function trendingScore(idea: Pick<Idea, "score" | "comment_count" | "created_at">, now = new Date()) {
  const ageDays = Math.max(0, (now.getTime() - new Date(idea.created_at).getTime()) / DAY_MS);
  const score = idea.score ?? 0;
  const comments = idea.comment_count ?? 0;
  const engagement = score * 2 + comments;
  return engagement / Math.pow(ageDays + 2, 1.18);
}

export function rankIdeas(ideas: Idea[], mode: LeaderboardMode, now = new Date()) {
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const filtered = ideas.filter((idea) => {
    if (mode === "month") return new Date(idea.created_at) >= startOfMonth;
    if (mode === "shipped") return idea.status === "shipped";
    return true;
  });

  const valueFor = (idea: Idea) => {
    if (mode === "trending") return trendingScore(idea, now);
    if (mode === "discussed") return idea.comment_count ?? 0;
    return ideaScore(idea);
  };

  return [...filtered].sort((a, b) => {
    const delta = valueFor(b) - valueFor(a);
    if (delta !== 0) return delta;
    const createdDelta = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (createdDelta !== 0) return createdDelta;
    return a.id.localeCompare(b.id);
  });
}
