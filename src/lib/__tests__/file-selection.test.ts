import { describe, expect, it } from "vitest";
import { createUploadEntries, normalizeFileList, readDataTransferItems, readDirectoryHandle, sanitizeRelativePath, type FileSystemDirectoryHandleLike, type FileSystemHandleLike } from "@/lib/file-selection";

function makeFile(name: string, size = 10, lastModified = 1) {
  return Object.assign(new File([new Uint8Array(size)], name, { type: "text/plain", lastModified }), { webkitRelativePath: "" });
}

function directory(name: string, children: FileSystemHandleLike[]): FileSystemDirectoryHandleLike {
  return { kind: "directory", name, async *values() { yield* children; } };
}

function file(name: string) {
  const item = makeFile(name);
  return { kind: "file" as const, name, async getFile() { return item; } };
}

describe("file selection", () => {
  it("normalizes one and multiple files with independent IDs", () => {
    const entries = normalizeFileList([makeFile("logo.svg"), makeFile("hero.png")]);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ name: "logo", size: 10, mimeType: "text/plain", state: "queued", progress: 0 });
    expect(entries[0].id).not.toBe(entries[1].id);
  });

  it("uses webkitRelativePath for fallback folder selections", () => {
    const selected = makeFile("home.png") as File & { webkitRelativePath: string };
    selected.webkitRelativePath = "brand/hero/home.png";
    const [entry] = normalizeFileList([selected]);
    expect(entry.relativePath).toBe("brand/hero/home.png");
  });

  it("recursively traverses nested folders and ignores directories", async () => {
    const root = directory("brand", [file("logo.svg"), directory("hero", [file("home.png"), directory("mobile", [file("phone.png")])])]);
    const entries = await readDirectoryHandle(root);
    expect(entries.map((entry) => entry.relativePath)).toEqual(["brand/logo.svg", "brand/hero/home.png", "brand/hero/mobile/phone.png"]);
  });

  it("returns an empty selection for an empty folder", async () => {
    expect(await readDirectoryHandle(directory("empty", []))).toEqual([]);
  });

  it("reads dropped folders recursively", async () => {
    const droppedFile = makeFile("menu.svg");
    const droppedEntry = {
      isFile: true,
      isDirectory: false,
      name: "menu.svg",
      file(callback: (file: File) => void) { callback(droppedFile); },
      createReader() { return { readEntries() { return; } }; },
    };
    const droppedFolder = {
      isFile: false,
      isDirectory: true,
      name: "icons",
      file() { return; },
      createReader() {
        let read = false;
        return { readEntries(callback: (entries: typeof droppedEntry[]) => void) { if (!read) { read = true; callback([droppedEntry]); } else callback([]); } };
      },
    };
    const item = { kind: "file", getAsFile: () => null, webkitGetAsEntry: () => droppedFolder } as unknown as DataTransferItem;
    const selection = await readDataTransferItems([item]);
    expect(selection[0].relativePath).toBe("icons/menu.svg");
  });

  it("deduplicates identical selections and rejects unsafe paths", () => {
    const item = makeFile("logo.svg");
    expect(createUploadEntries([{ file: item, relativePath: "brand/logo.svg" }, { file: item, relativePath: "brand/logo.svg" }])).toHaveLength(1);
    expect(sanitizeRelativePath("C:\\Users\\person\\logo.svg")).toBeUndefined();
    expect(sanitizeRelativePath("../outside/logo.svg")).toBeUndefined();
    expect(sanitizeRelativePath("brand/hero/logo.svg")).toBe("brand/hero/logo.svg");
  });
});
