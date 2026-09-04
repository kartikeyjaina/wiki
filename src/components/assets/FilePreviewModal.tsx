import { useEffect, useState } from "react";
import { Download, FileArchive, FileQuestion, X } from "lucide-react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import mammoth from "mammoth/mammoth.browser";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import type { Asset } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { downloadAsset, getAssetDownloadUrl } from "@/lib/storage";
import { formatFileSize, getAssetSize, getFilePreviewType, type FilePreviewType } from "@/lib/file-preview";

const MAX_PREVIEW_BYTES = 10 * 1024 * 1024;

export function FilePreviewModal({ asset, onClose }: { asset: Asset | null; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewType = asset ? getFilePreviewType(asset) : "unsupported";

  useEffect(() => {
    if (!asset) return;
    setUrl(null);
    setError(null);
    if (!asset.storage_path) return;
    setLoading(true);
    void getAssetDownloadUrl(asset.storage_path)
      .then(setUrl)
      .catch((previewError: unknown) => setError(previewError instanceof Error ? previewError.message : "Unable to create a secure preview URL."))
      .finally(() => setLoading(false));
  }, [asset]);

  useEffect(() => {
    if (!asset) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [asset, onClose]);

  if (!asset) return null;
  const size = getAssetSize(asset);
  const canDownload = Boolean(asset.storage_path);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="preview-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-soft">
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0"><h2 id="preview-title" className="truncate font-display text-xl font-bold">{asset.name}</h2><p className="mt-1 text-sm text-muted">{asset.asset_type} · {formatFileSize(size)}</p></div>
          <div className="flex shrink-0 gap-2"><Button variant="secondary" size="icon" onClick={onClose} aria-label="Close preview"><X className="h-4 w-4" /></Button></div>
        </header>
        <div className="min-h-[280px] flex-1 overflow-auto bg-surface p-5">
          {!asset.storage_path ? <UnsupportedPreview type={previewType} reason="This asset has no stored file to preview." /> : loading ? <p className="grid min-h-[240px] place-items-center text-sm text-muted">Creating secure preview...</p> : error ? <ErrorPreview message={error} /> : url ? <PreviewContent asset={asset} type={previewType} url={url} onError={setError} /> : <ErrorPreview message="Preview URL is unavailable." />}
        </div>
        <footer className="flex justify-end gap-3 border-t border-border px-5 py-4"><Button variant="secondary" onClick={onClose}>Close</Button>{canDownload ? <Button onClick={() => void downloadAsset(asset.storage_path!, String(asset.metadata?.original_name ?? asset.name))}><Download className="h-4 w-4" /> Download</Button> : null}</footer>
      </section>
    </div>
  );
}

function PreviewContent({ asset, type, url, onError }: { asset: Asset; type: FilePreviewType; url: string; onError: (message: string) => void }) {
  if (type === "image") return <img src={url} alt={asset.name} className="mx-auto max-h-[68vh] max-w-full object-contain" onError={() => onError("The image could not be loaded.")} />;
  if (type === "pdf") return <iframe title={asset.name} src={url} className="h-[68vh] min-h-[500px] w-full rounded-md bg-white" onError={() => onError("The PDF could not be loaded.")} />;
  if (type === "pptx") return <UnsupportedPreview type={type} reason="PowerPoint browser rendering is not available in this build." />;
  if (type === "skill") return <UnsupportedPreview type={type} reason="This skill package is not safely renderable in the browser." />;
  const size = getAssetSize(asset);
  if (size !== null && size > MAX_PREVIEW_BYTES) return <UnsupportedPreview type={type} reason="This file is too large for an in-browser preview." />;
  return <FetchedPreview asset={asset} type={type} url={url} onError={onError} />;
}

function FetchedPreview({ asset, type, url, onError }: { asset: Asset; type: FilePreviewType; url: string; onError: (message: string) => void }) {
  const [content, setContent] = useState<React.ReactNode>(<p className="text-sm text-muted">Loading preview...</p>);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (type === "docx") {
          const result = await mammoth.convertToHtml({ arrayBuffer: await (await fetch(url)).arrayBuffer() });
          if (!cancelled) setContent(<div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(result.value) }} />);
          return;
        }
        if (type === "xlsx") {
          const workbook = XLSX.read(await (await fetch(url)).arrayBuffer(), { type: "array", cellDates: true });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" }).slice(0, 200);
          if (!cancelled) setContent(<TablePreview rows={rows} />);
          return;
        }
        if (type === "zip") {
          const archive = await JSZip.loadAsync(await (await fetch(url)).arrayBuffer());
          const names = Object.keys(archive.files).slice(0, 500);
          if (!cancelled) setContent(<ArchivePreview names={names} />);
          return;
        }
        const text = await (await fetch(url)).text();
        if (type === "json") {
          try { if (!cancelled) setContent(<pre className="whitespace-pre-wrap font-mono text-sm">{JSON.stringify(JSON.parse(text), null, 2)}</pre>); } catch { if (!cancelled) setContent(<pre className="whitespace-pre-wrap font-mono text-sm">{text}</pre>); }
        } else if (type === "markdown") {
          if (!cancelled) setContent(<div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(await marked.parse(text)) }} />);
        } else if (type === "csv") {
          const rows = text.split(/\r?\n/).filter(Boolean).slice(0, 200).map((row) => row.split(","));
          if (!cancelled) setContent(<TablePreview rows={rows} />);
        } else if (!cancelled) setContent(<pre className="whitespace-pre-wrap font-mono text-sm">{text}</pre>);
      } catch (loadError) { if (!cancelled) onError(loadError instanceof Error ? loadError.message : "The file could not be previewed."); }
    }
    void load();
    return () => { cancelled = true; };
  }, [onError, type, url]);
  return content;
}

function TablePreview({ rows }: { rows: unknown[][] }) { return <div className="overflow-auto rounded-md bg-white"><table className="min-w-full border-collapse text-left text-sm"><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className="border-b border-border">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-2 align-top">{String(cell)}</td>)}</tr>)}</tbody></table></div>; }
function ArchivePreview({ names }: { names: string[] }) { return <div><div className="mb-4 flex items-center gap-3 text-sm font-semibold"><FileArchive className="h-5 w-5" /> {names.length} file{names.length === 1 ? "" : "s"} shown</div><ul className="space-y-1 rounded-md bg-white p-4 font-mono text-sm">{names.map((name) => <li key={name} className="truncate">{name}</li>)}</ul></div>; }
function ErrorPreview({ message }: { message: string }) { return <div className="grid min-h-[240px] place-items-center text-center text-sm text-[#b42318]"><p>{message}</p></div>; }
function UnsupportedPreview({ type, reason }: { type: FilePreviewType; reason?: string }) { return <div className="grid min-h-[240px] place-items-center text-center"><div><FileQuestion className="mx-auto h-10 w-10 text-muted" /><p className="mt-4 font-semibold">Preview not available for this file type</p><p className="mt-2 text-sm text-muted">{reason ?? type.toUpperCase()}</p></div></div>; }