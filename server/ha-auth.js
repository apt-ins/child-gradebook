import crypto from 'node:crypto';
import WebSocket from 'ws';
import {cookieSecure} from './security.js';
const error=(message,status)=>Object.assign(new Error(message),{status});
const digest=v=>crypto.createHash('sha256').update(v).digest('hex');
export function verifyHAIdentity(token,{url='http://homeassistant:8123',dashboard='lovelace',view='home',timeout=8000}={}){
 return new Promise((resolve,reject)=>{
  const endpoint=new URL('/api/websocket',url);endpoint.protocol=endpoint.protocol==='https:'?'wss:':'ws:';
  const socket=new WebSocket(endpoint),results=new Map();let done=false;
  const finish=(err,result)=>{if(done)return;done=true;clearTimeout(timer);socket.removeAllListeners('message');if(socket.readyState===WebSocket.CONNECTING)socket.terminate();else socket.close();err?reject(err):resolve(result);};
  const timer=setTimeout(()=>finish(error('暂时无法验证 HA 身份，请稍后重试。',503)),timeout);
  socket.on('error',()=>finish(error('暂时无法连接 HA，请稍后重试。',503)));
  socket.on('close',()=>{if(!done)finish(error('HA 身份验证中断，请重试。',503));});
  socket.on('message',raw=>{
   let m;try{m=JSON.parse(raw.toString());}catch{return finish(error('HA 身份响应异常。',503));}
   if(m.type==='auth_required')socket.send(JSON.stringify({type:'auth',access_token:token}));
   else if(m.type==='auth_invalid')finish(error('HA 登录已失效，请重新进入。',401));
   else if(m.type==='auth_ok'){socket.send(JSON.stringify({id:1,type:'auth/current_user'}));socket.send(JSON.stringify({id:2,type:'lovelace/config',url_path:dashboard}));}
   else if(m.type==='result'&&[1,2].includes(m.id)){
    if(!m.success)return finish(error('当前 HA 用户无法访问成绩册。',403));
    results.set(m.id,m.result);if(results.size!==2)return;
    const user=results.get(1),home=results.get(2)?.views?.find(v=>v.path===view);
    const visible=home?.visible;
    if(!user?.id||!home||visible===false||Array.isArray(visible)&&!visible.some(v=>v.user===user.id))return finish(error('当前 HA 用户无法访问首页及成绩册。',403));
    finish(null,{id:user.id});
   }
  });
 });
}
export function createHASessions(security,verify=token=>verifyHAIdentity(token,{url:security.haUrl}),{now=Date.now,ttl=300000,cacheTTL=30000}={}){
 const sessions=new Map(),cookieName='gradebook_ha_session';
 const key=req=>{const value=(req.get('cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='));return value?digest(value.slice(cookieName.length+1)):'';};
 async function create(req,res,token){
  if(typeof token!=='string'||!token||token.length>8192)throw error('缺少 HA 身份凭据。',401);
  const user=await verify(token);for(const [id,s]of sessions)if(s.expires<=now())sessions.delete(id);
  sessions.delete(key(req));const raw=crypto.randomBytes(32).toString('hex'),id=digest(raw);
  sessions.set(id,{user,token,checked:now(),expires:now()+ttl,pending:null});
  res.cookie(cookieName,raw,{httpOnly:true,sameSite:'strict',secure:cookieSecure(req,security),maxAge:ttl,path:'/'});return user;
 }
 async function authenticate(req){
  const id=key(req),s=sessions.get(id);if(!s||s.expires<=now()){sessions.delete(id);return null;}
  if(now()-s.checked>=cacheTTL){
   s.pending??=verify(s.token).then(user=>{if(user.id!==s.user.id)throw error('HA 身份已变化，请重新进入。',401);s.checked=now();return user;}).finally(()=>s.pending=null);
   try{await s.pending;}catch(e){if(e.status!==503)sessions.delete(id);throw e;}
  }
  return s.user;
 }
 function clear(req,res){sessions.delete(key(req));res.clearCookie(cookieName,{httpOnly:true,sameSite:'strict',secure:cookieSecure(req,security),path:'/'});}
 return {create,authenticate,clear};
}
