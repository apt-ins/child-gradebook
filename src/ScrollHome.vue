<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { motion } from "motion-v";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GitCompareArrows,
  Paperclip,
  Pencil,
  Plus,
  Search,
  X,
  CalendarDays,
  NotebookPen,
  ChartNoAxesCombined,
} from "lucide-vue-next";
import type { useJourney } from "./useJourney";
import type { Exam } from "./types";
import AnimatedNumber from "./AnimatedNumber.vue";
import { EXAM_TYPES } from "../shared/exam-types.js";
import { COPY } from "./copy";
const props = defineProps<{ journey: ReturnType<typeof useJourney> }>();
const {
  homeView: view,
  data,
  current,
  total,
  maximum,
  exams,
  filtered,
  timeline,
  currentIndex,
  allSubjects,
  subject,
  rows,
  term,
  terms,
  typeFilter,
  query,
  fmt,
  date,
  urlFor,
  navigate,
  pickExam,
  photosFor,
  photoUrl,
  openPhoto,
  getExamType,
} = props.journey;
const timelineTrack = ref<HTMLElement | null>(null);
const rm = matchMedia("(prefers-reduced-motion: reduce)"),
  reduced = ref(rm.matches);
const reducedChanged = () => (reduced.value = rm.matches);
onMounted(() => rm.addEventListener("change", reducedChanged));
const plotTransition = computed(() =>
  reduced.value ? { duration: 0 } : { duration: 0.45 },
);
const range = ref("5"),
  directory = ref<HTMLDialogElement | null>(null),
  detail = ref<HTMLDialogElement | null>(null),
  attachments = ref<HTMLDialogElement | null>(null),
  activeDialog = ref<HTMLDialogElement | null>(null),
  limit = ref(20),
  focusId = ref("");
const colors = [
  "#6c9e99",
  "#748fb2",
  "#9a91bb",
  "#779d94",
  "#b5a078",
  "#859cb2",
  "#a28ca0",
  "#739a9f",
  "#a89b7f",
];
const score = (e: Exam | undefined, s: string) =>
  e?.scores.find((v) => v.subject === s);
const examSubjects = computed(
  () => current.value?.scores.map((s) => s.subject) || [],
);
const semesterOptions = computed(() => {
  const options = terms.value.map((value) => {
    const grades = Array.from(
      new Set(
        exams.value
          .filter((e) => e.term === value)
          .map((e) => e.grade?.trim())
          .filter(Boolean),
      ),
    );
    const half = value.match(/上学期|下学期/)?.[0] || value;
    return {
      value,
      label: grades.length ? `${grades.join(" / ")} · ${half}` : value,
    };
  });
  const counts = new Map<string, number>();
  for (const o of options) counts.set(o.label, (counts.get(o.label) || 0) + 1);
  return options.map((o) => ({
    ...o,
    label: counts.get(o.label)! > 1 ? `${o.label}（${o.value}）` : o.label,
  }));
});
const semesterLabel = computed(() =>
  term.value === "全部学期"
    ? "全部学期"
    : semesterOptions.value.find((o) => o.value === term.value)?.label ||
      term.value,
);
const previous = computed(() => timeline.value[currentIndex.value - 1]),
  next = computed(() => timeline.value[currentIndex.value + 1]);
const listed = computed(() => filtered.value.slice(0, limit.value));
const recent = computed(() =>
  range.value === "all" ? rows.value : rows.value.slice(-Number(range.value)),
);
const sameMax = computed(
  () => new Set(recent.value.map((r) => r.score.max)).size <= 1,
);
const ceiling = computed(() =>
  sameMax.value ? recent.value[0]?.score.max || 100 : 100,
);
const chartPoints = computed(() =>
  recent.value.map((r, i) => ({
    ...r,
    x:
      recent.value.length === 1
        ? 350
        : 55 + (i * 590) / (recent.value.length - 1),
    y:
      220 -
      (sameMax.value
        ? r.score.score / ceiling.value
        : r.score.score / r.score.max) *
        175,
  })),
);
const activePoint = computed(
  () =>
    chartPoints.value.find((p) => p.exam.id === focusId.value) ||
    chartPoints.value.find((p) => p.exam.id === current.value?.id) ||
    chartPoints.value.at(-1),
);
const chartLine = computed(() =>
  chartPoints.value.map((p) => `${p.x},${p.y}`).join(" "),
);
const detailExam = ref<Exam>();
const detailTotal = computed(
    () => detailExam.value?.scores.reduce((sum, s) => sum + s.score, 0) || 0,
  ),
  detailMaximum = computed(
    () => detailExam.value?.scores.reduce((sum, s) => sum + s.max, 0) || 0,
  );
