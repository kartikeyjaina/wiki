import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export function People() {
  return (
    <div>
      <PageHeader eyebrow="People" title="Profiles should be real." description="People records will show names, roles, contributions, comments, ideas, and shipped work once Supabase contains authorized profile data." />
      <EmptyState title="No profiles visible." description="Profiles are created from authenticated Futurelab users and protected by row-level security." />
    </div>
  );
}
