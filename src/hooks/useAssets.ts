import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Asset } from "@/types/domain";
import { clampPageSize, hasNextPage, pageRange } from "@/lib/pagination";

interface UseAssetsOptions {
  limit?: number;
  pageSize?: number;
  collectionId?: string;
  search?: string;
}

export function useAssets(options: UseAssetsOptions = {}) {
  const { limit, pageSize, collectionId, search } = options;
  const effectivePageSize = clampPageSize(limit ?? pageSize);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      setHasMore(false);
      return;
    }

    setLoading(true);
    setError(null);
    const { from, to } = pageRange(0, effectivePageSize);

    let query = supabase
      .from("assets")
      .select("*, collection:asset_collections(id, name, slug)")
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (collectionId) query = query.eq("collection_id", collectionId);

    const normalizedSearch = search?.trim();
    if (normalizedSearch) {
      const escaped = normalizedSearch.replace(/[%_]/g, "\\$&");
      query = query.or(`name.ilike.%${escaped}%,category.ilike.%${escaped}%,asset_type.ilike.%${escaped}%`);
    }

    const { data, error: loadError } = await query;
    if (loadError) {
      setAssets([]);
      setHasMore(false);
      setError(loadError.message);
      setLoading(false);
      return;
    }

    const next = (data ?? []) as Asset[];
    setAssets(next);
    setHasMore(limit === undefined && hasNextPage(next.length, effectivePageSize));
    setLoading(false);
  }, [collectionId, effectivePageSize, limit, search]);

  const loadMore = useCallback(async () => {
    if (!supabase || !hasMore || loadingMore) return;

    setLoadingMore(true);
    setError(null);
    const { from, to } = pageRange(assets.length, effectivePageSize);
    let query = supabase
      .from("assets")
      .select("*, collection:asset_collections(id, name, slug)")
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (collectionId) query = query.eq("collection_id", collectionId);

    const normalizedSearch = search?.trim();
    if (normalizedSearch) {
      const escaped = normalizedSearch.replace(/[%_]/g, "\\$&");
      query = query.or(`name.ilike.%${escaped}%,category.ilike.%${escaped}%,asset_type.ilike.%${escaped}%`);
    }

    const { data, error: loadError } = await query;
    if (loadError) {
      setError(loadError.message);
      setLoadingMore(false);
      return;
    }

    const next = (data ?? []) as Asset[];
    setAssets((current) => [...current, ...next]);
    setHasMore(hasNextPage(next.length, effectivePageSize));
    setLoadingMore(false);
  }, [assets.length, collectionId, effectivePageSize, hasMore, loadingMore, search]);

  useEffect(() => {
    void load();
  }, [load]);

  return { assets, loading, loadingMore, hasMore, error, reload: load, loadMore };
}
