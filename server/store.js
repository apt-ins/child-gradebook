import initSqlJs from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';

export async function openStore(directory) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const SQL = await initSqlJs();
  const filename = path.join(directory, 'gradebook.sqlite');
  let database = fs.existsSync(filename) ? new SQL.Database(fs.readFileSync(filename)) : new SQL.Database();
  const db = { run: (...args) => database.run(...args) };
  db.run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS exams (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS photos (id TEXT PRIMARY KEY, exam_id TEXT NOT NULL, filename TEXT NOT NULL, label TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS uploads (id TEXT PRIMARY KEY, exam_id TEXT NOT NULL, photo_ids TEXT NOT NULL);`);
  function all(sql, params = []) { const s = database.prepare(sql); try {s.bind(params); const rows=[]; while(s.step()) rows.push(s.getAsObject()); return rows;} finally {s.free();} }
  function save() { const tmp = filename + '.tmp'; const fd = fs.openSync(tmp, 'w', 0o600); try {fs.writeFileSync(fd, database.export()); fs.fsyncSync(fd);} finally {fs.closeSync(fd);} fs.renameSync(tmp, filename); }
  function transaction(fn) { const before=database.export(); db.run('BEGIN'); try {const result=fn(); db.run('COMMIT'); save(); return result;} catch(e) {database.close(); database=new SQL.Database(before); throw e;} }
  const get = key => {const row=all('SELECT value FROM settings WHERE key=?',[key])[0];return row ? JSON.parse(row.value) : undefined;};
  const set = (key, value) => db.run('INSERT OR REPLACE INTO settings VALUES (?,?)',[key,JSON.stringify(value)]);
  if(!get('profile')) {set('profile',{nickname:'孩子',subjects:['语文','数学','英语','物理','化学','生物','道德与法治','历史','地理']}); save();}
  return {db,all,save,transaction,get,set,close:()=>database.close()};
}
