import { useState } from "react";
import { Download, Paperclip, Pencil, Save, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useProjectAttachments } from "@/hooks/useProjectAttachments";
import { formatFileSize } from "@/lib/file-preview";
import type { ProjectAttachment } from "@/types/domain";

export function ProjectAttachments({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const { attachments, loading, error, upload, update, remove, download } = useProjectAttachments(projectId);
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function onUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setActionError(null);
    try {
      await upload(file, description);
      setDescription("");
    } catch (uploadError) {
      setActionError(uploadError instanceof Error ? uploadError.message : "The attachment could not be uploaded.");
    } finally {
      setUploading(false);
    }
  }

  function startEditing(attachment: ProjectAttachment) {
    setEditingId(attachment.id);
    setEditingDescription(attachment.description ?? "");
    setActionError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingDescription("");
  }

  async function saveDescription(id: string) {
    setBusyId(id);
    setActionError(null);
    try {
      await update(id, editingDescription);
      cancelEditing();
    } catch (updateError) {
      setActionError(updateError instanceof Error ? updateError.message : "The attachment description could not be updated.");
    } finally {
      setBusyId(null);
    }
  }

  async function onRemove(attachment: ProjectAttachment) {
    if (!window.confirm(`Remove “${attachment.file_name}”?`)) return;
    setBusyId(attachment.id);
    setActionError(null);
    try {
      await remove(attachment);
    } catch (removeError) {
      setActionError(removeError instanceof Error ? removeError.message : "The attachment could not be removed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Attachments</h2>
          <p className="mt-1 text-sm text-muted">Keep working files and context with the project.</p>
        </div>
        <Paperclip className="h-5 w-5 text-muted" />
      </div>

      {canEdit ? (
        <div className="mt-4 grid gap-3 rounded-lg bg-surface p-4 sm:grid-cols-[1fr_auto]">
          <label className="text-sm font-semibold">
            Description
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3"
              placeholder="Optional context"
            />
          </label>
          <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 self-end rounded-md bg-foreground px-4 text-sm font-semibold text-white">
            {uploading ? "Uploading..." : <><Upload className="h-4 w-4" /> Upload file</>}
            <input
              type="file"
              className="sr-only"
              disabled={uploading}
              onChange={(event) => {
                void onUpload(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      ) : null}

      {error || actionError ? (
        <p className="mt-3 rounded-md bg-[#fad9db] px-4 py-3 text-sm" role="alert">
          {error ?? actionError}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-muted" role="status">Loading attachments...</p>
      ) : attachments.length ? (
        <ul className="mt-4 divide-y divide-border">
          {attachments.map((attachment) => {
            const isEditing = editingId === attachment.id;
            const isBusy = busyId === attachment.id;

            return (
              <li key={attachment.id} className="py-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">{attachment.file_name}</p>
                    <label className="block text-sm font-semibold">
                      Description
                      <textarea
                        value={editingDescription}
                        onChange={(event) => setEditingDescription(event.target.value)}
                        rows={3}
                        className="mt-1 w-full rounded-md border border-border px-3 py-2"
                      />
                    </label>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => void saveDescription(attachment.id)} disabled={isBusy}>
                        <Save className="h-4 w-4" /> Save
                      </Button>
                      <Button size="sm" variant="secondary" onClick={cancelEditing} disabled={isBusy}>
                        <X className="h-4 w-4" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{attachment.file_name}</p>
                      <p className="text-xs text-muted">
                        {formatFileSize(attachment.file_size)}
                        {attachment.description ? ` · ${attachment.description}` : " · No description"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => void download(attachment)} disabled={isBusy} aria-label={`Download ${attachment.file_name}`}>
                        <Download className="h-4 w-4" />
                      </Button>
                      {canEdit ? (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => startEditing(attachment)} disabled={isBusy} aria-label={`Edit description for ${attachment.file_name}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => void onRemove(attachment)} disabled={isBusy} aria-label={`Remove ${attachment.file_name}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-4">
          <EmptyState title="No attachments yet." description="Add working files so the project context stays together." />
        </div>
      )}
    </section>
  );
}
