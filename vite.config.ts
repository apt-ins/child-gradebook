import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig({ plugins: [vue(), {
 name: 'local-app-policy',
 transformIndexHtml(html) {
  if(process.env.VITE_LOCAL_APP !== 'true')return html;
  return html.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="default-src 'self' capacitor:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self' blob:; object-src 'none'; form-action 'none'">`);
 }
}], server: {proxy:{'/api':'http://127.0.0.1:3083'}} });
