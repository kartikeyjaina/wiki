import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export function People() {
  return (
    <div>
      <PageHeader eyebrow="People" title="Profiles are managed in the workspace." description="This legacy route is no longer part of the primary workspace." />
      <EmptyState title="No profiles visible." description="Profiles are created from authenticated Futurelab users and protected by row-level security." />
    </div>
  );
}
