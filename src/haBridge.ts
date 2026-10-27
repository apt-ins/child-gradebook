const params=new URLSearchParams(location.search);
export const inHA=window.parent!==window&&params.get('embed')==='ha';
let parentOrigin='';try{const u=new URL(params.get('ha_origin')||'');if(['http:','https:'].includes(u.protocol)&&u.href===u.origin+'/')parentOrigin=u.origin;}catch{}
export function haHomeUrl(){return inHA&&parentOrigin?parentOrigin+'/lovelace/home':'';}
export function haRecordsUrl(){return '';}
let pending:Promise<void>|null=null;
export function connectHA():Promise<void>{
 if(!inHA||!parentOrigin)return Promise.reject(Error('请从 HA 首页进入成绩册。'));
 if(pending)return pending;
 pending=new Promise<void>((resolve,reject)=>{
  const id=crypto.randomUUID?.()||String(Date.now())+'-'+Math.random();
  const finish=(err?:Error)=>{clearTimeout(timer);window.removeEventListener('message',receive);err?reject(err):resolve();};
  const receive=(event:MessageEvent)=>{if(event.source!==window.parent||event.origin!==parentOrigin||event.data?.id!==id)return;if(event.data.type==='gradebook:connected')finish();else if(event.data.type==='gradebook:connection-error')finish(Object.assign(Error(event.data.message||'HA 身份验证未完成。'),{status:event.data.status}));};
  const timer=setTimeout(()=>finish(Error('暂时未能连接 HA，请重试。')),15000);window.addEventListener('message',receive);window.parent.postMessage({type:'gradebook:connect',id},parentOrigin);
 }).finally(()=>pending=null);return pending;
}
export function returnHA(){if(inHA&&parentOrigin)window.parent.postMessage({type:'gradebook:return-home'},parentOrigin);else if(haHomeUrl())location.assign(haHomeUrl());}

/** Layout messages contain only finite geometry; they never establish authentication. */
export function installHALayout(){
 if(!inHA||!parentOrigin)return ()=>{};
 const update=(event:MessageEvent)=>{
  if(event.source!==window.parent||event.origin!==parentOrigin||event.data?.type!=='gradebook:viewport')return;
  const m=event.data,values=[m.width,m.height,m.offsetTop,m.offsetLeft,...['top','right','bottom','left'].map(s=>m.insets?.[s])];
  if(values.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0)||m.width<1||m.height<1||m.width>20000||m.height>20000||['top','right','bottom','left'].some(s=>m.insets[s]>200))return;
  const root=document.documentElement;
  for(const side of ['top','right','bottom','left']){const key='--gb-safe-'+side,value=m.insets[side]+'px';if(root.style.getPropertyValue(key)!==value)root.style.setProperty(key,value);}
  for(const [key,value]of [['width',m.width],['height',m.height]] as const)root.style.setProperty('--gb-viewport-'+key,value+'px');
 };
 window.addEventListener('message',update);window.parent.postMessage({type:'gradebook:layout-ready'},parentOrigin);
 return ()=>window.removeEventListener('message',update);
}
