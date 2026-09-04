import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AssetCollection } from "@/types/domain";

interface CollectionSinglePickerProps {
  collections: AssetCollection[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  compact?: boolean;
}

export function CollectionSinglePicker({ collections, value, onChange, label = "Collection", compact = false }: CollectionSinglePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = collections.find((collection) => collection.id === value);
  const filtered = collections.filter((collection) => collection.name.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    const close = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, []);

  return <div ref={rootRef} className="relative min-w-0">
    {label ? <span className="text-sm font-semibold">{label}</span> : null}
    <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} className={`${label ? "mt-1" : ""} flex h-10 w-full min-w-0 items-center gap-2 rounded-md border border-border bg-white px-3 text-left text-sm transition hover:border-[#1111112e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${compact ? "" : "min-h-11"}`}>
      <span className={selected ? "truncate text-foreground" : "truncate text-muted"}>{selected?.name ?? "Select collection"}</span><ChevronDown className={`ml-auto h-4 w-4 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} />
    </button>
    {open ? <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-border bg-white shadow-card" role="listbox" aria-label={label ?? "Collection"}>
      {collections.length > 6 ? <div className="border-b border-border p-2"><div className="flex items-center gap-2 rounded-md border border-border px-3"><Search className="h-4 w-4 shrink-0 text-muted" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search collections..." aria-label="Search collections" className="h-9 min-w-0 flex-1 text-sm outline-none" /></div></div> : null}
      <div className="max-h-52 overflow-y-auto p-1">{filtered.length ? filtered.map((collection) => <button key={collection.id} type="button" role="option" aria-selected={collection.id === value} onClick={() => { onChange(collection.id); setOpen(false); setQuery(""); }} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]"><span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${collection.id === value ? "border-foreground bg-foreground text-white" : "border-[#11111133] text-transparent"}`}><Check className="h-3 w-3" /></span><span className="truncate">{collection.name}</span></button>) : <p className="px-3 py-5 text-center text-sm text-muted">No collections found</p>}</div>
    </div> : null}
  </div>;
}
