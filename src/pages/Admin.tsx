import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useProfile } from "@/hooks/useProfile";
import { env } from "@/lib/env";
import { getMissingEnvKeys, hasRealSupabaseEnv } from "@/lib/real-env";
import { uploadAssetFile } from "@/lib/storage";
import { supabase } from "@/lib/supabase";

export function Admin() {
  const { profile, isAdmin } = useProfile();
  const missingEnv = getMissingEnvKeys();
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  async function handleUpload() {
  if (!selectedFile) {
    setUploadMessage("Choose a file first.");
    return;
  }

  if (!supabase) {
    setUploadMessage("Supabase is not configured.");
    return;
  }

  if (!profile?.id) {
    setUploadMessage("Your profile could not be loaded.");
    return;
  }

  setUploadMessage("Uploading...");

  try {
    // 1. Upload the actual file to Supabase Storage.
    const storagePath = await uploadAssetFile(selectedFile, "approved");

    // 2. Create the asset database record.
    const { data: asset, error: assetError } = await supabase
      .from("assets")
      .insert({
        name: selectedFile.name,
        asset_type: selectedFile.type || "application/octet-stream",
        status: "approved",
        storage_path: storagePath,
        version: "1",
        owner_id: profile.id,
        metadata: {
          original_name: selectedFile.name,
          mime_type: selectedFile.type || null,
          size: selectedFile.size,
        },
      })
      .select()
      .single();

    if (assetError) {
      throw assetError;
    }

    // 3. Create the first asset version.
    const { error: versionError } = await supabase
      .from("asset_versions")
      .insert({
        asset_id: asset.id,
        version: "1",
        storage_path: storagePath,
        created_by: profile.id,
        notes: "Initial upload",
      });

    if (versionError) {
      throw versionError;
    }

    setUploadMessage(`Upload complete: ${selectedFile.name}`);

    setSelectedFile(null);

    // If your file input has a ref, reset it here.
  } catch (uploadError) {
    console.error(uploadError);

    setUploadMessage(
      uploadError instanceof Error
        ? `Upload failed: ${uploadError.message}`
        : "Upload failed."
    );
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
