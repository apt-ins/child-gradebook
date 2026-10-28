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
      const [{ Filesystem, Directory }, { Share }, { toBase64 }] =
        await Promise.all([
          import("@capacitor/filesystem"),
          import("@capacitor/share"),
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
      const { uri } = await Filesystem.getUri({
        path,
        directory: Directory.Cache,
      });
      await Share.share({
        title: name,
        url: uri,
        dialogTitle: "保存或分享" + name,
      });
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
