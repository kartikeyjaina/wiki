import { Download, Package } from "lucide-react";
import type { FeaturedKit } from "@/types/domain";
import { downloadAsset } from "@/lib/storage";
import { formatFileSize } from "@/lib/file-preview";

const accents: Record<string, string> = {
  sage: "bg-[#e5eee8]",
  butter: "bg-[#f7efc9]",
  blush: "bg-[#f5e1df]",
  sky: "bg-[#dfeaf2]",
  lilac: "bg-[#e9e4f1]",
};

export function FeaturedKitCard({ kit }: { kit: FeaturedKit }) {
  async function download() {
    if (!kit.package_storage_path) return;
    await downloadAsset(kit.package_storage_path, `${kit.slug}.zip`);
  }

  return (
    <article className={`group flex min-h-64 flex-col rounded-2xl border border-[#11111112] p-6 transition hover:-translate-y-1 hover:shadow-card ${accents[kit.accent] ?? accents.sage}`}>
      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
        <span className="inline-flex items-center gap-2"><Package className="h-3.5 w-3.5" /> ZIP kit</span>
        <span>{kit.package_size ? formatFileSize(kit.package_size) : "Package unavailable"}</span>
      </div>
      <h3 className="mt-7 font-display text-2xl font-bold tracking-[-0.04em]">{kit.name}</h3>
      <p className="mt-3 text-sm leading-6 text-muted">{kit.description}</p>
      <div className="mt-auto pt-7">
        <button type="button" onClick={() => void download()} disabled={!kit.package_storage_path} className="inline-flex items-center gap-2 text-sm font-bold transition hover:text-muted disabled:cursor-not-allowed disabled:opacity-50">
          Download kit <span className="grid h-8 w-8 place-items-center rounded-full bg-white/80 transition group-hover:bg-white"><Download className="h-4 w-4" /></span>
        </button>
      </div>
    </article>
  );
}
