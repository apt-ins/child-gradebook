import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Preferences } from "@capacitor/preferences";
export interface LocalStorage {
  read(key: string): Promise<Uint8Array | undefined>;
  write(key: string, value: Uint8Array): Promise<void>;
  remove(key: string): Promise<void>;
}
export const encode = (s: string) => new TextEncoder().encode(s);
export const decode = (v: Uint8Array) =>
  new TextDecoder("utf-8", { fatal: true }).decode(v);
function base64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 8192)
    s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(s);
}
function bytes(s: string) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
export const toBase64 = base64;
export class DeviceStorage implements LocalStorage {
  async read(key: string) {
    if (key === "active") {
      const { value } = await Preferences.get({ key: "xueji-local-active-v1" });
      return value === null ? undefined : encode(value);
    }
    try {
      const r = await Filesystem.readFile({
        path: "xueji/" + key,
        directory: Directory.Data,
      });
      return typeof r.data === "string"
        ? bytes(r.data)
        : new Uint8Array(await r.data.arrayBuffer());
    } catch (e) {
      const error = e as { code?: string };
      if (
        [
          "OS-PLUG-FILE-0008",
          "OS-PLUG-FILE-0009",
          "OS-PLUG-FILE-0018",
          "NOT_FOUND",
        ].includes(error.code || "")
      )
        return undefined;
      const info = await Filesystem.stat({
        path: "xueji/" + key,
        directory: Directory.Data,
      }).catch(() => null);
      if (!info) return undefined;
      throw e;
    }
  }
  async write(key: string, value: Uint8Array) {
    if (key === "active") {
      await Preferences.set({
        key: "xueji-local-active-v1",
        value: decode(value),
      });
      return;
    }
    await Filesystem.writeFile({
      path: "xueji/" + key,
      directory: Directory.Data,
      data: base64(value),
      recursive: true,
    });
  }
  async remove(key: string) {
    await Filesystem.deleteFile({
      path: "xueji/" + key,
      directory: Directory.Data,
    }).catch(() => {});
  }
}
export class BrowserStorage implements LocalStorage {
  private db = new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("xueji-local-v1", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("files");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  async read(key: string) {
    const db = await this.db;
    return new Promise<Uint8Array | undefined>((resolve, reject) => {
      const tx = db.transaction("files", "readonly"),
        r = tx.objectStore("files").get(key);
      r.onsuccess = () =>
        resolve(r.result === undefined ? undefined : new Uint8Array(r.result));
      r.onerror = () => reject(r.error);
    });
  }
  async write(key: string, value: Uint8Array) {
    const db = await this.db;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").put(value.slice(), key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || Error("本机存储写入失败"));
    });
  }
  async remove(key: string) {
    const db = await this.db;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
export const localStorageDriver = () =>
  Capacitor.isNativePlatform() ? new DeviceStorage() : new BrowserStorage();
