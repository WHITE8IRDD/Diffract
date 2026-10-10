import { isTauri } from "@/hooks/useTauri";
import { openFileAsDocument, openPathAsDocument } from "./openImage";

export interface RecentFile {
  id: string;
  name: string;
  location: string;
  kind: "native" | "browser";
  updatedAt: number;
}

const KEY = "diffract.recent.v1";
const CHANGED = "diffract:recent-changed";
const DB_NAME = "diffract-recent-files";
const STORE = "files";
const MAX_RECENT = 6;

export function listRecent(): RecentFile[] {
  try {
    const items: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(items)) return [];
    return items.filter((x): x is RecentFile =>
      x && typeof x.id === "string" && typeof x.name === "string" &&
      typeof x.location === "string" && (x.kind === "native" || x.kind === "browser") &&
      typeof x.updatedAt === "number" && (isTauri() || x.kind === "browser"),
    ).slice(0, MAX_RECENT);
  } catch { return []; }
}

export function subscribeRecent(listener: () => void): () => void {
  window.addEventListener(CHANGED, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGED, listener);
    window.removeEventListener("storage", listener);
  };
}

// Browser File objects live in IndexedDB, NOT in localStorage (which has a
// small quota and cannot reopen an arbitrary local path without permission).
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveFile(id: string, file: File): Promise<void> {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(STORE, "readwrite").objectStore(STORE).put(file, id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}

async function deleteFiles(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      for (const id of ids) tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}

function remember(entry: RecentFile): void {
  const before = listRecent();
  const next = [entry, ...before.filter(x => x.id !== entry.id)].slice(0, MAX_RECENT);
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(CHANGED));
  void deleteFiles(before.filter(x => x.kind === "browser" && !next.some(y => x.id === y.id)).map(x => x.id)).catch(() => {});
}

export function rememberNative(path: string): void {
  try {
    remember({ id: path, name: path.split(/[\\/]/).pop() || path,
      location: path.slice(0, Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"))),
      kind: "native", updatedAt: Date.now() });
  } catch { /* Storage can be blocked. Opening the file still works. */ }
}

export async function rememberBrowser(file: File): Promise<void> {
  try {
    const id = crypto.randomUUID();
    await saveFile(id, file);
    remember({ id, name: file.name, location: "On this device", kind: "browser", updatedAt: Date.now() });
  } catch { /* Private mode may disallow IndexedDB. Do not show an unopenable row. */ }
}

export async function openRecent(entry: RecentFile): Promise<string | null> {
  if (entry.kind === "native") {
    if (!isTauri()) throw new Error("This desktop file cannot be opened in a browser.");
    const id = await openPathAsDocument(entry.id);
    rememberNative(entry.id);
    return id;
  }
  const db = await database();
  let file: File | undefined;
  try {
    file = await new Promise<File | undefined>((resolve, reject) => {
      const request = db.transaction(STORE, "readonly").objectStore(STORE).get(entry.id);
      request.onsuccess = () => resolve(request.result as File | undefined);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
  if (!file) {
    await forgetRecent(entry.id);
    throw new Error("This recent file is no longer available. It has been removed from the list.");
  }
  const id = await openFileAsDocument(file, false);
  remember({ ...entry, updatedAt: Date.now() });
  return id;
}

export async function forgetRecent(id: string): Promise<void> {
  const item = listRecent().find(x => x.id === id);
  try {
    localStorage.setItem(KEY, JSON.stringify(listRecent().filter(x => x.id !== id)));
    window.dispatchEvent(new Event(CHANGED));
    if (item?.kind === "browser") await deleteFiles([id]);
  } catch { /* Optional recent history must never block editing. */ }
}

export async function clearRecent(): Promise<void> {
  const browserIds = listRecent().filter(x => x.kind === "browser").map(x => x.id);
  try { localStorage.removeItem(KEY); window.dispatchEvent(new Event(CHANGED)); } catch { /* ignored */ }
  try { await deleteFiles(browserIds); } catch { /* ignored */ }
}

export function recentFileType(name: string): string {
  return name.toLowerCase().endsWith(".diffract") ? "PROJECT" :
    name.split(".").pop()?.toUpperCase() || "IMAGE";
}
