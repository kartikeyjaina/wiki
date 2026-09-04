import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { SearchResult } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const filters = ["all", "wiki", "assets", "ideas", "comments", "projects", "people"] as const;
const RECENT_SEARCHES_KEY = "futurelab-searches";
const SEARCH_PAGE_SIZE = 30;

function readRecentSearches(): string[] {
  try {
    const value = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string") ? parsed.slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>(readRecentSearches);
  const [activeIndex, setActiveIndex] = useState(0);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  useEffect(() => {
    const client = supabase;
    const normalizedQuery = query.trim();
    if (!open || !client || normalizedQuery.length < 2) {
      requestIdRef.current += 1;
      setResults([]);
      setLoading(false);
      setLoadingMore(false);
      setHasMore(false);
      setError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    const handle = window.setTimeout(() => {
      setLoading(true);
      setLoadingMore(false);
      setError(null);
      void (async () => {
        const { data, error: searchError } = await client.rpc("global_search", {
          search_query: normalizedQuery,
          type_filter: filter === "all" ? null : filter,
          page_size: SEARCH_PAGE_SIZE,
          page_offset: 0,
        });
        if (requestId !== requestIdRef.current) return;
        if (searchError) {
          setResults([]);
          setHasMore(false);
          setError("Search could not be completed. Please try again.");
        } else {
          const next = (data ?? []) as SearchResult[];
          setResults(next);
          setHasMore(next.length === SEARCH_PAGE_SIZE);
          setActiveIndex(0);
        }
        setLoading(false);
      })();
    }, 180);

    return () => window.clearTimeout(handle);
  }, [filter, open, query]);

  async function loadMore() {
    const client = supabase;
    const normalizedQuery = query.trim();
    if (!client || !hasMore || loadingMore || normalizedQuery.length < 2) return;

    const requestId = requestIdRef.current;
    setLoadingMore(true);
    setError(null);
    const { data, error: searchError } = await client.rpc("global_search", {
      search_query: normalizedQuery,
      type_filter: filter === "all" ? null : filter,
      page_size: SEARCH_PAGE_SIZE,
      page_offset: results.length,
    });
    if (requestId !== requestIdRef.current) return;
    if (searchError) {
      setError("More results could not be loaded. Please try again.");
    } else {
      const next = (data ?? []) as SearchResult[];
      setResults((current) => [...current, ...next]);
      setHasMore(next.length === SEARCH_PAGE_SIZE);
    }
    setLoadingMore(false);
  }

  const grouped = useMemo(() => results.reduce<Record<string, SearchResult[]>>((acc, result) => {
    acc[result.type] = [...(acc[result.type] ?? []), result];
    return acc;
  }, {}), [results]);

  function rememberSearch(value: string) {
    const normalized = value.trim();
    if (!normalized) return;
    const next = [normalized, ...recent.filter((item) => item !== normalized)].slice(0, 5);
    setRecent(next);
    try { localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)); } catch { /* localStorage may be unavailable */ }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#11111133] p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Global search">
      <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-xl bg-white shadow-lift">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <Search className="h-5 w-5 text-muted" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") onOpenChange(false);
              if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0))); }
              if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
              if (event.key === "Enter" && results[activeIndex]) { event.preventDefault(); rememberSearch(query); navigate(results[activeIndex].href); onOpenChange(false); }
              else if (event.key === "Enter") rememberSearch(query);
            }}
            placeholder="Search everything..."
            aria-label="Search everything"
            className="h-11 flex-1 border-0 bg-transparent text-lg outline-none placeholder:text-muted"
          />
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Close search">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-border px-5 py-3" aria-label="Search filters">
          {filters.map((item) => <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)} className={`rounded-pill px-3 py-1.5 text-xs font-semibold capitalize ${filter === item ? "bg-foreground text-white" : "bg-surface text-muted"}`}>{item}</button>)}
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-5">
          {!supabase ? (
            <EmptyState title="Search is ready for data." description="Connect Supabase and apply the schema to search wiki pages, assets, ideas, comments, projects, and people." />
          ) : query.trim().length < 2 ? (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-foreground">Recent searches</p>
              {recent.length ? recent.map((item) => <button className="block text-sm text-muted" key={item} onClick={() => setQuery(item)}>{item}</button>) : <p className="text-sm text-muted">No recent searches yet.</p>}
            </div>
          ) : loading ? (
            <div className="space-y-3" aria-live="polite" aria-busy="true"><div className="h-16 animate-pulse rounded-lg bg-surface" /><div className="h-16 animate-pulse rounded-lg bg-surface" /><p className="text-center text-sm text-muted">Searching…</p></div>
          ) : error && !results.length ? (
            <p className="rounded-md bg-[#fad9db] px-4 py-3 text-sm" role="alert">{error}</p>
          ) : results.length ? (
            <div className="space-y-7">
              {Object.entries(grouped).map(([group, items]) => <section key={group}><h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted">{group.replace("_", " ")}</h3><div className="space-y-2">{items.map((item) => <Link key={`${item.type}-${item.id}`} to={item.href} onClick={() => { rememberSearch(query); onOpenChange(false); }} className={`block rounded-lg border border-border px-4 py-3 transition hover:border-[#1111112e] hover:bg-surface ${results.indexOf(item) === activeIndex ? "border-[#1111112e] bg-surface" : ""}`}><span className="font-display text-base font-bold tracking-[-0.03em]">{item.title}</span>{item.excerpt ? <span className="mt-1 block text-sm text-muted">{item.excerpt}</span> : null}</Link>)}</div></section>)}
              {error ? <p className="rounded-md bg-[#fad9db] px-4 py-3 text-sm" role="alert">{error}</p> : null}
              {hasMore ? <div className="flex justify-center"><button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="rounded-pill bg-foreground px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{loadingMore ? "Loading more…" : "Load more results"}</button></div> : null}
            </div>
          ) : (
            <EmptyState title="Nothing matched." description="Try a different phrase or remove a filter." />
          )}
        </div>
      </div>
    </div>
  );
}