const historyLabels = computed(() =>
  chartPoints.value.filter(
    (_, i, a) =>
      a.length <= 5 ||
      i === 0 ||
      i === a.length - 1 ||
      i === Math.floor(a.length / 2),
  ),
);
const change = computed(() => {
  const p = chartPoints.value;
  if (p.length < 2) return "";
  const a = p.at(-1)!.score,
    b = p.at(-2)!.score;
  const d = sameMax.value
    ? a.score - b.score
    : (a.score / a.max - b.score / b.max) * 100;
  return `${d > 0 ? "+" : ""}${fmt(d)} ${sameMax.value ? "分" : "个百分点"}`;
});
const firstDate = computed(() => exams.value.at(-1)?.date.slice(0, 4));
const rate = computed(() => (maximum.value ? total.value / maximum.value : 0));
watch([term, typeFilter, query], () => (limit.value = 20));
watch(subject, () => (focusId.value = ""));
watch(view, (v) => {
  if (props.journey.screen.value === "voyage") {
    const u = new URL(location.href);
    u.searchParams.set("view", v);
    history.replaceState(history.state, "", u.pathname + u.search);
  }
});
let trackObserver: ResizeObserver | undefined;
async function centerTimeline() {
  await nextTick();
  const track = timelineTrack.value,
    node = track?.querySelector<HTMLElement>("[aria-current=true]");
  if (!track || !node) return;
  if (matchMedia("(max-width:1000px)").matches)
    track.scrollTo({
      left:
        track.scrollLeft +
        node.getBoundingClientRect().left -
        track.getBoundingClientRect().left -
        track.clientWidth / 2 +
        node.clientWidth / 2,
      behavior: "instant",
    });
  else
    track.scrollTo({
      top:
        track.scrollTop +
        node.getBoundingClientRect().top -
        track.getBoundingClientRect().top -
        track.clientHeight / 2 +
        node.clientHeight / 2,
      behavior: "instant",
    });
}
watch(
  () => current.value?.id,
  () => void centerTimeline(),
  { flush: "post" },
);
watch(
  timelineTrack,
  (el) => {
    trackObserver?.disconnect();
    if (el) {
      trackObserver = new ResizeObserver(() => void centerTimeline());
      trackObserver.observe(el);
      void centerTimeline();
    }
  },
  { flush: "post" },
);
function selectExam(e: Exam) {
  pickExam(e.id);
}
function progress(s?: string) {
  if (s) subject.value = s;
  view.value = "progress";
}
let previousOverflow = "",
  returnFocus: HTMLElement | null = null,
  closing = false;
