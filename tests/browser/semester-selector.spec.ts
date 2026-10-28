import {login} from './login-helper';
import {test,expect} from '@playwright/test';import fs from 'node:fs';
const fixture=JSON.parse(fs.readFileSync('tests/dashboard-fixture.json','utf8'));
test('semester labels include grade, distinguish duplicate names, and filter original records',async({page})=>{
 const d=structuredClone(fixture),sample=fixture.exams[0];d.exams=[{...sample,id:'a',title:'初一考试',date:'2026-10-01',grade:'初一',term:'2026–2027学年 上学期'},{...sample,id:'b',title:'六年级考试',date:'2026-06-01',grade:'六年级',term:'2025–2026学年 下学期'},{...sample,id:'c',title:'上一学年考试',date:'2025-06-01',grade:'六年级',term:'2024–2025学年 下学期'},{...sample,id:'d',title:'特殊学期考试',date:'2024-03-01',grade:'五年级',term:'春季课程'}];d.photos=[];
 await page.route('**/api/data',r=>r.fulfill({json:d}));await page.setViewportSize({width:320,height:844});await login(page,'http://127.0.0.1:3088');const f=page;await f.locator('.xj-exam-switch').click();const picker=f.getByLabel('总览筛选学期',{exact:true});
 await expect(picker.locator('option')).toHaveText(['全部学期','五年级 · 春季课程','初一 · 上学期','六年级 · 下学期（2025–2026学年 下学期）','六年级 · 下学期（2024–2025学年 下学期）']);
 await expect(f.locator('.xj-library-group')).toHaveCount(4);await picker.selectOption('2024–2025学年 下学期');await expect(f.locator('.xj-exam-tile')).toHaveCount(1);await f.locator('.xj-exam-tile').click();await expect(f.locator('.gs-exam-title h2')).toHaveText('上一学年考试');expect(await f.locator('html').evaluate(el=>el.scrollWidth<=innerWidth)).toBeTruthy();
 await f.getByRole('navigation',{name:'主要导航'}).getByRole('button',{name:'成长轨迹',exact:true}).click();const progressPicker=f.getByLabel('选择学期',{exact:true});await expect(progressPicker).toHaveValue('2024–2025学年 下学期');const gap=await f.locator('.gs-semester-value').evaluate(el=>{const t=el.querySelector('span')!.getBoundingClientRect(),a=el.querySelector('svg')!.getBoundingClientRect();return a.left-t.right;});expect(gap).toBeLessThanOrEqual(8);
});
