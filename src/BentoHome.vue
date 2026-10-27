<script setup lang="ts">
import {computed,nextTick,onUnmounted,ref,watch} from 'vue';
import {ArrowRight,ChartNoAxesColumnIncreasing,ChevronRight,GitCompareArrows,Images,Pencil,Plus,Users,X} from 'lucide-vue-next';
import type {useJourney} from './useJourney';
import type {Exam} from './types';
const props=defineProps<{journey:ReturnType<typeof useJourney>}>();
const {data,current,exams,filtered,allSubjects,subject,rows,points:journeyPoints,term,terms,typeFilter,query,fmt,date,urlFor,navigate,pickExam,photosFor,photoUrl,openPhoto,getExamType}=props.journey;
const chartEl=ref<HTMLElement|null>(null),chartWidth=ref(620);
let chartObserver:ResizeObserver|undefined;
watch(chartEl,el=>{chartObserver?.disconnect();if(el){chartWidth.value=el.clientWidth;chartObserver=new ResizeObserver(entries=>{chartWidth.value=entries[0]!.contentRect.width;});chartObserver.observe(el);}});
const range=ref('5'),limit=ref(10),detail=ref<HTMLDialogElement|null>(null),detailId=ref('');
const detailExam=computed(()=>exams.value.find(e=>e.id===detailId.value));
const companions=computed(()=>Array.from(new Set(['语文','数学','英语',...allSubjects.value])).filter(s=>s!==subject.value).slice(0,2));
const columns=computed(()=>Array.from(new Set([subject.value,...companions.value,...allSubjects.value])));
const score=(e:Exam|undefined,s:string)=>e?.scores.find(v=>v.subject===s);
const numberStyle=(e:Exam,s:string)=>({'--b-score-length':fmt(score(e,s)?.score??0).length,'--b-max-length':fmt(score(e,s)?.max??100).length});
const history=computed(()=>filtered.value.slice(0,limit.value));
const recent=computed(()=>range.value==='all'?rows.value:rows.value.slice(-Number(range.value)));
const sameMax=computed(()=>new Set(recent.value.map(r=>r.score.max)).size<=1);
const ceiling=computed(()=>sameMax.value?(recent.value[0]?.score.max||100):100);
const floor=computed(()=>{if(!recent.value.length)return 0;const min=Math.min(...recent.value.map(r=>sameMax.value?r.score.score:r.score.score/r.score.max*100));const unit=ceiling.value/6;return Math.max(0,Math.floor((min-ceiling.value*.25)/unit)*unit);});
const chartPoints=computed(()=>recent.value.map((r,i)=>{const animated=journeyPoints.value.find(p=>p.exam.id===r.exam.id);const rate=animated?(226-animated.y)/1.86:r.score.score/r.score.max*100;return {...r,x:recent.value.length===1?chartWidth.value/2:40+i*(chartWidth.value-72)/(recent.value.length-1),y:160-Math.max(0,Math.min(1,(rate/100*ceiling.value-floor.value)/(ceiling.value-floor.value)))*136};}));
const curve=computed(()=>chartPoints.value.map((p,i,a)=>i===0?`M ${p.x} ${p.y}`:`C ${a[i-1]!.x+(p.x-a[i-1]!.x)/3} ${a[i-1]!.y}, ${p.x-(p.x-a[i-1]!.x)/3} ${p.y}, ${p.x} ${p.y}`).join(' '));
const focusId=ref('');
const activePoint=computed(()=>chartPoints.value.find(p=>p.exam.id===focusId.value)||chartPoints.value.find(p=>p.exam.id===current.value?.id)||chartPoints.value.at(-1));
const labels=computed(()=>chartPoints.value.filter((_,i,a)=>a.length<=5||i===0||i===a.length-1||i===Math.floor(a.length/2)));
watch([term,typeFilter,query],()=>limit.value=10);
watch(subject,()=>focusId.value='');
let previousOverflow='';
async function showDetails(e:Exam){pickExam(e.id);detailId.value=e.id;await nextTick();previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';detail.value?.showModal();}
function closeDetails(){detail.value?.close();document.body.style.overflow=previousOverflow;detailId.value='';}
async function editDetail(){const id=detailId.value;closeDetails();await navigate('/record/'+id+'/edit');}
onUnmounted(()=>{chartObserver?.disconnect();if(detailId.value)document.body.style.overflow=previousOverflow;});
</script>

<template>
 <div class="b-home">
  <section class="b-overview" aria-label="考试成绩概览">
   <header class="b-heading"><div><h1 class="j-page-title" tabindex="-1">{{data.profile.nickname}}</h1><p>历史考试成绩</p></div><div class="b-heading-actions"><select :value="current?.id||''" aria-label="选择考试" @change="pickExam(($event.target as HTMLSelectElement).value)"><option v-if="!current" value="">暂无考试</option><option v-for="e in filtered" :key="e.id" :value="e.id">{{e.title}} · {{date(e.date)}}</option></select><a class="b-add" :href="urlFor('/record/new')" @click.prevent="navigate('/record/new')"><Plus :size="17" aria-hidden="true"/><span>记一场考试</span></a></div></header>
   <template v-if="current">
    <div class="b-tiles">
     <button class="b-score b-score-main" :aria-label="'查看'+subject+'考试详情'" @click="showDetails(current)"><span>{{subject}}</span><p v-if="score(current,subject)" :style="numberStyle(current,subject)" :class="{'b-long-score':fmt(score(current,subject)!.score).length>2}"><strong :key="subject+current.id">{{fmt(score(current,subject)!.score)}}</strong><small>/ {{fmt(score(current,subject)!.max)}}</small></p><p v-else class="b-unrecorded">未录入</p><footer>{{current.title}}<ChevronRight :size="17" aria-hidden="true"/></footer></button>
     <button v-for="(s,i) in companions" :key="s" class="b-score b-score-small" :class="i===0?'b-apricot':'b-mint'" :aria-label="'查看'+s+'历史'" @click="subject=s"><span>{{s}}</span><p v-if="score(current,s)" :style="numberStyle(current,s)"><strong>{{fmt(score(current,s)!.score)}}</strong><small>/ {{fmt(score(current,s)!.max)}}</small></p><p v-else class="b-unrecorded">未录入</p></button>
     <div class="b-rank b-class"><span>班级排名</span><strong>{{current.classRank??'—'}}</strong><Users :size="28" aria-hidden="true"/></div>
     <div class="b-rank b-grade"><span>年级排名</span><strong>{{current.gradeRank??'—'}}</strong><ChartNoAxesColumnIncreasing :size="28" aria-hidden="true"/></div>
    </div>
    <div class="b-chart-controls"><div class="b-subjects" role="group" aria-label="切换成绩科目"><button v-for="s in allSubjects" :key="s" :aria-pressed="subject===s" @click="subject=s">{{s}}</button></div><select v-model="range" aria-label="趋势考试范围"><option value="5">近5次考试</option><option value="10">近10次考试</option><option value="all">全部考试</option></select></div>
    <section ref="chartEl" class="b-chart" :aria-label="subject+'成绩变化'"><header><h2>{{subject}}成绩变化</h2><span>{{sameMax?'分数':'得分率 %'}}</span></header>
     <svg v-if="chartPoints.length" class="b-curve" :viewBox="`0 0 ${chartWidth} 218`" role="img" :aria-label="subject+'历次考试'+(sameMax?'分数':'得分率')+'，详细成绩见下方列表'"><defs><linearGradient id="b-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2c78f6" stop-opacity=".18"/><stop offset="1" stop-color="#2c78f6" stop-opacity=".015"/></linearGradient></defs><g v-for="n in [0,1,2,3]" :key="n"><line x1="40" :x2="chartWidth-32" :y1="160-n*136/3" :y2="160-n*136/3"/><text x="30" :y="164-n*136/3" text-anchor="end">{{fmt(floor+(ceiling-floor)*n/3)}}</text></g><path v-if="chartPoints.length>1" :d="curve+` L ${chartWidth-32} 160 L 40 160 Z`" fill="url(#b-area)"/><path v-if="chartPoints.length>1" :d="curve" class="b-line"/><g v-for="p in chartPoints" :key="p.exam.id"><circle :cx="p.x" :cy="p.y" :r="activePoint?.exam.id===p.exam.id?6:4.5" class="b-dot"/><title>{{p.exam.title}}：{{fmt(p.score.score)}} / {{fmt(p.score.max)}}</title></g><g v-for="p in labels" :key="p.exam.id"><text :x="p.x" y="183" text-anchor="middle">{{p.exam.date.slice(0,7).replace('-','.')}}</text><text :x="p.x" y="207" text-anchor="middle">{{getExamType(p.exam)||'考试'}}</text></g></svg>
     <p v-else class="b-chart-empty">还没有{{subject}}成绩，录入后会在这里展示。</p>
     <div v-if="chartPoints.length" class="b-point-pills" aria-label="查看趋势数据点"><button v-for="p in chartPoints" :key="p.exam.id" :aria-pressed="activePoint?.exam.id===p.exam.id" @click="focusId=p.exam.id">{{date(p.exam.date)}}<b>{{fmt(p.score.score)}}<small>/{{fmt(p.score.max)}}</small></b></button></div>
     <p v-if="rows.length===1" class="b-chart-note">目前只有一次记录，继续记录后即可观察变化。</p><p v-else-if="!sameMax" class="b-chart-note">试卷满分不同，已统一按得分率比较；原始成绩保留在数据点中。</p>
    </section>
   </template>
   <div v-else class="b-empty"><h2>{{exams.length?'没有匹配的考试':'从第一场考试开始'}}</h2><p>{{exams.length?'调整下方筛选条件，查看其他记录。':'记录成绩，也留住当时的小进步。'}}</p><a v-if="!exams.length" class="j-button j-primary" :href="urlFor('/record/new')" @click.prevent="navigate('/record/new')">记录第一次考试<ArrowRight :size="16"/></a></div>
  </section>
  <section class="b-history" aria-label="历史考试记录"><header><h2>历史考试记录 <small>{{filtered.length}} 次</small></h2><button v-if="current" class="j-text" @click="showDetails(current)">本场详情<ChevronRight :size="15"/></button></header><div class="b-filters"><input v-model="query" aria-label="搜索考试" placeholder="搜索考试或小记"><select v-model="term" aria-label="选择学期"><option>全部学期</option><option v-for="t in terms" :key="t">{{t}}</option></select><select v-model="typeFilter" aria-label="筛选考试类型"><option>全部类型</option><option v-for="t in ['月考','期中','期末','未分类']" :key="t">{{t}}</option></select></div>
   <div class="b-table-wrap"><table><thead><tr><th>考试时间</th><th>考试名称</th><th v-for="(s,i) in columns" :key="s" :class="{'b-extra':i>2}">{{s}}</th><th><span class="b-sr">考试详情</span></th></tr></thead><tbody><tr v-for="e in history" :key="e.id" :class="{'b-current':current?.id===e.id}"><td>{{date(e.date)}}</td><th scope="row"><button :aria-label="'查看'+e.title+'详情'" @click="showDetails(e)">{{e.title}}</button></th><td v-for="(s,i) in columns" :key="s" :class="{'b-extra':i>2}">{{score(e,s)?fmt(score(e,s)!.score):'—'}}</td><td><button class="b-row-open" :aria-label="e.title+'完整成绩'" @click="showDetails(e)"><ChevronRight :size="17"/></button></td></tr></tbody></table></div><p v-if="!history.length" class="b-history-empty">暂无记录</p><button v-if="filtered.length>limit" class="b-more" @click="limit+=10">再看 10 次考试</button>
  </section>
  <dialog ref="detail" class="j-dialog b-detail" aria-labelledby="b-detail-title" @cancel.prevent="closeDetails" @close="closeDetails" @click="(e:MouseEvent)=>{if(e.target===detail)closeDetails()}"><template v-if="detailExam"><header><div><p>{{date(detailExam.date)}} · {{detailExam.grade}}</p><h2 id="b-detail-title">{{detailExam.title}}</h2><p>{{detailExam.term}}</p></div><button class="j-icon j-close" aria-label="关闭考试详情" autofocus @click="closeDetails"><X :size="22"/></button></header><div class="b-detail-scores"><div v-for="s in detailExam.scores" :key="s.subject"><span>{{s.subject}}</span><strong>{{fmt(s.score)}} <small>/ {{fmt(s.max)}}</small></strong><span>{{(s.score/s.max*100).toFixed(1)}}%</span></div></div><div class="b-detail-ranks"><span>班级排名 <b>{{detailExam.classRank??'未记录'}}</b></span><span>年级排名 <b>{{detailExam.gradeRank??'未记录'}}</b></span></div><section class="b-memories"><h3>试卷与小记 <small>{{photosFor(detailExam.id).length}} 张照片</small></h3><div class="b-photo-strip"><button v-for="p in photosFor(detailExam.id)" :key="p.id" :aria-label="'放大照片：'+p.label" @click="openPhoto(p)"><img :src="photoUrl(p)" :alt="p.label" loading="lazy"><Images :size="16"/></button></div><p>{{detailExam.note||'还没有写下小记。'}}</p></section><footer><button class="j-outline" @click="editDetail"><Pencil :size="15"/>编辑这场考试</button><a v-if="exams.length>1" class="j-text" :href="urlFor('/compare')" @click.prevent="closeDetails();navigate('/compare')"><GitCompareArrows :size="16"/>和另一场对照</a></footer></template></dialog>
 </div>
</template>
