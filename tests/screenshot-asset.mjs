/** Capture screenshots of the Aset module for visual review. */
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import puppeteer from 'puppeteer'

const BASE = 'http://localhost:3000'
const OUT = 'test-results'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync(OUT, { recursive: true })

let server = null
async function isUp() {
  try {
    await fetch(BASE, { redirect: 'manual' })
    return true
  } catch {
    return false
  }
}
async function ensureServer() {
  if (await isUp()) return
  server = spawn('pnpm', ['dev'], { cwd: process.cwd(), stdio: 'ignore', detached: true })
  const start = Date.now()
  while (Date.now() - start < 90000) {
    if (await isUp()) return
    await sleep(500)
  }
  throw new Error('server timeout')
}
const $$ = (page, fn, arg) => page.$eval('body', fn, arg)
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png` })

async function setInput(page, selector, value) {
  await page.evaluate(
    (sel, val) => {
      const el = document.querySelector(sel)
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      ).set
      setter.call(el, val)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    },
    selector,
    value,
  )
}

async function main() {
  await ensureServer()
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })

  await page.goto(`${BASE}/aset`, { waitUntil: 'networkidle0' })
  await page.waitForSelector('[data-testid="asset-summary"]')
  await shot(page, 'a01-aset-tab-empty')

  // add a savings asset
  await $$(page, () => document.querySelector('[data-testid="asset-edit-button"]').click())
  await page.waitForSelector('[data-testid="asset-menu"]')
  await shot(page, 'a02-aset-menu')
  await $$(page, () => document.querySelector('[data-testid="asset-menu-add"]').click())
  await page.waitForSelector('[data-testid="asset-form"]')
  await setInput(page, '#asset-name-input', 'Tabungan')
  await setInput(page, '#asset-total-input', '1500000')
  await setInput(page, '#asset-description-input', 'Dana darurat')
  await shot(page, 'a03-asset-form')
  await $$(page, () => document.querySelector('[data-testid="asset-save"]').click())
  await page.waitForFunction(() => !document.querySelector('[data-testid="asset-form"]'))
  await page.waitForSelector('[data-testid="asset-row-Tabungan"]')
  await shot(page, 'a04-aset-tab-filled')

  // card asset form (extra fields)
  await $$(page, () => document.querySelector('[data-testid="asset-edit-button"]').click())
  await $$(page, () => document.querySelector('[data-testid="asset-menu-add"]').click())
  await page.waitForSelector('[data-testid="asset-form"]')
  await $$(page, () => document.querySelector('[data-testid="asset-group-field"]').click())
  await page.waitForSelector('[data-testid="picker-option-ag_card"]')
  await shot(page, 'a05-group-picker')
  await $$(page, () => document.querySelector('[data-testid="picker-option-ag_card"]').click())
  await setInput(page, '#asset-name-input', 'Kartu Kredit')
  await setInput(page, '#asset-total-input', '500000')
  await sleep(200)
  await shot(page, 'a06-card-form')
  await $$(page, () => document.querySelector('[data-testid="asset-save"]').click())
  await page.waitForFunction(() => !document.querySelector('[data-testid="asset-form"]'))
  await page.waitForSelector('[data-testid="asset-row-Kartu Kredit"]')
  await shot(page, 'a07-aset-tab-with-card')

  // detail overlay
  await $$(page, () => document.querySelector('[data-testid="asset-row-Tabungan"]').click())
  await page.waitForSelector('[data-testid="asset-detail"]')
  await shot(page, 'a08-asset-detail')
  await $$(page, () => document.querySelector('[aria-label="Kembali"]').click())

  // group manager
  await page.goto(`${BASE}/lainnya/kelola-aset/grup`, { waitUntil: 'networkidle0' })
  await page.waitForSelector('[data-testid="group-row-Cash"]')
  await shot(page, 'a09-group-manager')

  // deleted lists
  await page.goto(`${BASE}/lainnya/kelola-aset/aset-dihapus`, { waitUntil: 'networkidle0' })
  await sleep(300)
  await shot(page, 'a10-deleted-empty')

  // kelola aset hub
  await page.goto(`${BASE}/lainnya/kelola-aset`, { waitUntil: 'networkidle0' })
  await page.waitForSelector('[data-testid="aset-menu-card-timing"]')
  await shot(page, 'a11-kelola-aset-hub')

  // total statistik
  await page.goto(`${BASE}/aset/statistik`, { waitUntil: 'networkidle0' })
  await page.waitForSelector('[data-testid="stats-chart"]')
  await shot(page, 'a12-total-statistik')

  await browser.close()
  if (server?.pid) {
    try {
      process.kill(-server.pid, 'SIGTERM')
    } catch {
      /* ignore */
    }
  }
  console.log('Screenshots written to', OUT)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
