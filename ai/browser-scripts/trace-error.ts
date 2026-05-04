import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on("pageerror", (e) => {
    console.log("pageerror:", e.message);
    console.log("stack:", e.stack);
  });
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".shell-info", { timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: "Presets" }).click();
  await page.waitForTimeout(1500);
  await browser.close();
}
main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
