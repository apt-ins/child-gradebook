import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import sharp from 'sharp';
import AdmZip from 'adm-zip';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStore } from './store.js';
import { readSecurityConfig, cookieSecure } from './security.js';
import {createHASessions} from './ha-auth.js';
import { EXAM_TYPES, getExamType } from '../shared/exam-types.js';
const MAX_BACKUP=200*1024*1024, MAX_EXPANDED=300*1024*1024;
const uid = () => crypto.randomUUID();
const idPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function fail(message,status=400){const e=new Error(message);e.status=status;throw e;}
function text(v,max,label){if(typeof v!=='string'||!v.trim()||v.trim().length>max)fail(`${label}不能为空，且不能超过 ${max} 个字`);return v.trim();}
function profile(v){if(!v||typeof v!=='object')fail('孩子资料格式不正确');return {nickname:text(v.nickname,24,'昵称'),subjects:subjects(v.subjects)};}
function subjects(v){if(!Array.isArray(v)||v.length<1||v.length>30)fail('请保留 1 至 30 个科目');const a=v.map(x=>text(x,24,'科目'));if(new Set(a).size!==a.length)fail('科目名称不能重复');return a;}
export function validateExam(v){
  if(!v||typeof v!=='object')fail('考试格式不正确');
  if(!idPattern.test(v.id))fail('记录编号无效');
  if(v.examType!==undefined&&!EXAM_TYPES.includes(v.examType))fail('考试类型请选择月考、期中、期末或自定义');
  const ranks={};for(const [key,label] of [['classRank','班级排名'],['gradeRank','年级排名']]){if(v[key]!==undefined){if(typeof v[key]!=='number'||!Number.isSafeInteger(v[key])||v[key]<1)fail(label+'请填写大于 0 的整数，未知时留空');ranks[key]=v[key];}}
  const date=text(v.date,10,'日期');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)fail('请选择有效日期');
  if(!Array.isArray(v.scores)||v.scores.length<1||v.scores.length>30)fail('请至少填写一个科目的成绩');
  const scores=v.scores.map(s=>{const subject=text(s.subject,24,'科目');if(typeof s.score!=='number'||typeof s.max!=='number'||!Number.isFinite(s.score)||!Number.isFinite(s.max)||s.max<=0||s.max>10000||s.score<0||s.score>s.max)fail(`${subject}得分应在 0 到满分之间`);return {subject,score:s.score,max:s.max};});
  if(new Set(scores.map(s=>s.subject)).size!==scores.length)fail('一次考试不能重复填写相同科目');
  if(typeof v.note!=='string'||v.note.length>3000)fail('小记不能超过 3000 个字');
  return {id:v.id,title:text(v.title,80,'考试名称'),date,grade:text(v.grade,24,'年级'),term:text(v.term,40,'学期'),scores,note:v.note.trim(),...ranks,...(v.examType===undefined?{}:{examType:v.examType})};
}
export async function createApp({dataDir,haVerifier,haSessionOptions,security=readSecurityConfig(),distDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist')}={}){
  const store=await openStore(dataDir), {db,all,get,set,transaction}=store;
  if(get('password')||all('SELECT token FROM sessions').length)transaction(()=>{db.run("DELETE FROM settings WHERE key='password'");db.run('DELETE FROM sessions');});
  const haSessions=createHASessions(security,haVerifier,haSessionOptions);
  const photoDir=path.join(dataDir,'photos'), stagingDir=path.join(dataDir,'staging');
  fs.mkdirSync(photoDir,{recursive:true,mode:0o700});fs.mkdirSync(stagingDir,{recursive:true,mode:0o700});
  // Staging contains only unconfirmed restore packages; discard them after restart.
  for(const name of fs.readdirSync(stagingDir))fs.rmSync(path.join(stagingDir,name),{force:true,recursive:true});
  const previews=new Map();
  const app=express();app.disable('x-powered-by');
  if(security.trustedProxies.length)app.set('trust proxy',security.trustedProxies);
  app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'","blob:","data:"],connectSrc:["'self'"],objectSrc:["'none'"],upgradeInsecureRequests:null,frameAncestors:["'self'",...security.frameAncestors]}},xFrameOptions:security.frameAncestors.length?false:{action:'sameorigin'},strictTransportSecurity:false,crossOriginEmbedderPolicy:false}));
  app.use('/api',(_req,res,next)=>{res.set('Cache-Control','no-store');next();});
  app.use('/api/ha/session',(req,res,next)=>{
    const origin=req.get('Origin');if(!origin||!security.frameAncestors.includes(origin))return next(Object.assign(new Error('不允许此 HA 来源'),{status:403}));
    res.set({'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type, X-Requested-With'});res.vary('Origin');
    if(req.method==='OPTIONS')return res.sendStatus(204);next();
  });
  app.use('/api',(req,_res,next)=>{if(!['GET','HEAD','OPTIONS'].includes(req.method)) {if(req.get('X-Requested-With')!=='gradebook')return next(Object.assign(new Error('请求来源无效，请刷新页面重试'),{status:403}));const origin=req.get('Origin');if(req.get('Sec-Fetch-Site')==='cross-site'||(origin&&new URL(origin).host!==req.get('host')&&!(req.path==='/ha/session'&&security.frameAncestors.includes(origin))))return next(Object.assign(new Error('不允许跨站请求'),{status:403}));}next();});
  app.use(express.json({limit:'2mb'}));
  const authLimit=rateLimit({windowMs:60000,limit:60,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'连接次数较多，请稍后重试。'}});
  app.get('/api/health',(_req,res)=>res.json({ok:true}));
  app.post('/api/ha/session',authLimit,async(req,res)=>{const token=/^Bearer (.+)$/.exec(req.get('Authorization')||'')?.[1];await haSessions.create(req,res,token);res.json({ok:true,mode:'ha'});});
  for(const endpoint of ['setup','login','password'])app.post('/api/'+endpoint,(_req,res)=>res.status(410).json({error:'成绩册独立账号已停用，请通过 HA 进入。'}));
  app.get('/api/auth',async(req,res)=>{try{res.json({mode:'ha',authenticated:!!await haSessions.authenticate(req)});}catch(e){if(e.status===401||e.status===403)return res.json({mode:'ha',authenticated:false,error:e.message});throw e;}});
  app.use('/api',async(req,_res,next)=>{try{const user=await haSessions.authenticate(req);if(!user)throw Object.assign(new Error('请通过 HA 进入成绩册。'),{status:401});req.haUser=user;next();}catch(e){next(e);}});
  app.post('/api/logout',(req,res)=>{haSessions.clear(req,res);res.json({ok:true});});
  const exams=()=>all('SELECT payload FROM exams').map(r=>JSON.parse(r.payload)).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
  const photos=()=>all('SELECT id,exam_id AS examId,filename,label FROM photos');
  const snapshot=()=>({version:1,createdAt:new Date().toISOString(),profile:get('profile'),exams:exams(),photos:photos()});
  app.get('/api/data',(_req,res)=>res.json({profile:get('profile'),exams:exams(),photos:photos().map(({filename,...rest})=>rest),recoveryAvailable:fs.existsSync(path.join(dataDir,'before-restore.zip'))}));
  app.put('/api/profile',(req,res)=>{const p=profile(req.body);transaction(()=>set('profile',p));res.json(p);});
  app.post('/api/exams',(req,res)=>{const e=validateExam(req.body);const existing=all('SELECT payload FROM exams WHERE id=?',[e.id])[0];if(existing){if(existing.payload!==JSON.stringify(e))fail('记录编号已存在，请重新打开录入页面',409);return res.json(JSON.parse(existing.payload));}transaction(()=>db.run('INSERT INTO exams VALUES (?,?)',[e.id,JSON.stringify(e)]));res.status(201).json(e);});
  app.put('/api/exams/:id',(req,res)=>{if(req.params.id!==req.body.id)fail('记录编号不一致');const e=validateExam(req.body);if(!all('SELECT id FROM exams WHERE id=?',[e.id])[0])fail('记录不存在',404);transaction(()=>db.run('UPDATE exams SET payload=? WHERE id=?',[JSON.stringify(e),e.id]));res.json(e);});
  app.delete('/api/exams/:id',(req,res)=>{if(!all('SELECT id FROM exams WHERE id=?',[req.params.id])[0])fail('记录不存在',404);const files=all('SELECT filename FROM photos WHERE exam_id=?',[req.params.id]);transaction(()=>{db.run('DELETE FROM photos WHERE exam_id=?',[req.params.id]);db.run('DELETE FROM exams WHERE id=?',[req.params.id]);db.run('DELETE FROM uploads WHERE exam_id=?',[req.params.id]);});for(const f of files)fs.rmSync(path.join(photoDir,f.filename),{force:true});res.json({ok:true});});
  const photoUpload=multer({storage:multer.memoryStorage(),limits:{fileSize:12*1024*1024,files:8,parts:8},fileFilter:(_req,file,cb)=>cb(null,['image/jpeg','image/png','image/webp','image/heic','image/heif'].includes(file.mimetype))}).array('photos',8);
  app.post('/api/exams/:id/photos',photoUpload,async(req,res)=>{
    if(!all('SELECT id FROM exams WHERE id=?',[req.params.id])[0])fail('请先保存考试记录',404);
    const uploadId=req.get('X-Upload-Id');if(uploadId&&!idPattern.test(uploadId))fail('上传编号无效');
    if(uploadId){const previous=all('SELECT exam_id,photo_ids FROM uploads WHERE id=?',[uploadId])[0];if(previous){if(previous.exam_id!==req.params.id)fail('上传编号已使用',409);const ids=JSON.parse(previous.photo_ids);return res.json(photos().filter(p=>ids.includes(p.id)).map(({filename,...rest})=>rest));}}
    if(!req.files?.length)fail('请选择 JPG、PNG 或 WebP 图片；HEIC 照片请先转为 JPG');
    if(all('SELECT id FROM photos WHERE exam_id=?',[req.params.id]).length+req.files.length>30)fail('每次考试最多保存 30 张照片');
    const staged=[];
    try {for(const f of req.files){const id=uid(),filename=id+'.webp';staged.push({id,examId:req.params.id,filename,label:f.originalname.slice(0,180)});await sharp(f.buffer,{limitInputPixels:60000000}).rotate().resize({width:2400,height:3200,fit:'inside',withoutEnlargement:true}).webp({quality:86}).toFile(path.join(photoDir,filename));}
      if(!all('SELECT id FROM exams WHERE id=?',[req.params.id])[0])fail('该考试记录已被删除',404);
      if(all('SELECT id FROM photos WHERE exam_id=?',[req.params.id]).length+staged.length>30)fail('每次考试最多保存 30 张照片');
      if(uploadId&&all('SELECT id FROM uploads WHERE id=?',[uploadId])[0]){for(const p of staged)fs.rmSync(path.join(photoDir,p.filename),{force:true});return res.json([]);}
      transaction(()=>{for(const p of staged)db.run('INSERT INTO photos VALUES (?,?,?,?)',[p.id,p.examId,p.filename,p.label]);if(uploadId)db.run('INSERT INTO uploads VALUES (?,?,?)',[uploadId,req.params.id,JSON.stringify(staged.map(p=>p.id))]);});res.status(201).json(staged.map(({filename,...rest})=>rest));
    }catch(e){for(const p of staged)fs.rmSync(path.join(photoDir,p.filename),{force:true});if(e.status)throw e;fail('照片处理失败，请使用 JPG、PNG 或 WebP 图片重试');}
  });
  app.get('/api/photos/:id',(req,res)=>{const p=all('SELECT filename FROM photos WHERE id=?',[req.params.id])[0];if(!p)fail('照片不存在',404);res.type('webp').sendFile(path.join(photoDir,p.filename));});
  app.delete('/api/photos/:id',(req,res)=>{const p=all('SELECT filename FROM photos WHERE id=?',[req.params.id])[0];if(!p)fail('照片不存在',404);transaction(()=>db.run('DELETE FROM photos WHERE id=?',[req.params.id]));fs.rmSync(path.join(photoDir,p.filename),{force:true});res.json({ok:true});});
  function makeBackup(){const zip=new AdmZip(), data=snapshot(), manifest=Buffer.from(JSON.stringify(data,null,2));const total=manifest.length+data.photos.reduce((sum,p)=>sum+fs.statSync(path.join(photoDir,p.filename)).size,0);if(total>190*1024*1024)fail('档案已较大，请在 NAS 上备份整个数据目录',413);zip.addFile('manifest.json',manifest);for(const p of data.photos)zip.addLocalFile(path.join(photoDir,p.filename),'photos');return zip.toBuffer();}
  app.get('/api/backup',(_req,res)=>res.attachment('gradebook-'+new Date().toISOString().slice(0,10)+'.zip').send(makeBackup()));
  app.get('/api/recovery-backup',(_req,res)=>{const file=path.join(dataDir,'before-restore.zip');if(!fs.existsSync(file))fail('暂无恢复前备份',404);res.download(file,'gradebook-before-restore.zip');});
  app.get('/api/csv',(_req,res)=>{const cell=value=>'"'+String(value).replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';const rows=[['日期','年级','学期','考试名称','考试类型','班级排名','年级排名','科目','得分','满分','得分率','小记']];for(const e of exams())for(const s of e.scores)rows.push([e.date,e.grade,e.term,e.title,getExamType(e)||'',e.classRank??'',e.gradeRank??'',s.subject,s.score,s.max,(s.score/s.max*100).toFixed(2)+'%',e.note]);res.type('text/csv; charset=utf-8').attachment('gradebook.csv').send('\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n'));});
  function readBackup(buffer){
    let zip;try{zip=new AdmZip(buffer);}catch{fail('备份包无法读取');}
    const entries=zip.getEntries();if(entries.length>25000)fail('备份文件数量过多');let expanded=0;const names=new Set();for(const e of entries){expanded+=e.header.size;if(expanded>MAX_EXPANDED||e.header.size>25*1024*1024||names.has(e.entryName)||e.entryName.includes('..')||e.entryName.startsWith('/')||e.entryName.includes('\\'))fail('备份包内容无效或解压后过大');names.add(e.entryName);}
    const manifest=zip.getEntry('manifest.json');if(!manifest||manifest.header.size>10*1024*1024)fail('未找到有效的成绩册清单');let raw;try{raw=JSON.parse(manifest.getData().toString());}catch{fail('备份清单损坏');}
    if(raw.version!==1||!Array.isArray(raw.exams)||!Array.isArray(raw.photos)||raw.exams.length>20000||raw.photos.length>20000)fail('不支持的备份格式');
    const p=profile(raw.profile), es=raw.exams.map(validateExam), ids=new Set(es.map(e=>e.id));if(ids.size!==es.length)fail('备份含有重复记录');const pids=new Set();
    const ps=raw.photos.map(p=>{if(!idPattern.test(p.id)||pids.has(p.id)||!ids.has(p.examId)||p.filename!==p.id+'.webp')fail('备份照片关联无效');pids.add(p.id);const entry=zip.getEntry('photos/'+p.filename);if(!entry||entry.header.size>12*1024*1024)fail('备份中缺少照片或照片过大');return {id:p.id,examId:p.examId,filename:p.filename,label:typeof p.label==='string'?p.label.slice(0,180):'照片'};});
    const counts=new Map();for(const p of ps){counts.set(p.examId,(counts.get(p.examId)||0)+1);if(counts.get(p.examId)>30)fail('单次考试的照片数量过多');}
    return {zip,data:{version:1,profile:p,exams:es,photos:ps}};
  }
  const backupUpload=multer({storage:multer.memoryStorage(),limits:{fileSize:MAX_BACKUP,files:1,parts:1}}).single('backup');
  app.post('/api/restore/preview',backupUpload,(req,res)=>{if(!req.file)fail('请选择备份 ZIP 文件');const {data}=readBackup(req.file.buffer);for(const [t,p] of previews){if(p.expires<Date.now()||p.owner===req.haUser.id){fs.rmSync(p.file,{force:true});previews.delete(t);}}const token=uid(),file=path.join(stagingDir,token+'.zip');fs.writeFileSync(file,req.file.buffer,{mode:0o600});previews.set(token,{file,owner:req.haUser.id,expires:Date.now()+15*60000});res.json({token,nickname:data.profile.nickname,exams:data.exams.length,photos:data.photos.length});});
  app.post('/api/restore/confirm',async(req,res)=>{
    const preview=previews.get(req.body.token);if(!preview||preview.expires<Date.now()||preview.owner!==req.haUser.id)fail('备份预览已过期，请重新选择文件');
    if(req.body.confirm!=='替换现有记录')fail('请确认替换现有记录');
    // Consume once before asynchronous image validation, preventing double restore.
    previews.delete(req.body.token);
    let {zip,data}=readBackup(fs.readFileSync(preview.file));const prepared=[];let previousPhotoFiles=[];
    try{for(const p of data.photos){const buffer=zip.getEntry('photos/'+p.filename).getData();const id=uid(),filename=id+'.webp',stagePath=path.join(stagingDir,filename);prepared.push({id,examId:p.examId,filename,label:p.label,stagePath});await sharp(buffer,{limitInputPixels:60000000}).rotate().resize({width:2400,height:3200,fit:'inside',withoutEnlargement:true}).webp({quality:86}).toFile(stagePath);}
      // Write new files under fresh IDs, keeping existing references intact until commit.
      zip=null;previousPhotoFiles=photos().map(p=>p.filename);
      fs.writeFileSync(path.join(dataDir,'before-restore.zip.tmp'),makeBackup(),{mode:0o600});fs.renameSync(path.join(dataDir,'before-restore.zip.tmp'),path.join(dataDir,'before-restore.zip'));
      for(const p of prepared)fs.renameSync(p.stagePath,path.join(photoDir,p.filename));
      transaction(()=>{db.run('DELETE FROM exams');db.run('DELETE FROM photos');db.run('DELETE FROM uploads');set('profile',data.profile);for(const e of data.exams)db.run('INSERT INTO exams VALUES (?,?)',[e.id,JSON.stringify(e)]);for(const p of prepared)db.run('INSERT INTO photos VALUES (?,?,?,?)',[p.id,p.examId,p.filename,p.label]);});
    }catch(e){for(const p of prepared){fs.rmSync(path.join(photoDir,p.filename),{force:true});fs.rmSync(p.stagePath,{force:true});}throw e;}finally{fs.rmSync(preview.file,{force:true});}
    for(const filename of previousPhotoFiles){try{fs.rmSync(path.join(photoDir,filename),{force:true});}catch(e){console.error('旧照片清理失败',e.message);}}
    res.json({ok:true});
  });
  app.use('/api',(_req,res)=>res.status(404).json({error:'接口不存在'}));
  app.use(express.static(distDir,{index:'index.html'}));
  app.get('/{*path}',(_req,res)=>res.sendFile(path.join(distDir,'index.html')));
  app.use((err,_req,res,_next)=>{const status=err.status||((err instanceof multer.MulterError)?400:500);if(status>=500)console.error(err);res.status(status).json({error:err instanceof multer.MulterError?'文件过大或数量过多：照片每张最多 12 MB、每批最多 8 张，备份包最多 200 MB':status<500?err.message:'操作未完成，请重试；若仍失败，请检查服务器存储空间'});});
  return {app,store};
}
