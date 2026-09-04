import { Check, ChevronDown, ChevronUp, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useProjectMilestones } from "@/hooks/useProjectMilestones";

export function ProjectMilestones({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const { milestones, loading, error, create, update, move, remove } = useProjectMilestones(projectId);
  const [title, setTitle] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftDueDate, setDraftDueDate] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function add() {
    if (!title.trim()) return;
    setActionError(null);
    try {
      await create(title.trim());
      setTitle("");
    } catch (createError) {
      setActionError(createError instanceof Error ? createError.message : "Milestone could not be created.");
    }
  }

  function startEditing(id: string) {
    const milestone = milestones.find((item) => item.id === id);
    if (!milestone) return;
    setEditingId(id);
    setDraftTitle(milestone.title);
    setDraftDescription(milestone.description ?? "");
    setDraftDueDate(milestone.due_date ?? "");
    setActionError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setDraftTitle("");
    setDraftDescription("");
    setDraftDueDate("");
  }

  async function saveEditing(id: string) {
    if (!draftTitle.trim()) return;
    setBusyId(id);
    setActionError(null);
    try {
      await update(id, {
        title: draftTitle.trim(),
        description: draftDescription.trim() || null,
        due_date: draftDueDate || null,
      });
      cancelEditing();
    } catch (updateError) {
      setActionError(updateError instanceof Error ? updateError.message : "Milestone could not be updated.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggle(id: string, completed: boolean) {
    setBusyId(id);
    setActionError(null);
    try {
      await update(id, {
        status: completed ? "pending" : "completed",
        completed_at: completed ? null : new Date().toISOString(),
      });
    } catch (updateError) {
      setActionError(updateError instanceof Error ? updateError.message : "Milestone could not be updated.");
    } finally {
      setBusyId(null);
    }
  }

  async function reorder(id: string, direction: "up" | "down") {
    setBusyId(id);
    setActionError(null);
    try {
      await move(id, direction);
    } catch (moveError) {
      setActionError(moveError instanceof Error ? moveError.message : "Milestone order could not be updated.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteMilestone(id: string, milestoneTitle: string) {
    if (!window.confirm(`Delete milestone “${milestoneTitle}”?`)) return;
    setBusyId(id);
    setActionError(null);
    try {
      await remove(id);
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : "Milestone could not be deleted.");
    } finally {
      setBusyId(null);
    }
  }

  const completed = milestones.filter((milestone) => milestone.status === "completed").length;

  return (
    <section className="rounded-xl border border-border bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Milestones</h2>
          <p className="mt-1 text-sm text-muted">Track outcomes, owners’ little slices of sanity, and deadlines.</p>
        </div>
        <span className="text-sm text-muted">{completed} / {milestones.length}</span>
      </div>

      {canEdit ? (
        <div className="mt-5 flex gap-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") void add(); }}
            placeholder="Add a milestone..."
            className="h-10 min-w-0 flex-1 rounded-md border border-border px-3 text-sm"
          />
          <Button size="sm" onClick={() => void add()} disabled={!title.trim()}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      ) : null}

      {error || actionError ? (
        <p className="mt-4 rounded-md bg-[#fad9db] px-3 py-2 text-sm" role="alert">
          {actionError ?? error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-5 text-sm text-muted">Loading milestones...</p>
      ) : milestones.length ? (
        <ol className="mt-5 space-y-3">
          {milestones.map((milestone, index) => {
            const isEditing = editingId === milestone.id;
            const isBusy = busyId === milestone.id;
            const isCompleted = milestone.status === "completed";

            return (
              <li key={milestone.id} className="rounded-md bg-surface p-3">
                {isEditing ? (
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold">
                      Title
                      <input
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3"
                      />
                    </label>
                    <label className="block text-sm font-semibold">
                      Description
                      <textarea
                        value={draftDescription}
                        onChange={(event) => setDraftDescription(event.target.value)}
                        rows={3}
                        className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2"
                      />
                    </label>
                    <label className="block text-sm font-semibold">
                      Due date
                      <input
                        type="date"
                        value={draftDueDate}
                        onChange={(event) => setDraftDueDate(event.target.value)}
                        className="mt-1 h-10 rounded-md border border-border bg-white px-3"
                      />
                    </label>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => void saveEditing(milestone.id)} disabled={isBusy || !draftTitle.trim()}>
                        <Save className="h-4 w-4" /> Save
                      </Button>
                      <Button size="sm" variant="secondary" onClick={cancelEditing} disabled={isBusy}>
                        <X className="h-4 w-4" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      disabled={!canEdit || isBusy}
                      onClick={() => void toggle(milestone.id, isCompleted)}
                      aria-label={isCompleted ? `Mark ${milestone.title} incomplete` : `Complete ${milestone.title}`}
                      className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded border ${isCompleted ? "border-foreground bg-foreground text-white" : "border-border"}`}
                    >
                      {isCompleted ? <Check className="h-4 w-4" /> : null}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-sm ${isCompleted ? "text-muted line-through" : "font-semibold"}`}>
                          {milestone.title}
                        </span>
                        {milestone.due_date ? <span className="text-xs text-muted">Due {milestone.due_date}</span> : null}
                      </div>
                      {milestone.description ? <p className="mt-1 text-xs leading-5 text-muted">{milestone.description}</p> : null}
                    </div>

                    {canEdit ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => void reorder(milestone.id, "up")}
                          disabled={isBusy || index === 0}
                          aria-label={`Move ${milestone.title} up`}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => void reorder(milestone.id, "down")}
                          disabled={isBusy || index === milestones.length - 1}
                          aria-label={`Move ${milestone.title} down`}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => startEditing(milestone.id)} disabled={isBusy} aria-label={`Edit ${milestone.title}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => void deleteMilestone(milestone.id, milestone.title)} disabled={isBusy} aria-label={`Delete ${milestone.title}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="mt-4">
          <EmptyState title="No milestones yet." description="Add a small sequence of outcomes to make progress visible." />
        </div>
      )}
    </section>
  );
}
