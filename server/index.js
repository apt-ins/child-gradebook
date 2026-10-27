import { createApp } from './app.js';
import path from 'node:path';
const {app,store}=await createApp({dataDir:path.resolve(process.env.DATA_DIR||'data')});
const server=app.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log(`学迹已启动，端口 ${process.env.PORT||3000}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{store.close();process.exit(0);}));
