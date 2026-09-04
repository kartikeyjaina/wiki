import { Archive, FolderKanban, Lightbulb } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
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
  const { ideas } = useIdeas();
  const trending = rankIdeas(ideas, "trending").slice(0, 3);
  const { assets: recentAssets } = useAssets({ limit: 3 });

  return (
    <div>
      <PageHeader
        eyebrow="Futurelab"
        title="Where Futurelab works, thinks, creates and shares."
      />
      <section className="grid gap-3 md:grid-cols-3">
        {areas.map((area) => {
          const Icon = area.icon;
          return (
            <Link key={area.href} to={area.href} className="rounded-xl border border-border bg-surface p-5 transition hover:border-[#1111112e] hover:bg-white hover:shadow-card">
              <Icon className="h-5 w-5" />
              <span className="mt-8 block font-display text-xl font-bold tracking-[-0.03em]">{area.label}</span>
            </Link>
          );
        })}
      </section>
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold tracking-[-0.03em]">Trending ideas</h2>
            <IngredientPulse />
          </div>
          {trending.length ? (
            <div className="space-y-4">
              {trending.map((idea) => (
                <Link key={idea.id} to={`/ideas/${idea.id}`} className="block border-t border-border pt-4">
                  <span className="font-semibold">{idea.title}</span>
                  <span className="mt-1 block text-sm text-muted">▲ {idea.score ?? 0} · {idea.comment_count ?? 0} comments</span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="No ideas yet." description="This is the quiet part. Submit the first idea and start the conversation." />
          )}
        </div>
        <div className="rounded-xl border border-border bg-white p-6">
          <h2 className="mb-5 font-display text-2xl font-bold tracking-[-0.03em]">Recently added assets</h2>
          {recentAssets.length ? (
            <div className="space-y-4">
              {recentAssets.map((asset) => (
                <Link key={asset.id} to={`/assets/${asset.id}`} className="block border-t border-border pt-4">
                  <span className="font-semibold">{asset.name}</span>
                  <span className="mt-1 block text-sm text-muted">{asset.category ?? asset.asset_type}</span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="No assets yet." description="Connect the brand repository importer or upload brand files through admin." />
          )}
        </div>
      </section>
      <div className="mt-6"><RecentlyViewed /></div>
    </div>
  );
}
