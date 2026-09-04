import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AssetCollection } from "@/types/domain";

interface CollectionMultiPickerProps {
  collections: AssetCollection[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function CollectionMultiPicker({ collections, selectedIds, onChange }: CollectionMultiPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = selectedIds.map((id) => collections.find((collection) => collection.id === id)).filter((collection): collection is AssetCollection => Boolean(collection));
  const filtered = collections.filter((collection) => collection.name.toLowerCase().includes(query.trim().toLowerCase()));
  const visibleSelected = selected.slice(0, 3);
  const hiddenCount = Math.max(0, selected.length - visibleSelected.length);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((selectedId) => selectedId !== id) : [...selectedIds, id]);
  }

  function remove(id: string) {
    onChange(selectedIds.filter((selectedId) => selectedId !== id));
  }

  return (
    <div ref={containerRef} className="relative">
      <span id="kit-collections-label" className="text-sm font-semibold">Collections</span>
      <div role="combobox" tabIndex={0} aria-labelledby="kit-collections-label" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setOpen((current) => !current); } }} className="mt-1 flex min-h-11 w-full cursor-pointer flex-wrap items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-left text-sm transition hover:border-[#1111112e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
        {visibleSelected.map((collection) => <span key={collection.id} className="inline-flex max-w-full items-center gap-1 rounded-pill bg-surface px-2.5 py-1 text-xs font-semibold"><span className="max-w-44 truncate">{collection.name}</span><button type="button" aria-label={`Remove ${collection.name}`} onClick={(event) => { event.stopPropagation(); remove(collection.id); }} className="grid h-4 w-4 shrink-0 place-items-center rounded-full text-muted hover:bg-white hover:text-foreground"><X className="h-3 w-3" /></button></span>)}
        {hiddenCount > 0 ? <span className="rounded-pill bg-surface px-2.5 py-1 text-xs font-semibold text-muted">+ {hiddenCount} more</span> : null}
        {!selected.length ? <span className="text-muted">Select collections</span> : null}
        <ChevronDown className={`ml-auto h-4 w-4 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} />
      </div>
      {open ? <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-border bg-white shadow-card" role="listbox" aria-label="Select collections">
        <div className="border-b border-border p-2"><div className="flex items-center gap-2 rounded-md border border-border px-3"><Search className="h-4 w-4 shrink-0 text-muted" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search collections..." aria-label="Search collections" className="h-10 min-w-0 flex-1 text-sm outline-none" /></div></div>
        <div className="max-h-56 overflow-y-auto p-1">{filtered.length ? filtered.map((collection) => { const checked = selectedIds.includes(collection.id); return <button key={collection.id} type="button" role="option" aria-selected={checked} onClick={() => toggle(collection.id)} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]"><span className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${checked ? "border-foreground bg-foreground text-white" : "border-[#11111133] text-transparent"}`}><Check className="h-3.5 w-3.5" /></span><span className="truncate">{collection.name}</span></button>; }) : <p className="px-3 py-6 text-center text-sm text-muted">No collections found</p>}</div>
        {selected.length ? <div className="flex justify-end border-t border-border px-3 py-2"><button type="button" onClick={() => onChange([])} className="text-xs font-semibold text-muted hover:text-foreground">Clear all</button></div> : null}
      </div> : null}
    </div>
  );
}
