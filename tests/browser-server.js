import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';import https from 'node:https';import {execFileSync} from 'node:child_process';import {createApp} from '../server/app.js';import {readSecurityConfig} from '../server/security.js';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gradebook-browser-')),instances=[],servers=[];
const origins='http://127.0.0.1:3085 http://nas.example.test:3085 https://ha.example.test:3087';
const haVerifier=async token=>{if(token!=='browser-allowed')throw Object.assign(Error('当前 HA 用户无法访问成绩册。'),{status:403});return {id:'browser-family'};};
const make=async name=>{const i=await createApp({dataDir:path.join(dir,name),security:readSecurityConfig({FRAME_ANCESTORS:origins}),haVerifier});instances.push(i);i.store.transaction(()=>i.store.set('profile',{nickname:name==='main'?'浏览器测试':'小禾',subjects:['语文','数学','英语','物理','化学','生物','道德与法治','历史','地理']}));return i;};
const main=await make('main'),embedded=await make('embedded');
const fixture=JSON.parse(fs.readFileSync('tests/dashboard-fixture.json'));embedded.store.transaction(()=>{for(const e of fixture.exams)embedded.store.db.run('INSERT INTO exams VALUES (?,?)',[e.id,JSON.stringify(e)]);});
const listen=async(server,port)=>{servers.push(server);await new Promise(r=>server.listen(port,'127.0.0.1',r));};
execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',path.join(dir,'key.pem'),'-out',path.join(dir,'cert.pem'),'-days','1','-subj','/CN=*.example.test','-addext','subjectAltName=DNS:*.example.test'],{stdio:'ignore'});const tls={key:fs.readFileSync(path.join(dir,'key.pem')),cert:fs.readFileSync(path.join(dir,'cert.pem'))};
await listen(http.createServer(embedded.app),3088);await listen(https.createServer(tls,embedded.app),3086);
const parent=(req,res)=>{
 if(req.url==='/gradebook-frame.js'){res.setHeader('Content-Type','text/javascript');return res.end(fs.readFileSync('ha/gradebook-frame.js'));}
 if(req.url.startsWith('/local/')){res.setHeader('Content-Type','text/javascript');return res.end('export const bindDashboardChrome=()=>()=>{};');}
 const mainPage=req.url.startsWith('/main'),denied=req.url.includes('denied');const config={local_port:mainPage?3084:3088,local_ha_origins:['http://127.0.0.1:3085','http://nas.example.test:3085','http://127.0.0.1:3089'],external_ha_origins:['https://ha.example.test:3087'],external_url:'https://grades.example.test:3086/'};
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><header style="height:56px">HA test shell</header><script type="module">import '/gradebook-frame.js';const card=window.testCard=document.createElement('gradebook-frame-v3');card.preview=${req.url.includes('preview')};card.hass={auth:{data:{access_token:'${denied?'denied':'browser-allowed'}'},expired:false,refreshAccessToken:async()=>{}}};card.setConfig(${JSON.stringify(config)});document.body.append(card);</script></body></html>`);
};
await listen(http.createServer(parent),3085);await listen(http.createServer(parent),3089);await listen(https.createServer(tls,parent),3087);await listen(http.createServer(main.app),3084);
async function close(){await Promise.all(servers.map(s=>new Promise(r=>s.close(r))));instances.forEach(i=>i.store.close());fs.rmSync(dir,{recursive:true,force:true});process.exit(0);}process.on('SIGTERM',close);process.on('SIGINT',close);
