import { useState } from "react";
import { Archive, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getProjectTransitions, projectStatusLabels } from "@/lib/project-workflow";
import type { ProjectStatus } from "@/types/domain";

export function ProjectStageControl({ status, canEdit, onChange }: { status: ProjectStatus; canEdit: boolean; onChange: (status: ProjectStatus) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const transitions = getProjectTransitions(status);
  async function move(nextStatus: ProjectStatus) {
    if (nextStatus === "archived" && !window.confirm("Archive this project?")) return;
    setBusy(true);
    try { await onChange(nextStatus); } finally { setBusy(false); }
  }
  return <section className="rounded-xl border border-border bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Project stage</p><Badge>{projectStatusLabels[status]}</Badge></div>{canEdit && transitions.length ? <div className="flex flex-wrap gap-2">{transitions.map((transition) => <Button key={transition.status} size="sm" variant={transition.status === "archived" ? "secondary" : "primary"} disabled={busy} onClick={() => void move(transition.status)}>{transition.status === "archived" ? <Archive className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}{transition.label}</Button>)}</div> : null}</div><div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">{(["planned", "in_progress", "blocked", "shipped"] as ProjectStatus[]).map((stage, index) => <span key={stage} className="flex items-center gap-2"><span className={stage === status ? "font-bold text-foreground" : ""}>{projectStatusLabels[stage]}</span>{index < 3 ? <span>→</span> : null}</span>)}</div></section>;
}