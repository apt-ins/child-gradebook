import type { Photo } from "./types";
export const isLocalApp = import.meta.env.VITE_LOCAL_APP === "true";
export const localApi = () => import("./mobile/api");
export async function prepareLocalPhotos(photos: Photo[]) {
  if (isLocalApp) await (await localApi()).preparePhotos(photos);
}
export async function saveDownload(blob: Blob, name: string) {
  if (isLocalApp) {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const [{ Filesystem, Directory }, { registerPlugin }, { toBase64 }] =
        await Promise.all([
          import("@capacitor/filesystem"),
          import("@capacitor/core"),
          import("./mobile/storage"),
        ]);
      const path =
        "exports/" + crypto.randomUUID() + "/" + name.replace(/[\\/]/g, "-");
      await Filesystem.writeFile({
        path,
        directory: Directory.Cache,
        data: toBase64(new Uint8Array(await blob.arrayBuffer())),
        recursive: true,
      });
      const files = registerPlugin<{
        save(options: { path: string }): Promise<{ cancelled: boolean }>;
      }>("LocalFiles");
      await files.save({ path });
      return;
    }
  }
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
