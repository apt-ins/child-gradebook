<script setup lang="ts">
import {
  Paperclip,
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  GitCompareArrows,
  ImagePlus,
  Images,
  Leaf,
  LockKeyhole,
  Home,
  Maximize2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-vue-next";
import ScrollHome from "./ScrollHome.vue";
import XuejiNav from "./XuejiNav.vue";
import { MotionConfig } from "motion-v";
import { Sun, Moon } from "lucide-vue-next";
import { usePresentation } from "./usePresentation";
import AuthPanel from "./AuthPanel.vue";
import PasswordSettings from "./PasswordSettings.vue";
import { EXAM_TYPES } from "../shared/exam-types.js";
import { useJourney } from "./useJourney";
import { COPY } from "./copy";
const journey = useJourney();
const { theme, toggleTheme } = usePresentation();
const {
  homeView,
  downloadFile,
  logout,
  configured,
  authUnavailable,
  data,
  ready,
  signedIn,
  demo,
  busy,
  refreshing,
  savePending,
  uploading,
  authError,
  connectionError,
  notice,
  noticeError,
  screen,
  picked,
  term,
  typeFilter,
  query,
  subject,
  point,
  compareId,
  routeError,
  pickerOpen,
  picker,
  photoDialog,
  confirmDialog,
  restoreDialog,
  photo,
  confirmation,
  editor,
  step,
  formError,
  formErrorEl,
  savedId,
  files,
  fileUrls,
  subjectInput,
  profileDraft,
  profileError,
  newSubject,
  restore,
  restoreText,
  restoreError,
  exams,
  terms,
  allSubjects,
  filtered,
  timeline,
  current,
  currentIndex,
  total,
  maximum,
  photosFor,
  currentPhotos,
  photoUrl,
  fmt,
  percent,
  date,
  rows,
  points,
  line,
  selectedPoint,
  other,
  comparison,
  completed,
  dirty,
  draftTotal,
  draftMaximum,
  urlFor,
  navigate,
  answer,
  sync,
  startDemo,
  pickExam,
  moveExam,
  openPicker,
  viewSubject,
  openPhoto,
  closePhoto,
  removePhoto,
  setType,
  goStep,
  addDraftSubject,
  filesChanged,
  removeFile,
  saveRecord,
  deleteRecord,
  addProfileSubject,
  saveProfile,
  previewBackup,
  closeRestore,
  confirmRestore,
  getExamType,
} = journey;
const steps = ["考试信息", "各科成绩", "排名与附件", "确认保存"];
const grades = [
  "一年级",
  "二年级",
  "三年级",
  "四年级",
  "五年级",
  "六年级",
  "初一",
  "初二",
  "初三",
  "高一",
  "高二",
  "高三",
];
</script>

<template>
  <MotionConfig
    reduced-motion="user"
    :transition="{ type: 'spring', stiffness: 300, damping: 30 }"
  >
    <div
      class="journey"
      :class="{
        'is-authenticated': signedIn,
        'j-recording': screen === 'record' && signedIn,
      }"
    >
      <a class="j-skip" href="#journey-main">跳到主要内容</a>
      <div v-if="!ready" class="j-loading" role="status">
        <Leaf :size="28" />
        <p>正在翻开你的成长档案…</p>
        <div class="xj-skeleton"><i></i><i></i><i></i></div>
      </div>
      <AuthPanel
        v-else-if="!signedIn"
        :configured="configured"
        :unavailable="authUnavailable"
        :connection-error="authError"
        @authenticated="sync"
        @retry="sync"
      />
      <template v-else>
        <XuejiNav
          :screen="screen"
          :view="homeView"
          :disabled="busy || savePending"
          @navigate="navigate"
        />
        <header class="j-header">
          <a class="j-brand" :href="urlFor('/')" @click.prevent="navigate('/')"
            ><span><Leaf :size="22" aria-hidden="true" /></span
            ><b>{{ COPY.brand }}</b></a
          ><span class="j-header-child"
            >{{ data.profile.nickname }}的私人档案</span
          ><span v-if="demo" class="j-demo-label"
            >示例档案 · 不会保存到服务器</span
          >
          <div class="j-header-actions">
            <button
              class="j-icon"
              :aria-label="theme === 'light' ? '切换深色主题' : '切换浅色主题'"
              @click="toggleTheme"
            >
              <Moon v-if="theme === 'light'" :size="18" /><Sun
                v-else
                :size="18"
              /></button
            ><button
              v-if="!demo"
              class="j-icon"
              aria-label="刷新档案"
              :disabled="refreshing || busy || savePending"
              @click="sync"
            >
              <RefreshCw :size="17" :class="{ 'j-spin': refreshing }" /></button
            ><a
              class="j-icon"
              :href="urlFor('/settings')"
              aria-label="档案工具"
              @click.prevent="navigate('/settings')"
              ><Settings2 :size="19" /></a
            ><button
              class="j-icon"
              aria-label="退出登录"
              :disabled="busy || savePending"
              @click="logout"
            >
              <LockKeyhole :size="18" />
            </button>
          </div>
        </header>
        <div v-if="connectionError" class="j-connection" role="alert">
          {{ connectionError
          }}<button class="j-text" :disabled="refreshing" @click="sync">
            重新连接
          </button>
        </div>
        <main id="journey-main" class="j-main">
          <Transition name="xj-page" mode="out-in">
            <ScrollHome v-if="screen === 'voyage'" :journey="journey" />

            <section v-else-if="screen === 'subject'" class="j-lens">
              <a
                class="j-back"
                :href="urlFor('/')"
                @click.prevent="navigate('/')"
                ><ArrowLeft :size="16" />回到考试档案</a
              >
              <header class="j-subheading">
                <div>
                  <p class="j-eyebrow">把一次次认真，连起来看</p>
                  <h1 class="j-page-title" tabindex="-1">
                    {{ subject }}的成长轨迹
                  </h1>
                </div>
                <label
                  >切换科目<select
                    v-model="subject"
                    aria-label="选择趋势科目"
                    @change="point = ''"
                  >
                    <option v-for="s in allSubjects" :key="s">{{ s }}</option>
                  </select></label
                >
              </header>
              <div class="j-lens-filters">
                <label
                  >学期<select v-model="term" aria-label="趋势学期">
                    <option>全部学期</option>
                    <option v-for="t in terms" :key="t">{{ t }}</option>
                  </select></label
                ><label
                  >考试类型<select
                    v-model="typeFilter"
                    aria-label="趋势考试类型"
                  >
                    <option>全部类型</option>
                    <option v-for="t in [...EXAM_TYPES, '未分类']" :key="t">
                      {{ t }}
                    </option>
                  </select></label
                ><span>{{ rows.length }} 次真实记录 · 统一按得分率显示</span>
              </div>
              <div class="j-lens-canvas">
                <template v-if="points.length"
                  ><svg
                    class="j-curve"
                    viewBox="0 0 700 280"
                    role="img"
                    :aria-label="
                      subject + '历次考试得分率；具体成绩可在下方考试列表查看'
                    "
                  >
                    <defs>
                      <linearGradient
                        id="j-curve-fill"
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stop-color="#86efd2"
                          stop-opacity=".16"
                        />
                        <stop
                          offset="100%"
                          stop-color="#86efd2"
                          stop-opacity="0"
                        />
                      </linearGradient>
                    </defs>
                    <g v-for="v in [0, 25, 50, 75, 100]" :key="v">
                      <line
                        x1="50"
                        x2="650"
                        :y1="226 - v * 1.86"
                        :y2="226 - v * 1.86"
                        stroke="#345251"
                        stroke-dasharray="3 6"
                      />
                      <text x="34" :y="230 - v * 1.86" text-anchor="end">
                        {{ v }}
                      </text>
                    </g>
                    <text x="50" y="17">得分率 % · 按考试顺序</text>
                    <polygon
                      v-if="points.length > 1"
                      :points="`50,226 ${line} 650,226`"
                      fill="url(#j-curve-fill)"
                    />
                    <polyline
                      v-if="points.length > 1"
                      :points="line"
                      fill="none"
                      stroke="#86efd2"
                      stroke-width="2.5"
                      stroke-linejoin="round"
                    />
                    <g v-for="p in points" :key="p.exam.id">
                      <circle
                        :cx="p.x"
                        :cy="p.y"
                        :r="selectedPoint?.exam.id === p.exam.id ? 7 : 4"
                        fill="#102d30"
                        stroke="#a2f4df"
                        stroke-width="2"
                      />
                    </g>
                    <text x="50" y="264">{{ date(points[0]!.exam.date) }}</text>
                    <text
                      v-if="points.length > 1"
                      x="650"
                      y="264"
                      text-anchor="end"
                    >
                      {{ date(points[points.length - 1]!.exam.date) }}
                    </text>
                  </svg>
                  <div
                    v-if="selectedPoint"
                    class="j-point-detail"
                    aria-live="polite"
                  >
                    <div>
                      <span>{{ date(selectedPoint.exam.date) }}</span
                      ><strong>{{ selectedPoint.exam.title }}</strong>
                    </div>
                    <p>
                      <b>{{ fmt(selectedPoint.score.score) }}</b> /
                      {{ fmt(selectedPoint.score.max)
                      }}<span>{{
                        percent(
                          (selectedPoint.score.score /
                            selectedPoint.score.max) *
                            100,
                        )
                      }}</span>
                    </p>
                    <button
                      class="j-text"
                      @click="pickExam(selectedPoint.exam.id)"
                    >
                      翻开这场考试<ArrowRight :size="16" />
                    </button></div
                ></template>
                <div v-else class="j-lens-empty">
                  <Activity :size="32" />
                  <h2>还没有{{ subject }}成绩</h2>
                  <p>试试其他科目，或调整学期和考试类型。</p>
                </div>
                <p class="j-chart-context">
                  {{
                    rows.length === 1
                      ? "目前只有一次记录，继续记录后才能观察变化。"
                      : "不同试卷难度不同，轨迹只作回顾，不代表对孩子的评价。"
                  }}
                </p>
              </div>
              <div class="j-subject-history">
                <button
                  v-for="r in rows.slice().reverse()"
                  :key="r.exam.id"
                  :aria-pressed="selectedPoint?.exam.id === r.exam.id"
                  @click="point = r.exam.id"
                >
                  <span>{{ date(r.exam.date) }}</span
                  ><strong>{{ r.exam.title }}</strong
                  ><span>{{ fmt(r.score.score) }} / {{ fmt(r.score.max) }}</span
                  ><b>{{ percent((r.score.score / r.score.max) * 100) }}</b>
                </button>
              </div>
            </section>

            <section v-else-if="screen === 'compare'" class="j-compare">
              <a
                class="j-back"
                :href="urlFor('/')"
                @click.prevent="navigate('/')"
                ><ArrowLeft :size="16" />回到考试档案</a
              >
              <header class="j-subheading">
                <div>
                  <p class="j-eyebrow">两次认真，放在一起看</p>
                  <h1 class="j-page-title" tabindex="-1">看见这一路的变化</h1>
                </div>
                <GitCompareArrows :size="30" aria-hidden="true" />
              </header>
              <template v-if="current && other"
                ><div class="j-compare-head">
                  <div>
                    <span>这场考试</span>
                    <h2>{{ current.title }}</h2>
                    <p>{{ date(current.date) }} · {{ current.grade }}</p>
                  </div>
                  <label
                    >对照另一场<select
                      v-model="compareId"
                      aria-label="选择对照考试"
                    >
                      <option
                        v-for="e in exams.filter((e) => e.id !== current?.id)"
                        :key="e.id"
                        :value="e.id"
                      >
                        {{ e.title }} · {{ e.date }}
                      </option></select
                    ><small>{{ other.grade }} · {{ other.term }}</small></label
                  >
                </div>
                <p class="j-compare-note">
                  变化为「这场 − 对照场」的得分率百分点差，不同满分已换算。{{
                    current.grade !== other.grade || current.term !== other.term
                      ? "两场不在同一年级或学期，请结合学习内容变化一起看。"
                      : "试卷难度不同，差值仅供参考。"
                  }}
                </p>
                <div class="j-compare-table">
                  <div class="j-compare-labels">
                    <span>科目</span><span>这场</span><span>对照场</span
                    ><span>得分率变化</span>
                  </div>
                  <div
                    v-for="r in comparison"
                    :key="r.subject"
                    class="j-compare-row"
                  >
                    <strong>{{ r.subject }}</strong
                    ><span>{{
                      r.a ? fmt(r.a.score) + " / " + fmt(r.a.max) : "未录入"
                    }}</span
                    ><span>{{
                      r.b ? fmt(r.b.score) + " / " + fmt(r.b.max) : "未录入"
                    }}</span
                    ><b>{{
                      r.delta === null
                        ? "—"
                        : (r.delta > 0 ? "+" : "") + r.delta.toFixed(1) + " pp"
                    }}</b>
                  </div>
                </div>
                <div class="j-compare-ranks">
                  <p>
                    班级排名<span
                      >{{ current.classRank ?? "未记录" }} /
                      {{ other.classRank ?? "未记录" }}</span
                    >
                  </p>
                  <p>
                    年级排名<span
                      >{{ current.gradeRank ?? "未记录" }} /
                      {{ other.gradeRank ?? "未记录" }}</span
                    >
                  </p>
                  <small
                    >依次为这场与对照场；未提供班级人数，不推算百分位。</small
                  >
                </div></template
              >
              <div v-else class="j-empty">
                <h2>再记一场，才能并肩对照。</h2>
                <p>当前记录仍可独立翻阅，不生成虚构比较。</p>
                <a
                  class="j-button j-primary"
                  :href="urlFor('/record/new')"
                  @click.prevent="navigate('/record/new')"
                  >记一场考试<Plus :size="17"
                /></a>
              </div>
            </section>

            <section v-else-if="screen === 'record'" class="j-workspace">
              <div class="j-workspace-top">
                <a
                  class="j-back"
                  :href="urlFor('/')"
                  @click.prevent="navigate('/')"
                  ><ArrowLeft :size="16" />返回成绩总览</a
                ><span
                  ><i :class="{ 'is-dirty': dirty }"></i
                  >{{
                    savePending
                      ? "正在保存…"
                      : savedId
                        ? "成绩已保存，继续处理附件"
                        : dirty
                          ? "有未保存的填写"
                          : "填写后确认保存"
                  }}</span
                >
              </div>
              <div v-if="routeError" class="j-empty">
                <h1 class="j-page-title" tabindex="-1">记录未找到</h1>
                <p>{{ routeError }}</p>
              </div>
              <div v-else-if="editor" class="j-record-layout">
                <aside class="j-record-guide">
                  <p class="j-eyebrow">考试记录</p>
                  <h1 class="j-page-title" tabindex="-1">
                    {{
                      exams.some((e) => e.id === editor?.id)
                        ? "完善这次记录"
                        : "记录一场考试"
                    }}<span>。</span>
                  </h1>
                  <p class="j-guide-copy">
                    先填写已公布的成绩，其他信息以后可以补充。
                  </p>
                  <nav aria-label="录入步骤">
                    <button
                      v-for="(label, i) in steps"
                      :key="label"
                      :aria-current="step === i ? 'step' : undefined"
                      :disabled="savePending"
                      @click="goStep(i)"
                    >
                      <span
                        ><Check
                          v-if="step > i"
                          :size="15"
                          aria-hidden="true"
                        /><template v-else>{{ i + 1 }}</template></span
                      ><strong>{{ label }}</strong
                      ><small v-if="i === 1"
                        >{{ completed.length }} 科已填</small
                      >
                    </button>
                  </nav>
                  <section class="gs-draft-preview" aria-label="本次录入概况">
                    <span>正在记录</span>
                    <h2>{{ editor.title || "未命名考试" }}</h2>
                    <p>{{ date(editor.date) }} · {{ editor.grade }}</p>
                    <div>
                      <span
                        >已填科目<strong>{{ completed.length }}</strong></span
                      ><span
                        >当前合计<strong
                          >{{ fmt(draftTotal) }}<small> 分</small></strong
                        ></span
                      >
                    </div>
                    <p>
                      未出分可留空，0 分请填写 0。<br />确认保存后才会写入档案。
                    </p>
                  </section>
                </aside>
                <form
                  class="j-record-form"
                  @submit.prevent="step < 3 ? goStep(step + 1) : saveRecord()"
                >
                  <fieldset :disabled="savePending || busy">
                    <div class="j-step-count">
                      第 {{ step + 1 }} 步 / 共 4 步<span>{{
                        steps[step]
                      }}</span>
                    </div>
                    <Transition name="j-step" mode="out-in"
                      ><div :key="step" class="j-step-content">
                        <template v-if="step === 0"
                          ><h2 tabindex="-1">先给这次考试一个名字</h2>
                          <p>日期与学期，会让多年后的查找更容易。</p>
                          <div
                            class="j-choice-group"
                            role="group"
                            aria-label="考试类型"
                          >
                            <button
                              type="button"
                              v-for="t in EXAM_TYPES"
                              :key="t"
                              :aria-pressed="editor.examType === t"
                              @click="setType(t)"
                            >
                              {{ t
                              }}<Check
                                v-if="editor.examType === t"
                                :size="15"
                                aria-hidden="true"
                              />
                            </button>
                          </div>
                          <label
                            >考试名称<input
                              v-model="editor.title"
                              required
                              maxlength="80"
                              :placeholder="
                                editor.examType === '自定义'
                                  ? '例如：入学测试、校际联考'
                                  : '例如：十月月考、秋季期中考试'
                              "
                          /></label>
                          <div class="j-fields-two j-exam-meta-fields">
                            <label
                              >考试日期<input
                                v-model="editor.date"
                                type="date"
                                required /></label
                            ><label
                              >年级<select
                                v-model="editor.grade"
                                aria-label="年级"
                                required
                              >
                                <option v-for="g in grades" :key="g">
                                  {{ g }}
                                </option>
                                <option v-if="!grades.includes(editor.grade)">
                                  {{ editor.grade }}
                                </option>
                              </select></label
                            >
                          </div>
                          <label
                            >所属学期<input
                              v-model="editor.term"
                              list="j-term-options"
                              maxlength="40"
                              required
                              placeholder="例如：2026–2027学年 上学期" /><datalist
                              id="j-term-options"
                            >
                              <option
                                v-for="t in terms"
                                :key="t"
                                :value="t"
                              /></datalist></label
                        ></template>
                        <template v-else-if="step === 1"
                          ><h2 tabindex="-1">一科一科，把认真记下来</h2>
                          <p>
                            空白表示未出分，0 分会保留。满分可按实际试卷修改。
                          </p>
                          <div class="j-entry-labels">
                            <span>科目</span><span>得分</span><span>满分</span
                            ><span></span>
                          </div>
                          <div class="j-entry-rows">
                            <div
                              v-for="(s, i) in editor.scores"
                              :key="s.subject"
                              class="j-entry-row"
                            >
                              <span>{{ s.subject }}</span
                              ><input
                                v-model.number="s.score"
                                type="number"
                                min="0"
                                :max="Number(s.max) || 10000"
                                step="0.01"
                                inputmode="decimal"
                                placeholder="未出分"
                                :aria-label="s.subject + '得分'"
                              /><input
                                v-model.number="s.max"
                                type="number"
                                min="0.01"
                                max="10000"
                                step="0.01"
                                inputmode="decimal"
                                :aria-label="s.subject + '满分'"
                              /><button
                                type="button"
                                class="j-icon"
                                :aria-label="'移除' + s.subject"
                                :disabled="editor.scores.length === 1"
                                @click="editor.scores.splice(i, 1)"
                              >
                                <X :size="15" />
                              </button>
                            </div>
                          </div>
                          <div class="j-add-subject">
                            <input
                              v-model="subjectInput"
                              maxlength="30"
                              aria-label="添加考试科目"
                              placeholder="还有其他科目？"
                              @keydown.enter.prevent="addDraftSubject"
                            /><button
                              type="button"
                              class="j-text"
                              @click="addDraftSubject"
                            >
                              <Plus :size="15" />添加科目
                            </button>
                          </div>
                          <div class="j-entry-summary">
                            已填写 <b>{{ completed.length }}</b> 科<span
                              >当前合计 {{ fmt(draftTotal) }} 分</span
                            >
                          </div></template
                        >
                        <template v-else-if="step === 2"
                          ><h2 tabindex="-1">补充排名与成绩截图</h2>
                          <p>排名、截图与小记均可选填，未公布的排名请留空。</p>
                          <div class="j-fields-two">
                            <label
                              >班级排名<input
                                v-model.number="editor.classRank"
                                type="number"
                                min="1"
                                step="1"
                                inputmode="numeric"
                                placeholder="未公布可留空" /></label
                            ><label
                              >年级排名<input
                                v-model.number="editor.gradeRank"
                                type="number"
                                min="1"
                                step="1"
                                inputmode="numeric"
                                placeholder="未公布可留空"
                            /></label>
                          </div>
                          <details class="gs-entry-attachment">
                            <summary>
                              <Paperclip
                                :size="17"
                                aria-hidden="true"
                              />添加成绩截图<span>选填</span>
                            </summary>
                            <label class="j-file-drop"
                              ><ImagePlus
                                :size="25"
                                aria-hidden="true" /><strong
                                >选择本次查分结果的截图</strong
                              ><span
                                >每批最多 8 张 JPG / PNG / WebP，每张不超过 12
                                MB</span
                              ><input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                @change="filesChanged"
                            /></label>
                            <div v-if="files.length" class="j-selected-files">
                              <div v-for="(f, i) in files" :key="f.name + i">
                                <img :src="fileUrls[i]" :alt="f.name" /><button
                                  type="button"
                                  class="j-icon"
                                  :aria-label="'取消上传' + f.name"
                                  @click="removeFile(i)"
                                >
                                  <X :size="15" />
                                </button>
                              </div>
                            </div>
                            <p
                              v-if="photosFor(editor.id).length"
                              class="j-existing-files"
                            >
                              已保存
                              {{
                                photosFor(editor.id).length
                              }}
                              张成绩截图；新截图会追加。
                            </p>
                          </details>
                          <label
                            >这一次的小记<textarea
                              aria-label="这一次的小记"
                              v-model="editor.note"
                              rows="4"
                              maxlength="3000"
                              placeholder="这次考试有哪些进步，或想留给下次的提醒？"
                            ></textarea
                            ><small
                              >{{ editor.note.length }} / 3000</small
                            ></label
                          ></template
                        >
                        <template v-else
                          ><h2 tabindex="-1">确认这次考试记录</h2>
                          <p>看一遍这一页。以后仍可回来修改和补充。</p>
                          <article class="j-review">
                            <header>
                              <span
                                >{{ date(editor.date) }} ·
                                {{ editor.grade }}</span
                              >
                              <h3>{{ editor.title }}</h3>
                              <p>
                                {{ editor.term }} ·
                                {{ editor.examType || "未分类" }}
                              </p>
                            </header>
                            <div
                              class="gs-total gs-review-total"
                              role="group"
                              aria-label="确认保存总分"
                            >
                              <span>总分</span>
                              <p>
                                <strong>{{ fmt(draftTotal) }}</strong
                                ><small>/ {{ fmt(draftMaximum) }}</small>
                              </p>
                              <small
                                >已录入 {{ completed.length }} 科合计</small
                              >
                            </div>
                            <div
                              v-for="s in completed"
                              :key="s.subject"
                              class="j-review-score"
                            >
                              <span>{{ s.subject }}</span
                              ><strong
                                >{{ fmt(s.score)
                                }}<small> / {{ fmt(s.max) }}</small></strong
                              >
                            </div>
                            <p class="j-review-ranks">
                              班级
                              {{
                                editor.classRank
                                  ? "第 " + editor.classRank + " 名"
                                  : "未记录"
                              }}<span
                                >年级
                                {{
                                  editor.gradeRank
                                    ? "第 " + editor.gradeRank + " 名"
                                    : "未记录"
                                }}</span
                              >
                            </p>
                            <p class="j-review-note">
                              {{ editor.note || "未填写小记" }}
                            </p>
                            <footer>
                              {{ photosFor(editor.id).length }} 张已保存照片 ·
                              {{ files.length }} 张待上传
                            </footer>
                          </article>
                          <button
                            v-if="
                              exams.some((e) => e.id === editor?.id) || savedId
                            "
                            type="button"
                            class="j-text j-danger"
                            @click="deleteRecord"
                          >
                            <Trash2 :size="15" />删除这场考试
                          </button></template
                        >
                      </div></Transition
                    >
                    <p
                      v-if="formError"
                      ref="formErrorEl"
                      class="j-error"
                      role="alert"
                      tabindex="-1"
                    >
                      {{ formError }}
                    </p>
                    <footer class="j-record-footer">
                      <button
                        v-if="step > 0"
                        type="button"
                        class="j-text"
                        @click="goStep(step - 1)"
                      >
                        <ArrowLeft :size="16" />上一步</button
                      ><span v-else class="j-save-hint"
                        ><LockKeyhole :size="12" />确认保存前不会写入档案</span
                      ><button class="j-button j-primary">
                        {{
                          uploading
                            ? "正在上传照片…"
                            : savePending
                              ? "正在保存…"
                              : step === 3
                                ? savedId
                                  ? "继续保存并重试"
                                  : "保存这次成长"
                                : "下一步"
                        }}<Check v-if="step === 3" :size="17" /><ArrowRight
                          v-else
                          :size="17"
                        />
                      </button>
                    </footer>
                  </fieldset>
                </form>
              </div>
            </section>

            <section v-else-if="screen === 'settings'" class="j-tools">
              <a
                class="j-back"
                :href="urlFor('/')"
                @click.prevent="navigate('/')"
                ><ArrowLeft :size="16" />回到成绩总览</a
              >
              <header class="j-subheading">
                <div>
                  <p class="j-eyebrow">让这些记录，长久留存</p>
                  <h1 class="j-page-title" tabindex="-1">档案工具</h1>
                </div>
                <ShieldCheck :size="30" aria-hidden="true" />
              </header>
              <div class="j-tools-layout">
                <form @submit.prevent="saveProfile">
                  <h2>这是谁的成长档案</h2>
                  <label
                    >孩子的昵称<input
                      v-model="profileDraft.nickname"
                      required
                      maxlength="24"
                      autocomplete="nickname" /></label
                  ><span class="j-field-label">常用科目</span>
                  <div class="j-subject-tags">
                    <span v-for="(s, i) in profileDraft.subjects" :key="s"
                      >{{ s
                      }}<button
                        type="button"
                        :aria-label="'移除常用科目' + s"
                        @click="profileDraft.subjects.splice(i, 1)"
                      >
                        <X :size="13" /></button
                    ></span>
                  </div>
                  <div class="j-add-subject">
                    <input
                      v-model="newSubject"
                      aria-label="添加常用科目"
                      maxlength="30"
                      placeholder="添加一个科目"
                      @keydown.enter.prevent="addProfileSubject"
                    /><button
                      type="button"
                      class="j-text"
                      @click="addProfileSubject"
                    >
                      添加
                    </button>
                  </div>
                  <p class="j-tool-hint">
                    调整常用科目不会改变已保存的考试成绩。
                  </p>
                  <p v-if="profileError" class="j-error" role="alert">
                    {{ profileError }}
                  </p>
                  <button class="j-button j-primary" :disabled="busy">
                    保存资料<Check :size="16" />
                  </button>
                </form>
                <section class="j-backup-tools">
                  <h2>把记录，完整带走</h2>
                  <p>成绩、排名、小记和照片，一起保存在完整备份中。</p>
                  <a
                    class="j-tool-action"
                    href="/api/backup"
                    download
                    :aria-disabled="demo"
                    @click.prevent="
                      !demo && downloadFile('/backup', COPY.backupFile)
                    "
                    ><Download :size="22" aria-hidden="true" /><span
                      ><strong>导出完整备份</strong
                      ><small>ZIP · 包含成绩与全部照片</small></span
                    ><ArrowUpRight :size="17" /></a
                  ><a
                    class="j-tool-action"
                    href="/api/csv"
                    download="gradebook.csv"
                    :aria-disabled="demo"
                    @click.prevent="
                      !demo && downloadFile('/csv', 'gradebook.csv')
                    "
                    ><Download :size="22" aria-hidden="true" /><span
                      ><strong>导出成绩表</strong
                      ><small>CSV · 在表格软件中查看</small></span
                    ><ArrowUpRight :size="17" /></a
                  ><label class="j-tool-action j-import"
                    ><Upload :size="22" aria-hidden="true" /><span
                      ><strong>从完整备份恢复</strong
                      ><small>先查看内容，再确认替换</small></span
                    ><input
                      type="file"
                      accept=".zip"
                      :disabled="busy || demo"
                      @change="previewBackup" /></label
                  ><a
                    v-if="data.recoveryAvailable && !demo"
                    class="j-text"
                    href="/api/recovery-backup"
                    @click.prevent="
                      downloadFile(
                        '/recovery-backup',
                        'gradebook-before-restore.zip',
                      )
                    "
                    >下载上次恢复前备份<Download :size="15"
                  /></a>
                  <p v-if="demo" class="j-tool-hint">
                    示例档案不导出或恢复服务器资料。
                  </p>
                </section>
              </div>
              <PasswordSettings v-if="!demo" />
            </section>
          </Transition>
        </main>
        <footer
          v-if="screen !== 'record'"
          class="j-site-footer"
          :class="{ 'is-voyage': screen === 'voyage' }"
        >
          <span
            ><LockKeyhole
              :size="12"
              aria-hidden="true"
            />只属于你们的成长档案</span
          ><span
            >{{ data.exams.length }} 次考试 ·
            {{ data.photos.length }} 张照片</span
          >
        </footer>
      </template>
      <dialog
        ref="photoDialog"
        class="j-dialog j-photo-viewer"
        aria-label="照片查看"
        @cancel.prevent="closePhoto"
      >
        <template v-if="photo"
          ><header>
            <span>{{ photo.label }}</span>
            <div>
              <a
                v-if="!demo"
                class="j-icon"
                :href="photoUrl(photo)"
                download="试卷照片.webp"
                @click.prevent="
                  downloadFile('/photos/' + photo.id, '试卷照片.webp')
                "
                aria-label="下载照片"
                ><Download :size="19" /></a
              ><button
                class="j-icon"
                aria-label="删除照片"
                @click="removePhoto(photo)"
              >
                <Trash2 :size="18" /></button
              ><button
                class="j-icon j-close"
                aria-label="关闭照片"
                @click="closePhoto"
              >
                <X :size="23" />
              </button>
            </div>
          </header>
          <div class="j-photo-image">
            <img :src="photoUrl(photo)" :alt="photo.label" />
          </div>
          <p>可通过浏览器缩放查看成绩截图</p></template
        >
      </dialog>
      <dialog
        ref="confirmDialog"
        class="j-dialog j-confirm"
        aria-labelledby="j-confirm-title"
        @cancel.prevent="answer(false)"
      >
        <template v-if="confirmation"
          ><span class="j-confirm-symbol"><ShieldCheck :size="25" /></span>
          <h2 id="j-confirm-title">{{ confirmation.title }}</h2>
          <p>{{ confirmation.body }}</p>
          <footer>
            <button class="j-outline" @click="answer(false)">取消</button
            ><button
              class="j-button"
              :class="confirmation.danger ? 'j-danger-button' : 'j-primary'"
              @click="answer(true)"
            >
              {{ confirmation.label }}
            </button>
          </footer></template
        >
      </dialog>
      <dialog
        ref="restoreDialog"
        class="j-dialog j-restore"
        aria-labelledby="j-restore-title"
        @cancel.prevent="closeRestore"
      >
        <template v-if="restore"
          ><header>
            <h2 id="j-restore-title">恢复这份成长记录？</h2>
            <button
              class="j-icon j-close"
              aria-label="关闭恢复"
              :disabled="busy"
              @click="closeRestore"
            >
              <X :size="22" />
            </button>
          </header>
          <p>
            将恢复「{{ restore.nickname }}」的 {{ restore.exams }} 次考试与
            {{
              restore.photos
            }}
            张照片，替换现有档案。替换前会自动保留当前档案的备份。
          </p>
          <label
            >输入「替换现有记录」以确认<input
              v-model="restoreText"
              autocomplete="off"
          /></label>
          <p v-if="restoreError" class="j-error" role="alert">
            {{ restoreError }}
          </p>
          <footer>
            <button class="j-outline" :disabled="busy" @click="closeRestore">
              取消</button
            ><button
              class="j-button j-primary"
              :disabled="busy || restoreText !== '替换现有记录'"
              @click="confirmRestore"
            >
              {{ busy ? "正在恢复…" : "确认恢复" }}
            </button>
          </footer></template
        >
      </dialog>
      <Transition name="xj-toast"
        ><div
          v-if="notice"
          class="j-toast"
          :class="{ 'is-error': noticeError }"
          role="status"
        >
          <CheckCircle2 :size="18" aria-hidden="true" />{{ notice }}
        </div></Transition
      >
    </div>
  </MotionConfig>
</template>
