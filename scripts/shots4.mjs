import { chromium } from 'playwright'

const base = 'http://localhost:5174'
const out = 'scripts/shots'
const browser = await chromium.launch({ channel: 'msedge', headless: true }).catch(() => chromium.launch({ headless: true }))
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true })
const errors = []
page.on('pageerror', e => errors.push(String(e)))

await page.goto(base, { waitUntil: 'networkidle' })
await page.locator('.pbtn--ghost').first().click()
await page.waitForTimeout(160)
await page.screenshot({ path: `${out}/12-transition-forward.png` })
await page.waitForTimeout(600)

await page.locator('.pbtn--ghost').first().click()
await page.waitForTimeout(160)
await page.screenshot({ path: `${out}/13-transition-back.png` })
await page.waitForTimeout(700)

await page.locator('.pbtn--ghost').first().click()
await page.waitForTimeout(600)
await page.locator('button:has-text("puzzle")').last().click()
await page.waitForTimeout(600)
await page.locator('.seg button:has-text("Hexágonos")').click()
await page.waitForTimeout(700)
await page.screenshot({ path: `${out}/14-symhex.png` })

const svg = page.locator('svg.puzzle-panel')
const box = await svg.boundingBox()
if (box) {
  const cell = box.width / (3 + 2 * 0.72)
  const startX = box.x + cell * 0.72
  const startY = box.y + box.height - cell * 0.72
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + cell * 0.5, startY, { steps: 10 })
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${out}/15-symhex-mid-edge.png` })
  await page.mouse.up()
}

console.log('errors:', errors.length ? errors : 'none')
await browser.close()
