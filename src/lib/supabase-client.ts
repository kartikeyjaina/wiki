import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

export const supabaseClient = env.supabaseUrl && env.supabaseAnonKey
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        fetch: (...args) => fetch(...args),
      },
    })
  : null;
