import path from 'node:path';
import {openStore} from './store.js';
const store=await openStore(path.resolve(process.env.DATA_DIR||'data'));
try{store.transaction(()=>{store.db.run("DELETE FROM settings WHERE key='password'");store.db.run('DELETE FROM sessions');});console.log('密码已重置。请启动服务并在本机重新设置密码。');}finally{store.close();}
