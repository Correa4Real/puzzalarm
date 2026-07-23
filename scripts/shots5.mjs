import { chromium } from 'playwright'

const base = 'http://localhost:5174'
const out = 'scripts/shots'
const browser = await chromium.launch({ channel: 'msedge', headless: true }).catch(() => chromium.launch({ headless: true }))
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true })
const errors = []
page.on('pageerror', e => errors.push(String(e)))

await page.goto(base, { waitUntil: 'networkidle' })
await page.locator('.fab button').click()
await page.waitForTimeout(700)
await page.locator('.seg button:has-text("Meu som")').click()
await page.waitForTimeout(400)
await page.locator('.seg button:has-text("Meu som")').scrollIntoViewIfNeeded()
await page.screenshot({ path: `${out}/16-custom-sound.png` })

await page.goto(base, { waitUntil: 'networkidle' })
await page.locator('.pbtn--ghost').first().click()
await page.waitForTimeout(500)
await page.locator('button:has-text("puzzle")').last().click()
await page.waitForTimeout(500)
await page.locator('.seg button:has-text("Simetria")').click()
await page.waitForTimeout(500)
for (let i = 0; i < 6; i++) {
  await page.screenshot({ path: `${out}/17-sym-${i}.png` })
  await page.locator('button:has-text("Novo puzzle")').click()
  await page.waitForTimeout(450)
}

console.log('errors:', errors.length ? errors : 'none')
await browser.close()
