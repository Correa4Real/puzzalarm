import { chromium } from 'playwright'

const base = 'http://localhost:5174'
const out = 'scripts/shots'
const browser = await chromium.launch({ channel: 'msedge', headless: true }).catch(() => chromium.launch({ headless: true }))
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true })
const errors = []
page.on('pageerror', e => errors.push(String(e)))

await page.goto(base, { waitUntil: 'networkidle' })
await page.locator('.fab button').click()
await page.waitForTimeout(600)
await page.locator('button:has-text("Salvar")').click()
await page.waitForTimeout(800)
await page.locator('.alarm-card').first().click()
await page.waitForTimeout(700)
await page.locator('button:has-text("Excluir")').scrollIntoViewIfNeeded()
await page.locator('button:has-text("Excluir")').click()
await page.waitForTimeout(400)
await page.screenshot({ path: `${out}/18-delete-confirm.png` })
await page.locator('button:has-text("Sim, excluir")').click()
await page.waitForTimeout(800)
await page.screenshot({ path: `${out}/19-after-delete.png` })

console.log('errors:', errors.length ? errors : 'none')
await browser.close()
