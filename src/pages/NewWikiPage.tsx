import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
import { recordActivity } from "@/lib/activity";

const slugify = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function NewWikiPage() {
  const navigate = useNavigate();
  const { isAdmin, session } = useProfile();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAdmin) {
    return <p className="rounded-md bg-[#fad9db] px-4 py-3 text-sm" role="alert">Admin access required.</p>;
  }

  async function savePage() {
    if (!supabase || !title.trim() || !content.trim() || saving) return;
    const slug = slugify(title);
    if (!slug || slug === "new") {
      setError("Choose a title that does not produce the reserved slug 'new'.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const parsedTags = tags.split(",").map((tag) => tag.trim()).filter(Boolean);
      const result = await supabase.from("wiki_pages").insert({
        title: title.trim(),
        slug,
        content: content.trim(),
        tags: parsedTags,
        author_id: session?.user.id ?? null,
      }).select("*").single();
      if (result.error) throw result.error;
      const page = result.data;
      await recordActivity("wiki_page", page.id, "wiki_page_created", { title: title.trim() });
      navigate(`/wiki/${page.slug}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "We couldn't save this page.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={() => navigate("/wiki")} className="text-sm font-semibold text-muted hover:text-foreground">← Wiki</button>
      <PageHeader eyebrow="New page" title="Create a Wiki page" description="Use Markdown for headings, links, and lists." />
      <div className="mt-6 max-w-4xl space-y-4">
        <label className="block text-sm font-semibold">Title<input value={title} onChange={(event) => setTitle(event.target.value)} disabled={saving} className="mt-1 h-11 w-full rounded-md border border-border px-3" /></label>
        <label className="block text-sm font-semibold">Tags<input value={tags} onChange={(event) => setTags(event.target.value)} disabled={saving} placeholder="brand, process" className="mt-1 h-11 w-full rounded-md border border-border px-3" /></label>
        <label className="block text-sm font-semibold">Content<textarea value={content} onChange={(event) => setContent(event.target.value)} disabled={saving} rows={16} className="mt-1 w-full rounded-md border border-border p-3 font-mono text-sm" /></label>
        {tags.split(",").filter((tag) => tag.trim()).length ? <div className="flex flex-wrap gap-2">{tags.split(",").map((tag) => tag.trim()).filter(Boolean).map((tag) => <Badge key={tag}>{tag}</Badge>)}</div> : null}
        {error ? <p className="rounded-md bg-[#fad9db] px-4 py-3 text-sm" role="alert">{error}</p> : null}
        <div className="flex gap-2"><Button onClick={() => void savePage()} disabled={saving || !title.trim() || !content.trim()}>{saving ? "Saving..." : "Save page"}</Button><Button variant="secondary" onClick={() => navigate("/wiki")} disabled={saving}>Cancel</Button></div>
      </div>
    </div>
  );
}
