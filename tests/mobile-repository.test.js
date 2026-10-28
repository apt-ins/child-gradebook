import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import { randomUUID, webcrypto } from "node:crypto";
if (!globalThis.crypto) globalThis.crypto = webcrypto;
await fs.mkdir("artifacts/mobile", { recursive: true });
const compiled = path.resolve("artifacts/mobile/repository-test.mjs");
await build({
  entryPoints: ["src/mobile/repository.ts"],
  bundle: true,
  platform: "browser",
  format: "esm",
  outfile: compiled,
});
const { LocalRepository } = await import(compiled);
class Memory {
  files = new Map();
  failKey = "";
  async read(k) {
    return this.files.get(k)?.slice();
  }
  async write(k, v) {
    if (k === this.failKey) throw Error("disk full");
    this.files.set(k, v.slice());
  }
  async remove(k) {
    this.files.delete(k);
  }
}
const exam = () => ({
  id: randomUUID(),
  title: "本地考试",
  examType: "自定义",
  date: "2026-10-28",
  grade: "初一",
  term: "2026–2027学年 上学期",
  scores: [
    { subject: "语文", score: 0, max: 120 },
    { subject: "数学", score: 88.5, max: 150 },
  ],
  note: "认真留下痕迹",
  classRank: 3,
});
test("local save, fractional and zero scores, removed subjects and ranks persist across restart", async () => {
  const storage = new Memory(),
    r = new LocalRepository(storage),
    e = exam();
  await r.save(e);
  await r.save({ ...e, scores: [e.scores[1]], classRank: undefined }, true);
  const d = await new LocalRepository(storage).data();
  assert.equal(d.exams.length, 1);
  assert.deepEqual(d.exams[0].scores, [e.scores[1]]);
  assert.equal(d.exams[0].classRank, undefined);
  await assert.rejects(r.save({ ...e, date: "2026-02-30" }, true));
  assert.equal((await r.data()).exams[0].scores.length, 1);
});
test("failed record and pointer writes retain the last committed snapshot in memory and on disk", async () => {
  const s = new Memory(),
    r = new LocalRepository(s),
    e = exam();
  await r.save(e);
  s.failKey = "active";
  await assert.rejects(r.save({ ...e, title: "should not commit" }, true));
  assert.equal((await r.data()).exams[0].title, e.title);
  assert.equal((await new LocalRepository(s).data()).exams[0].title, e.title);
  s.failKey = "";
  const active = strFromU8(await s.read("active"));
  s.failKey = "records-" + (active === "a" ? "b" : "a") + ".json";
  await assert.rejects(r.profile({ nickname: "new name", subjects: ["语文"] }));
  assert.equal((await new LocalRepository(s).data()).profile.nickname, "孩子");
});
test("photo retries are idempotent; ZIP restore round-trips photos repeatedly and preserves recovery backup", async () => {
  const s = new Memory(),
    r = new LocalRepository(s),
    e = exam();
  await r.save(e);
  const bytes = new Uint8Array([1, 2, 3, 4]),
    upload = randomUUID();
  const first = await r.addPhotos(
    e.id,
    [{ label: "截图.webp", bytes }],
    upload,
  );
  assert.equal(
    (await r.addPhotos(e.id, [{ label: "截图.webp", bytes }], upload))[0].id,
    first[0].id,
  );
  const original = await r.backup();
  const preview = await r.preview(original);
  await r.restore(preview.token, "替换现有记录");
  assert.deepEqual(await r.photo(first[0].id), bytes);
  const second = await r.backup();
  const preview2 = await r.preview(second);
  await r.restore(preview2.token, "替换现有记录");
  assert.deepEqual(await new LocalRepository(s).photo(first[0].id), bytes);
  assert.ok((await r.recovery()).length);
  const manifest = JSON.parse(
    strFromU8(unzipSync(await r.backup())["manifest.json"]),
  );
  assert.equal(manifest.photos[0].filename, first[0].id + ".webp");
  assert.equal("storageKey" in manifest.photos[0], false);
  await assert.rejects(r.restore(preview2.token, "替换现有记录"));
  await r.remove(e.id);
  assert.equal((await r.data()).photos.length, 0);
});
test("failed restore cannot replace original records or overwrite original photo data", async () => {
  const s = new Memory(),
    r = new LocalRepository(s),
    e = exam();
  await r.save(e);
  await r.addPhotos(e.id, [{ label: "original", bytes: new Uint8Array([7]) }]);
  const original = await r.data(),
    zip = await r.backup(),
    preview = await r.preview(zip);
  s.failKey = "active";
  await assert.rejects(r.restore(preview.token, "替换现有记录"));
  s.failKey = "";
  assert.deepEqual(await r.data(), original);
  assert.deepEqual(await new LocalRepository(s).data(), original);
  assert.deepEqual(await r.photo(original.photos[0].id), new Uint8Array([7]));
});
test("restore rejects invalid or missing photos and traversal without changing saved records", async () => {
  const r = new LocalRepository(new Memory()),
    e = exam();
  await r.save(e);
  const zip = unzipSync(await r.backup());
  zip["../attack"] = strToU8("x");
  await assert.rejects(r.preview(zipSync(zip)));
  const m = JSON.parse(strFromU8(zip["manifest.json"]));
  m.photos = [
    {
      id: randomUUID(),
      examId: e.id,
      filename: randomUUID() + ".webp",
      label: "bad",
    },
  ];
  await assert.rejects(
    r.preview(zipSync({ "manifest.json": strToU8(JSON.stringify(m)) })),
  );
  await assert.rejects(r.preview(new Uint8Array([1, 2, 3])));
  assert.equal((await r.data()).exams[0].id, e.id);
});
test("concurrent queued saves retain both records; CSV protects spreadsheet formulas", async () => {
  const r = new LocalRepository(new Memory()),
    a = exam(),
    b = exam();
  a.title = '=HYPERLINK("bad")';
  await Promise.all([r.run(() => r.save(a)), r.run(() => r.save(b))]);
  assert.equal((await r.data()).exams.length, 2);
  assert.match(strFromU8(await r.csv()), /'=HYPERLINK/);
});
test("corrupt committed metadata is not silently replaced with an empty journal", async () => {
  const s = new Memory(),
    r = new LocalRepository(s);
  await r.save(exam());
  const slot = strFromU8(await s.read("active"));
  await s.write("records-" + slot + ".json", strToU8("{corrupt"));
  await assert.rejects(new LocalRepository(s).data(), /损坏/);
  assert.equal(strFromU8(await s.read("active")), slot);
});
