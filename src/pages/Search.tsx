import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export function SearchPage() {
  return (
    <div>
      <PageHeader eyebrow="Search" title="Search everything from one place." description="Use Ctrl K or Cmd K anywhere to search wiki pages, assets, ideas, comments, projects, and people." />
      <EmptyState title="Open universal search." description="The command search becomes useful as real records are added to Supabase." />
    </div>
  );
}
