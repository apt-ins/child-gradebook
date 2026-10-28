import { zipSync, unzipSync } from "fflate";
import type { Data, Exam, Profile, Photo } from "../types";
import { EXAM_TYPES, getExamType } from "../../shared/exam-types.js";
export interface StorageDriver {
  read(key: string): Promise<Uint8Array | undefined>;
  write(key: string, value: Uint8Array): Promise<void>;
  remove(key: string): Promise<void>;
}
const enc = (s: string) => new TextEncoder().encode(s),
  dec = (s: Uint8Array) => new TextDecoder("utf-8", { fatal: true }).decode(s);
const copy = <T>(v: T): T => structuredClone(v);
const uuid = () => crypto.randomUUID();
const idPattern =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function fail(message: string, status = 400): never {
  throw Object.assign(Error(message), { status });
}
function text(value: unknown, max: number, label: string) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    fail(`${label}不能为空，且不能超过 ${max} 个字`);
  return (value as string).trim();
}
export function validateProfile(v: Profile): Profile {
  if (
    !v ||
    !Array.isArray(v.subjects) ||
    v.subjects.length < 1 ||
    v.subjects.length > 30
  )
    fail("请保留 1 至 30 个科目");
  const subjects = v.subjects.map((s) => text(s, 24, "科目"));
  if (new Set(subjects).size !== subjects.length) fail("科目不能重复");
  return { nickname: text(v.nickname, 24, "昵称"), subjects };
}
export function validateExam(v: Exam): Exam {
  if (!v || !idPattern.test(v.id)) fail("记录编号无效");
  if (v.examType !== undefined && !EXAM_TYPES.includes(v.examType))
    fail("考试类型无效");
  const date = text(v.date, 10, "日期");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  )
    fail("请选择有效日期");
  if (!Array.isArray(v.scores) || v.scores.length < 1 || v.scores.length > 30)
    fail("请至少填写一个科目");
  const scores = v.scores.map((s) => {
    if (
      !s ||
      typeof s.score !== "number" ||
      typeof s.max !== "number" ||
      !Number.isFinite(s.score) ||
      !Number.isFinite(s.max) ||
      s.score < 0 ||
      s.max <= 0 ||
      s.max > 10000 ||
      s.score > s.max
    )
      fail("得分须在 0 到满分之间");
    return { subject: text(s.subject, 24, "科目"), score: s.score, max: s.max };
  });
  if (new Set(scores.map((s) => s.subject)).size !== scores.length)
    fail("一次考试不能有重复科目");
  if (typeof v.note !== "string" || v.note.length > 3000)
    fail("小记最多 3000 字");
  const e: Exam = {
    id: v.id,
    title: text(v.title, 80, "考试名称"),
    date,
    grade: text(v.grade, 24, "年级"),
    term: text(v.term, 40, "学期"),
    scores,
    note: v.note.trim(),
  };
  if (v.examType !== undefined) e.examType = v.examType;
  for (const k of ["classRank", "gradeRank"] as const) {
    if (v[k] !== undefined) {
      if (!Number.isSafeInteger(v[k]) || v[k]! < 1)
        fail("排名须为大于 0 的整数");
      e[k] = v[k];
    }
  }
  return e;
}
type StoredPhoto = Photo & { filename: string; storageKey?: string };
type Snapshot = {
  version: 1;
  profile: Profile;
  exams: Exam[];
  photos: StoredPhoto[];
  uploads: Record<string, { examId: string; ids: string[] }>;
  recovery?: string;
};
const empty = (): Snapshot => ({
  version: 1,
  profile: {
    nickname: "孩子",
    subjects: [
      "语文",
      "数学",
      "英语",
      "物理",
      "化学",
      "生物",
      "道德与法治",
      "历史",
      "地理",
    ],
  },
  exams: [],
  photos: [],
  uploads: {},
});
export class LocalRepository {
  private state?: Snapshot;
  private active = "a";
  private pending = Promise.resolve();
  private previews = new Map<
    string,
    { state: Snapshot; files: Record<string, Uint8Array>; expires: number }
  >();
  constructor(
    private storage: StorageDriver,
    private validateImage: (
      bytes: Uint8Array,
    ) => Promise<void> = async () => {},
  ) {}
  run<T>(fn: () => Promise<T>): Promise<T> {
    const job = this.pending.then(fn);
    this.pending = job.then(
      () => {},
      () => {},
    );
    return job;
  }
  private async load() {
    if (this.state) return this.state;
    const marker = await this.storage.read("active");
    if (!marker) {
      await this.commit(empty());
      return this.state!;
    }
    this.active = dec(marker);
    if (!["a", "b"].includes(this.active))
      fail("本机档案索引损坏，请勿清除应用数据。", 500);
    const bytes = await this.storage.read(`records-${this.active}.json`);
    if (!bytes) fail("本机档案无法读取，请保留应用数据并使用备份恢复。", 500);
    let s: Snapshot;
    try {
      s = JSON.parse(dec(bytes));
      if (
        s.version !== 1 ||
        !Array.isArray(s.exams) ||
        !Array.isArray(s.photos) ||
        !s.profile
      )
        throw Error();
    } catch {
      fail("本机档案损坏，请保留数据并使用备份恢复。", 500);
    }
    this.state = s!;
    return s!;
  }
  private async commit(next: Snapshot) {
    const slot = this.active === "a" ? "b" : "a",
      raw = JSON.stringify(next);
    await this.storage.write(`records-${slot}.json`, enc(raw));
    const verify = await this.storage.read(`records-${slot}.json`);
    if (!verify || dec(verify) !== raw)
      fail("保存校验失败，原档案未改动。", 500);
    await this.storage.write("active", enc(slot));
    this.active = slot;
    this.state = copy(next);
  }
  async data(): Promise<Data> {
    const s = await this.load();
    return {
      profile: copy(s.profile),
      exams: copy(s.exams),
      photos: s.photos.map(({ filename, storageKey, ...p }) => p),
      recoveryAvailable: !!s.recovery,
    };
  }
  async profile(v: Profile) {
    const s = copy(await this.load());
    s.profile = validateProfile(v);
    await this.commit(s);
    return s.profile;
  }
  async save(v: Exam, update = false) {
    const e = validateExam(v),
      s = copy(await this.load()),
      i = s.exams.findIndex((x) => x.id === e.id);
    if (update && i < 0) fail("这场考试已不存在", 404);
    if (!update && i >= 0) {
      if (JSON.stringify(s.exams[i]) === JSON.stringify(e)) return e;
      fail("记录编号已经存在", 409);
    }
    if (i >= 0) s.exams[i] = e;
    else s.exams.push(e);
    await this.commit(s);
    return e;
  }
  async remove(id: string) {
    const s = copy(await this.load());
    if (!s.exams.some((e) => e.id === id)) fail("这场考试已不存在", 404);
    s.exams = s.exams.filter((e) => e.id !== id);
    const removed = s.photos.filter((p) => p.examId === id);
    s.photos = s.photos.filter((p) => p.examId !== id);
    for (const [key, v] of Object.entries(s.uploads))
      if (v.examId === id) delete s.uploads[key];
    await this.commit(s);
    await Promise.all(
      removed.map((p) =>
        this.storage
          .remove("photos/" + (p.storageKey || p.filename))
          .catch(() => {}),
      ),
    );
    return { ok: true };
  }
  async photo(id: string) {
    const s = await this.load(),
      p = s.photos.find((p) => p.id === id);
    if (!p) fail("照片不存在", 404);
    const raw = await this.storage.read(
      "photos/" + (p!.storageKey || p!.filename),
    );
    if (!raw) fail("照片文件无法读取", 500);
    return raw!;
  }
  async removePhoto(id: string) {
    const s = copy(await this.load()),
      p = s.photos.find((p) => p.id === id);
    if (!p) fail("照片不存在", 404);
    s.photos = s.photos.filter((p) => p.id !== id);
    await this.commit(s);
    await this.storage
      .remove("photos/" + (p!.storageKey || p!.filename))
      .catch(() => {});
    return { ok: true };
  }
  async addPhotos(
    examId: string,
    files: { label: string; bytes: Uint8Array }[],
    uploadId?: string,
  ) {
    const s = copy(await this.load());
    if (!s.exams.some((e) => e.id === examId)) fail("请先保存考试", 404);
    if (uploadId && s.uploads[uploadId]) {
      const u = s.uploads[uploadId];
      if (u.examId !== examId) fail("上传编号已经使用", 409);
      return s.photos.filter((p) => u.ids.includes(p.id));
    }
    if (
      !files.length ||
      files.length > 8 ||
      files.some((f) => f.bytes.length > 12 * 1024 * 1024) ||
      s.photos.filter((p) => p.examId === examId).length + files.length > 30
    )
      fail("每次最多添加 8 张，每场考试最多保留 30 张截图");
    const added: StoredPhoto[] = files.map((f) => ({
      id: uuid(),
      examId,
      label: f.label.slice(0, 180),
      filename: "",
    }));
    for (const p of added) p.filename = p.id + ".webp";
    try {
      for (let i = 0; i < added.length; i++)
        await this.storage.write(
          "photos/" + added[i]!.filename,
          files[i]!.bytes,
        );
      s.photos.push(...added);
      if (uploadId)
        s.uploads[uploadId] = { examId, ids: added.map((p) => p.id) };
      await this.commit(s);
    } catch (e) {
      await Promise.all(
        added.map((p) =>
          this.storage
            .remove("photos/" + (p.storageKey || p.filename))
            .catch(() => {}),
        ),
      );
      throw e;
    }
    return added.map(({ filename, ...p }) => p);
  }
  async backup() {
    const s = await this.load(),
      files: Record<string, Uint8Array> = {};
    files["manifest.json"] = enc(
      JSON.stringify(
        {
          version: 1,
          createdAt: new Date().toISOString(),
          profile: s.profile,
          exams: s.exams,
          photos: s.photos.map(({ storageKey, ...p }) => ({
            ...p,
            filename: p.id + ".webp",
          })),
        },
        null,
        2,
      ),
    );
    let size = files["manifest.json"]!.length;
    for (const p of s.photos) {
      const bytes = await this.photo(p.id);
      size += bytes.length;
      if (size > 150 * 1024 * 1024)
        fail("档案超过本机导出大小限制，请先分别保存部分成绩截图。", 413);
      files["photos/" + p.id + ".webp"] = bytes;
    }
    return zipSync(files, { level: 1 });
  }
  async recovery() {
    const s = await this.load();
    if (!s.recovery) fail("暂无恢复前备份", 404);
    const r = await this.storage.read(s.recovery!);
    if (!r) fail("恢复前备份无法读取", 404);
    return r!;
  }
  async preview(raw: Uint8Array) {
    if (raw.length > 50 * 1024 * 1024) fail("备份 ZIP 不能超过 50MB");
    let total = 0;
    const accepted = new Set<string>();
    let files: Record<string, Uint8Array>;
    try {
      files = unzipSync(raw, {
        filter: (entry) => {
          total += entry.originalSize;
          if (accepted.size >= 25000) throw Error("文件数量过多");
          if (
            total > 150 * 1024 * 1024 ||
            entry.originalSize > 25 * 1024 * 1024 ||
            accepted.has(entry.name) ||
            entry.name.includes("..") ||
            entry.name.startsWith("/") ||
            entry.name.includes("\\")
          )
            throw Error("备份路径、大小或重复文件无效");
          accepted.add(entry.name);
          return true;
        },
      });
    } catch {
      fail("备份包损坏、过大或内容无效");
    }
    if (
      !files!["manifest.json"] ||
      files!["manifest.json"]!.length > 10 * 1024 * 1024
    )
      fail("未找到有效备份清单");
    let rawState: Snapshot;
    try {
      rawState = JSON.parse(dec(files!["manifest.json"]!));
    } catch {
      fail("备份清单损坏");
    }
    if (
      rawState!.version !== 1 ||
      !Array.isArray(rawState!.exams) ||
      !Array.isArray(rawState!.photos) ||
      rawState!.exams.length > 20000 ||
      rawState!.photos.length > 20000
    )
      fail("备份格式不支持");
    const profile = validateProfile(rawState!.profile),
      exams = rawState!.exams.map(validateExam),
      ids = new Set(exams.map((e) => e.id));
    if (ids.size !== exams.length) fail("考试记录重复");
    const pids = new Set<string>(),
      counts = new Map<string, number>();
    const photos = rawState!.photos.map((p) => {
      if (
        !idPattern.test(p.id) ||
        pids.has(p.id) ||
        !ids.has(p.examId) ||
        p.filename !== p.id + ".webp" ||
        !files!["photos/" + p.filename] ||
        files!["photos/" + p.filename]!.length > 12 * 1024 * 1024
      )
        fail("备份照片缺失或关联无效");
      pids.add(p.id);
      counts.set(p.examId, (counts.get(p.examId) || 0) + 1);
      if (counts.get(p.examId)! > 30) fail("单次考试截图过多");
      return {
        id: p.id,
        examId: p.examId,
        filename: p.filename,
        label: text(p.label || "成绩截图", 180, "照片名称"),
      };
    });
    for (const p of photos)
      await this.validateImage(files!["photos/" + p.filename]!);
    const state: Snapshot = { version: 1, profile, exams, photos, uploads: {} };
    const token = uuid();
    this.previews.clear();
    this.previews.set(token, {
      state,
      files: files!,
      expires: Date.now() + 15 * 60000,
    });
    return {
      token,
      nickname: profile.nickname,
      exams: exams.length,
      photos: photos.length,
    };
  }
  async restore(token: string, confirm: string) {
    const preview = this.previews.get(token);
    if (!preview || preview.expires < Date.now())
      fail("备份预览已过期，请重新选择");
    if (confirm !== "替换现有记录") fail("请确认替换现有记录");
    this.previews.delete(token);
    const recovery = "recovery-" + uuid() + ".zip";
    await this.storage.write(recovery, await this.backup());
    const old = await this.load();
    const state = copy(preview.state);
    state.recovery = recovery;
    const newFiles: string[] = [];
    try {
      for (const p of state.photos) {
        const name = uuid() + ".webp";
        await this.storage.write(
          "photos/" + name,
          preview.files["photos/" + p.filename]!,
        );
        newFiles.push(name);
        p.storageKey = name;
      }
      await this.commit(state);
    } catch (e) {
      await Promise.all(
        newFiles.map((n) => this.storage.remove("photos/" + n)),
      );
      await this.storage.remove(recovery);
      throw e;
    }
    await Promise.all(
      old.photos.map((p) =>
        this.storage
          .remove("photos/" + (p.storageKey || p.filename))
          .catch(() => {}),
      ),
    );
    if (old.recovery) await this.storage.remove(old.recovery).catch(() => {});
    return { ok: true };
  }
  async csv() {
    const d = await this.data(),
      cell = (v: unknown) =>
        '"' +
        String(v)
          .replace(/^[=+@\-\t\r]/, "'$&")
          .replaceAll('"', '""') +
        '"';
    const rows: unknown[][] = [
      [
        "日期",
        "年级",
        "学期",
        "考试名称",
        "考试类型",
        "班级排名",
        "年级排名",
        "科目",
        "得分",
        "满分",
        "得分率",
        "小记",
      ],
    ];
    for (const e of d.exams)
      for (const s of e.scores)
        rows.push([
          e.date,
          e.grade,
          e.term,
          e.title,
          getExamType(e) || "",
          e.classRank ?? "",
          e.gradeRank ?? "",
          s.subject,
          s.score,
          s.max,
          ((s.score / s.max) * 100).toFixed(2) + "%",
          e.note,
        ]);
    return enc("\ufeff" + rows.map((r) => r.map(cell).join(",")).join("\r\n"));
  }
}
