import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { IngredientSpark } from "@/components/ingredients/IngredientSpark";

export function NewIdea() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [why, setWhy] = useState("");
  const [category, setCategory] = useState("");
  const [links, setLinks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (title.trim().length < 8) return setError("Give the idea a clear title.");
    if (description.trim().length < 24) return setError("Add enough description for someone to understand it.");
    if (!category.trim()) return setError("Choose or enter a category.");
    if (!supabase) return setError("Supabase is not connected yet.");

    const { data: duplicate } = await supabase.from("ideas").select("id").ilike("title", title.trim()).limit(1);
    if (duplicate?.length) return setError("An idea with a very similar title already exists.");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setError("Sign in to submit an idea.");

    const { data, error: insertError } = await supabase
      .from("ideas")
      .insert({ title: title.trim(), description: description.trim(), why_it_matters: why.trim() || null, optional_links: links.trim() || null, author_id: user.id, raw_category: category.trim() })
      .select("id")
      .single();

    if (insertError) setError(insertError.message);
    else {
      setSaved(true);
      window.setTimeout(() => navigate(`/ideas/${data.id}`), 650);
    }
  }

  return (
    <div>
      <PageHeader eyebrow="New Idea" title="Write it clearly enough to invite a real conversation." />
      <form onSubmit={(event) => void submit(event)} className="max-w-3xl space-y-5">
        <Field label="Title"><input value={title} onChange={(event) => setTitle(event.target.value)} className="h-12 w-full rounded-md border border-border px-4 outline-none focus:border-foreground" /></Field>
        <Field label="Description"><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} className="w-full rounded-md border border-border p-4 leading-6 outline-none focus:border-foreground" /></Field>
        <Field label="Why does it matter?"><textarea value={why} onChange={(event) => setWhy(event.target.value)} rows={4} className="w-full rounded-md border border-border p-4 leading-6 outline-none focus:border-foreground" /></Field>
        <Field label="Category"><input value={category} onChange={(event) => setCategory(event.target.value)} className="h-12 w-full rounded-md border border-border px-4 outline-none focus:border-foreground" /></Field>
        <Field label="Optional links"><textarea value={links} onChange={(event) => setLinks(event.target.value)} rows={3} className="w-full rounded-md border border-border p-4 leading-6 outline-none focus:border-foreground" /></Field>
        {error ? <p className="rounded-md bg-[#fad9db] px-4 py-3 text-sm font-medium" role="alert">{error}</p> : null}
        {saved ? <div className="flex items-center gap-4 rounded-xl border border-border bg-[#ccf0dc] p-4"><IngredientSpark className="h-10 w-10" /> <span className="font-semibold">Idea saved.</span></div> : null}
        <Button type="submit">Submit idea</Button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold text-foreground"><span className="mb-2 block">{label}</span>{children}</label>;
}
