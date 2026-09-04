import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Project, ProjectStatus } from "@/types/domain";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);
  const mutationRef = useRef(false);

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: loadError } = await supabase.from("projects").select("*").order("updated_at", { ascending: false });
    setProjects((data ?? []) as Project[]);
    setError(loadError?.message ?? null);
    setLoading(false);
    if (loadError) throw loadError;
  }, []);

  useEffect(() => { void load().catch(() => undefined); }, [load]);

  async function create(input: { title: string; description: string; status: ProjectStatus; originating_idea_id: string | null; owner_id?: string | null; due_date?: string | null; priority?: string }) {
    if (!supabase) throw new Error("Supabase is not configured.");
    if (mutationRef.current) throw new Error("A project change is already in progress.");
    mutationRef.current = true;
    setError(null);
    try {
      const { error: createError } = await supabase.from("projects").insert(input);
      if (createError) throw createError;
      await load();
    } finally {
      mutationRef.current = false;
    }
  }

  async function update(id: string, input: Partial<Pick<Project, "title" | "description" | "status" | "originating_idea_id" | "owner_id" | "due_date" | "priority">>) {
    if (!supabase) throw new Error("Supabase is not configured.");
    if (mutationRef.current) throw new Error("A project change is already in progress.");
    mutationRef.current = true;
    setError(null);
    try {
      const { error: updateError } = await supabase.from("projects").update({ ...input, updated_at: new Date().toISOString() }).eq("id", id);
      if (updateError) throw updateError;
      await load();
    } finally {
      mutationRef.current = false;
    }
  }

  return { projects, loading, error, create, update, reload: load };
}
