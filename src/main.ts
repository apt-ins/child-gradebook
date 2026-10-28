import { createApp } from "vue";
import Journey from "./Journey.vue";
import "./xueji.css";
import { loadGradebookFonts } from "./fonts";
document.addEventListener(
  "keydown",
  (e) => {
    if (e.key === "Tab")
      document.documentElement.setAttribute("data-keyboard", "");
  },
  { capture: true },
);
for (const type of ["pointerdown", "touchstart"])
  document.addEventListener(
    type,
    () => document.documentElement.removeAttribute("data-keyboard"),
    { capture: true, passive: true },
  );
try {
  const theme = localStorage.getItem("xueji-theme");
  document.documentElement.dataset.theme =
    theme === "dark" ||
    (theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches)
      ? "dark"
      : "light";
} catch {}
void loadGradebookFonts().then(() => createApp(Journey).mount("#app"));
