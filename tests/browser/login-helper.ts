import type {Page} from '@playwright/test';
export async function login(page:Page,url:string){const r=await page.request.post(url+'/api/login',{headers:{'X-Requested-With':'gradebook'},data:{password:'fixture-password-123'}});if(!r.ok())throw Error(`登录测试失败: ${r.status()}`);await page.goto(url+'/');}
