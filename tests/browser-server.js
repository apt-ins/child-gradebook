import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';
import {createApp} from '../server/app.js';import {hashPassword} from '../server/password-auth.js';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gradebook-browser-')),instances=[],servers=[];
const make=async(name,configured=true)=>{const i=await createApp({dataDir:path.join(dir,name)});instances.push(i);i.store.transaction(()=>{i.store.set('profile',{nickname:name==='main'?'浏览器测试':'小禾',subjects:['语文','数学','英语','物理','化学','生物','道德与法治','历史','地理']});});if(configured){const hash=await hashPassword('fixture-password-123');i.store.transaction(()=>i.store.set('password',hash));}return i;};
const main=await make('main'),example=await make('example'),fresh=await make('fresh',false);
const fixture=JSON.parse(fs.readFileSync('tests/dashboard-fixture.json'));example.store.transaction(()=>{for(const e of fixture.exams)example.store.db.run('INSERT INTO exams VALUES (?,?)',[e.id,JSON.stringify(e)]);});
for(const [app,port] of [[main.app,3084],[example.app,3088],[fresh.app,3089]]){const server=http.createServer(app);servers.push(server);await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));}
async function close(){await Promise.all(servers.map(s=>new Promise(r=>s.close(r))));instances.forEach(i=>i.store.close());fs.rmSync(dir,{recursive:true,force:true});process.exit(0);}process.on('SIGTERM',close);process.on('SIGINT',close);
