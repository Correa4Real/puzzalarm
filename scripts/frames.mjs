import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const url = 'http://localhost:5174/src/ideia/' + encodeURIComponent('Gravando 2026-07-22 215617.mp4')
const browser = await chromium.launch({ channel: 'msedge', headless: false })
const page = await browser.newPage({ viewport: { width: 800, height: 600 } })

await page.setContent(`<video id="v" src="${url}" style="width:100%" muted></video>`)
await page.waitForFunction(() => {
  const v = document.getElementById('v')
  return v && (v.readyState >= 2 || v.error)
}, undefined, { timeout: 20000 })
const error = await page.evaluate(() => document.getElementById('v').error?.message ?? null)
if (error) {
  console.log('video error:', error)
  await browser.close()
  process.exit(1)
}
const duration = await page.evaluate(() => document.getElementById('v').duration)
console.log('duration:', duration)

const count = 8
for (let i = 0; i < count; i++) {
  const t = (duration * i) / (count - 1)
  await page.evaluate(time => {
    const v = document.getElementById('v')
    v.currentTime = Math.min(time, v.duration - 0.05)
    return new Promise(done => { v.onseeked = done })
  }, t)
  await page.waitForTimeout(150)
  await page.screenshot({ path: `scripts/shots/frame-${i}.png` })
}
await browser.close()
