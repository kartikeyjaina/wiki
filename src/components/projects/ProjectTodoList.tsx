import { useState } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useProjectTodos } from "@/hooks/useProjectTodos";

export function ProjectTodoList({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const { todos, loading, error, create, update, remove } = useProjectTodos(projectId);
  const [title, setTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function addTodo() {
    if (!title.trim() || busyId) return;
    setBusyId("create"); setActionError(null);
    try { await create(title); setTitle(""); }
    catch (todoError) { setActionError(todoError instanceof Error ? todoError.message : "Todo could not be added."); }
    finally { setBusyId(null); }
  }

  async function save(id: string) {
    if (!draft.trim() || busyId) return;
    setBusyId(id); setActionError(null);
    try { await update(id, { title: draft.trim() }); setEditingId(null); }
    catch (todoError) { setActionError(todoError instanceof Error ? todoError.message : "Todo could not be updated."); }
    finally { setBusyId(null); }
  }

  async function toggle(id: string, completed: boolean) {
    if (busyId) return;
    setBusyId(id); setActionError(null);
    try { await update(id, { completed }); }
    catch (todoError) { setActionError(todoError instanceof Error ? todoError.message : "Todo could not be updated."); }
    finally { setBusyId(null); }
  }

  async function deleteTodo(id: string) {
    if (busyId || !window.confirm("Delete this task?")) return;
    setBusyId(id); setActionError(null);
    try { await remove(id); if (editingId === id) setEditingId(null); }
    catch (todoError) { setActionError(todoError instanceof Error ? todoError.message : "Todo could not be deleted."); }
    finally { setBusyId(null); }
  }

  const visibleError = actionError ?? error;

  return (
    <section className="rounded-xl border border-border bg-white p-5 sm:p-6" aria-labelledby="project-todo-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 id="project-todo-heading" className="font-display text-xl font-bold tracking-[-0.02em]">Todo</h2><p className="mt-1 text-sm text-muted">Keep the next concrete steps visible.</p></div>
        <span className="rounded-pill bg-surface px-3 py-1 text-sm font-medium text-muted">{todos.filter((todo) => !todo.completed).length} active</span>
      </div>
      {canEdit ? <div className="mt-5 flex flex-col gap-2 sm:flex-row"><input value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void addTodo(); }} placeholder="Add a task..." aria-label="New task" disabled={busyId !== null} className="h-11 min-w-0 flex-1 rounded-md border border-border bg-white px-3 text-sm" /><Button size="sm" disabled={!title.trim() || busyId !== null} onClick={() => void addTodo()} className="h-11 shrink-0"><Plus className="h-4 w-4" /> {busyId === "create" ? "Adding..." : "Add"}</Button></div> : null}
      {visibleError ? <p className="mt-4 rounded-lg border border-black/5 bg-[#FAD9DB] px-4 py-3 text-sm" role="alert">{visibleError}</p> : null}
      {loading ? <p className="mt-5 text-sm text-muted" role="status">Loading todos...</p> : todos.length ? <ul className="mt-5 space-y-2">{todos.map((todo) => { const busy = busyId === todo.id; return <li key={todo.id} className="flex min-w-0 items-center gap-3 rounded-lg bg-surface px-3 py-2.5"><button type="button" aria-label={todo.completed ? "Mark incomplete" : "Mark complete"} disabled={busyId !== null} className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border ${todo.completed ? "border-foreground bg-foreground text-white" : "border-border bg-white"}`} onClick={() => void toggle(todo.id, !todo.completed)}>{todo.completed ? <Check className="h-4 w-4" /> : null}</button>{editingId === todo.id ? <input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void save(todo.id); if (event.key === "Escape") setEditingId(null); }} aria-label="Edit task" disabled={busy} className="h-10 min-w-0 flex-1 rounded-md border border-border bg-white px-2 text-sm" /> : <span className={`min-w-0 flex-1 text-sm ${todo.completed ? "text-muted line-through" : ""}`}>{todo.title}</span>} {canEdit ? <div className="flex shrink-0 gap-1">{editingId === todo.id ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => void save(todo.id)}>{busy ? "Saving..." : "Save"}</Button> : <Button size="icon" variant="ghost" disabled={busyId !== null} aria-label="Edit todo" onClick={() => { setEditingId(todo.id); setDraft(todo.title); }}><Pencil className="h-4 w-4" /></Button>}<Button size="icon" variant="ghost" disabled={busyId !== null} aria-label="Delete todo" onClick={() => void deleteTodo(todo.id)}>{busy ? "…" : <Trash2 className="h-4 w-4" />}</Button></div> : null}</li>; })}</ul> : <div className="mt-5"><EmptyState title="No todos yet." description={canEdit ? "Add the next concrete step for this project." : "No tasks have been added to this project."} /></div>}
    </section>
  );
}