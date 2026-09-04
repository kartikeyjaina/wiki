import { AdminLibrary } from "@/components/assets/AdminLibrary";
import { EmptyState } from "@/components/ui/EmptyState";
import { useProfile } from "@/hooks/useProfile";
import { env } from "@/lib/env";

export function Admin() {
  const { isAdmin } = useProfile();
  const hasSupabaseEnv = Boolean(env.supabaseUrl && env.supabaseAnonKey);

  if (!isAdmin && hasSupabaseEnv) {
    return <EmptyState title="Admin access required." description="Only users with the admin role can manage assets, visibility, and governance settings." />;
  }

  return <AdminLibrary />;
}
