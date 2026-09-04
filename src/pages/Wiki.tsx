import DOMPurify from "dompurify";
import { marked } from "marked";
import { BookOpen, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
import { recordActivity } from "@/lib/activity";
import type { WikiPage, WikiRevision } from "@/types/domain";

function renderMarkdown(content: string) {
  return { __html: DOMPurify.sanitize(marked.parse(content) as string) };
}

export function Wiki() {
  const { slug } = useParams();
  const { isAdmin, session } = useProfile();
  const navigate = useNavigate();
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [page, setPage] = useState<WikiPage | null>(null);
  const [revisions, setRevisions] = useState<WikiRevision[]>([]);
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    const client = supabase;
    setLoading(true);
    void (async () => {
      const result = slug
        ? await client.from("wiki_pages").select("*, author:profiles!wiki_pages_author_id_fkey(id, display_name, role, avatar_url)").eq("slug", slug).maybeSingle()
        : await client.from("wiki_pages").select("*").order("updated_at", { ascending: false });
      if (result.error) { setError("We couldn’t load the Wiki. Please try again."); setLoading(false); return; }
      if (slug) {
        const selected = result.data as WikiPage | null;
        setPage(selected);
        if (selected) {
          setTitle(selected.title); setContent(selected.content); setTags(selected.tags.join(", "));
          const revisionResult = await client.from("wiki_page_revisions").select("*").eq("wiki_page_id", selected.id).order("created_at", { ascending: false });
          setRevisions((revisionResult.data ?? []) as WikiRevision[]);
        }
      } else setPages((result.data ?? []) as WikiPage[]);
      setLoading(false);
    })();
  }, [slug]);

  const filteredPages = useMemo(() => pages.filter((item) => `${item.title} ${item.content} ${item.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())), [pages, query]);

  async function savePage() {
    if (!supabase || !title.trim() || !content.trim()) return;
    setError(null);
    const client = supabase;
    const nextSlug = (page?.slug ?? title).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const input = { title: title.trim(), slug: nextSlug, content: content.trim(), tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean), updated_at: new Date().toISOString() };
    const result = page
      ? await client.from("wiki_pages").update(input).eq("id", page.id).select().single()
      : await client.from("wiki_pages").insert({ ...input, author_id: session?.user.id ?? null }).select().single();
    if (result.error) { setError("We couldn’t save this page. Please check the title and try again."); return; }
    if (page && page.content !== content.trim()) {
      const revisionResult = await client.from("wiki_page_revisions").insert({ wiki_page_id: page.id, content: page.content, author_id: session?.user.id ?? null });
      if (revisionResult.error) { setError("The page changed, but its previous revision could not be saved."); return; }
      await recordActivity("wiki_page", page.id, "wiki_page_updated", { title: input.title });
    } else if (!page) {
      await recordActivity("wiki_page", (result.data as WikiPage).id, "wiki_page_created", { title: input.title });
    }
    const saved = result.data as WikiPage;
    setEditing(false);
    navigate(`/wiki/${saved.slug}`);
  }

  if (!slug) return <div><PageHeader eyebrow="Wiki" title="Shared knowledge, kept close to the work." description="Browse guidance, decisions, and useful context from across Futurelab." action={isAdmin ? <Button onClick={() => navigate("/wiki/new")}><Plus className="mr-2 h-4 w-4" />New page</Button> : null} /><div className="mt-6 flex h-11 items-center gap-3 rounded-md border border-border bg-white px-4"><Search className="h-4 w-4 text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Wiki..." aria-label="Search Wiki" className="min-w-0 flex-1 outline-none" /></div>{error ? <p className="mt-4 rounded-md bg-[#fad9db] px-4 py-3 text-sm" role="alert">{error}</p> : loading ? <p className="mt-8 text-sm text-muted" role="status">Loading Wiki...</p> : filteredPages.length ? <div className="mt-6 grid gap-4 md:grid-cols-2">{filteredPages.map((item) => <Link key={item.id} to={`/wiki/${item.slug}`} className="rounded-xl border border-border bg-white p-5 transition hover:border-[#1111112e] hover:shadow-card"><div className="flex items-start justify-between gap-3"><BookOpen className="h-5 w-5 shrink-0 text-muted" /><span className="text-xs text-muted">{new Date(item.updated_at).toLocaleDateString()}</span></div><h2 className="mt-5 font-display text-xl font-bold">{item.title}</h2><p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{item.content}</p><div className="mt-4 flex flex-wrap gap-2">{item.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div></Link>)}</div> : <EmptyState title="No Wiki pages yet." description="Create the first page to give the workspace a shared source of truth." />}</div>;

  if (slug === "new" || editing) return <div><Link to="/wiki" className="text-sm font-semibold text-muted hover:text-foreground">← Wiki</Link><PageHeader eyebrow={page ? "Edit page" : "New page"} title={page?.title ?? "Create a Wiki page"} description="Use Markdown for headings, links, and lists." /><div className="mt-6 space-y-4"><label className="block text-sm font-semibold">Title<input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 h-11 w-full rounded-md border border-border px-3" /></label><label className="block text-sm font-semibold">Tags<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="brand, process" className="mt-1 h-11 w-full rounded-md border border-border px-3" /></label><label className="block text-sm font-semibold">Content<textarea value={content} onChange={(event) => setContent(event.target.value)} rows={16} className="mt-1 w-full rounded-md border border-border p-3 font-mono text-sm" /></label>{error ? <p className="rounded-md bg-[#fad9db] px-4 py-3 text-sm" role="alert">{error}</p> : null}<div className="flex gap-2"><Button onClick={() => void savePage()} disabled={!title.trim() || !content.trim()}>Save page</Button><Button variant="secondary" onClick={() => navigate(page ? `/wiki/${page.slug}` : "/wiki")}>Cancel</Button></div></div></div>;

  async function restoreRevision(revision: WikiRevision) {
    if (!supabase || !page || !isAdmin) return;
    const result = await supabase.from("wiki_pages").update({ content: revision.content, updated_at: new Date().toISOString() }).eq("id", page.id).select().single();
    if (result.error) { setError("We couldn’t restore that revision."); return; }
    await supabase.from("wiki_page_revisions").insert({ wiki_page_id: page.id, content: page.content, author_id: session?.user.id ?? null });
    await recordActivity("wiki_page", page.id, "wiki_revision_restored", { revision_id: revision.id });
    setPage(result.data as WikiPage); setContent(revision.content); setRevisions((items) => [{ ...revision, content: page.content }, ...items]);
  }

  return <div><Link to="/wiki" className="text-sm font-semibold text-muted hover:text-foreground">← Wiki</Link>{loading ? <p className="mt-8 text-sm text-muted" role="status">Loading page...</p> : page ? <><PageHeader eyebrow="Wiki" title={page.title} description={`${page.author?.display_name ? `By ${page.author.display_name} · ` : ""}Updated ${new Date(page.updated_at).toLocaleDateString()}`} action={isAdmin ? <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button> : null} /><div className="mt-6 flex flex-wrap gap-2">{page.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div><article className="prose prose-neutral mt-8 max-w-none" dangerouslySetInnerHTML={renderMarkdown(page.content)} />{revisions.length ? <section className="mt-12 border-t border-border pt-6"><h2 className="font-display text-xl font-bold">Revision history</h2><ul className="mt-4 space-y-3">{revisions.map((revision) => <li key={revision.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-4 py-3 text-sm"><span><strong>{revision.author?.display_name ?? "Workspace member"}</strong><span className="ml-2 text-muted">{new Date(revision.created_at).toLocaleString()}</span></span><Button size="sm" variant="secondary" onClick={() => void restoreRevision(revision)}>Inspect / restore</Button></li>)}</ul></section> : null}</> : <EmptyState title="Page not found." description="This Wiki page may have been moved or removed." />}</div>;
}