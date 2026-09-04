import { AdminLibrary } from "@/components/assets/AdminLibrary";
import { EmptyState } from "@/components/ui/EmptyState";
import { useProfile } from "@/hooks/useProfile";
import { hasRealSupabaseEnv } from "@/lib/real-env";

export function Admin() {
  const { profile, isAdmin } = useProfile();
  if (!isAdmin && hasRealSupabaseEnv()) {
    return <EmptyState title="Admin access required." description="Only users with the admin role can manage assets, visibility, and governance settings." />;
  }

  return (
    <AdminLibrary />
  );
}
