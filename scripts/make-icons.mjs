import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

mkdirSync('assets', { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true }).catch(() => chromium.launch({ headless: true }))
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } })

const glyph = `
  <path d="M16 48 L16 24 L36 24 L36 40 L48 40 L48 16" stroke="#ffe98a" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="16" cy="48" r="7" fill="#ffe98a"/>`

const fullIcon = `<!doctype html><html><body style="margin:0">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="1024" height="1024">
    <rect width="64" height="64" fill="#efa900"/>${glyph}
  </svg></body></html>`

const foreground = `<!doctype html><html><body style="margin:0;background:transparent">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="1024" height="1024">
    <g transform="translate(32 32) scale(0.55) translate(-32 -32)">${glyph}</g>
  </svg></body></html>`

const background = `<!doctype html><html><body style="margin:0">
  <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="#efa900"/></svg>
  </body></html>`

await page.setContent(fullIcon)
await page.screenshot({ path: 'assets/icon-only.png' })
await page.setContent(foreground)
await page.screenshot({ path: 'assets/icon-foreground.png', omitBackground: true })
await page.setContent(background)
await page.screenshot({ path: 'assets/icon-background.png' })

await browser.close()
console.log('icons written')