async function showDialog(el: HTMLDialogElement | null) {
  if (!el) return;
  returnFocus = document.activeElement as HTMLElement;
  previousOverflow = document.body.style.overflow;
  activeDialog.value = el;
  document.body.style.overflow = "hidden";
  el.showModal();
  el.querySelector<HTMLElement>(".j-close,button,input")?.focus({
    preventScroll: true,
  });
}
async function closeDialog() {
  const el = activeDialog.value;
  if (!el || closing) return;
  closing = true;
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
    await el
      .animate(
        [
          { opacity: 1, transform: "translateY(0)" },
          { opacity: 0, transform: "translateY(12px)" },
        ],
        { duration: 150, easing: "ease-out" },
      )
      .finished.catch(() => {});
  activeDialog.value = null;
  el.close();
  document.body.style.overflow = previousOverflow;
  returnFocus?.focus({ preventScroll: true });
  closing = false;
}
async function showDetails(e: Exam) {
  detailExam.value = e;
  await nextTick();
  showDialog(detail.value);
}
async function showAttachments() {
  detailExam.value = current.value;
  await nextTick();
  showDialog(attachments.value);
}
async function edit(e: Exam) {
  await closeDialog();
  await navigate("/record/" + e.id + "/edit");
}
async function choose(e: Exam) {
  await closeDialog();
  selectExam(e);
}
function inspectPoint(event: PointerEvent) {
  const svg = event.currentTarget as SVGElement,
    rect = svg.getBoundingClientRect(),
    x = ((event.clientX - rect.left) / rect.width) * 700;
  const p = chartPoints.value.reduce(
    (a, b) => (Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a),
    chartPoints.value[0]!,
  );
  if (p) focusId.value = p.exam.id;
}
onUnmounted(() => {
  rm.removeEventListener("change", reducedChanged);
  trackObserver?.disconnect();
  if (activeDialog.value) {
    activeDialog.value.close();
    document.body.style.overflow = previousOverflow;
  }
});
</script>
<template>
  <div class="growth-scroll">
    <header class="gs-intro">
      <div>
        <p class="xj-page-overline">
          {{
            firstDate
              ? `从 ${firstDate} 开始，慢慢长大`
              : "新的故事，从这里开始"
          }}
        </p>
        <h1 class="j-page-title" tabindex="-1">
          {{ data.profile.nickname }}{{ COPY.homeTitleSuffix }}
        </h1>
        <p>{{ COPY.homeSubtitle }}</p>
      </div>
      <a
        aria-label="记一场考试"
        class="gs-record"
        :href="urlFor('/record/new')"
        @click.prevent="navigate('/record/new')"
        ><Plus :size="18" aria-hidden="true" />记一场考试</a
      >
    </header>
    <div class="xj-section-heading">
      <div>
        <h2>
          {{
            view === "exam"
              ? "翻开一页，看看这次的认真"
              : "把每一步，连成成长的模样"
          }}
        </h2>
        <span>{{
          view === "exam"
            ? `${exams.length} 场考试，都是成长的印记`
            : "不止看分数，也看一路走来的变化"
        }}</span>
      </div>
      <div class="gs-semester">
        <label class="gs-semester-picker"
          ><select v-model="term" aria-label="选择学期">
            <option value="全部学期">全部学期</option>
            <option
              v-for="o in semesterOptions"
              :key="o.value"
              :value="o.value"
            >
              {{ o.label }}
            </option></select
          ><span class="gs-semester-value" aria-hidden="true"
            ><span>{{ semesterLabel }}</span
            ><ChevronDown :size="15" /></span></label
        ><button
          aria-label="考试目录"
          class="gs-directory-button"
          @click="showDialog(directory)"
        >
          <Search :size="16" aria-hidden="true" /><span
            class="xj-directory-label"
            >考试目录</span
          ><span>{{ exams.length }}</span>
        </button>
      </div>
    </div>
    <motion.div
      v-if="view === 'exam'"
      key="exam"
      class="xj-overview-grid"
      :initial="reduced ? false : { opacity: 0, y: 12 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="
        reduced
          ? { duration: 0 }
          : { type: 'spring', stiffness: 230, damping: 30 }
      "
    >
      <section v-if="current" class="gs-exam" aria-label="本场考试成绩">
        <div class="gs-exam-context">
          <div class="xj-summary-top">
            <span class="xj-exam-badge">{{
              getExamType(current) || "考试记录"
            }}</span
            ><span class="gs-current-mark"
              >第 {{ currentIndex + 1 }} / {{ timeline.length }} 场记录</span
            ><button
              class="xj-summary-more"
              aria-label="本场详情"
              @click="showDetails(current)"
            >
              <ArrowUpRight :size="20" />
            </button>
          </div>
          <div class="gs-exam-title">
            <h2>{{ current.title }}</h2>
            <p>
              <CalendarDays :size="13" aria-hidden="true" />{{
                date(current.date)
              }}<span>{{ current.grade }}</span>
            </p>
            <small>{{ current.term }}</small>
          </div>
          <div class="xj-summary-bottom">
            <div
              class="gs-total gs-exam-total"
              role="group"
              aria-label="本场总分"
            >
              <span>本次总分</span>
              <p>
                <AnimatedNumber :value="total" /><small
                  >/ {{ fmt(maximum) }}</small
                >
              </p>
              <small>已录入 {{ current.scores.length }} 科合计</small>
            </div>
            <div class="gs-ranks">
              <div class="gs-class-rank">
                <span>班级排名</span>
                <p>
                  <AnimatedNumber
                    v-if="current.classRank"
                    :value="current.classRank"
                  /><strong v-else>—</strong
                  ><small>{{ current.classRank ? "名" : "未记录" }}</small>
                </p>
              </div>
              <div class="gs-grade-rank">
                <span>年级排名</span>
                <p>
                  <AnimatedNumber
                    v-if="current.gradeRank"
                    :value="current.gradeRank"
                  /><strong v-else>—</strong
                  ><small>{{ current.gradeRank ? "名" : "未记录" }}</small>
                </p>
              </div>
            </div>
          </div>
          <svg class="xj-score-orbit" viewBox="0 0 200 200" aria-hidden="true">
            <circle cx="100" cy="100" r="78" />
            <circle
              cx="100"
              cy="100"
              r="78"
              :style="{
                strokeDasharray: '490',
                strokeDashoffset: 490 * (1 - rate),
              }"
            />
            <path d="M84 104l12 12 25-31" />
          </svg>
        </div>
        <div class="gs-score-section">
          <header>
            <div>
              <span class="xj-heading-mark"></span>
              <h3>{{ COPY.scoresHeading }}</h3>
            </div>
            <span>点击科目，查看历次变化</span>
          </header>
          <div class="gs-score-list">
            <button
              v-for="(s, i) in examSubjects"
              :key="s"
              class="gs-score-row"
              :style="{ '--subject-color': colors[i % colors.length] }"
              :aria-label="'查看' + s + COPY.growthTab"
              @click="progress(s)"
            >
              <span class="gs-subject"
                ><i>{{ s.slice(0, 1) }}</i
                >{{ s }}</span
              ><span class="gs-score-track" aria-hidden="true"
                ><motion.i
                  :initial="reduced ? false : { scaleX: 0 }"
                  :animate="{
                    scaleX: score(current, s)
                      ? score(current, s)!.score / score(current, s)!.max
                      : 0,
                  }"
                  :transition="
                    reduced
                      ? { duration: 0 }
                      : {
                          type: 'spring',
                          stiffness: 130,
                          damping: 24,
                          delay: i * 0.025,
                        }
                  " /></span
              ><span v-if="score(current, s)" class="gs-value"
                ><AnimatedNumber :value="score(current, s)!.score" /><small
                  >/ {{ fmt(score(current, s)!.max) }}</small
                ></span
              ><span v-else class="gs-value gs-missing">未录入</span
              ><ChevronRight
                :size="14"
                class="gs-score-chevron"
                aria-hidden="true"
              />
            </button>
          </div>
          <footer class="gs-score-footer">
            <a
              class="j-text"
              :href="urlFor('/record/' + current.id + '/edit')"
              @click.prevent="edit(current)"
              ><Pencil :size="14" aria-hidden="true" />编辑记录</a
            ><a
              v-if="exams.length > 1"
              class="j-text"
              :href="urlFor('/compare')"
              @click.prevent="navigate('/compare')"
              ><GitCompareArrows :size="15" aria-hidden="true" />选两场对照</a
            >
          </footer>
        </div>
      </section>
      <div v-else class="gs-empty">
        <NotebookPen :size="36" />
        <h2>{{ exams.length ? "没有匹配的考试" : "从第一场考试开始" }}</h2>
        <p>
          {{
            exams.length
              ? "在考试目录中调整搜索和筛选条件。"
              : "先记下一次成绩，慢慢连成成长的轨迹。"
          }}
        </p>
        <a
          v-if="!exams.length"
          class="j-button j-primary"
          :href="urlFor('/record/new')"
          @click.prevent="navigate('/record/new')"
          >记录第一次考试<ArrowRight :size="16" /></a
        ><button
          v-else
          class="j-text"
          @click="
            query = '';
            term = '全部学期';
            typeFilter = '全部类型';
          "
        >
          清除筛选
        </button>
      </div>
      <aside class="gs-journey" aria-label="考试时间线">
        <div class="xj-history-heading">
          <h3>考试时光</h3>
          <span>{{ timeline.length }} 次记录</span>
        </div>
        <div v-if="timeline.length" class="gs-time-layout">
          <button
            class="gs-time-arrow"
            aria-label="上一场考试"
            :disabled="!previous"
            @click="previous && selectExam(previous)"
          >
            <ChevronLeft :size="18" />
          </button>
          <div
            ref="timelineTrack"
            class="gs-time-track"
            role="group"
            aria-label="选择考试"
          >
            <button
              v-for="e in timeline"
              :key="e.id"
              class="gs-time-node"
              :aria-current="current?.id === e.id ? 'true' : undefined"
              :aria-label="e.title + ' ' + date(e.date)"
              @click="selectExam(e)"
            >
              <span class="gs-node-dot"></span><small>{{ date(e.date) }}</small
              ><strong>{{ e.title }}</strong
              ><span class="xj-history-grade">{{ e.grade }}</span>
            </button>
          </div>
          <button
            class="gs-time-arrow"
            aria-label="下一场考试"
            :disabled="!next"
            @click="next && selectExam(next)"
          >
            <ChevronRight :size="18" />
          </button>
        </div>
        <div v-if="current" class="xj-memory">
          <NotebookPen :size="20" aria-hidden="true" />
          <h3>留给未来的小记</h3>
          <p>
            {{
              current.note ||
              "有些进步，分数没有说完。为这次考试留下一点回忆吧。"
            }}
          </p>
          <button
            v-if="photosFor(current.id).length"
            class="gs-attachment"
            @click="showAttachments()"
          >
            <Paperclip :size="16" aria-hidden="true" />成绩截图 ·
            {{ photosFor(current.id).length }} 张<ChevronRight
              :size="14"
            /></button
          ><a
            v-else
            class="gs-attachment gs-attachment-empty"
            :href="urlFor('/record/' + current.id + '/edit')"
            @click.prevent="edit(current)"
            ><Paperclip :size="16" />添加成绩截图<span>选填</span></a
          >
        </div>
      </aside>
    </motion.div>
    <motion.section
      v-else
      class="gs-progress"
      :aria-label="COPY.growthTab"
      :initial="reduced ? false : { opacity: 0, y: 12 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="
        reduced
          ? { duration: 0 }
          : { type: 'spring', stiffness: 230, damping: 30 }
      "
      ><div class="gs-progress-controls">
        <div class="gs-subjects" role="group" aria-label="切换成绩科目">
          <button
            v-for="s in allSubjects"
            :key="s"
            :aria-pressed="subject === s"
            @click="subject = s"
          >
            <motion.span
              v-if="subject === s"
              layout-id="xj-subject-indicator"
              class="xj-subject-indicator"
              :transition="{ type: 'spring', stiffness: 340, damping: 32 }"
            /><span>{{ s }}</span>
          </button>
        </div>
        <select v-model="range" aria-label="趋势考试范围">
          <option value="5">近5次考试</option>
          <option value="10">近10次考试</option>
          <option value="all">全部考试</option>
        </select>
      </div>
      <div class="gs-progress-layout">
        <div class="gs-chart">
          <header>
            <div>
              <p class="xj-chart-label">每一次认真，都有回响</p>
              <h2>{{ subject }}成绩变化</h2>
              <p>
                {{ sameMax ? "分数" : "得分率 %" }} · {{ recent.length }} 次记录
              </p>
            </div>
            <div v-if="change" class="gs-change">
              <span>最近两次变化</span><strong>{{ change }}</strong>
            </div>
          </header>
          <div v-if="activePoint" class="xj-chart-reading">
            <AnimatedNumber :value="activePoint.score.score" /><span
              >/ {{ fmt(activePoint.score.max)
              }}<small
                >{{ activePoint.exam.title }} ·
                {{ date(activePoint.exam.date) }}</small
              ></span
            >
          </div>
          <svg
            v-if="chartPoints.length"
            viewBox="0 0 700 270"
            role="img"
            :aria-label="
              subject +
              '历次考试' +
              (sameMax ? '分数' : '得分率') +
              '，详细数值见下方记录'
            "
            @pointermove="inspectPoint"
          >
            <defs>
              <linearGradient id="gs-chart-fill" x1="0" y1="0" x2="0" y2="1">
                <stop stop-color="currentColor" stop-opacity=".17" />
                <stop offset="1" stop-color="currentColor" stop-opacity="0" />
              </linearGradient>
            </defs>
            <g v-for="n in [0, 1, 2, 3, 4]" :key="n">
              <line
                x1="55"
                x2="645"
                :y1="220 - n * 43.75"
                :y2="220 - n * 43.75"
              />
              <text x="40" :y="225 - n * 43.75" text-anchor="end">
                {{ fmt((ceiling * n) / 4) }}
              </text>
            </g>
            <motion.polygon
              v-if="chartPoints.length > 1"
              :animate="{ points: `55,220 ${chartLine} 645,220` }"
              fill="url(#gs-chart-fill)"
              :transition="plotTransition"
            />
            <motion.polyline
              v-if="chartPoints.length > 1"
              :animate="{ points: chartLine }"
              class="gs-chart-line"
              :transition="plotTransition"
            />
            <line
              v-if="activePoint"
              :x1="activePoint.x"
              :x2="activePoint.x"
              y1="35"
              y2="220"
              class="xj-chart-guide"
            />
            <g v-for="p in chartPoints" :key="p.exam.id">
              <motion.circle
                :animate="{
                  cx: p.x,
                  cy: p.y,
                  r: activePoint?.exam.id === p.exam.id ? 6 : 4,
                }"
                :transition="
                  reduced
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 180, damping: 28 }
                "
              />
              <title>
                {{ p.exam.title }}：{{ fmt(p.score.score) }} /
                {{ fmt(p.score.max) }}
              </title>
            </g>
            <text
              v-for="p in historyLabels"
              :key="p.exam.id"
              :x="p.x"
              y="250"
              text-anchor="middle"
            >
              {{ p.exam.date.slice(2).replaceAll("-", ".") }}
            </text>
          </svg>
          <div v-else class="xj-chart-empty">
            <ChartNoAxesCombined :size="34" />
            <p>还没有本科成绩，换个科目看看。</p>
          </div>
          <p class="gs-chart-note">
            {{
              !chartPoints.length
                ? ""
                : chartPoints.length === 1
                  ? "只有一次记录，继续记录后即可观察变化。"
                  : !sameMax
                    ? "满分不同，已按得分率比较。原始分数保留在记录中。"
                    : "不同考试难度可能不同，变化只作回顾。"
            }}
          </p>
        </div>
        <div class="gs-trend-records" aria-label="趋势成绩记录">
          <h3>每一次的记录</h3>
          <button
            v-for="p in chartPoints.slice().reverse()"
            :key="p.exam.id"
            :aria-pressed="activePoint?.exam.id === p.exam.id"
            @click="focusId = p.exam.id"
          >
            <span
              ><strong>{{ p.exam.title }}</strong
              ><small>{{ date(p.exam.date) }}</small></span
            ><b
              >{{ fmt(p.score.score)
              }}<small>/ {{ fmt(p.score.max) }}</small></b
            ></button
          ><button
            v-if="activePoint"
            class="gs-open-record"
            @click="
              selectExam(activePoint.exam);
              view = 'exam';
            "
          >
            翻开这场考试<ArrowRight :size="16" />
          </button>
        </div>
      </div>
      <a
        v-if="exams.length > 1"
        class="j-text xj-compare-link"
        :href="urlFor('/compare')"
        @click.prevent="navigate('/compare')"
        ><GitCompareArrows :size="17" />选择两场考试对照</a
      ></motion.section
    >
    <dialog
      ref="directory"
      class="j-dialog gs-directory"
      aria-labelledby="gs-directory-title"
      @cancel.prevent="closeDialog"
      @close="closeDialog"
    >
      <header>
        <div>
          <h2 id="gs-directory-title">考试目录</h2>
          <p>{{ filtered.length }} 场记录，按时间倒序</p>
        </div>
        <button
          class="j-icon j-close"
          aria-label="关闭考试目录"
          @click="closeDialog"
        >
          <X :size="22" />
        </button>
      </header>
      <div class="gs-directory-filters">
        <input
          v-model="query"
          aria-label="搜索考试"
          placeholder="搜索考试、科目或小记"
        /><select v-model="typeFilter" aria-label="筛选考试类型">
          <option>全部类型</option>
          <option v-for="t in [...EXAM_TYPES, '未分类']" :key="t">
            {{ t }}
          </option>
        </select>
      </div>
      <div class="gs-directory-list">
        <button
          v-for="e in listed"
          :key="e.id"
          :aria-current="e.id === current?.id ? 'true' : undefined"
          @click="choose(e)"
        >
          <span>{{ date(e.date) }}</span>
          <div>
            <strong>{{ e.title }}</strong
            ><small>{{ e.term }} · {{ e.grade }}</small>
          </div>
          <ChevronRight :size="18" />
        </button>
        <p v-if="!listed.length">没有匹配的考试，试试其他关键词。</p>
        <button
          v-if="filtered.length > limit"
          class="gs-load-more"
          @click="limit += 20"
        >
          再看 20 次考试
        </button>
      </div>
    </dialog>
    <dialog
      ref="detail"
      class="j-dialog gs-detail"
      aria-labelledby="gs-detail-title"
      @cancel.prevent="closeDialog"
      @close="closeDialog"
    >
      <template v-if="detailExam"
        ><header>
          <div>
            <p>{{ date(detailExam.date) }} · {{ detailExam.grade }}</p>
            <h2 id="gs-detail-title">{{ detailExam.title }}</h2>
          </div>
          <button
            class="j-icon j-close"
            aria-label="关闭考试详情"
            @click="closeDialog"
          >
            <X :size="22" />
          </button>
        </header>
        <div
          class="gs-total gs-detail-total"
          role="group"
          aria-label="本场详情总分"
        >
          <span>总分</span>
          <p>
            <strong>{{ fmt(detailTotal) }}</strong
            ><small>/ {{ fmt(detailMaximum) }}</small>
          </p>
          <small>已录入 {{ detailExam.scores.length }} 科合计</small>
        </div>
        <div class="gs-detail-scores">
          <div v-for="s in detailExam.scores" :key="s.subject">
            <span>{{ s.subject }}</span
            ><strong
              >{{ fmt(s.score) }} <small>/ {{ fmt(s.max) }}</small></strong
            >
          </div>
        </div>
        <div class="gs-detail-ranks">
          <span
            >班级排名 <b>{{ detailExam.classRank ?? "未记录" }}</b></span
          ><span
            >年级排名 <b>{{ detailExam.gradeRank ?? "未记录" }}</b></span
          >
        </div>
        <p v-if="detailExam.note" class="gs-note">{{ detailExam.note }}</p>
        <div v-if="photosFor(detailExam.id).length" class="gs-attachment-list">
          <button
            v-for="(p, i) in photosFor(detailExam.id)"
            :key="p.id"
            :aria-label="'放大成绩截图：' + p.label"
            @click="openPhoto(p)"
          >
            <Paperclip :size="16" />成绩截图 {{ i + 1
            }}<ChevronRight :size="14" />
          </button>
        </div>
        <footer>
          <button class="j-outline" @click="edit(detailExam)">
            <Pencil :size="16" />编辑这场考试</button
          ><a
            v-if="exams.length > 1"
            class="j-text"
            :href="urlFor('/compare')"
            @click.prevent="
              pickExam(detailExam.id);
              closeDialog();
              navigate('/compare');
            "
            >和另一场对照</a
          >
        </footer></template
      >
    </dialog>
    <dialog
      ref="attachments"
      class="j-dialog gs-attachments"
      aria-labelledby="gs-attachments-title"
      @cancel.prevent="closeDialog"
      @close="closeDialog"
    >
      <template v-if="detailExam"
        ><header>
          <div>
            <h2 id="gs-attachments-title">成绩截图</h2>
            <p>{{ detailExam.title }} · {{ date(detailExam.date) }}</p>
          </div>
          <button
            class="j-icon j-close"
            aria-label="关闭成绩截图"
            @click="closeDialog"
          >
            <X :size="22" />
          </button>
        </header>
        <div class="gs-attachment-thumbs">
          <button
            v-for="p in photosFor(detailExam.id)"
            :key="p.id"
            :aria-label="'放大成绩截图：' + p.label"
            @click="openPhoto(p)"
          >
            <img :src="photoUrl(p)" :alt="p.label" loading="lazy" /><span
              >点击放大</span
            >
          </button>
        </div></template
      >
    </dialog>
  </div>
</template>
