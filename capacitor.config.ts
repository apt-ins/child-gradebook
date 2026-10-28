import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "app.xueji.journal",
  appName: "学迹",
  webDir: "mobile/www",
  backgroundColor: "#f5f8ff",
  android: { backgroundColor: "#f5f8ff", allowMixedContent: false },
  server: {
    hostname: "localhost",
    androidScheme: "https",
  },
};
export default config;
