import { ArrowUpRight, Folder } from "lucide-react";
import { Link } from "react-router-dom";
import type { AssetCollection } from "@/types/domain";

const accents: Record<string, string> = {
  sage: "bg-[#e5eee8]", butter: "bg-[#f7efc9]", blush: "bg-[#f5e1df]", sky: "bg-[#dfeaf2]", lilac: "bg-[#e9e4f1]",
};

export function CollectionCard({ collection }: { collection: AssetCollection }) {
  return (
    <Link to={`/collections/${collection.slug}`} className={`group block min-h-64 rounded-2xl border border-[#11111112] p-6 transition hover:-translate-y-1 hover:shadow-card ${accents[collection.accent] ?? accents.sage}`}>
      <div className="flex items-center justify-between"><span className="font-display text-sm font-bold">{String(collection.display_order).padStart(2, "0")}</span><span className="rounded-pill bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em]">{collection.file_count ?? 0} files</span></div>
      <Folder className="mt-9 h-7 w-7" strokeWidth={1.6} />
      <h3 className="mt-5 font-display text-xl font-bold tracking-[-0.035em]">{collection.name}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{collection.description}</p>
      <ArrowUpRight className="mt-5 h-5 w-5 transition group-hover:translate-x-1 group-hover:-translate-y-1" />
    </Link>
  );
}
