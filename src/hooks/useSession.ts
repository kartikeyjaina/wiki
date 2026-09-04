import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";

function clearAuthCallbackUrl() {
  if (!window.location.hash.includes("access_token=") && !window.location.hash.includes("error=")) {
    return;
  }

  window.history.replaceState(null, document.title, `${window.location.pathname}${window.location.search}`);
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(hasSupabaseConfig);

  useEffect(() => {
    if (!supabase) return;

    let active = true;

    void supabase.auth.getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        setLoading(false);
        clearAuthCallbackUrl();
      })
      .catch(() => {
        if (!active) return;
        setSession(null);
        setLoading(false);
        clearAuthCallbackUrl();
      });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setLoading(false);
      clearAuthCallbackUrl();
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return { session, loading, configured: hasSupabaseConfig };
}
