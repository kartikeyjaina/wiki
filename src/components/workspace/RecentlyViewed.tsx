import { Link } from "react-router-dom";
import { EmptyState } from "@/components/ui/EmptyState";
import { useRecentlyViewedItems } from "@/hooks/useRecentlyViewedItems";

export function RecentlyViewed() {
  const { items, loading } = useRecentlyViewedItems();
  return <section className="rounded-xl border border-border bg-white p-6"><h2 className="font-display text-xl font-bold">Continue where you left off</h2>{loading ? <p className="mt-4 text-sm text-muted" role="status">Loading recent work...</p> : items.length ? <ul className="mt-4 divide-y divide-border">{items.map((item) => <li key={`${item.entity_type}-${item.id}`}><Link to={item.href} className="flex items-center justify-between gap-3 py-3"><span className="font-semibold">{item.title}</span><span className="text-xs capitalize text-muted">{item.entity_type.replace("_", " ")}</span></Link></li>)}</ul> : <div className="mt-4"><EmptyState title="Nothing viewed recently." description="Open an asset, idea, project, or Wiki page and it will appear here." /></div>}</section>;
}