import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ASSET_BUCKET } from "@/lib/storage";
import type { Asset } from "@/types/domain";

export function useAssets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const client = supabase;

    setLoading(true);
    setError(null);

    const { data, error: loadError } = await client
      .from("assets")
      .select("*, asset_collections(id, name, slug)")
      .order("updated_at", { ascending: false });

    if (loadError) {
      setError(loadError.message);
      setAssets([]);
      setLoading(false);
      return;
    }

    const assetsWithPreviews = await Promise.all(
      (data ?? []).map(async (asset) => {
        if (!asset.storage_path) {
          return { ...asset, collection: asset.asset_collections ?? null } as Asset;
        }

        const { data: signed, error: signedError } =
          await client.storage
            .from(ASSET_BUCKET)
            .createSignedUrl(asset.storage_path, 3600);

        if (signedError) {
          console.error(
            `Could not create preview URL for asset ${asset.id}:`,
            signedError
          );

          return { ...asset, collection: asset.asset_collections ?? null } as Asset;
        }

        return {
          ...asset,
          collection: asset.asset_collections ?? null,
          preview_url: signed.signedUrl,
        } as Asset;
      })
    );

    setAssets(assetsWithPreviews);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    assets,
    loading,
    error,
    reload: load,
  };
}