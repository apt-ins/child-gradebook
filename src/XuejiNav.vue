<script setup lang="ts">
import { computed } from "vue";
import { motion } from "motion-v";
import {
  BookOpen,
  ChartNoAxesCombined,
  SlidersHorizontal,
  Plus,
  Leaf,
} from "lucide-vue-next";
const props = defineProps<{
  screen: string;
  view: string;
  disabled: boolean;
}>();
const active = computed(() =>
  props.screen === "voyage"
    ? props.view
    : ["record", "compare"].includes(props.screen)
      ? "exam"
      : props.screen === "subject"
        ? "progress"
        : props.screen,
);
const emit = defineEmits<{ navigate: [path: string] }>();
const items = [
  { label: "考试记录", icon: BookOpen, path: "/?view=exam", id: "exam" },
  {
    label: "成长轨迹",
    icon: ChartNoAxesCombined,
    path: "/?view=progress",
    id: "progress",
  },
  {
    label: "档案工具",
    icon: SlidersHorizontal,
    path: "/settings",
    id: "settings",
  },
];
</script>
<template>
  <aside class="xj-sidebar">
    <a
      href="/"
      class="xj-side-brand"
      @click.prevent="emit('navigate', '/?view=exam')"
      ><span><Leaf :size="24" aria-hidden="true" /></span
      ><b>学迹<small>私人求学纪念册</small></b></a
    >
    <p class="xj-nav-label">你的成长档案</p>
    <nav aria-label="主要导航">
      <button
        v-for="item in items"
        :key="item.id"
        :aria-current="active === item.id ? 'page' : undefined"
        :disabled="disabled"
        @click="emit('navigate', item.path)"
      >
        <motion.span
          v-if="active === item.id"
          class="xj-nav-selected"
          layout-id="xj-navigation"
          :transition="{ type: 'spring', stiffness: 380, damping: 36 }"
        /><component :is="item.icon" :size="19" aria-hidden="true" /><span>{{
          item.label
        }}</span>
      </button>
    </nav>
    <button
      class="xj-sidebar-add"
      :disabled="disabled"
      @click="emit('navigate', '/record/new')"
    >
      <Plus :size="18" />新建记录
    </button>
    <div class="xj-nav-foot">
      <svg viewBox="0 0 180 82" aria-hidden="true">
        <path d="M10 68C35 68 25 42 58 48S75 18 107 26S138 14 170 12" />
        <circle cx="58" cy="48" r="4" />
        <circle cx="107" cy="26" r="4" />
        <circle cx="170" cy="12" r="4" />
      </svg>
      <p>每一步，都有迹可循。</p>
      <small>属于你们的时光，慢慢珍藏。</small>
    </div>
  </aside>
</template>
