import { supabaseClient } from "./supabase-client";

export async function ensureAdminAccess() {
  const client = supabaseClient;
  if (!client) {
    throw new Error("Supabase is not configured.");
  }

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("Sign in before checking admin access.");
  }

  const { data, error } = await client.from("profiles").select("role").eq("id", userData.user.id).single();

  if (error || !data) {
    throw new Error("Profile is missing. The database trigger should create it after sign-up.");
  }

  return data.role === "admin";
}
