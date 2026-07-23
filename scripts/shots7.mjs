import { chromium } from 'playwright'

const base = 'http://localhost:5174'
const out = 'scripts/shots'
const browser = await chromium.launch({ channel: 'msedge', headless: true }).catch(() => chromium.launch({ headless: true }))
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true })
const errors = []
page.on('pageerror', e => errors.push(String(e)))

await page.goto(base, { waitUntil: 'networkidle' })
await page.locator('.pbtn--ghost').first().click()
await page.waitForTimeout(500)
await page.locator('button:has-text("puzzle")').last().click()
await page.waitForTimeout(500)
await page.locator('.seg button:has-text("Quadrados")').click()
await page.waitForTimeout(600)

let captured = false
for (let attempt = 0; attempt < 10 && !captured; attempt++) {
  const svg = page.locator('svg.puzzle-panel')
  const box = await svg.boundingBox()
  const unit = box.width / 3.44
  const px = u => box.x + unit * (0.72 + u)
  const py = u => box.y + unit * (0.72 + u)

  await page.mouse.move(px(0), py(2))
  await page.mouse.down()
  await page.mouse.move(px(0), py(0), { steps: 16 })
  await page.mouse.move(px(2), py(0), { steps: 16 })
  await page.mouse.up()
  await page.waitForTimeout(250)
  const count = await page.locator('.violation').count()
  if (count > 0) {
    await page.screenshot({ path: `${out}/20-violation.png` })
    console.log('violations blinking:', count)
    captured = true
  }
  await page.waitForTimeout(1400)
  await page.locator('button:has-text("Novo puzzle")').click()
  await page.waitForTimeout(500)
}

if (!captured) console.log('no violation captured (end never at corner)')
console.log('errors:', errors.length ? errors : 'none')
await browser.close()
