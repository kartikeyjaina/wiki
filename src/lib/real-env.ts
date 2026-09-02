import { env } from "./env";

export function getMissingEnvKeys() {
  const keys: string[] = [];

  if (!env.supabaseUrl) keys.push("VITE_SUPABASE_URL");
  if (!env.supabaseAnonKey) keys.push("VITE_SUPABASE_ANON_KEY");
  if (!env.allowedDomains.length) keys.push("VITE_ALLOWED_EMAIL_DOMAINS");

  return keys;
}

export function hasRealSupabaseEnv() {
  return !!env.supabaseUrl && !!env.supabaseAnonKey;
}
