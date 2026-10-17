/** Capture screenshots of the Transaksi module for visual review. */
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
const type = async (page, keys) => {
  for (const k of keys) await click(page, `[data-testid="numpad-${k}"]`)
}
const setInput = (page, selector, value) =>
  page.$eval(
    selector,
    (el, val) => {
      const proto =
        el instanceof window.HTMLTextAreaElement
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set
      el.focus()
      setter.call(el, val)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    },
    value,
  )

async function main() {
  await ensureServer()
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })

  await page.goto(`${BASE}/transaksi`, { waitUntil: 'networkidle0' })
  await page.waitForSelector('[data-testid="trx-summary"]')
  await page.waitForSelector('[data-testid="transactions-empty"]')
  await shot(page, 't01-transaksi-harian-kosong')

  // month picker popup
  await click(page, '[data-testid="month-navigator-label"]')
  await page.waitForSelector('[aria-label="Pilih bulan dan tahun"]')
  await shot(page, 't02-pemilih-bulan')
  await page.keyboard.press('Escape')

  // expense form
  await click(page, '[data-testid="trx-fab"]')
  await page.waitForSelector('[data-testid="transaction-form"]')
  await type(page, ['5', '0', '0', '0', '0'])
  await shot(page, 't03-form-pengeluaran')
  await click(page, '[data-testid="trx-category-button"]')
  await page.waitForSelector('[data-testid="category-picker"]')
  await shot(page, 't04-pemilih-kategori')
  await page.$eval('[data-testid="category-picker"]', (el) => {
    const target = [...el.querySelectorAll('[data-testid^="category-option-"]')].find((n) =>
      n.textContent.includes('Food'),
    )
    target.click()
  })
  await page.waitForFunction(() => !document.querySelector('[data-testid="category-picker"]'))
  await click(page, '[data-testid="trx-asset-button"]')
  await page.waitForSelector('[data-testid="asset-picker"]')
  await shot(page, 't05-pemilih-aset')
  await click(page, '[data-testid="picker-option-ast_cash"]')
  await page.waitForFunction(() => !document.querySelector('[data-testid="asset-picker"]'))
  await setInput(page, '#trx-note-input', 'makan siang')
  await setInput(page, '#trx-description-input', 'Nasi goreng + es teh')
  await shot(page, 't06-form-terisi')

  // recurring
  await click(page, '[data-testid="trx-recurring-button"]')
  await page.waitForSelector('[data-testid="recurring-sheet"]')
  await shot(page, 't07-berulang-menu')
  await click(page, '[data-testid="recurring-menu-repeat"]')
  await page.waitForSelector('[data-testid="recurring-option-0"]')
  await shot(page, 't08-berulang-daftar')
  await click(page, '[data-testid="recurring-option-7"]')
  await page.waitForFunction(() => !document.querySelector('[data-testid="recurring-sheet"]'))
  await click(page, '[data-testid="trx-recurring-button"]')
  await click(page, '[data-testid="recurring-menu-installment"]')
  await page.waitForSelector('[data-testid="installment-screen"]')
  for (const k of ['1', '2']) await click(page, `[data-testid="installment-screen"] [data-testid="numpad-${k}"]`)
  await shot(page, 't09-cicil')
  await click(page, '[data-testid="installment-screen"] [data-testid="numpad-back"]')
  await click(page, '[data-testid="installment-screen"] [data-testid="numpad-back"]')
  await click(page, '[data-testid="installment-screen"] [data-testid="numpad-6"]')
  await click(page, '[data-testid="installment-save"]')
  await page.waitForFunction(() => !document.querySelector('[data-testid="installment-screen"]'))

  // save the expense, then add income + transfer
  await click(page, '[data-testid="trx-save"]')
  await page.waitForFunction(() => !document.querySelector('[data-testid="transaction-form"]'))

  await click(page, '[data-testid="trx-fab"]')
  await type(page, ['8', '00', '00', '0'])
  await click(page, '[data-testid="trx-type-income"]')
  await click(page, '[data-testid="trx-category-button"]')
  await page.waitForSelector('[data-testid="category-picker"]')
  await page.$eval('[data-testid="category-picker"]', (el) => {
    const target = [...el.querySelectorAll('[data-testid^="category-option-"]')].find((n) =>
      n.textContent.includes('Salary'),
    )
    target.click()
  })
  await click(page, '[data-testid="trx-asset-button"]')
  await page.waitForSelector('[data-testid="asset-picker"]')
  await click(page, '[data-testid="picker-option-ast_accounts"]')
  await click(page, '[data-testid="trx-save"]')
  await page.waitForFunction(() => !document.querySelector('[data-testid="transaction-form"]'))

  await click(page, '[data-testid="trx-fab"]')
  await type(page, ['2', '5', '00', '0'])
  await click(page, '[data-testid="trx-type-transfer"]')
  await shot(page, 't10-form-transfer')
  await click(page, '[data-testid="trx-from-asset-button"]')
  await page.waitForSelector('[data-testid="asset-picker"]')
  await click(page, '[data-testid="picker-option-ast_cash"]')
  await click(page, '[data-testid="trx-to-asset-button"]')
  await page.waitForSelector('[data-testid="asset-picker"]')
  await click(page, '[data-testid="picker-option-ast_accounts"]')
  await setInput(page, '#trx-fee-input', '500')
  await click(page, '[data-testid="trx-save"]')
  await page.waitForFunction(() => !document.querySelector('[data-testid="transaction-form"]'))
  await shot(page, 't11-harian-terisi')

  // calendar + day dialog
  await click(page, '[data-testid="trx-view-calendar"]')
  await page.waitForSelector('[data-testid="calendar-total"]')
  await shot(page, 't12-kalender')
  const cell = await page.$('[data-testid^="calendar-cell-"]:not([data-testid$="-"])')
  const cellId = await cell.evaluate((el) => el.getAttribute('data-testid'))
  const today = new Date()
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const dayCell = (await page.$(`[data-testid="calendar-cell-${todayIso}"]`)) ? `calendar-cell-${todayIso}` : cellId
  await click(page, `[data-testid="${dayCell}"]`)
  await page.waitForSelector('[data-testid="calendar-day-dialog"]')
  await shot(page, 't13-kalender-dialog-hari')
  await click(page, '[data-testid="calendar-day-dialog"] button[aria-label="Tutup"]')

  // monthly (year header + year picker)
  await click(page, '[data-testid="trx-view-monthly"]')
  await page.waitForSelector('[data-testid="monthly-view"]')
  await shot(page, 't14-bulanan')
  await click(page, '[data-testid="month-navigator-label"]')
  await page.waitForSelector('[data-testid="year-option-2026"]')
  await shot(page, 't15-pemilih-tahun')
  await page.keyboard.press('Escape')

  // tutup buku
  await click(page, '[data-testid="trx-view-closebook"]')
  await page.waitForSelector('[data-testid="close-book-view"]')
  await shot(page, 't16-tutup-buku')
  await click(page, '[data-testid="close-book-budget"]')
  await page.waitForSelector('[data-testid="budget-notice"]')
  await shot(page, 't17-tutup-buku-anggaran')
  await click(page, '[data-testid="budget-notice"] button[aria-label="Tutup"]')

  // memo
  await click(page, '[data-testid="trx-view-memo"]')
  await page.waitForSelector('[data-testid="transactions-empty"]')
  await shot(page, 't18-memo')
  await click(page, '[data-testid="trx-view-daily"]')

  // edit form with actions
  await click(page, '[data-testid^="tx-row-"]')
  await page.waitForSelector('[data-testid="transaction-form"]')
  await shot(page, 't19-form-ubah')
  await click(page, '[data-testid="trx-delete-button"]')
  await page.waitForSelector('[data-testid="confirm-dialog"]')
  await shot(page, 't20-konfirmasi-hapus')
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('[data-testid="confirm-dialog"] button')].find(
      (b) => b.textContent.trim() === 'Tidak',
    )
    btn.click()
  })
  await page.waitForFunction(() => !document.querySelector('[data-testid="confirm-dialog"]'))
  await click(page, '[data-testid="trx-copy-button"]')
  await page.waitForSelector('[data-testid="trx-copy-dialog"]')
  await shot(page, 't21-dialog-salin')
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('[data-testid="trx-copy-dialog"] button')].find(
      (b) => b.textContent.trim() === 'Tidak',
    )
    btn.click()
  })
  // bookmark flow
  await click(page, '[data-testid="trx-mark-button"]')
  await click(page, '[data-testid="trx-save"]')
  await page.waitForFunction(() => !document.querySelector('[data-testid="transaction-form"]'))
  await click(page, '[data-testid="trx-header-bookmark"]')
  await page.waitForSelector('[data-testid="bookmark-screen"]')
  await shot(page, 't22-bookmark')
  await click(page, '[data-testid="bookmark-edit-button"]')
  await page.waitForSelector('[data-testid^="bookmark-select-"]')
  await click(page, '[data-testid^="bookmark-select-"]')
  await shot(page, 't23-bookmark-mode-ubah')
  await click(page, '[data-testid="bookmark-screen"] [aria-label="Kembali"]')
  await page.waitForFunction(() => !document.querySelector('[data-testid="bookmark-screen"]'))

  // search
  await click(page, '[data-testid="trx-header-search"]')
  await page.waitForSelector('[data-testid="search-screen"]')
  await shot(page, 't24-pencarian-awal')
  await setInput(page, '[data-testid="search-input"]', 'makan')
  await page.keyboard.press('Enter')
  await page.waitForFunction(
    () => document.querySelectorAll('[data-testid="search-screen"] [data-testid^="tx-row-"]').length > 0,
  )
  await shot(page, 't25-pencarian-hasil')
  await click(page, '[data-testid="search-filter-button"]')
  await page.waitForSelector('[data-testid="filter-section-periode"]')
  await shot(page, 't26-pencarian-filter-lengkap')
  await click(page, '[data-testid="filter-screen"] button[aria-label="Tutup"]')
  await click(page, '[data-testid="search-screen"] [aria-label="Kembali"]')

  // header filter
  await click(page, '[data-testid="trx-header-filter"]')
  await page.waitForSelector('[data-testid="filter-screen"]')
  await shot(page, 't27-filter-transaksi')
  await click(page, '[data-testid="filter-type-pengeluaran-expense"]')
  await click(page, '[data-testid="filter-apply"]')
  await page.waitForSelector('[data-testid="filter-chip"]')
  await shot(page, 't28-filter-aktif')
  await click(page, '[data-testid="filter-clear"]')

  // asset detail with real transactions
  await page.goto(`${BASE}/aset`, { waitUntil: 'networkidle0' })
  await page.waitForSelector('[data-testid="asset-row-Cash"]')
  await click(page, '[data-testid="asset-row-Cash"]')
  await page.waitForSelector('[data-testid="asset-detail"]')
  await shot(page, 't29-detail-aset-transaksi')

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
