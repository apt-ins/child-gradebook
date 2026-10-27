import crypto from 'node:crypto';
import {promisify} from 'node:util';
import {cookieSecure} from './security.js';
const scrypt=promisify(crypto.scrypt), digest=v=>crypto.createHash('sha256').update(v).digest('hex');
const invalid=()=>Object.assign(new Error('密码不正确。'),{status:401});
export function validatePassword(password){if(typeof password!=='string'||password.length<10||password.length>256||!password.trim())throw Object.assign(new Error('密码需为 10 至 256 个字符。'),{status:400});}
export async function hashPassword(password){validatePassword(password);const salt=crypto.randomBytes(16).toString('hex');const hash=await scrypt(password,salt,64);return {salt,hash:hash.toString('hex')};}
export async function verifyPassword(password,stored){if(typeof password!=='string'||password.length>256||!stored?.salt||!stored?.hash)return false;const actual=await scrypt(password,stored.salt,64),expected=Buffer.from(stored.hash,'hex');return expected.length===actual.length&&crypto.timingSafeEqual(expected,actual);}
export function createPasswordSessions(store,security){
 const sessions=new Map(),cookieName='gradebook_session',ttl=7*24*60*60*1000;
 const key=req=>{const raw=(req.get('cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='));return raw?digest(raw.slice(cookieName.length+1)):'';};
 const clear=(req,res)=>{sessions.delete(key(req));res.clearCookie(cookieName,{httpOnly:true,sameSite:'strict',secure:cookieSecure(req,security),path:'/'});};
 const create=(req,res)=>{for(const [id,s]of sessions)if(s.expires<=Date.now())sessions.delete(id);sessions.delete(key(req));const raw=crypto.randomBytes(32).toString('hex');sessions.set(digest(raw),{id:digest(raw),expires:Date.now()+ttl});res.cookie(cookieName,raw,{httpOnly:true,sameSite:'strict',secure:cookieSecure(req,security),maxAge:ttl,path:'/'});};
 const authenticate=req=>{const id=key(req),s=sessions.get(id);if(!s||s.expires<=Date.now()){sessions.delete(id);return null;}return s;};
 async function setup(password){if(store.get('password'))throw Object.assign(new Error('密码已经设置，请登录。'),{status:409});const hash=await hashPassword(password);if(store.get('password'))throw Object.assign(new Error('密码已经设置，请登录。'),{status:409});store.transaction(()=>store.set('password',hash));}
 async function login(password){const current=store.get('password');if(!await verifyPassword(password,current)||store.get('password')?.hash!==current?.hash)throw invalid();return current;}
 async function change(oldPassword,newPassword){const current=await login(oldPassword);const hash=await hashPassword(newPassword);if(store.get('password')?.hash!==current.hash)throw Object.assign(new Error('密码已更改，请重试。'),{status:409});store.transaction(()=>store.set('password',hash));sessions.clear();}
 return {setup,login,change,create,authenticate,clear};
}
