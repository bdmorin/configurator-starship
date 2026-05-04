import { chromium } from "playwright";
async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".shell-info");
  await page.waitForSelector(".xterm-rows");
  await page.waitForTimeout(900);
  await page.screenshot({ path: "tmp/shot-format.png", fullPage: false });

  await page.getByRole("button", { name: "Modules" }).click();
  await page.locator(".module-row", { hasText: "directory" }).first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "tmp/shot-modules.png", fullPage: false });

  await page.getByRole("button", { name: "Palettes" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "tmp/shot-palettes.png", fullPage: false });

  await page.getByRole("button", { name: "Presets" }).click();
  await page.waitForSelector(".chip-list .chip");
  await page.locator(".chip", { hasText: "tokyo-night" }).first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "tmp/shot-presets.png", fullPage: false });

  console.log("wrote 4 screenshots to tmp/");
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
