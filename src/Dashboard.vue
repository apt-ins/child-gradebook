<script setup lang="ts">
import {computed,nextTick,onMounted,onUnmounted,ref,watch} from 'vue';
import {Activity,ArrowDown,ArrowLeft,ArrowUpRight,BookOpen,CalendarDays,ChevronRight,Eye,EyeOff,FileText,Image as ImageIcon,LayoutDashboard,LockKeyhole,LogOut,Maximize2,RefreshCw,Search,Settings,ShieldCheck,Sparkles,Trophy,X} from 'lucide-vue-next';
import type {Data,Exam,Photo} from './types';
import {getExamType} from '../shared/exam-types.js';
import './dashboard.css';
const embedded=new URLSearchParams(location.search).get('embed')==='ha';
const manageUrl='/manage'+(embedded?'?embed=ha':'');
const data=ref<Data|null>(null),ready=ref(false),configured=ref(true),busy=ref(false),refreshing=ref(false),password=ref(''),showPassword=ref(false),error=ref(''),loginError=ref('');
const term=ref('全部学期'),examType=ref('全部类型'),query=ref(''),subject=ref('语文'),selectedId=ref(''),visibleCount=ref(20),updated=ref('');
const typeSwitch=ref<HTMLElement|null>(null),indicator=ref({left:0,width:0});
const detail=ref<Exam|null>(null),photo=ref<Photo|null>(null),detailDialog=ref<HTMLDialogElement|null>(null),photoDialog=ref<HTMLDialogElement|null>(null),errorEl=ref<HTMLElement|null>(null);
let generation=0,alive=true,previousOverflow='';
const defaultSubjects=['语文','数学','英语','物理','化学','生物','道德与法治','历史','地理'];
const subjects=computed(()=>Array.from(new Set([...defaultSubjects,...(data.value?.profile.subjects||[]),...(data.value?.exams.flatMap(e=>e.scores.map(s=>s.subject))||[])])));
const terms=computed(()=>Array.from(new Set(data.value?.exams.map(e=>e.term)||[])).sort().reverse());
const exams=computed(()=>[...(data.value?.exams||[])].sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id)));
const filtered=computed(()=>exams.value.filter(e=>(term.value==='全部学期'||e.term===term.value)&&(examType.value==='全部类型'||(getExamType(e)||'未分类')===examType.value)&&(!query.value.trim()||[e.title,e.note,e.grade,e.term,...e.scores.map(s=>s.subject)].some(v=>v.toLowerCase().includes(query.value.trim().toLowerCase())))));
const latest=computed(()=>filtered.value[0]);
const total=computed(()=>latest.value?.scores.reduce((a,s)=>a+s.score,0)||0),maximum=computed(()=>latest.value?.scores.reduce((a,s)=>a+s.max,0)||0);
const rate=computed(()=>maximum.value?total.value/maximum.value*100:0);
const selectedScore=(sub:string)=>latest.value?.scores.find(s=>s.subject===sub);
const rows=computed(()=>filtered.value.slice().reverse().filter(e=>e.scores.some(s=>s.subject===subject.value)).map(e=>({exam:e,score:e.scores.find(s=>s.subject===subject.value)!})));
const points=computed(()=>rows.value.map((r,i)=>({...r,x:rows.value.length===1?350:50+i*600/(rows.value.length-1),y:224-(chartRates.value[i]??r.score.score/r.score.max*100)*1.84})));
const chartRates=ref<number[]>([]);
let chartFrame=0;
watch(rows,newRows=>{
 cancelAnimationFrame(chartFrame);
 const target=newRows.map(r=>r.score.score/r.score.max*100),previous=chartRates.value.slice();
 if(!target.length||!previous.length||(target.length===previous.length&&target.every((v,i)=>v===previous[i]))||matchMedia('(prefers-reduced-motion: reduce)').matches){chartRates.value=target;return;}
 const start=performance.now(),sample=(i:number)=>{const x=target.length===1?previous.length-1:i*(previous.length-1)/(target.length-1);const a=Math.floor(x),b=Math.min(previous.length-1,a+1);return previous[a]!+(previous[b]!-previous[a]!)*(x-a);};
 const from=target.map((_,i)=>sample(i));
 const tick=(now:number)=>{const t=Math.min(1,(now-start)/300),ease=1-Math.pow(1-t,3);chartRates.value=target.map((v,i)=>from[i]!+(v-from[i]!)*ease);if(t<1)chartFrame=requestAnimationFrame(tick);};
 chartRates.value=from;chartFrame=requestAnimationFrame(tick);
},{immediate:true,flush:'sync'});
const line=computed(()=>points.value.map(p=>`${p.x},${p.y}`).join(' '));
const active=computed(()=>points.value.find(p=>p.exam.id===selectedId.value)||points.value.at(-1));
const average=computed(()=>rows.value.length?rows.value.reduce((a,r)=>a+r.score.score/r.score.max*100,0)/rows.value.length:null);
const high=computed(()=>rows.value.length?Math.max(...rows.value.map(r=>r.score.score/r.score.max*100)):null);
const shown=computed(()=>filtered.value.slice(0,visibleCount.value));
const photosFor=(id:string)=>data.value?.photos.filter(p=>p.examId===id)||[];
const fmt=(n:number)=>Number(n.toFixed(2)).toString();
const percent=(n:number)=>n.toFixed(1)+'%';
const date=(s:string)=>s.replaceAll('-','.');
const photoUrl=(p:Photo)=>'/api/photos/'+encodeURIComponent(p.id);
watch([term,examType,query],()=>{visibleCount.value=20;selectedId.value='';});
watch(subject,()=>{selectedId.value='';});
function positionIndicator(){const button=typeSwitch.value?.querySelector<HTMLElement>('[aria-pressed="true"]');if(button)indicator.value={left:button.offsetLeft,width:button.offsetWidth};}
watch([examType,data],async()=>{await nextTick();positionIndicator();});
let filterObserver:ResizeObserver|undefined;
watch(typeSwitch,el=>{filterObserver?.disconnect();if(el){filterObserver=new ResizeObserver(positionIndicator);filterObserver.observe(el);positionIndicator();}});
watch(()=>!!detail.value||!!photo.value,open=>{if(open){previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';}else document.body.style.overflow=previousOverflow;});
async function api(path:string,options:RequestInit={}){
 const headers=new Headers(options.headers);headers.set('X-Requested-With','gradebook');if(options.body)headers.set('Content-Type','application/json');
 let response:Response;try{response=await fetch('/api'+path,{...options,headers,cache:'no-store',signal:AbortSignal.timeout(15000)});}catch{throw new Error('连接失败，请检查网络后重试。');}
 const body=await response.json().catch(()=>({error:'服务器响应异常，请稍后重试。'}));if(!response.ok)throw Object.assign(new Error(body.error||'操作失败'),{status:response.status});return body;
}
function clearPrivate(){data.value=null;closePhoto();closeDetail();}
async function sync(){
 const version=++generation;refreshing.value=true;error.value='';
 try{const auth=await api('/auth');if(!alive||version!==generation)return;configured.value=auth.configured;if(!auth.authenticated){clearPrivate();return;}const result:Data=await api('/data');if(!alive||version!==generation)return;data.value=result;if(!result.exams.some(e=>e.scores.some(s=>s.subject===subject.value)))subject.value=result.exams.flatMap(e=>e.scores)[0]?.subject||'语文';if(term.value!=='全部学期'&&!result.exams.some(e=>e.term===term.value))term.value='全部学期';updated.value=new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});if(detail.value){detail.value=result.exams.find(e=>e.id===detail.value!.id)||null;if(!detail.value)closeDetail();}if(photo.value&&!result.photos.some(p=>p.id===photo.value!.id))closePhoto();}
 catch(e){if(!alive||version!==generation)return;clearPrivate();if((e as {status?:number}).status!==401)error.value=(e as Error).message;}
 finally{if(alive&&version===generation){ready.value=true;refreshing.value=false;}}
}
async function login(){if(busy.value)return;busy.value=true;loginError.value='';try{await api('/login',{method:'POST',body:JSON.stringify({password:password.value})});await sync();if(!data.value)throw new Error(error.value||'登录状态已失效，请重新登录。');password.value='';}catch(e){loginError.value=(e as Error).message;await nextTick();errorEl.value?.focus();}finally{busy.value=false;}}
async function logout(){if(busy.value)return;busy.value=true;++generation;try{await api('/logout',{method:'POST'});clearPrivate();error.value='';password.value='';}catch(e){error.value=(e as Error).message;}finally{busy.value=false;}}
async function openDetail(e:Exam){detail.value=e;await nextTick();detailDialog.value?.showModal();}
function closeDetail(){detailDialog.value?.close();detail.value=null;}
async function openPhoto(p:Photo){photo.value=p;await nextTick();photoDialog.value?.showModal();}
function closePhoto(){photoDialog.value?.close();photo.value=null;}
function finishChart(){cancelAnimationFrame(chartFrame);chartRates.value=rows.value.map(r=>r.score.score/r.score.max*100);}
const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
function motionChanged(){if(motionQuery.matches)finishChart();}
function revalidate(){if(document.visibilityState==='hidden'){finishChart();return;}if(!refreshing.value&&!busy.value)void sync();}
onMounted(()=>{document.title='学迹 · 成绩看板';motionQuery.addEventListener('change',motionChanged);void sync();window.addEventListener('focus',revalidate);window.addEventListener('pageshow',revalidate);document.addEventListener('visibilitychange',revalidate);});
onUnmounted(()=>{cancelAnimationFrame(chartFrame);motionQuery.removeEventListener('change',motionChanged);filterObserver?.disconnect();alive=false;++generation;window.removeEventListener('focus',revalidate);window.removeEventListener('pageshow',revalidate);document.removeEventListener('visibilitychange',revalidate);document.body.style.overflow=previousOverflow;});
</script>

<template>
 <div class="dash" :class="{'d-embedded':embedded}">
  <a class="d-skip" href="#dashboard-main">跳到成绩内容</a>
  <template v-if="!data">
   <main class="d-gate" id="dashboard-main">
    <a class="d-brand" href="/"><span><BookOpen :size="24"/></span>学迹</a>
    <section class="d-login-panel"><div class="d-orbit" aria-hidden="true"><Activity :size="40"/><span></span></div><p class="d-eyebrow">每一次记录，都看得见</p><h1>你的成长，一目了然。</h1><p class="d-gate-description">成绩走势、历史考试、值得收藏的瞬间。<br>打开属于你们的成长档案。</p>
     <p v-if="!ready" class="d-loading" role="status"><RefreshCw class="d-spin" :size="17"/>正在连接成绩册…</p>
     <form v-else-if="configured" @submit.prevent="login"><label>私人密码<span class="d-password"><input v-model="password" :type="showPassword?'text':'password'" placeholder="请输入密码" autocomplete="current-password" required maxlength="128"><button type="button" class="d-icon" :aria-label="showPassword?'隐藏密码':'显示密码'" @click="showPassword=!showPassword"><EyeOff v-if="showPassword" :size="19"/><Eye v-else :size="19"/></button></span></label><p v-if="loginError" ref="errorEl" class="d-error" role="alert" tabindex="-1">{{loginError}}</p><button class="d-button d-primary" :disabled="busy||refreshing">{{busy?'正在打开…':'打开成绩看板'}}<ArrowUpRight :size="18"/></button></form>
     <a v-else class="d-button d-primary" :href="manageUrl">创建成绩册<ArrowUpRight :size="18"/></a>
     <div v-if="error" class="d-error" role="alert">{{error}}<button class="d-text" :disabled="refreshing" @click="sync">重新连接</button></div>
     <p class="d-private-caption"><LockKeyhole :size="13"/>私人数据，仅在登录后查看</p>
    </section><footer>把每一份认真，连成成长的轨迹。</footer>
   </main>
  </template>
  <template v-else>
   <aside class="d-sidebar"><a class="d-brand" href="/" aria-label="学迹首页"><span><BookOpen :size="23"/></span><b>成长<br>成绩册</b></a><nav aria-label="看板导航"><a class="d-nav-active" href="#dashboard-main"><LayoutDashboard :size="21"/><span>概览</span></a><a href="#score-trend"><Activity :size="21"/><span>趋势</span></a><a href="#score-history"><CalendarDays :size="21"/><span>历史</span></a><a :href="manageUrl"><Settings :size="21"/><span>管理</span></a></nav><div class="d-sidebar-bottom"><ShieldCheck :size="22"/><span>私人档案</span></div></aside>
   <div class="d-shell">
    <header class="d-topbar"><a class="d-mobile-brand" href="#dashboard-main"><BookOpen :size="21"/>学迹</a><span class="d-breadcrumb">成长档案<ChevronRight :size="14"/>成绩看板</span><div class="d-top-actions"><span class="d-session"><i></i>私人空间</span><button class="d-icon" aria-label="刷新成绩" :disabled="refreshing||busy" @click="sync"><RefreshCw :size="18" :class="{'d-spin':refreshing}"/></button><a class="d-icon" :href="manageUrl" aria-label="管理成绩"><Settings :size="19"/></a><button class="d-icon" aria-label="退出登录" :disabled="busy||refreshing" @click="logout"><LogOut :size="18"/></button><span class="d-avatar">{{data.profile.nickname.slice(0,1)}}</span></div></header>
    <main id="dashboard-main" class="d-main">
     <section class="d-page-heading"><div><p class="d-eyebrow"><span></span>成长正在发生</p><h1>{{data.profile.nickname}}的成绩看板<span class="d-heading-dot">.</span></h1><p>每一次认真，都有迹可循。<span class="d-update">更新于 {{updated}}</span></p></div><a class="d-button d-primary" :href="manageUrl"><Settings :size="16"/>管理成绩<ArrowUpRight :size="16"/></a></section>
     <section class="d-filters" aria-label="筛选历史成绩"><div class="d-select"><CalendarDays :size="16"/><select v-model="term" aria-label="筛选学期"><option>全部学期</option><option v-for="t in terms" :key="t">{{t}}</option></select></div><div ref="typeSwitch" class="d-type-switch" role="group" aria-label="筛选考试类型"><span class="d-filter-indicator" aria-hidden="true" :style="{width:indicator.width+'px',transform:`translateX(${indicator.left}px)`,visibility:indicator.width?'visible':'hidden'}"></span><button v-for="t in ['全部类型','月考','期中','期末','未分类']" :key="t" :aria-pressed="examType===t" @click="examType=t">{{t==='全部类型'?'全部考试':t}}</button></div><label class="d-search"><Search :size="17"/><input v-model="query" aria-label="搜索考试或小记" placeholder="搜索考试、小记…" type="search"></label></section>
     <template v-if="latest">
      <section class="d-summary-grid" aria-label="最近一次成绩">
       <article class="d-panel d-latest"><div class="d-panel-top"><span class="d-kicker"><i></i>最近一次考试</span><button class="d-icon" aria-label="查看最近一次考试详情" @click="openDetail(latest)"><ArrowUpRight :size="20"/></button></div><div class="d-latest-title"><h2>{{latest.title}}</h2><span class="d-tag">{{getExamType(latest)||'未分类'}}</span></div><p class="d-meta">{{date(latest.date)}}<span>·</span>{{latest.grade}}<span>·</span>{{latest.scores.length}} 科已录入</p><div class="d-total"><strong>{{fmt(total)}}</strong><span>/ {{fmt(maximum)}}<small>本次已录入总分</small></span><div class="d-rate"><span>综合得分率</span><b>{{percent(rate)}}</b></div></div><div class="d-meter" aria-hidden="true"><span :style="{width:rate+'%'}"></span></div><p class="d-latest-foot">{{latest.term}}<span>{{photosFor(latest.id).length}} 张照片</span></p></article>
       <div class="d-rank-row">
        <article class="d-panel d-rank-card d-class-rank"><span class="d-rank-icon"><Trophy :size="22" aria-hidden="true"/></span><h2>班级排名</h2><p><strong>{{latest.classRank??'—'}}</strong><span>{{latest.classRank?'名':'未记录'}}</span></p><small>本次考试 · {{latest.grade}}</small></article>
        <article class="d-panel d-rank-card d-grade-rank"><span class="d-rank-icon"><ShieldCheck :size="22" aria-hidden="true"/></span><h2>年级排名</h2><p><strong>{{latest.gradeRank??'—'}}</strong><span>{{latest.gradeRank?'名':'未记录'}}</span></p><small>本次考试 · {{latest.grade}}</small></article>
       </div>
      </section>
       <article class="d-panel d-subject-panel"><div class="d-panel-heading"><div><h2>各科表现</h2><p>本次成绩 · 点击科目查看历史走势</p></div><span class="d-small-label">得分 / 满分</span></div><div class="d-subject-grid"><button v-for="s in subjects" :key="s" class="d-subject" :class="{'is-selected':subject===s,'is-missing':!selectedScore(s)}" :aria-pressed="subject===s" @click="subject=s"><span>{{s}}<ArrowUpRight :size="13"/></span><p v-if="selectedScore(s)"><strong :class="{'d-long-score':fmt(selectedScore(s)!.score).length>4}">{{fmt(selectedScore(s)!.score)}}</strong><small>/ {{fmt(selectedScore(s)!.max)}}</small><em>{{percent(selectedScore(s)!.score/selectedScore(s)!.max*100)}}</em></p><p v-else><strong class="d-no-score">—</strong><small>未录入</small></p><div class="d-subject-meter" aria-hidden="true"><i :style="{width:(selectedScore(s)?selectedScore(s)!.score/selectedScore(s)!.max*100:0)+'%'}"></i></div></button></div></article>
      <section id="score-trend" class="d-trend-grid">
       <article class="d-panel d-chart-panel"><div class="d-panel-heading"><div><span class="d-kicker">沿着时间，看见变化</span><h2>{{subject}}成绩趋势</h2></div><label class="d-chart-select"><span class="d-small-label">切换科目</span><select v-model="subject" aria-label="趋势科目"><option v-for="s in subjects" :key="s">{{s}}</option></select></label></div><div class="d-chart-stats"><span>平均得分率 <strong>{{average===null?'—':percent(average)}}</strong></span><span>最高得分率 <strong>{{high===null?'—':percent(high)}}</strong></span><span class="d-chart-count">{{rows.length}} 次记录</span></div>
        <template v-if="points.length"><div class="d-chart-wrap"><svg class="d-chart" viewBox="0 0 700 270" role="group" :aria-label="subject+'历史得分率趋势'"><defs><linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#385cf6" stop-opacity=".13"/><stop offset="100%" stop-color="#385cf6" stop-opacity="0"/></linearGradient></defs><g v-for="v in [0,25,50,75,100]" :key="v"><line x1="50" x2="650" :y1="224-v*1.84" :y2="224-v*1.84" stroke="#e3e8f2" stroke-dasharray="3 6"/><text x="34" :y="228-v*1.84" text-anchor="end">{{v}}</text></g><text x="50" y="18" class="d-axis-title">得分率 % · 按考试顺序</text><polygon v-if="points.length>1" :points="`50,224 ${line} 650,224`" fill="url(#trend-fill)"/><polyline v-if="points.length>1" :points="line" fill="none" stroke="#385cf6" stroke-width="2.5" stroke-linejoin="round"/>
         <line v-if="active" :x1="active.x" :x2="active.x" y1="32" y2="224" stroke="#7b93ea" stroke-dasharray="3 6" opacity=".4"/>
         <g v-for="p in points" :key="p.exam.id"><circle :cx="p.x" :cy="p.y" :r="active?.exam.id===p.exam.id?9:5" fill="#ffffff" stroke="#385cf6" stroke-width="2"/><circle :cx="p.x" :cy="p.y" r="22" fill="transparent" role="button" tabindex="0" :aria-pressed="active?.exam.id===p.exam.id" :aria-label="`${p.exam.title}，${p.exam.date}，${p.score.score}分，满分${p.score.max}分`" @click="selectedId=p.exam.id" @keydown.enter.prevent="selectedId=p.exam.id" @keydown.space.prevent="selectedId=p.exam.id"><title>{{p.exam.title}} · {{p.score.score}} / {{p.score.max}}</title></circle></g><text x="50" y="258">{{date(points[0]!.exam.date)}}</text><text v-if="points.length>1" x="650" y="258" text-anchor="end">{{date(points[points.length-1]!.exam.date)}}</text></svg></div><div class="d-point-picker" aria-label="选择考试节点"><button v-for="p in points" :key="p.exam.id" :aria-pressed="active?.exam.id===p.exam.id" @click="selectedId=p.exam.id">{{p.exam.title}}<span>{{date(p.exam.date)}}</span></button></div><div class="d-active-point" v-if="active"><span><i></i>{{active.exam.title}}<small>{{date(active.exam.date)}}</small></span><strong>{{fmt(active.score.score)}}<small> / {{fmt(active.score.max)}}</small><b>{{percent(active.score.score/active.score.max*100)}}</b></strong><button class="d-text" @click="openDetail(active.exam)">查看详情<ChevronRight :size="16"/></button></div></template>
        <div v-else class="d-empty-chart"><Activity :size="35"/><p>当前筛选下还没有{{subject}}成绩</p><span>试试其他科目，或调整筛选条件。</span></div><p class="d-chart-note">不同满分统一为得分率；试卷难度不同，曲线仅供回顾。{{rows.length===1?'目前只有一次记录，继续记录后即可连成趋势。':''}}</p>
       </article>
       <aside class="d-panel d-memory"><div class="d-panel-heading"><h2>这一次的小记</h2><Sparkles :size="19"/></div><span class="d-memory-quote" aria-hidden="true">“</span><p class="d-memory-text">{{latest.note||'这一页还没有小记。记下一句当时的心情，让分数之外的成长也被看见。'}}</p><div class="d-memory-source"><span>{{date(latest.date)}}</span><strong>{{latest.title}}</strong></div><div class="d-memory-photo" v-if="photosFor(latest.id).length"><button :aria-label="'放大照片：'+photosFor(latest.id)[0]!.label" @click="openPhoto(photosFor(latest.id)[0]!)"><img :src="photoUrl(photosFor(latest.id)[0]!)" :alt="photosFor(latest.id)[0]!.label" loading="lazy"><span><ImageIcon :size="14"/>{{photosFor(latest.id).length}} 张照片<Maximize2 :size="14"/></span></button></div><button v-else class="d-memory-open d-text" @click="openDetail(latest)">翻开完整记录<ArrowUpRight :size="16"/></button></aside>
      </section>
     </template>
     <section v-else class="d-panel d-empty"><BookOpen :size="40"/><h2>{{exams.length?'没有找到符合条件的考试':'成长的第一份记录，等你写下'}}</h2><p>{{exams.length?'调整学期、类型或搜索词，再看看其他记录。':'记录一次考试，成绩、排名和照片都会在这里汇成成长档案。'}}</p><button v-if="exams.length" class="d-button d-secondary" @click="term='全部学期';examType='全部类型';query=''">清除筛选</button><a v-else class="d-button d-primary" :href="manageUrl">去记录第一次考试<ArrowUpRight :size="16"/></a></section>
     <section id="score-history" class="d-panel d-history"><div class="d-panel-heading"><div><span class="d-kicker">每一次，都值得留下</span><h2>历史考试<span class="d-count">{{filtered.length}}</span></h2></div><a class="d-text" :href="manageUrl">录入 / 编辑<ArrowUpRight :size="16"/></a></div><div v-if="shown.length" class="d-table-scroll"><table class="d-history-table"><thead><tr><th>考试记录</th><th v-for="s in subjects" :key="s">{{s}}</th><th>班级排名</th><th>年级排名</th><th>收藏</th></tr></thead><tbody><tr v-for="e in shown" :key="e.id"><td><button class="d-exam-title" @click="openDetail(e)"><strong>{{e.title}}<ArrowUpRight :size="14"/></strong><span>{{date(e.date)}}<i>{{getExamType(e)||'未分类'}}</i></span></button></td><td v-for="s in subjects" :key="s"><template v-if="e.scores.find(v=>v.subject===s)"><strong>{{fmt(e.scores.find(v=>v.subject===s)!.score)}}</strong><small>/{{fmt(e.scores.find(v=>v.subject===s)!.max)}}</small></template><span v-else class="d-dash" aria-label="未录入">—</span></td><td>{{e.classRank??'—'}}</td><td>{{e.gradeRank??'—'}}</td><td><span class="d-photo-count"><ImageIcon :size="14"/>{{photosFor(e.id).length}}</span></td></tr></tbody></table></div>
      <div class="d-history-mobile"><button v-for="e in shown" :key="e.id" class="d-history-card" @click="openDetail(e)"><span class="d-history-card-top"><span>{{date(e.date)}}<i>{{getExamType(e)||'未分类'}}</i></span><ArrowUpRight :size="18"/></span><strong>{{e.title}}</strong><span class="d-history-scores"><span v-for="s in e.scores" :key="s.subject">{{s.subject}} <b>{{fmt(s.score)}}</b><small>/{{fmt(s.max)}}</small></span></span><span class="d-history-card-foot"><span>班级 {{e.classRank?'第 '+e.classRank+' 名':'未记录'}}<i>年级 {{e.gradeRank?'第 '+e.gradeRank+' 名':'未记录'}}</i></span><span><ImageIcon :size="13"/>{{photosFor(e.id).length}}</span></span></button></div><p v-if="!shown.length" class="d-history-empty">暂无符合条件的考试记录</p><button v-if="shown.length<filtered.length" class="d-load-more d-text" @click="visibleCount+=20">再看 20 次考试<ArrowDown :size="16"/></button></section>
     <footer class="d-footer"><span><LockKeyhole :size="12"/>你的记录，安心留存</span><span>已保存 {{data.exams.length}} 次考试 · {{data.photos.length}} 张照片</span></footer>
    </main>
   </div>
  </template>
  <dialog ref="detailDialog" class="d-dialog d-detail" aria-labelledby="d-detail-title" @cancel.prevent="closeDetail" @click="(e:MouseEvent)=>{if(e.target===detailDialog)closeDetail()}"><template v-if="detail"><div class="d-dialog-head"><span class="d-kicker">成长档案</span><button class="d-icon" aria-label="关闭详情" autofocus @click="closeDetail"><X :size="22"/></button></div><p class="d-meta">{{date(detail.date)}} · {{detail.grade}} · {{detail.term}}</p><h2 id="d-detail-title">{{detail.title}}</h2><div class="d-detail-ranks"><span class="d-tag">{{getExamType(detail)||'未分类'}}</span><span>班级 {{detail.classRank?'第 '+detail.classRank+' 名':'未记录'}}</span><span>年级 {{detail.gradeRank?'第 '+detail.gradeRank+' 名':'未记录'}}</span></div><div class="d-detail-scores"><div v-for="s in detail.scores" :key="s.subject"><span>{{s.subject}}</span><p><strong :class="{'d-long-score':fmt(s.score).length>4}">{{fmt(s.score)}}</strong><small> / {{fmt(s.max)}}</small></p><b>{{percent(s.score/s.max*100)}}</b></div></div><section class="d-detail-note"><h3>这一次的小记</h3><p>{{detail.note||'还没有写下小记。'}}</p></section><section class="d-detail-photos"><h3>试卷与照片 <small>{{photosFor(detail.id).length}}</small></h3><div v-if="photosFor(detail.id).length"><button v-for="p in photosFor(detail.id)" :key="p.id" :aria-label="'放大照片：'+p.label" @click="openPhoto(p)"><img :src="photoUrl(p)" :alt="p.label" loading="lazy"></button></div><p v-else>还没有收藏照片。</p></section><div class="d-detail-footer"><span>记录的每一面，都值得珍藏。</span><a class="d-button d-secondary" :href="manageUrl">进入管理<ArrowUpRight :size="16"/></a></div></template></dialog>
  <dialog ref="photoDialog" class="d-dialog d-photo-dialog" aria-label="照片查看" @cancel.prevent="closePhoto"><template v-if="photo"><div class="d-dialog-head"><span>{{photo.label}}</span><button class="d-icon" aria-label="关闭照片" autofocus @click="closePhoto"><X :size="23"/></button></div><div class="d-photo-stage"><img :src="photoUrl(photo)" :alt="photo.label" @error="($event.target as HTMLImageElement).alt='照片暂时无法加载，请关闭后重试'"></div><p>可用浏览器缩放查看照片细节</p></template></dialog>
 </div>
</template>
