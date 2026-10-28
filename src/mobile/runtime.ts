import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
export async function initNative() {
  if (!Capacitor.isNativePlatform()) return;
  await App.addListener("backButton", () => {
    const dialog = document.querySelector<HTMLDialogElement>("dialog[open]");
    if (dialog) {
      const event = new Event("cancel", { cancelable: true });
      if (dialog.dispatchEvent(event)) dialog.close();
      return;
    }
    if (Number(history.state?.journeyIndex) > 0) history.back();
    else void App.minimizeApp();
  });
  await App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) window.dispatchEvent(new Event("focus"));
  });
}
