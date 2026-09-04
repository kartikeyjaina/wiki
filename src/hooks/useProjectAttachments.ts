import { useCallback, useEffect, useState } from "react";
import type { ProjectAttachment } from "@/types/domain";
import { supabase } from "@/lib/supabase";
import { ASSET_BUCKET, getAssetDownloadUrl } from "@/lib/storage";

export function useProjectAttachments(projectId: string) {
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    const result = await supabase.from("project_attachments").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
    setAttachments((result.data ?? []) as ProjectAttachment[]);
    setError(result.error ? "We couldn’t load project attachments." : null);
    setLoading(false);
  }, [projectId]);
  useEffect(() => { void load(); }, [load]);

  async function upload(file: File, description: string) {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Sign in to upload an attachment.");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `projects/${projectId}/${crypto.randomUUID()}-${safeName}`;
    const uploadResult = await supabase.storage.from(ASSET_BUCKET).upload(path, file, { upsert: false });
    if (uploadResult.error) throw uploadResult.error;
    const insertResult = await supabase.from("project_attachments").insert({ project_id: projectId, storage_path: path, file_name: file.name, description: description.trim() || null, mime_type: file.type || null, file_size: file.size, uploaded_by: auth.user.id });
    if (insertResult.error) { await supabase.storage.from(ASSET_BUCKET).remove([path]); throw insertResult.error; }
    await load();
  }

  async function remove(attachment: ProjectAttachment) {
    if (!supabase) throw new Error("Supabase is not configured.");
    const result = await supabase.from("project_attachments").delete().eq("id", attachment.id).eq("project_id", projectId);
    if (result.error) throw result.error;
    const storageResult = await supabase.storage.from(ASSET_BUCKET).remove([attachment.storage_path]);
    if (storageResult.error) console.error("Attachment storage cleanup failed", storageResult.error);
    await load();
  }

  async function download(attachment: ProjectAttachment) {
    const url = await getAssetDownloadUrl(attachment.storage_path);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return { attachments, loading, error, upload, remove, download, reload: load };
}