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
  { label: "Assets", href: "/assets", icon: Archive },
  { label: "Ideas", href: "/ideas", icon: Lightbulb },
  { label: "Projects", href: "/projects", icon: FolderKanban },
];

export function Home() {
  const { ideas, loading: ideasLoading, error: ideasError } = useIdeas();
  const trending = rankIdeas(ideas, "trending").slice(0, 3);
  const { assets: recentAssets, loading: assetsLoading, error: assetsError } = useAssets({ limit: 3 });

  return (
    <div>
      <PageHeader eyebrow="Futurelab" title="Where Futurelab works, thinks, creates and shares." />
      <section className="grid gap-3 md:grid-cols-3" aria-label="Workspace areas">
        {areas.map((area) => {
          const Icon = area.icon;
          return <Link key={area.href} to={area.href} className="rounded-xl border border-border bg-surface p-5 transition hover:border-[#1111112e] hover:bg-white hover:shadow-card"><Icon className="h-5 w-5" aria-hidden="true" /><span className="mt-8 block font-display text-xl font-bold tracking-[-0.03em]">{area.label}</span></Link>;
        })}
      </section>
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-white p-6">
          <div className="mb-5 flex items-center justify-between"><h2 className="font-display text-2xl font-bold tracking-[-0.03em]">Trending ideas</h2><IngredientPulse /></div>
          {ideasError ? <p className="rounded-md bg-[#fad9db] px-4 py-3 text-sm" role="alert">Ideas could not be loaded. Please try again later.</p> : ideasLoading ? <div className="space-y-4" aria-busy="true" aria-label="Loading trending ideas"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div> : trending.length ? <div className="space-y-4">{trending.map((idea) => <Link key={idea.id} to={`/ideas/${idea.id}`} className="block border-t border-border pt-4"><span className="font-semibold">{idea.title}</span><span className="mt-1 block text-sm text-muted">▲ {idea.score ?? 0} · {idea.comment_count ?? 0} comments</span></Link>)}</div> : <EmptyState title="No ideas yet." description="This is the quiet part. Submit the first idea and start the conversation." />}
        </div>
        <div className="rounded-xl border border-border bg-white p-6">
          <h2 className="mb-5 font-display text-2xl font-bold tracking-[-0.03em]">Recently added assets</h2>
          {assetsError ? <p className="rounded-md bg-[#fad9db] px-4 py-3 text-sm" role="alert">Assets could not be loaded. Please try again later.</p> : assetsLoading ? <div className="space-y-4" aria-busy="true" aria-label="Loading recent assets"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div> : recentAssets.length ? <div className="space-y-4">{recentAssets.map((asset) => <Link key={asset.id} to={`/assets/${asset.id}`} className="block border-t border-border pt-4"><span className="font-semibold">{asset.name}</span><span className="mt-1 block text-sm text-muted">{asset.category ?? asset.asset_type}</span></Link>)}</div> : <EmptyState title="No assets yet." description="Connect the brand repository importer or upload brand files through admin." />}
        </div>
      </section>
      <div className="mt-6"><RecentlyViewed /></div>
    </div>
  );
}
