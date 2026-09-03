export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? "",
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
  assetBucket: import.meta.env.VITE_SUPABASE_ASSET_BUCKET ?? "brand-assets",
  allowedDomains: (import.meta.env.VITE_ALLOWED_EMAIL_DOMAINS ?? "gmail.com,futurelab.com").split(",").map((domain: string) => domain.trim()).filter(Boolean),
  appName: import.meta.env.VITE_APP_NAME ?? "futurelab wiki",
  devGuestEmail: import.meta.env.VITE_DEV_GUEST_EMAIL ?? "",
  devGuestPassword: import.meta.env.VITE_DEV_GUEST_PASSWORD ?? "",
};

export function isValidDomain(email?: string | null) {
  if (!email) return false;
  const [, domain] = email.toLowerCase().split("@", 2);
  return Boolean(domain && env.allowedDomains.includes(domain));
}
