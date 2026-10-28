import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const visit = async (page: Page) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator(".save-status")).toHaveText("已保存到本机");
};
const close = (page: Page) => page.getByRole("button", { name: "关闭", exact: true }).click();
const artifacts = fileURLToPath(new URL("../../../../artifacts/", import.meta.url));

test("browse the library, filter media, and preserve theme", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await visit(page);
  await expect(page.locator(".asset-card")).toHaveCount(16);
  await mkdir(artifacts, { recursive: true });
  await page.screenshot({ path: `${artifacts}/muse-desktop.png`, animations: "disabled" });
  await page
    .getByRole("group", { name: "素材类型" })
    .getByRole("button", { name: /^视频/ })
    .click();
  await expect(page.locator(".asset-card")).toHaveCount(1);
  await page.getByRole("button", { name: "查看 风里的日常 · 影像片段", exact: true }).click();
  await expect(page.locator(".detail-preview video")).toHaveAttribute("controls", "");
  await close(page);
  await page
    .getByRole("group", { name: "素材类型" })
    .getByRole("button", { name: /^链接/ })
    .click();
  await expect(page.locator(".asset-card")).toHaveCount(2);
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByLabel("界面外观").selectOption("dark");
  await close(page);
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("collect a link, organize it, reload, and recover it from trash", async ({ page }) => {
  await visit(page);
  await page.locator(".new-collection").click();
  await page.getByLabel("收藏集名称").fill("光影研究");
  await page.getByRole("button", { name: "创建收藏集", exact: true }).click();
  await page.getByRole("button", { name: "添加素材", exact: true }).click();
  await page.getByRole("button", { name: "网页链接", exact: true }).click();
  await page.getByLabel("链接地址").fill("https://example.com/reference");
  await page.getByLabel("标题 可选").fill("新收藏的建筑灵感");
  await page.getByRole("button", { name: "保存链接", exact: true }).click();
  await page.getByRole("button", { name: "查看 新收藏的建筑灵感", exact: true }).click();
  await page.getByRole("button", { name: "加入喜欢", exact: true }).click();
  await page.getByLabel("素材标签").fill("建筑，光影");
  await page.getByLabel("素材名称").click();
  await close(page);
  await expect(page.locator(".save-status")).toHaveText("已保存到本机");
  await page.reload({ waitUntil: "networkidle" });
  await page.getByLabel("搜索素材").fill("光影");
  await expect(page.locator(".asset-card")).toHaveCount(2);
  await page.getByRole("button", { name: "查看 新收藏的建筑灵感", exact: true }).click();
  await expect(page.getByRole("button", { name: "已加入喜欢", exact: true })).toBeVisible();
  await expect(page.getByLabel("光影研究", { exact: true })).toBeChecked();
  await page.getByRole("button", { name: "移入回收站", exact: true }).click();
  await page
    .getByRole("navigation", { name: "素材库导航" })
    .getByRole("button", { name: /^回收站/ })
    .click();
  await expect(page.locator(".asset-card")).toHaveCount(1);
  await page.getByRole("button", { name: "查看 新收藏的建筑灵感", exact: true }).click();
  await page.getByRole("button", { name: "恢复素材", exact: true }).click();
  await expect(page.locator(".asset-card")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "收藏集", exact: true })
    .getByRole("button", { name: /^光影研究/ })
    .click();
  await expect(page.locator(".asset-card")).toHaveCount(1);
});

test("import an image and merge a portable backup without duplicating records", async ({
  page,
}) => {
  await visit(page);
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles(fileURLToPath(new URL("../../public/assets/chair.jpg", import.meta.url)));
  await expect(page.locator(".asset-card")).toHaveCount(17);
  await page.getByRole("button", { name: "查看 chair", exact: true }).click();
  await expect(page.locator(".detail-preview img")).toHaveAttribute(
    "src",
    /^data:image\/jpeg;base64,/,
  );
  await close(page);
  await page.getByRole("button", { name: "设置", exact: true }).click();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出备份", exact: true }).click();
  const download = await downloadEvent;
  const path = await download.path();
  if (!path) throw new Error("Backup download did not produce a file");
  await page.locator('input[type="file"]').nth(1).setInputFiles(path);
  await close(page);
  await expect(page.locator(".asset-card")).toHaveCount(17);
  await expect(page.getByRole("status")).toContainText("重复素材已跳过");
});

test("canvas arrangement persists and Infinity continues after panning", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await visit(page);
  await page.getByRole("button", { name: "画布", exact: true }).click();
  const card = page.locator('.stage-card[data-asset="01"]');
  const bounds = await card.boundingBox();
  if (!bounds) throw new Error("Canvas card is not visible");
  await page.mouse.move(bounds.x + 50, bounds.y + 50);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 170, bounds.y + 130, { steps: 8 });
  await page.mouse.up();
  await expect(card).toHaveCSS("left", "240px");
  await expect(page.locator(".save-status")).toHaveText("已保存到本机");
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "画布", exact: true }).click();
  await expect(card).toHaveCSS("left", "240px");
  await page.getByRole("button", { name: "Infinity", exact: true }).click();
  const count = await page.locator(".infinity-card").count();
  expect(count).toBeGreaterThan(16);
  await page.mouse.move(1100, 700);
  await page.mouse.down();
  await page.mouse.move(500, 400, { steps: 8 });
  await page.mouse.up();
  expect(await page.locator(".infinity-card").count()).toBeGreaterThan(16);
});

test("phone layout supports navigation, collection, and a readable view switcher", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page);
  expect((await page.locator(".app-shell").boundingBox())?.width).toBe(390);
  const gridButton = page.getByRole("button", { name: "网格", exact: true });
  expect((await gridButton.boundingBox())?.height).toBeLessThan(42);
  await page.getByRole("button", { name: "打开导航", exact: true }).click();
  await page
    .getByRole("navigation", { name: "收藏集", exact: true })
    .getByRole("button", { name: /^去自然里/ })
    .click();
  await expect(page.locator(".asset-card")).toHaveCount(4);
  await page.screenshot({ path: `${artifacts}/muse-mobile.png`, animations: "disabled" });
  await page.getByRole("button", { name: "添加素材", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "网页链接", exact: true }).click();
  await expect(page.getByRole("button", { name: "保存链接", exact: true })).toBeInViewport();
});
