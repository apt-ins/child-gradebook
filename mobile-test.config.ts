import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/mobile",
  timeout: 45000,
  use: {
    baseURL: "http://127.0.0.1:3091",
    headless: true,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
      args: ["--no-sandbox"],
    },
    viewport: { width: 390, height: 844 },
  },
  webServer: {
    command:
      "npx vite preview --outDir mobile/www --port 3091 --host 127.0.0.1",
    url: "http://127.0.0.1:3091",
    reuseExistingServer: false,
  },
  workers: 1,
  reporter: "list",
});
