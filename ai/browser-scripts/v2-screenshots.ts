import { chromium } from "playwright";
async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".shell-info");
  await page.waitForSelector(".xterm-rows");
  await page.waitForTimeout(1000);

  // Format tab — pill view (default)
  await page.screenshot({ path: "tmp/v2-format-pills.png", fullPage: false });

  // Toggle to raw edit
  const rawBtn = page.locator("button", { hasText: "raw edit" }).first();
  if (await rawBtn.isVisible()) { await rawBtn.click(); await page.waitForTimeout(300); }
  await page.screenshot({ path: "tmp/v2-format-raw.png", fullPage: false });

  // Modules — character (has fields + is in format)
  await page.getByRole("button", { name: "Modules" }).click();
  await page.locator(".module-row", { hasText: "character" }).first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "tmp/v2-modules-character.png", fullPage: false });

  // Modules — env_var (no fields, should show custom field adder)
  await page.locator(".module-row", { hasText: "env_var" }).first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "tmp/v2-modules-envvar.png", fullPage: false });

  // Palettes
  await page.getByRole("button", { name: "Palettes" }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "tmp/v2-palettes.png", fullPage: false });

  // Presets
  await page.getByRole("button", { name: "Presets" }).click();
  await page.waitForSelector(".chip-list .chip");
  await page.locator(".chip", { hasText: "gruvbox-rainbow" }).first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "tmp/v2-presets.png", fullPage: false });

  console.log("wrote 6 screenshots to tmp/v2-*");
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
