import type { Photo } from "../types";
import { LocalRepository } from "./repository";
import { localStorageDriver } from "./storage";
const repository = new LocalRepository(localStorageDriver(), validateImage);
async function validateImage(bytes: Uint8Array) {
  const url = URL.createObjectURL(
    new Blob([bytes.slice().buffer as ArrayBuffer], { type: "image/webp" }),
  );
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (image.naturalWidth * image.naturalHeight > 60000000)
      throw Error("截图像素过大");
  } catch {
    throw Error("备份包含损坏或不支持的图片，原档案未改动。");
  } finally {
    URL.revokeObjectURL(url);
  }
}
const urls = new Map<string, string>();
const json = (v: unknown, status = 200) =>
  new Response(JSON.stringify(v), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const binary = (raw: Uint8Array, type: string) =>
  new Response(new Blob([raw.slice().buffer as ArrayBuffer], { type }));
async function screenshot(file: File) {
  if (
    file.size > 12 * 1024 * 1024 ||
    ![
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
    ].includes(file.type)
  )
    throw Error(
      "请选择不超过 12MB 的 JPG、PNG 或 WebP 截图；HEIC 请先转为 JPG。",
    );
  const url = URL.createObjectURL(file),
    image = new Image();
  try {
    image.src = url;
    await image.decode();
    if (image.naturalWidth * image.naturalHeight > 60000000)
      throw Error("截图像素过大");
    const ratio = Math.min(
        1,
        2400 / image.naturalWidth,
        3200 / image.naturalHeight,
      ),
      canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("无法处理截图");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b && b.type === "image/webp"
            ? resolve(b)
            : reject(Error("截图转换失败，请使用 JPG 或 PNG 重试")),
        "image/webp",
        0.86,
      ),
    );
    return {
      label: file.name,
      bytes: new Uint8Array(await blob.arrayBuffer()),
    };
  } catch (e) {
    if (e instanceof DOMException)
      throw Error("图片无法解码，请先转为 JPG 或 PNG。");
    throw e;
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function localRequest(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  return repository.run(async () => {
    try {
      const method = options.method || "GET",
        body = typeof options.body === "string" ? JSON.parse(options.body) : {};
      if (path === "/auth")
        return json({ configured: true, authenticated: true });
      if (path === "/data") return json(await repository.data());
      if (path === "/profile" && method === "PUT")
        return json(await repository.profile(body));
      if (path === "/exams" && method === "POST")
        return json(await repository.save(body));
      let m = path.match(/^\/exams\/([^/]+)(\/photos)?$/);
      if (m) {
        const id = decodeURIComponent(m[1]!);
        if (m[2] && method === "POST") {
          if (!(options.body instanceof FormData)) throw Error("请选择截图");
          const files = options.body
            .getAll("photos")
            .filter((f): f is File => f instanceof File);
          const converted = await Promise.all(files.map(screenshot));
          return json(
            await repository.addPhotos(
              id,
              converted,
              new Headers(options.headers).get("X-Upload-Id") || undefined,
            ),
          );
        }
        if (method === "PUT") {
          if (body.id !== id) throw Error("记录编号不一致");
          return json(await repository.save(body, true));
        }
        if (method === "DELETE") return json(await repository.remove(id));
      }
      m = path.match(/^\/photos\/([^/]+)$/);
      if (m) {
        const id = decodeURIComponent(m[1]!);
        if (method === "DELETE") return json(await repository.removePhoto(id));
        return binary(await repository.photo(id), "image/webp");
      }
      if (path === "/backup")
        return binary(await repository.backup(), "application/zip");
      if (path === "/recovery-backup")
        return binary(await repository.recovery(), "application/zip");
      if (path === "/csv")
        return binary(await repository.csv(), "text/csv;charset=utf-8");
      if (path === "/restore/preview" && method === "POST") {
        const file =
          options.body instanceof FormData ? options.body.get("backup") : null;
        if (!(file instanceof File)) throw Error("请选择备份 ZIP 文件");
        return json(
          await repository.preview(new Uint8Array(await file.arrayBuffer())),
        );
      }
      if (path === "/restore/confirm" && method === "POST")
        return json(await repository.restore(body.token, body.confirm));
      return json({ error: "本地应用不支持此操作" }, 404);
    } catch (e) {
      const error = e as Error & { status?: number };
      return json(
        { error: error.message || "本机保存失败，请检查可用空间并重试。" },
        error.status || 400,
      );
    }
  });
}
export async function preparePhotos(photos: Photo[]) {
  const ids = new Set(photos.map((p) => p.id));
  for (const [id, url] of urls)
    if (!ids.has(id)) {
      URL.revokeObjectURL(url);
      urls.delete(id);
    }
  for (const p of photos)
    if (!urls.has(p.id)) {
      const bytes = await repository.run(() => repository.photo(p.id));
      urls.set(
        p.id,
        URL.createObjectURL(
          new Blob([bytes.slice().buffer as ArrayBuffer], {
            type: "image/webp",
          }),
        ),
      );
    }
}
export const localPhotoUrl = (p: Photo) => urls.get(p.id) || "";
