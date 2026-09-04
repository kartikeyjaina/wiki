import { useState } from "react";
import { Download, Paperclip, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useProjectAttachments } from "@/hooks/useProjectAttachments";
import { useProfile } from "@/hooks/useProfile";
import { formatFileSize } from "@/lib/file-preview";
import type { ProjectAttachment } from "@/types/domain";

export function ProjectAttachments({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const { attachments, loading, error, upload, remove, download } = useProjectAttachments(projectId);
  const { profile } = useProfile();
  const [description, setDescription] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  async function onUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true); setActionError(null);
    try { await upload(file, description); setDescription(""); } catch { setActionError("The attachment could not be uploaded."); } finally { setUploading(false); }
  }
  async function onRemove(attachment: ProjectAttachment) {
    try { await remove(attachment); } catch { setActionError("The attachment could not be removed."); }
  }
  return <section className="rounded-xl border border-border bg-white p-6"><div className="flex items-center justify-between gap-3"><h2 className="font-display text-xl font-bold">Attachments</h2><Paperclip className="h-5 w-5 text-muted" /></div>{canEdit ? <div className="mt-4 grid gap-3 rounded-lg bg-surface p-4 sm:grid-cols-[1fr_auto]"><label className="text-sm font-semibold">Description<input value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3" placeholder="Optional context" /></label><label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 self-end rounded-md bg-foreground px-4 text-sm font-semibold text-white">{uploading ? "Uploading..." : <><Upload className="h-4 w-4" />Upload file</>}<input type="file" className="sr-only" disabled={uploading} onChange={(event) => void onUpload(event.target.files?.[0])} /></label></div> : null}{error || actionError ? <p className="mt-3 rounded-md bg-[#fad9db] px-4 py-3 text-sm" role="alert">{error ?? actionError}</p> : null}{loading ? <p className="mt-4 text-sm text-muted" role="status">Loading attachments...</p> : attachments.length ? <ul className="mt-4 divide-y divide-border">{attachments.map((attachment) => <li key={attachment.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{attachment.file_name}</p><p className="text-xs text-muted">{formatFileSize(attachment.file_size)}{attachment.description ? ` · ${attachment.description}` : ""}</p></div><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => void download(attachment)} aria-label={`Download ${attachment.file_name}`}><Download className="h-4 w-4" /></Button>{canEdit && profile ? <Button size="icon" variant="ghost" onClick={() => void onRemove(attachment)} aria-label={`Remove ${attachment.file_name}`}><Trash2 className="h-4 w-4" /></Button> : null}</div></li>)}</ul> : <div className="mt-4"><EmptyState title="No attachments yet." description="Add working files so the project context stays together." /></div>}</section>;
}