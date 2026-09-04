import { env } from "./env";



export function hasRealSupabaseEnv() {
  return !!env.supabaseUrl && !!env.supabaseAnonKey;
}
