import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export function Projects() {
  return (
    <div>
      <PageHeader eyebrow="Projects" title="Ideas can become shipped work." description="Projects connect accepted ideas to execution and outcomes without inventing impact." />
      <EmptyState title="No projects yet." description="When an idea becomes a real project, it will appear here with its actual status and relationships." />
    </div>
  );
}
