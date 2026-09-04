import { env } from "./env";
import { supabase } from "./supabase";

export const ASSET_BUCKET = env.assetBucket;

export async function getAssetDownloadUrl(storagePath: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.storage.from(ASSET_BUCKET).createSignedUrl(storagePath, 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function downloadAsset(storagePath: string, filename?: string) {
  const url = await getAssetDownloadUrl(storagePath);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename ?? storagePath.split("/").at(-1) ?? "asset";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export async function uploadAssetFile(file: File, folder = "uploads") {
  if (!supabase) throw new Error("Supabase is not configured.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
  const safeFolder = folder.split("/").filter((part) => part && part !== "." && part !== "..").map((part) => part.replace(/[^a-zA-Z0-9._-]/g, "-")).join("/") || "uploads";
  const path = `${safeFolder}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from(ASSET_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export async function uploadKitPackage(file: File, kitId: string) {
  if (file.type !== "application/zip" && !file.name.toLowerCase().endsWith(".zip")) {
    throw new Error("Kit packages must be ZIP files.");
  }
  return uploadAssetFile(file, `kits/${kitId}`);
}
