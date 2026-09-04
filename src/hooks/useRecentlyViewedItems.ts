import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { EntityType } from "@/types/domain";

export interface RecentlyViewedItem { id: string; entity_type: EntityType; title: string; href: string; last_viewed_at: string; }

export function useRecentlyViewedItems(limit = 6) {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    const client = supabase;
    void (async () => {
      const recent = await client.from("recently_viewed").select("entity_type, entity_id, last_viewed_at").order("last_viewed_at", { ascending: false }).limit(limit * 2);
      if (recent.error || !recent.data?.length) { setLoading(false); return; }
      const rows = recent.data as { entity_type: EntityType; entity_id: string; last_viewed_at: string }[];
      const ids = (type: EntityType) => rows.filter((row) => row.entity_type === type).map((row) => row.entity_id).slice(0, limit);
      const [assets, ideas, projects, wiki] = await Promise.all([
        client.from("assets").select("id, name").in("id", ids("asset")),
        client.from("ideas").select("id, title").in("id", ids("idea")),
        client.from("projects").select("id, title").in("id", ids("project")),
        client.from("wiki_pages").select("id, title, slug").in("id", ids("wiki_page")),
      ]);
      const titles = new Map<string, { title: string; href: string }>();
      for (const item of assets.data ?? []) titles.set(`asset:${item.id}`, { title: item.name, href: `/assets/${item.id}` });
      for (const item of ideas.data ?? []) titles.set(`idea:${item.id}`, { title: item.title, href: `/ideas/${item.id}` });
      for (const item of projects.data ?? []) titles.set(`project:${item.id}`, { title: item.title, href: `/projects/${item.id}` });
      for (const item of wiki.data ?? []) titles.set(`wiki_page:${item.id}`, { title: item.title, href: `/wiki/${item.slug}` });
      const resolved = rows.map((row) => { const item = titles.get(`${row.entity_type}:${row.entity_id}`); return item ? { id: row.entity_id, entity_type: row.entity_type, last_viewed_at: row.last_viewed_at, ...item } : null; });
      setItems(resolved.filter((item): item is RecentlyViewedItem => item !== null).slice(0, limit));
      setLoading(false);
    })();
  }, [limit]);
  return { items, loading };
}