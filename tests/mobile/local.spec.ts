import { test, expect } from "@playwright/test";
import sharp from "sharp";
import fs from "node:fs/promises";
test("offline local save, photo persistence, edit, ZIP restore and zero API calls", async ({
  page,
  context,
}) => {
  const calls: string[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/api/")) calls.push(r.url());
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "孩子的求学足迹" }),
  ).toBeVisible();
  await expect(page.locator("input[type=password]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "退出登录" })).toHaveCount(0);
  await context.setOffline(true);
  await page.getByRole("link", { name: "记录第一次考试" }).click();
  await page.getByLabel("考试名称", { exact: true }).fill("本机离线期中考试");
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await page.getByLabel("语文得分", { exact: true }).fill("0");
  await page.getByLabel("数学得分", { exact: true }).fill("88.5");
  await page.getByLabel("数学满分", { exact: true }).fill("120");
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await page.getByLabel("班级排名", { exact: true }).fill("5");
  await page.locator("input[type=file][multiple]").setInputFiles({
    name: "成绩截图.png",
    mimeType: "image/png",
    buffer: await sharp({
      create: { width: 120, height: 100, channels: 3, background: "white" },
    })
      .png()
      .toBuffer(),
  });
  await page
    .getByRole("navigation", { name: "录入步骤" })
    .getByRole("button", { name: /确认保存/ })
    .click();
  await page.getByRole("button", { name: "保存这次成长", exact: true }).click();
  await expect(page.locator(".gs-exam-total strong")).toHaveText("88.5");
  await expect(page.locator(".gs-score-row")).toHaveCount(2);
  await context.setOffline(false);
  await page.reload();
  await expect(page.locator(".gs-exam-total strong")).toHaveText("88.5");
  await page.getByRole("button", { name: "成绩截图 · 1 张" }).click();
  await page
    .getByRole("button", { name: "放大成绩截图：成绩截图.png" })
    .click();
  await expect(page.locator(".j-photo-image img")).toBeVisible();
  await page.getByRole("button", { name: "关闭照片" }).click();
  await page.getByRole("button", { name: "关闭成绩截图" }).click();
  await page.getByRole("link", { name: "编辑记录", exact: true }).click();
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await page.getByRole("button", { name: "移除语文", exact: true }).click();
  await page.getByLabel("数学得分", { exact: true }).fill("90.5");
  await page
    .getByRole("navigation", { name: "录入步骤" })
    .getByRole("button", { name: /确认保存/ })
    .click();
  await page.getByRole("button", { name: "保存这次成长", exact: true }).click();
  await expect(page.locator(".gs-score-row")).toHaveCount(1);
  await page
    .getByRole("navigation", { name: "主要导航" })
    .getByRole("button", { name: "档案工具", exact: true })
    .click();
  await expect(
    page.getByText("档案仅保存在这台手机。", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".password-settings")).toHaveCount(0);
  const wait = page.waitForEvent("download");
  await page.getByRole("link", { name: "导出完整备份" }).click();
  const file = await wait;
  await fs.mkdir("artifacts/mobile", { recursive: true });
  await file.saveAs("artifacts/mobile/browser-local-backup.zip");
  await page
    .locator("input[type=file]")
    .setInputFiles("artifacts/mobile/browser-local-backup.zip");
  await page.getByLabel("输入「替换现有记录」以确认").fill("替换现有记录");
  await page.getByRole("button", { name: "确认恢复", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("备份已恢复");
  await page
    .getByRole("navigation", { name: "主要导航" })
    .getByRole("button", { name: "考试记录", exact: true })
    .click();
  await expect(page.locator(".gs-exam-total strong")).toHaveText("90.5");
  await expect(
    page.getByRole("button", { name: "成绩截图 · 1 张" }),
  ).toBeVisible();
  expect(calls).toEqual([]);
});
test("invalid backup preserves local profile; a different device starts with its own empty journal", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "孩子的求学足迹" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "主要导航" })
    .getByRole("button", { name: "档案工具", exact: true })
    .click();
  await page.getByLabel("孩子的昵称").fill("本机记录");
  await page.getByRole("button", { name: "保存资料", exact: true }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "bad.zip",
      mimeType: "application/zip",
      buffer: Buffer.from("invalid backup"),
    });
  await expect(page.getByRole("status")).toContainText("备份");
  await page.reload();
  await expect(page.getByLabel("孩子的昵称")).toHaveValue("本机记录");
  const context = await browser.newContext();
  try {
    const second = await context.newPage();
    await second.goto("http://127.0.0.1:3091");
    await expect(
      second.getByRole("heading", { name: "孩子的求学足迹" }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
