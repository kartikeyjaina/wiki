import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { SearchResult } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const filters = ["all", "wiki", "assets", "ideas", "comments", "projects", "people"] as const;

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>(() => JSON.parse(localStorage.getItem("futurelab-searches") ?? "[]") as string[]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    const client = supabase;
    if (!open || !client || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const handle = window.setTimeout(() => {
      setLoading(true);
      void (async () => {
        const { data } = await client.rpc("global_search", {
          search_query: query.trim(),
          type_filter: filter === "all" ? null : filter,
        });
        setResults((data ?? []) as SearchResult[]);
        setLoading(false);
      })();
    }, 180);

    return () => window.clearTimeout(handle);
  }, [filter, open, query]);

  const grouped = useMemo(() => {
    return results.reduce<Record<string, SearchResult[]>>((acc, result) => {
      acc[result.type] = [...(acc[result.type] ?? []), result];
      return acc;
    }, {});
  }, [results]);

  function rememberSearch(value: string) {
    if (!value.trim()) return;
    const next = [value.trim(), ...recent.filter((item) => item !== value.trim())].slice(0, 5);
    setRecent(next);
    localStorage.setItem("futurelab-searches", JSON.stringify(next));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#11111133] p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Search">
      <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-xl bg-white shadow-lift">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <Search className="h-5 w-5 text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") onOpenChange(false);
              if (event.key === "Enter") rememberSearch(query);
            }}
            placeholder="Search everything..."
            className="h-11 flex-1 border-0 bg-transparent text-lg outline-none placeholder:text-muted"
          />
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close search</span>
          </Button>
        </div>
        <div className="flex gap-2 overflow-x-auto border-b border-border px-5 py-3">
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-pill px-3 py-1.5 text-xs font-semibold capitalize ${
                filter === item ? "bg-foreground text-white" : "bg-surface text-muted"
              }`}
            >
              {item}
            </button>
          ))}
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
            <p className="py-10 text-center text-sm text-muted">Searching...</p>
          ) : results.length ? (
            <div className="space-y-7">
              {Object.entries(grouped).map(([group, items]) => (
                <section key={group}>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted">{group.replace("_", " ")}</h3>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <Link
                        key={`${item.type}-${item.id}`}
                        to={item.href}
                        onClick={() => {
                          rememberSearch(query);
                          onOpenChange(false);
                        }}
                        className="block rounded-lg border border-border px-4 py-3 transition hover:border-[#1111112e] hover:bg-surface"
                      >
                        <span className="font-display text-base font-bold tracking-[-0.03em]">{item.title}</span>
                        {item.excerpt ? <span className="mt-1 block text-sm text-muted">{item.excerpt}</span> : null}
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <EmptyState title="Nothing matched." description="Try a different phrase or remove a filter." />
          )}
        </div>
      </div>
    </div>
  );
}
