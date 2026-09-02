import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "./useSession";
import type { Profile } from "@/types/domain";

export function useProfile() {
  const { session, loading: sessionLoading, configured } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !session?.user.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    void supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single()
      .then(({ data, error: profileError }) => {
        setProfile((data as Profile | null) ?? null);
        setError(profileError?.message ?? null);
        setLoading(false);
      });
  }, [session?.user.id]);

  return {
    session,
    profile,
    loading: sessionLoading || loading,
    error,
    configured,
    isAdmin: profile?.role === "admin",
  };
}
