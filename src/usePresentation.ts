import { ref, onMounted, onUnmounted } from "vue";
export function usePresentation() {
  const reduced = ref(matchMedia("(prefers-reduced-motion: reduce)").matches);
  const theme = ref("light");
  const mq = matchMedia("(prefers-color-scheme: dark)"),
    rm = matchMedia("(prefers-reduced-motion: reduce)");
  let saved = "";
  try {
    saved = localStorage.getItem("xueji-theme") || "";
  } catch {}
  theme.value = saved || (mq.matches ? "dark" : "light");
  const apply = () => {
    document.documentElement.dataset.theme = theme.value;
    document.documentElement.style.colorScheme = theme.value;
  };
  apply();
  function toggleTheme() {
    theme.value = theme.value === "light" ? "dark" : "light";
    saved = theme.value;
    try {
      localStorage.setItem("xueji-theme", theme.value);
    } catch {}
    apply();
  }
  function change() {
    if (!saved) {
      theme.value = mq.matches ? "dark" : "light";
      apply();
    }
  }
  function motionChanged() {
    reduced.value = rm.matches;
  }
  onMounted(() => {
    mq.addEventListener("change", change);
    rm.addEventListener("change", motionChanged);
  });
  onUnmounted(() => {
    mq.removeEventListener("change", change);
    rm.removeEventListener("change", motionChanged);
  });
  return { theme, reduced, toggleTheme };
}
