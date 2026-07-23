import { chromium } from 'playwright'

const base = 'http://localhost:5174'
const out = 'scripts/shots'
const browser = await chromium.launch({ channel: 'msedge', headless: true }).catch(() => chromium.launch({ headless: true }))
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true })
const errors = []
page.on('pageerror', e => errors.push(String(e)))

await page.goto(base, { waitUntil: 'networkidle' })
await page.locator('.pbtn--ghost').first().click()
await page.waitForTimeout(600)
await page.locator('button:has-text("puzzle")').last().click()
await page.waitForTimeout(600)
await page.locator('.seg button:has-text("Pontos")').click()
await page.waitForTimeout(600)
await page.screenshot({ path: `${out}/6-dots.png` })
await page.locator('.seg button:has-text("Quadrados")').click()
await page.waitForTimeout(600)
await page.locator('.seg button:has-text("Difícil")').click()
await page.waitForTimeout(600)
await page.screenshot({ path: `${out}/7-squares.png` })

console.log('errors:', errors.length ? errors : 'none')
await browser.close()
