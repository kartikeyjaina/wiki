import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";

const sections = ["Guidelines", "Logo", "Typography", "Colours", "Imagery", "Voice & Tone"];

export function Brand() {
  return (
    <div>
      <PageHeader
        eyebrow="Brand"
        title="A useful home for the Futurelab system."
        description="Brand guidance and source files are available in the Assets library."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section, index) => (
          <article key={section} className="rounded-xl border border-border bg-white p-6">
            <Badge className={["bg-[#fad9db]", "bg-[#ccf0dc]", "bg-[#d6e8f8]", "bg-[#e5d9f7]", "bg-[#fbf0cc]", "bg-[#eff1f3]"][index]}>
              Brand
            </Badge>
            <h2 className="mt-6 font-display text-2xl font-bold tracking-[-0.03em]">{section}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Add real wiki content and approved assets for this section through Supabase-backed records.</p>
          </article>
        ))}
      </div>
    </div>
  );
}
