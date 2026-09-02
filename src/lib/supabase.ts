import { env } from "./env";
import { supabaseClient } from "./supabase-client";
import { isConfigured } from "./utils";

export const hasSupabaseConfig = isConfigured(env.supabaseUrl) && isConfigured(env.supabaseAnonKey);
export const supabase = supabaseClient;

export function getSupabaseStatus() {
  return {
    configured: hasSupabaseConfig,
    url: env.supabaseUrl,
    bucket: env.assetBucket,
    allowedDomains: env.allowedDomains,
  };
}
