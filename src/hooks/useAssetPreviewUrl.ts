import { useEffect, useState } from "react";
import { getAssetPreviewUrl } from "@/lib/storage";

export function useAssetPreviewUrl(storagePath: string | null) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!storagePath) {
      setPreviewUrl(null);
      return;
    }

    let cancelled = false;

    setLoading(true);

    void getAssetPreviewUrl(storagePath)
      .then((url) => {
        if (!cancelled) {
          setPreviewUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewUrl(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [storagePath]);

  return {
    previewUrl,
    loading,
  };
}