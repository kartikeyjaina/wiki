import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Archive,
  FolderPlus,
  PackagePlus,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { AssetUploadPanel } from "@/components/assets/AssetUploadPanel";
import { Button } from "@/components/ui/Button";
import { CollectionMultiPicker } from "@/components/ui/CollectionMultiPicker";
import { formatFileSize } from "@/lib/file-preview";
import { ASSET_BUCKET, uploadKitPackage } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import type { AssetCollection, FeaturedKit } from "@/types/domain";

const accents = ["sage", "butter", "blush", "sky", "lilac"];

type CollectionDraft = Pick<
  AssetCollection,
  "name" | "description" | "display_order" | "accent" | "is_visible"
>;

type KitDraft = Pick<
  FeaturedKit,
  | "name"
  | "description"
  | "display_order"
  | "accent"
  | "is_visible"
  | "is_featured"
>;

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const field =
  "mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm";

export function AdminLibrary() {
  const [tab, setTab] = useState<"kits" | "collections">("kits");
  const [kits, setKits] = useState<FeaturedKit[]>([]);
  const [collections, setCollections] = useState<AssetCollection[]>([]);
  const [editingCollection, setEditingCollection] =
    useState<AssetCollection | null>(null);

  const [kitDraft, setKitDraft] = useState<KitDraft>({
    name: "",
    description: "",
    display_order: 1,
    accent: "sage",
    is_visible: true,
    is_featured: true,
  });

  const [collectionDraft, setCollectionDraft] =
    useState<CollectionDraft>({
      name: "",
      description: "",
      display_order: 1,
      accent: "sage",
      is_visible: true,
    });

  const [kitCollections, setKitCollections] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const client = supabase;
    if (!client) return;

    const [kitResult, collectionResult] = await Promise.all([
      client
        .from("featured_kits")
        .select("*")
        .order("display_order"),
      client
        .from("asset_collections")
        .select("*")
        .order("display_order"),
    ]);

    if (kitResult.error || collectionResult.error) {
      setMessage(
        (kitResult.error ?? collectionResult.error)?.message ??
          "Library data could not be loaded.",
      );
      return;
    }

    setKits((kitResult.data ?? []) as FeaturedKit[]);
    setCollections((collectionResult.data ?? []) as AssetCollection[]);
  }

  useEffect(() => {
    void load();
  }, []);

  function startCollection(item?: AssetCollection) {
    setEditingCollection(item ?? null);

    setCollectionDraft(
      item
        ? {
            name: item.name,
            description: item.description,
            display_order: item.display_order,
            accent: item.accent,
            is_visible: item.is_visible,
          }
        : {
            name: "",
            description: "",
            display_order: collections.length + 1,
            accent: "sage",
            is_visible: true,
          },
    );
  }

  async function saveKit(event: FormEvent) {
    event.preventDefault();

    const client = supabase;
    if (!client || !kitDraft.name.trim() || busy) return;

    setBusy(true);
    setMessage(null);

    try {
      const payload = {
        ...kitDraft,
        name: kitDraft.name.trim(),
        description: kitDraft.description?.trim() ?? "",
        slug: slugify(kitDraft.name),
      };

      const result = await client
        .from("featured_kits")
        .insert(payload)
        .select("id")
        .single();

      if (result.error) throw result.error;

      const kitId = (result.data as { id: string }).id;

      if (kitCollections.length) {
        const relationshipResult = await client
          .from("featured_kit_collections")
          .insert(
            kitCollections.map((collection_id) => ({
              kit_id: kitId,
              collection_id,
            })),
          );

        if (relationshipResult.error) {
          await client
            .from("featured_kits")
            .delete()
            .eq("id", kitId);

          throw relationshipResult.error;
        }
      }

      setMessage("Kit created.");
      setKitCollections([]);
      setKitDraft({
        name: "",
        description: "",
        display_order: kits.length + 1,
        accent: "sage",
        is_visible: true,
        is_featured: true,
      });

      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Kit could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveCollection(event: FormEvent) {
    event.preventDefault();

    const client = supabase;
    if (!client || !collectionDraft.name.trim() || busy) return;

    setBusy(true);
    setMessage(null);

    try {
      const payload = {
        ...collectionDraft,
        name: collectionDraft.name.trim(),
        description: collectionDraft.description?.trim() ?? "",
        ...(editingCollection
          ? {}
          : { slug: slugify(collectionDraft.name) }),
      };

      const result = editingCollection
        ? await client
            .from("asset_collections")
            .update({
              ...payload,
              updated_at: new Date().toISOString(),
            })
            .eq("id", editingCollection.id)
        : await client
            .from("asset_collections")
            .insert(payload);

      if (result.error) throw result.error;

      setMessage(
        editingCollection
          ? "Collection updated."
          : "Collection created.",
      );

      setEditingCollection(null);
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Collection could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function uploadPackage(
    event: ChangeEvent<HTMLInputElement>,
    target: FeaturedKit,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    const client = supabase;
    if (!file || !client || busy) return;

    setBusy(true);
    setMessage(null);

    try {
      const path = await uploadKitPackage(file, target.id);

      const result = await client
        .from("featured_kits")
        .update({
          package_storage_path: path,
          package_size: file.size,
          mime_type: file.type || "application/zip",
          updated_at: new Date().toISOString(),
        })
        .eq("id", target.id);

      if (result.error) {
        await client.storage.from(ASSET_BUCKET).remove([path]);
        throw result.error;
      }

      if (target.package_storage_path) {
        await client.storage
          .from(ASSET_BUCKET)
          .remove([target.package_storage_path]);
      }

      setMessage(`${target.name} package uploaded successfully.`);
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Package upload failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function archiveCollection(item: AssetCollection) {
    const client = supabase;

    if (
      !client ||
      busy ||
      !window.confirm(
        `Archive ${item.name}? Its assets will remain associated and will not be deleted.`,
      )
    ) {
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const result = await client
        .from("asset_collections")
        .update({
          archived_at: new Date().toISOString(),
          is_visible: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (result.error) throw result.error;

      setMessage("Collection archived. Assets were retained.");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Collection could not be archived.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function restoreCollection(item: AssetCollection) {
    const client = supabase;
    if (!client || busy) return;

    setBusy(true);
    setMessage(null);

    try {
      const result = await client
        .from("asset_collections")
        .update({
          archived_at: null,
          is_visible: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (result.error) throw result.error;

      await load();
      setMessage("Collection restored.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Collection could not be restored.",
      );
    } finally {
      setBusy(false);
    }
  }

  const visibleCollections = collections.filter(
    (item) => !item.archived_at,
  );

  return (
    <section className="mt-8 rounded-2xl border border-border bg-white shadow-card">
      <div className="border-b border-border p-6 md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
          Asset Library
        </p>

        <h2 className="mt-2 font-display text-3xl font-bold tracking-[-0.04em]">
          Curate the company archive
        </h2>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab("kits")}
            className={`rounded-pill px-4 py-2 text-sm font-bold ${
              tab === "kits"
                ? "bg-foreground text-white"
                : "bg-surface text-muted"
            }`}
          >
            Featured kits
          </button>

          <button
            type="button"
            onClick={() => setTab("collections")}
            className={`rounded-pill px-4 py-2 text-sm font-bold ${
              tab === "collections"
                ? "bg-foreground text-white"
                : "bg-surface text-muted"
            }`}
          >
            Collections
          </button>
        </div>
      </div>

      {tab === "kits" ? (
        <div className="p-6 md:p-8">
          <form
            onSubmit={(event) => void saveKit(event)}
            className="grid gap-4 rounded-xl bg-surface p-5 md:grid-cols-2"
          >
            <label className="text-sm font-semibold">
              Title
              <input
                className={field}
                value={kitDraft.name}
                onChange={(event) =>
                  setKitDraft({
                    ...kitDraft,
                    name: event.target.value,
                  })
                }
                required
              />
            </label>

            <label className="text-sm font-semibold">
              Display order
              <input
                type="number"
                min="1"
                className={field}
                value={kitDraft.display_order}
                onChange={(event) =>
                  setKitDraft({
                    ...kitDraft,
                    display_order: Number(event.target.value),
                  })
                }
              />
            </label>

            <label className="text-sm font-semibold md:col-span-2">
              Description
              <textarea
                className={`${field} h-24 py-3`}
                value={kitDraft.description}
                onChange={(event) =>
                  setKitDraft({
                    ...kitDraft,
                    description: event.target.value,
                  })
                }
              />
            </label>

            <label className="text-sm font-semibold">
              Accent
              <select
                className={field}
                value={kitDraft.accent}
                onChange={(event) =>
                  setKitDraft({
                    ...kitDraft,
                    accent: event.target.value,
                  })
                }
              >
                {accents.map((accent) => (
                  <option key={accent}>{accent}</option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 pt-7 text-sm font-semibold">
              <input
                type="checkbox"
                checked={kitDraft.is_visible}
                onChange={(event) =>
                  setKitDraft({
                    ...kitDraft,
                    is_visible: event.target.checked,
                  })
                }
              />
              Published
            </label>

            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={kitDraft.is_featured}
                onChange={(event) =>
                  setKitDraft({
                    ...kitDraft,
                    is_featured: event.target.checked,
                  })
                }
              />
              Featured
            </label>

            <div className="md:col-span-2">
              <CollectionMultiPicker
                collections={visibleCollections}
                selectedIds={kitCollections}
                onChange={setKitCollections}
              />
            </div>

            <Button
              className="md:col-span-2"
              disabled={busy}
            >
              <PackagePlus className="h-4 w-4" />
              Create kit
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            {kits.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-4"
              >
                <Archive className="h-5 w-5" />

                <div className="min-w-40 flex-1">
                  <p className="font-semibold">{item.name}</p>

                  <p className="text-xs text-muted">
                    {item.package_size
                      ? formatFileSize(item.package_size)
                      : "No ZIP package"}{" "}
                    · {item.is_visible ? "Published" : "Hidden"}
                  </p>
                </div>

                <label
                  className={`inline-flex items-center gap-2 rounded-pill bg-surface px-4 py-2 text-sm font-semibold ${
                    busy
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer"
                  }`}
                >
                  <Upload className="h-4 w-4" />

                  {item.package_storage_path
                    ? "Replace ZIP"
                    : "Upload ZIP"}

                  <input
                    type="file"
                    accept=".zip,application/zip"
                    disabled={busy}
                    className="hidden"
                    onChange={(event) =>
                      void uploadPackage(event, item)
                    }
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-6 md:p-8">
          <form
            onSubmit={(event) => void saveCollection(event)}
            className="grid gap-4 rounded-xl bg-surface p-5 md:grid-cols-2"
          >
            <label className="text-sm font-semibold">
              Name
              <input
                className={field}
                value={collectionDraft.name}
                onChange={(event) =>
                  setCollectionDraft({
                    ...collectionDraft,
                    name: event.target.value,
                  })
                }
                required
              />
            </label>

            <label className="text-sm font-semibold">
              Display order
              <input
                type="number"
                min="1"
                className={field}
                value={collectionDraft.display_order}
                onChange={(event) =>
                  setCollectionDraft({
                    ...collectionDraft,
                    display_order: Number(event.target.value),
                  })
                }
              />
            </label>

            <label className="text-sm font-semibold md:col-span-2">
              Description
              <textarea
                className={`${field} h-24 py-3`}
                value={collectionDraft.description ?? ""}
                onChange={(event) =>
                  setCollectionDraft({
                    ...collectionDraft,
                    description: event.target.value,
                  })
                }
              />
            </label>

            <label className="text-sm font-semibold">
              Accent
              <select
                className={field}
                value={collectionDraft.accent}
                onChange={(event) =>
                  setCollectionDraft({
                    ...collectionDraft,
                    accent: event.target.value,
                  })
                }
              >
                {accents.map((accent) => (
                  <option key={accent}>{accent}</option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 pt-7 text-sm font-semibold">
              <input
                type="checkbox"
                checked={collectionDraft.is_visible}
                onChange={(event) =>
                  setCollectionDraft({
                    ...collectionDraft,
                    is_visible: event.target.checked,
                  })
                }
              />
              Published
            </label>

            <Button
              className="md:col-span-2"
              disabled={busy}
            >
              <FolderPlus className="h-4 w-4" />
              {editingCollection
                ? "Save collection"
                : "Create collection"}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            {collections.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-4"
              >
                <span className="font-display font-bold">
                  {String(item.display_order).padStart(2, "0")}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{item.name}</p>

                  <p className="text-xs text-muted">
                    {item.archived_at
                      ? "Archived"
                      : item.is_visible
                        ? "Published"
                        : "Hidden"}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => startCollection(item)}
                  className="rounded-pill bg-surface px-3 py-2 text-xs font-bold"
                >
                  Edit
                </button>

                {item.archived_at ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void restoreCollection(item)}
                    className="inline-flex items-center gap-1 rounded-pill bg-surface px-3 py-2 text-xs font-bold"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void archiveCollection(item)}
                    className="inline-flex items-center gap-1 rounded-pill bg-surface px-3 py-2 text-xs font-bold"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Archive
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {message ? (
        <p
          className="border-t border-border px-6 py-4 text-sm"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <div className="border-t border-border px-6 pb-6 md:px-8">
        <AssetUploadPanel />
      </div>
    </section>
  );
}