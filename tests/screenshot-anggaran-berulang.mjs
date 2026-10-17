/** Capture screenshots of the Anggaran + Berulang modules for visual review. */
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

const click = async (page, sel) => {
  await page.waitForSelector(sel, { visible: true, timeout: 20000 })
  await page.$eval(sel, (el) => {
    el.scrollIntoView({ block: 'center' })
    el.click()
  })
}
const shot = async (page, name) => {
  await sleep(220)
  await page.screenshot({ path: `${OUT}/${name}.png` })
}
const type = async (page, keys, scope = '') => {
  for (const k of keys) await click(page, `${scope}[data-testid="numpad-${k}"]`)
}
const waitGone = (page, sel) =>
  page.waitForFunction((s) => !document.querySelector(s), { timeout: 20000 }, sel)

async function main() {
  await ensureServer()
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })

  // ---------------------------------------------------------------- Anggaran
  await page.goto(`${BASE}/lainnya/anggaran`, { waitUntil: 'networkidle0' })
  await page.waitForSelector('[data-testid="budget-list"]')
  await shot(page, 'f5-01-anggaran-kosong')

  await click(page, '[data-testid="budget-add"]')
  await page.waitForSelector('[data-testid="budget-form"]')
  await shot(page, 'f5-02-anggaran-tambah-kategori')

  await click(page, '[data-testid="budget-category-option-cat_exp_1"]')
  await click(page, '[data-testid="budget-total-button"]')
  await page.waitForSelector('[data-testid="budget-pad"]')
  await type(page, ['5', '0', '0', '0', '0'], '[data-testid="budget-pad"] ')
  await shot(page, 'f5-03-anggaran-total-numpad')
  await click(page, '[data-testid="budget-pad-done"]')
  await waitGone(page, '[data-testid="budget-pad"]')
  await click(page, '[data-testid="budget-save"]')
  await waitGone(page, '[data-testid="budget-form"]')

  // "Total anggaran" (Semua)
  await click(page, '[data-testid="budget-add"]')
  await page.waitForSelector('[data-testid="budget-form"]')
  await click(page, '[data-testid="budget-category-option-all"]')
  await click(page, '[data-testid="budget-total-button"]')
  await type(page, ['2', '0', '0', '0', '0', '0', '0'], '[data-testid="budget-pad"] ')
  await click(page, '[data-testid="budget-pad-done"]')
  await waitGone(page, '[data-testid="budget-pad"]')
  await click(page, '[data-testid="budget-save"]')
  await waitGone(page, '[data-testid="budget-form"]')
  await shot(page, 'f5-04-anggaran-daftar')

  // Detail bulanan
  await page.evaluate(() => {
    const row = [...document.querySelectorAll('[data-testid^="budget-row-"]')].find((el) =>
      el.textContent.includes('Food'),
    )
    row.querySelector('[data-testid^="budget-open-"]').click()
  })
  await page.waitForSelector('[data-testid="budget-monthly"]')
  await shot(page, 'f5-05-anggaran-bulanan')
  await click(page, '[data-testid="budget-base-row"]')
  await page.waitForSelector('[data-testid="budget-pad"]')
  await shot(page, 'f5-06-anggaran-dasar-numpad')
  await click(page, '[data-testid="budget-pad-done"]')
  await waitGone(page, '[data-testid="budget-pad"]')
  await click(page, '[data-testid="budget-delete"]')
  await page.waitForSelector('[data-testid="confirm-dialog"]')
  await shot(page, 'f5-07-anggaran-hapus-konfirmasi')
  await page.evaluate(() => {
    const root = document.querySelector('[data-testid="confirm-dialog"]')
    const button = [...root.querySelectorAll('button')].find(
      (el) => el.textContent.trim().toUpperCase() === 'TIDAK',
    )
    button.click()
  })
  await waitGone(page, '[data-testid="confirm-dialog"]')
  await click(page, '[data-testid="budget-monthly-back"]')
  await waitGone(page, '[data-testid="budget-monthly"]')

  // Status di Tutup buku (butuh satu pengeluaran di periode ini)
  await page.goto(`${BASE}/transaksi`, { waitUntil: 'networkidle0' })
  await page.waitForSelector('[data-testid="trx-fab"]')
  await click(page, '[data-testid="trx-fab"]')
  await page.waitForSelector('[data-testid="transaction-form"]')
  await type(page, ['7', '5', '0', '0', '0'])
  await click(page, '[data-testid="trx-category-button"]')
  await page.waitForSelector('[data-testid="category-picker"]')
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('[data-testid^="category-option-"]')].find((n) =>
      n.textContent.includes('Food'),
    )
    el.click()
  })
  await waitGone(page, '[data-testid="category-picker"]')
  await click(page, '[data-testid="trx-asset-button"]')
  await page.waitForSelector('[data-testid="asset-picker"]')
  await click(page, '[data-testid="picker-option-ast_cash"]')
  await waitGone(page, '[data-testid="asset-picker"]')
  await click(page, '[data-testid="trx-save"]')
  await waitGone(page, '[data-testid="transaction-form"]')
  await click(page, '[data-testid="trx-view-closebook"]')
  await page.waitForSelector('[data-testid="close-book-view"]')
  await shot(page, 'f5-08-tutup-buku-anggaran')
  await click(page, '[data-testid="close-book-budget"]')
  await page.waitForSelector('[data-testid="budget-notice"]')
  await shot(page, 'f5-09-tutup-buku-status-anggaran')

  // ---------------------------------------------------------------- Berulang
  await page.goto(`${BASE}/lainnya/berulang`, { waitUntil: 'networkidle0' })
  await page.waitForSelector('[data-testid="repeat-settings"]')
  await shot(page, 'f5-10-berulang')

  await click(page, '[data-testid="repeat-review-row"]')
  await page.waitForSelector('[data-testid="repeat-review-sheet"]')
  await shot(page, 'f5-11-berulang-waktu-peninjauan')
  await click(page, '[data-testid="repeat-review-option-first_of_month"]')
  await page.waitForSelector('[data-testid="confirm-dialog"]')
  await shot(page, 'f5-12-berulang-konfirmasi')
  await page.evaluate(() => {
    const root = document.querySelector('[data-testid="confirm-dialog"]')
    const button = [...root.querySelectorAll('button')].find(
      (el) => el.textContent.trim().toUpperCase() === 'TIDAK',
    )
    button.click()
  })
  await waitGone(page, '[data-testid="confirm-dialog"]')
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="repeat-review-sheet"]')
    el.click()
  })
  await waitGone(page, '[data-testid="repeat-review-sheet"]')

  await click(page, '[data-testid="repeat-add"]')
  await page.waitForSelector('[data-testid="repeat-type-screen"]')
  await shot(page, 'f5-13-berulang-frekuensi')
  await click(page, '[data-testid="repeat-option-7"]')
  await page.waitForSelector('[data-testid="transaction-form"]')
  await type(page, ['1', '0', '0', '0', '0', '0'])
  await click(page, '[data-testid="trx-category-button"]')
  await page.waitForSelector('[data-testid="category-picker"]')
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('[data-testid^="category-option-"]')].find((n) =>
      n.textContent.includes('Food'),
    )
    el.click()
  })
  await waitGone(page, '[data-testid="category-picker"]')
  await click(page, '[data-testid="trx-asset-button"]')
  await page.waitForSelector('[data-testid="asset-picker"]')
  await click(page, '[data-testid="picker-option-ast_cash"]')
  await waitGone(page, '[data-testid="asset-picker"]')
  await shot(page, 'f5-14-berulang-form')

  await browser.close()
  if (server?.pid) {
    try {
      process.kill(-server.pid, 'SIGTERM')
    } catch {
      /* ignore */
    }
  }
  console.log('· Screenshots written to', OUT)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
