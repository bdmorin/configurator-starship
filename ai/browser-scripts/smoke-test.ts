/**
 * Smoke test: verify the app boots, bootstraps from the API, shows the
 * preview, switches tabs, and re-renders on edit.
 */
import { chromium } from "playwright";

interface ConsoleEntry { type: string; text: string }

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  const consoleErrors: ConsoleEntry[] = [];
  const pageErrors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") {
      consoleErrors.push({ type: m.type(), text: m.text() });
    }
  });
  page.on("pageerror", (e) => pageErrors.push(e.message));

  await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });

  await page.waitForSelector(".shell-info", { timeout: 15000 });
  await page.waitForSelector(".xterm-rows", { timeout: 15000 });
  await page.waitForTimeout(700);

  const title = await page.title();
  const header = await page.locator(".header h1").first().innerText();
  const shellBadges = await page.locator(".shell-info .badge").allInnerTexts();
  const tabs = await page.locator(".tabs .tab").allInnerTexts();

  const getPreviewText = () => page.locator(".preview-terminal").first().innerText();
  const initialPreview = await getPreviewText();

  // Modules tab
  await page.getByRole("button", { name: "Modules" }).click();
  await page.waitForSelector(".module-row");
  const moduleCount = await page.locator(".module-row").count();
  await page.locator(".module-row", { hasText: "character" }).first().click();
  await page.waitForTimeout(250);

  // Find success_symbol field row by its <code> label, then edit its input.
  const changed = await page.locator("code", { hasText: "success_symbol" }).first()
    .locator("xpath=ancestor::div[contains(@style, 'border-top')]")
    .locator("input[type='text'], textarea")
    .first()
    .evaluate((el: HTMLInputElement | HTMLTextAreaElement) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
                  || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
      setter?.call(el, "[STARSHIP](bold cyan) ");
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }).catch(() => false);

  await page.waitForTimeout(700);
  const afterEditPreview = await getPreviewText();

  await page.getByRole("button", { name: "Presets" }).click();
  await page.waitForSelector(".chip-list .chip");
  const presetChips = await page.locator(".chip-list .chip").count();

  await page.getByRole("button", { name: "TOML", exact: true }).click();
  await page.waitForSelector(".tab-body textarea");
  const tomlBytes = await page.locator(".tab-body textarea").inputValue().then((v) => v.length);

  await page.screenshot({ path: "tmp/smoke-shot.png", fullPage: true });

  const summary = {
    ok: pageErrors.length === 0 && consoleErrors.filter((c) => c.type === "error").length === 0,
    title,
    header,
    shellBadges,
    tabs,
    initialPreviewBytes: initialPreview.length,
    previewAfterEditBytes: afterEditPreview.length,
    previewChanged: changed && initialPreview !== afterEditPreview,
    moduleCount,
    presetChips,
    tomlBytes,
    consoleErrors,
    pageErrors,
    screenshot: "tmp/smoke-shot.png",
  };

  console.log(JSON.stringify(summary, null, 2));
  await browser.close();
}

main().catch((err) => { console.error("FATAL:", err); process.exit(1); });
