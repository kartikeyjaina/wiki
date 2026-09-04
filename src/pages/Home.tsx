import { Archive, FolderKanban, Lightbulb } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { IngredientPulse } from "@/components/ingredients/IngredientPulse";
import { useAssets } from "@/hooks/useAssets";
import { useIdeas } from "@/hooks/useIdeas";
import { rankIdeas } from "@/lib/ranking";
import { RecentlyViewed } from "@/components/workspace/RecentlyViewed";

const areas = [
  { label: "Assets", href: "/assets", icon: Archive, accent: "fl-card-pink" },
  { label: "Ideas", href: "/ideas", icon: Lightbulb, accent: "fl-card-yellow" },
  { label: "Projects", href: "/projects", icon: FolderKanban, accent: "fl-card-blue" },
];

export function Home() {
  const { ideas, loading: ideasLoading, error: ideasError } = useIdeas();
  const trending = rankIdeas(ideas, "trending").slice(0, 3);
  const { assets: recentAssets, loading: assetsLoading, error: assetsError } = useAssets({ limit: 3 });

  return (
    <div>
      <PageHeader eyebrow="Futurelab workspace" title="Where Futurelab works, thinks, creates and shares." description="A living workspace for ideas, projects, assets and the people behind them." />
      <section className="grid gap-4 md:grid-cols-3" aria-label="Workspace areas">
        {areas.map((area) => {
          const Icon = area.icon;
          return <Link key={area.href} to={area.href} className={`fl-card ${area.accent} group p-6`}><div className="flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-pill bg-white/80 shadow-sm transition-transform duration-300 group-hover:rotate-[-4deg] group-hover:scale-105"><Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" /></span><span aria-hidden="true" className="text-2xl leading-none opacity-40 transition-transform duration-300 group-hover:translate-x-1">↗</span></div><span className="mt-10 block font-display text-2xl font-bold tracking-[-0.03em]">{area.label}</span><span className="mt-2 block text-sm text-muted">Explore the latest {area.label.toLowerCase()}.</span></Link>;
        })}
      </section>
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="fl-card fl-card-purple p-6" data-active="false"><div className="mb-5 flex items-center justify-between"><h2 className="font-display text-2xl font-bold tracking-[-0.03em]">Trending ideas</h2><IngredientPulse /></div>{ideasError ? <p className="rounded-md bg-[#FAD9DB] px-4 py-3 text-sm" role="alert">Ideas could not be loaded. Please try again later.</p> : ideasLoading ? <div className="space-y-4" aria-busy="true" aria-label="Loading trending ideas"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div> : trending.length ? <div className="space-y-3">{trending.map((idea) => <Link key={idea.id} to={`/ideas/${idea.id}`} className="group block rounded-lg border border-black/5 bg-white/70 p-4 transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-card"><span className="font-semibold">{idea.title}</span><span className="mt-1 block text-sm text-muted">▲ {idea.score ?? 0} · {idea.comment_count ?? 0} comments</span></Link>)}</div> : <EmptyState title="No ideas yet." description="This is the quiet part. Submit the first idea and start the conversation." />}</div>
        <div className="fl-card fl-card-green p-6" data-active="false"><h2 className="mb-5 font-display text-2xl font-bold tracking-[-0.03em]">Recently added assets</h2>{assetsError ? <p className="rounded-md bg-[#FAD9DB] px-4 py-3 text-sm" role="alert">Assets could not be loaded. Please try again later.</p> : assetsLoading ? <div className="space-y-4" aria-busy="true" aria-label="Loading recent assets"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div> : recentAssets.length ? <div className="space-y-3">{recentAssets.map((asset) => <Link key={asset.id} to={`/assets/${asset.id}`} className="group block rounded-lg border border-black/5 bg-white/70 p-4 transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-card"><span className="font-semibold">{asset.name}</span><span className="mt-1 block text-sm text-muted">{asset.category ?? asset.asset_type}</span></Link>)}</div> : <EmptyState title="No assets yet." description="Connect the brand repository importer or upload brand files through admin." />}</div>
      </section>
      <div className="mt-6"><RecentlyViewed /></div>
    </div>
  );
}
