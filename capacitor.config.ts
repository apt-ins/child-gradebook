import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "app.xueji.journal",
  appName: "学迹",
  webDir: "mobile/www",
  backgroundColor: "#f5f8ff",
  android: { backgroundColor: "#f5f8ff", allowMixedContent: false },
  ios: { backgroundColor: "#f5f8ff", contentInset: "automatic" },
  server: {
    hostname: "localhost",
    androidScheme: "https",
    iosScheme: "capacitor",
  },
};
export default config;
