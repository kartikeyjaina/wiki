import type { Session } from "@supabase/supabase-js";
import { env } from "./env";
import { supabase } from "./supabase";

export const guestModeEnabled = import.meta.env.VITE_ENABLE_GUEST_MODE === "true";

export function isDevelopmentGuest(session: Session | null) {
  return guestModeEnabled && Boolean(env.devGuestEmail) && session?.user.email?.toLowerCase() === env.devGuestEmail.toLowerCase();
}

export async function signInAsDevelopmentGuest() {
  if (!guestModeEnabled) {
    throw new Error("Development guest mode is disabled.");
  }

  if (!supabase || !env.devGuestEmail || !env.devGuestPassword) {
    throw new Error("Configure the development guest email and password before using guest mode.");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: env.devGuestEmail,
    password: env.devGuestPassword,
  });

  if (error) throw error;
}