<script setup lang="ts">
import { ref, watch, onUnmounted } from "vue";
const props = withDefaults(defineProps<{ value: number; as?: string }>(), {
  as: "strong",
});
const shown = ref(props.value);
let frame = 0;
const mq = matchMedia("(prefers-reduced-motion: reduce)");
function finish() {
  cancelAnimationFrame(frame);
  shown.value = props.value;
}
watch(
  () => props.value,
  (to) => {
    cancelAnimationFrame(frame);
    if (mq.matches) {
      shown.value = to;
      return;
    }
    const from = shown.value,
      start = performance.now();
    function tick(time: number) {
      const p = Math.min(1, (time - start) / 460);
      shown.value = from + (to - from) * (1 - Math.pow(1 - p, 4));
      if (p < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
  },
);
mq.addEventListener("change", finish);
onUnmounted(() => {
  cancelAnimationFrame(frame);
  mq.removeEventListener("change", finish);
});
const fmt = (v: number) =>
  Number(v.toFixed(Number.isInteger(props.value) ? 0 : 2)).toString();
</script>
<template>
  <component :is="as" class="xj-number" :aria-label="String(value)">{{
    fmt(shown)
  }}</component>
</template>
