import { useState } from "react";
import { Archive, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getProjectTransitions, projectStatusLabels } from "@/lib/project-workflow";
import type { ProjectStatus } from "@/types/domain";

export function ProjectStageControl({ status, canEdit, onChange }: { status: ProjectStatus; canEdit: boolean; onChange: (status: ProjectStatus) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const transitions = getProjectTransitions(status);
  const isCurrent = (stage: ProjectStatus) => stage === status ? "font-bold text-foreground" : "";
  async function move(nextStatus: ProjectStatus) {
    if (nextStatus === "archived" && !window.confirm("Archive this project?")) return;
    setBusy(true);
    try { await onChange(nextStatus); } finally { setBusy(false); }
  }
  return <section className="rounded-xl border border-border bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Project stage</p><Badge>{projectStatusLabels[status]}</Badge></div>{canEdit && transitions.length ? <div className="flex flex-wrap gap-2">{transitions.map((transition) => <Button key={transition.status} size="sm" variant={transition.status === "archived" ? "secondary" : "primary"} disabled={busy} onClick={() => void move(transition.status)}>{transition.status === "archived" ? <Archive className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}{transition.label}</Button>)}</div> : null}</div><div className="mt-4 flex max-w-md items-center gap-2 text-xs text-muted" aria-label="Project lifecycle"><span className={isCurrent("planned")}>{projectStatusLabels.planned}</span><span>→</span><span className={isCurrent("in_progress")}>{projectStatusLabels.in_progress}</span><span className="flex flex-col gap-1"><span className={isCurrent("blocked")}>↙ {projectStatusLabels.blocked}</span><span className={isCurrent("shipped")}>↘ {projectStatusLabels.shipped}</span></span></div></section>;
}