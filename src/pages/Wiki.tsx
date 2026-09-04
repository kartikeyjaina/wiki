import DOMPurify from "dompurify";
import { marked } from "marked";
import { BookOpen, Plus, RotateCcw, Search } from "lucide-react";
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

type DiffLine = { type: "same" | "removed" | "added"; text: string };

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const rows = oldLines.length;
  const cols = newLines.length;
  const table = Array.from({ length: rows + 1 }, () => new Uint32Array(cols + 1));
  for (let i = rows - 1; i >= 0; i -= 1) {
    for (let j = cols - 1; j >= 0; j -= 1) {
      table[i][j] = oldLines[i] === newLines[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < rows && j < cols) {
    if (oldLines[i] === newLines[j]) { result.push({ type: "same", text: oldLines[i] }); i += 1; j += 1; }
    else if (table[i + 1][j] >= table[i][j + 1]) { result.push({ type: "removed", text: oldLines[i] }); i += 1; }
    else { result.push({ type: "added", text: newLines[j] }); j += 1; }
  }
  while (i < rows) { result.push({ type: "removed", text: oldLines[i++] }); }
  while (j < cols) { result.push({ type: "added", text: newLines[j++] }); }
  return result;
}

function DiffView({ current, revision }: { current: string; revision: WikiRevision }) {
  const diff = useMemo(() => computeDiff(revision.content, current), [current, revision.content]);
  const hasChanges = diff.some((line) => line.type !== "same");
  return <div className="rounded-lg border border-border bg-white p-4"><div className="mb-3 flex flex-wrap items-center gap-3 text-sm"><span className="font-semibold">Revision by {revision.author?.display_name ?? "Workspace member"}</span><span className="text-muted">{new Date(revision.created_at).toLocaleString()}</span>{revision.title ? <Badge>Title: {revision.title}</Badge> : null}{revision.tags?.length ? <span className="text-xs text-muted">Tags: {revision.tags.join(", ")}</span> : null}</div>{hasChanges ? <pre className="overflow-auto rounded-md bg-surface p-4 font-mono text-xs leading-5">{diff.map((line, index) => <span key={`${line.type}-${index}`} className={line.type === "added" ? "block bg-[#ccf0dc] text-[#1a5f2e]" : line.type === "removed" ? "block bg-[#fad9db] text-[#7a1a1a]" : "block text-muted"}>{line.type === "added" ? "+ " : line.type === "removed" ? "- " : "  "}{line.text}</span>)}</pre> : <p className="text-sm text-muted">No content differences detected. Metadata or tags may have changed.</p>}</div>;
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
  const [inspectedRevision, setInspectedRevision] = useState<WikiRevision | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    const client = supabase;
    setLoading(true);
    void (async () => {
      const result = slug ? await client.from("wiki_pages").select("*, author:profiles!wiki_pages_author_id_fkey(id, display_name, role, avatar_url)").eq("slug", slug).maybeSingle() : await client.from("wiki_pages").select("*").order("updated_at", { ascending: false });
      if (result.error) { setError("We couldn't load the Wiki. Please try again."); setLoading(false); return; }
      if (slug) {
        const selected = result.data as WikiPage | null;
        setPage(selected);
        if (selected) {
          setTitle(selected.title);
          setContent(selected.content);
          setTags(selected.tags.join(", "));
          const revisionResult = await client.from("wiki_page_revisions").select("*, author:profiles!wiki_page_revisions_author_id_fkey(id, display_name, role, avatar_url)").eq("wiki_page_id", selected.id).order("created_at", { ascending: false });
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
    if (!nextSlug || nextSlug === "new") { setError("Choose a title that does not use the reserved slug 'new'."); return; }
    const parsedTags = tags.split(",").map((tag) => tag.trim()).filter(Boolean);
    if (page) {
      const { data: updated, error: rpcError } = await client.rpc("save_wiki_page", { p_page_id: page.id, p_title: title.trim(), p_slug: nextSlug, p_content: content.trim(), p_tags: parsedTags, p_author_id: session?.user.id ?? null, p_old_title: page.title, p_old_content: page.content, p_old_tags: page.tags });
      if (rpcError) { setError("We couldn't save this page. Please check the title and try again."); return; }
      await recordActivity("wiki_page", page.id, "wiki_page_updated", { title: title.trim() });
      const saved = updated as WikiPage;
      setEditing(false);
      navigate(`/wiki/${saved.slug}`);
      return;
    }
    const result = await client.from("wiki_pages").insert({ title: title.trim(), slug: nextSlug, content: content.trim(), tags: parsedTags, author_id: session?.user.id ?? null }).select("*").single();
    if (result.error) { setError("We couldn't save this page. Please check the title and try again."); return; }
    await recordActivity("wiki_page", (result.data as WikiPage).id, "wiki_page_created", { title: title.trim() });
    const saved = result.data as WikiPage;
    setEditing(false);
    navigate(`/wiki/${saved.slug}`);
  }

  async function restoreRevision(revision: WikiRevision) {
    if (!supabase || !page || !isAdmin) return;
    if (!window.confirm("Restore this revision? The current content will be saved as a new revision first.")) return;
    setRestoring(true);
    setError(null);
    const { data: updated, error: rpcError } = await supabase.rpc("restore_wiki_revision", { p_page_id: page.id, p_revision_id: revision.id, p_author_id: session?.user.id ?? null });
    if (rpcError) { setError("We couldn't restore that revision."); setRestoring(false); return; }
    await recordActivity("wiki_page", page.id, "wiki_revision_restored", { revision_id: revision.id });
    const restoredPage = updated as WikiPage;
    setPage(restoredPage);
    setContent(restoredPage.content);
    setTitle(restoredPage.title);
    setTags(restoredPage.tags?.join(", ") ?? "");
    setInspectedRevision(null);
    const revisionResult = await supabase.from("wiki_page_revisions").select("*, author:profiles!wiki_page_revisions_author_id_fkey(id, display_name, role, avatar_url)").eq("wiki_page_id", page.id).order("created_at", { ascending: false });
    setRevisions((revisionResult.data ?? []) as WikiRevision[]);
    setRestoring(false);
  }

  if (!slug) return <div><PageHeader eyebrow="Wiki" title="Shared knowledge, kept close to the work." description="Browse guidance, decisions, and useful context from across Futurelab." action={isAdmin ? <Button onClick={() => navigate("/wiki/new")}><Plus className="mr-2 h-4 w-4" />New page</Button> : null} /><div className="mt-6 flex h-11 items-center gap-3 rounded-md border border-border bg-white px-4"><Search className="h-4 w-4 text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Wiki..." aria-label="Search Wiki" className="min-w-0 flex-1 outline-none" /></div>{error ? <p className="mt-4 rounded-md bg-[#fad9db] px-4 py-3 text-sm" role="alert">{error}</p> : loading ? <p className="mt-8 text-sm text-muted" role="status">Loading Wiki...</p> : filteredPages.length ? <div className="mt-6 grid gap-4 md:grid-cols-2">{filteredPages.map((item) => <Link key={item.id} to={`/wiki/${item.slug}`} className="rounded-xl border border-border bg-white p-5 transition hover:border-[#1111112e] hover:shadow-card"><div className="flex items-start justify-between gap-3"><BookOpen className="h-5 w-5 shrink-0 text-muted" /><span className="text-xs text-muted">{new Date(item.updated_at).toLocaleDateString()}</span></div><h2 className="mt-5 font-display text-xl font-bold">{item.title}</h2><p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{item.content}</p><div className="mt-4 flex flex-wrap gap-2">{item.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div></Link>)}</div> : <EmptyState title="No Wiki pages yet." description="Create the first page to give the workspace a shared source of truth." />}</div>;

  if (editing) return <div><Link to="/wiki" className="text-sm font-semibold text-muted hover:text-foreground">← Wiki</Link><PageHeader eyebrow="Edit page" title={page?.title ?? "Edit Wiki page"} description="Use Markdown for headings, links, and lists." /><div className="mt-6 space-y-4"><label className="block text-sm font-semibold">Title<input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 h-11 w-full rounded-md border border-border px-3" /></label><label className="block text-sm font-semibold">Tags<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="brand, process" className="mt-1 h-11 w-full rounded-md border border-border px-3" /></label><label className="block text-sm font-semibold">Content<textarea value={content} onChange={(event) => setContent(event.target.value)} rows={16} className="mt-1 w-full rounded-md border border-border p-3 font-mono text-sm" /></label>{error ? <p className="rounded-md bg-[#fad9db] px-4 py-3 text-sm" role="alert">{error}</p> : null}<div className="flex gap-2"><Button onClick={() => void savePage()} disabled={!title.trim() || !content.trim()}>Save page</Button><Button variant="secondary" onClick={() => navigate(page ? `/wiki/${page.slug}` : "/wiki")}>Cancel</Button></div></div></div>;

  return <div><Link to="/wiki" className="text-sm font-semibold text-muted hover:text-foreground">← Wiki</Link>{loading ? <p className="mt-8 text-sm text-muted" role="status">Loading page...</p> : page ? <><PageHeader eyebrow="Wiki" title={page.title} description={`${page.author?.display_name ? `By ${page.author.display_name} · ` : ""}Updated ${new Date(page.updated_at).toLocaleDateString()}`} action={isAdmin ? <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button> : null} /><div className="mt-6 flex flex-wrap gap-2">{page.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div><article className="prose prose-neutral mt-8 max-w-none" dangerouslySetInnerHTML={renderMarkdown(page.content)} />{revisions.length ? <section className="mt-12 border-t border-border pt-6"><h2 className="font-display text-xl font-bold">Revision history</h2><ul className="mt-4 space-y-3">{revisions.map((revision) => <li key={revision.id} className="rounded-md border border-border px-4 py-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-3"><span><strong>{revision.author?.display_name ?? "Workspace member"}</strong><span className="ml-2 text-muted">{new Date(revision.created_at).toLocaleString()}</span>{revision.title && revision.title !== page.title ? <span className="ml-2 text-xs text-muted">(titled &ldquo;{revision.title}&rdquo;)</span> : null}</span><div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => setInspectedRevision(inspectedRevision?.id === revision.id ? null : revision)}>{inspectedRevision?.id === revision.id ? "Close" : "Inspect"}</Button>{isAdmin ? <Button size="sm" variant="secondary" disabled={restoring} onClick={() => void restoreRevision(revision)}><RotateCcw className="h-3.5 w-3.5" />Restore</Button> : null}</div></div>{inspectedRevision?.id === revision.id ? <div className="mt-4"><DiffView current={page.content} revision={revision} /></div> : null}</li>)}</ul></section> : null}</> : <EmptyState title="Page not found." description="This Wiki page may have been moved or removed." />}{error ? <p className="mt-4 rounded-md bg-[#fad9db] px-4 py-3 text-sm" role="alert">{error}</p> : null}</div>;
}
