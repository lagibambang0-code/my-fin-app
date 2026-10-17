/** Capture screenshots of the category & theme UI states for visual review. */
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

async function main() {
  await ensureServer()
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })

  await page.goto(`${BASE}/lainnya/kategori-pengeluaran`, { waitUntil: 'networkidle0' })
  await page.waitForSelector('[data-testid="category-row-🍜 Food"]')
  await shot(page, '01-expense-list')

  // enable sub category — now toggles directly, no modal
  await $$(page, () => document.querySelector('[data-testid="sub-toggle"]').click())
  await page.waitForFunction(
    () => document.querySelector('[data-testid="sub-toggle-state"]')?.textContent === 'Aktif',
  )
  await shot(page, '02-list-with-subs')

  // open sub manager
  await $$(page, () =>
    document.querySelector('[aria-label="Kelola sub kategori 🍜 Food"]').click(),
  )
  await page.waitForSelector('[data-testid="sub-category-manager"]')
  await shot(page, '03-sub-manager')

  // edit sub form (focused input should hug the ring, no offset gap)
  await $$(page, () => document.querySelector('[aria-label="Ubah sub kategori Lunch"]').click())
  await page.waitForSelector('#sub-name-input')
  await $$(page, () => document.querySelector('#sub-name-input')?.focus())
  await shot(page, '04-edit-sub-focused')
  await $$(page, () => {
    const b = [...document.querySelectorAll('[role="dialog"] button')].find(
      (x) => x.textContent.trim() === 'Batal',
    )
    b?.click()
  })

  // back + edit category form
  await $$(page, () => document.querySelector('[aria-label="Kembali ke daftar kategori"]').click())
  await page.waitForSelector('[data-testid="category-row-🍜 Food"]')
  await $$(page, () => document.querySelector('[aria-label="Ubah kategori 🍜 Food"]').click())
  await page.waitForSelector('#category-name-input')
  await $$(page, () => document.querySelector('#category-name-input')?.focus())
  await shot(page, '05-edit-category-focused')
  await $$(page, () => {
    const b = [...document.querySelectorAll('[role="dialog"] button')].find(
      (x) => x.textContent.trim() === 'Batal',
    )
    b?.click()
  })

  // confirm delete dialog
  await $$(page, () => document.querySelector('[aria-label="Pilih kategori 🐶 Pets"]').click())
  await $$(page, () => document.querySelector('[aria-label="Hapus kategori terpilih"]').click())
  await page.waitForSelector('[data-testid="confirm-dialog"]')
  await shot(page, '06-confirm-delete')

  // ---------------------------------------------------------------------
  // Theme lives on its own page now, reached like every other setting
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }])
  await page.goto(`${BASE}/lainnya`, { waitUntil: 'networkidle0' })
  await page.waitForSelector('[data-testid="settings-item-tema"]')
  await shot(page, '07-settings-hub')

  await $$(page, () => document.querySelector('[data-testid="settings-item-tema"]').click())
  await page.waitForSelector('[data-testid="theme-option-ocean"]')
  await shot(page, '08-theme-default')

  await $$(page, () => document.querySelector('[data-testid="theme-option-ocean"]').click())
  await sleep(400)
  await shot(page, '09-theme-samudra')

  await $$(page, () => document.querySelector('[data-testid="theme-option-lavender"]').click())
  await sleep(400)
  await shot(page, '10-theme-lavender')

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
