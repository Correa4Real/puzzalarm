import { chromium } from "playwright";

const base = "http://localhost:5174";
const out = "scripts/shots";
const browser = await chromium
  .launch({ channel: "msedge", headless: true })
  .catch(() => chromium.launch({ headless: true }));
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
});

const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await page.goto(base, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/1-home.png` });

await page.locator(".fab button").click();
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/2-edit.png` });

await page.goto(base, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.locator(".pbtn--ghost").first().click();
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/3-settings.png` });

await page.locator('button:has-text("puzzle")').last().click();
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/4-test.png` });

const svg = page.locator("svg.puzzle-panel");
const box = await svg.boundingBox();
if (box) {
  await page.mouse.move(box.x + box.width * 0.16, box.y + box.height * 0.84);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.16, box.y + box.height * 0.55, {
    steps: 12,
  });
  await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.55, {
    steps: 12,
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/5-drawing.png` });
  await page.mouse.up();
}

console.log("errors:", errors.length ? errors : "none");
await browser.close();
