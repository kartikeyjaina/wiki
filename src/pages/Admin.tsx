import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useProfile } from "@/hooks/useProfile";
import { env } from "@/lib/env";
import { getMissingEnvKeys, hasRealSupabaseEnv } from "@/lib/real-env";
import { uploadAssetFile } from "@/lib/storage";

export function Admin() {
  const { profile, isAdmin } = useProfile();
  const missingEnv = getMissingEnvKeys();
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function handleUpload() {
    if (!selectedFile) {
      setUploadMessage("Choose a file to upload into the asset bucket.");
      return;
    }

    setUploading(true);
    setUploadMessage(null);

    try {
      const path = await uploadAssetFile(selectedFile, "approved");
      setUploadMessage(`Upload complete: ${path}`);
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  if (!isAdmin && hasRealSupabaseEnv()) {
    return <EmptyState title="Admin access required." description="Only users with the admin role can manage assets, visibility, and governance settings." />;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Govern the workspace carefully."
        description="The live project connection is active when the environment variables are set, and all admin actions should be validated by Supabase RLS and the auth trigger."
      />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-white p-6">
          <h2 className="font-display text-2xl font-bold tracking-[-0.03em]">Project connection</h2>
          {missingEnv.length ? (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-[#b42318]">Missing environment variables</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
                {missingEnv.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">Supabase is configured for URL, anon key, and the asset bucket: {env.assetBucket}</p>
          )}
          <div className="mt-4 text-sm text-muted">
            Allowlisted domains: {env.allowedDomains.join(", ") || "not configured"}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-6">
          <h2 className="font-display text-2xl font-bold tracking-[-0.03em]">Admin enforcement</h2>
          <p className="mt-4 text-sm text-muted">Role: {profile?.role ?? "member"}</p>
          <p className="mt-2 text-sm text-muted">Backend checks should rely on the profile trigger and an admin-only policy layer in Supabase. The UI blocks the admin routes when the profile is not elevated.</p>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-white p-6">
        <h2 className="font-display text-2xl font-bold tracking-[-0.03em]">Asset upload</h2>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
          <input type="file" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} className="block w-full rounded-md border border-border px-3 py-2 text-sm" />
          <Button onClick={() => void handleUpload()} disabled={uploading || !selectedFile}>
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
        {uploadMessage ? <p className="mt-4 rounded-md bg-surface px-4 py-3 text-sm text-muted">{uploadMessage}</p> : null}
      </section>

      <section className="mt-6 rounded-xl border border-dashed border-border bg-white p-6">
        <h2 className="font-display text-2xl font-bold tracking-[-0.03em]">Import pipeline</h2>
        <p className="mt-4 text-sm leading-6 text-muted">
          The importer should stage the Futurelab Brand Repository metadata into asset collections, assets, asset_versions, asset_tags, and storage paths before it is accepted. This UI prepares the import path while the live repository is connected to your Supabase project.
        </p>
      </section>
    </div>
  );
}
