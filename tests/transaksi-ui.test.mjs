/**
 * Real-browser UI test for the Transaksi module using Puppeteer.
 * Drives the actual Next.js app (client-side IndexedDB via Dexie) and covers
 * the scenarios in money-manager-clone/test-scenarios/TS-05-Tab-Transaksi.md.
 *
 * Run: pnpm test:ui:transaksi
 */
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'

const BASE = process.env.APP_BASE ?? 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const toIso = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const TODAY = new Date()
const TODAY_ISO = toIso(TODAY)
const YESTERDAY_ISO = toIso(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - 1))

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
  if (await isUp()) {
    console.log('· Using already-running dev server at', BASE)
    return
  }
  console.log('· Starting dev server…')
  server = spawn('pnpm', ['dev'], { cwd: process.cwd(), stdio: 'ignore', detached: true, env: { ...process.env } })
  const start = Date.now()
  while (Date.now() - start < 90000) {
    if (await isUp()) {
      console.log('· Dev server ready')
      return
    }
    await sleep(500)
  }
  throw new Error('Dev server did not start within 90s')
}

function stopServer() {
  if (!server?.pid) return
  try {
    process.kill(-server.pid, 'SIGTERM')
  } catch {
    /* ignore */
  }
}

const results = []
let currentPage = null

async function test(name, fn) {
  try {
    await fn()
    results.push({ name, ok: true })
    console.log(`  ✅ ${name}`)
  } catch (err) {
    results.push({ name, ok: false, err: err.message })
    console.log(`  ❌ ${name}\n       ${err.message}`)
    if (currentPage) {
      try {
        const txt = await currentPage.evaluate(() =>
          document.body.innerText.replace(/\n+/g, ' | ').slice(0, 600),
        )
        console.log(`       ↳ DOM: ${txt}`)
      } catch {
        /* ignore */
      }
    }
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

async function waitFor(page, selector, timeout = 15000) {
  await page.waitForSelector(selector, { timeout })
}

async function waitGone(page, selector, timeout = 15000) {
  await page.waitForFunction((sel) => !document.querySelector(sel), { timeout }, selector)
}

async function click(page, selector) {
  await page.waitForSelector(selector, { timeout: 15000, visible: true })
  const ok = await page.$eval(selector, (el) => {
    el.scrollIntoView({ block: 'center', inline: 'center' })
    el.click()
    return true
  })
  assert(ok, `click failed: ${selector}`)
}

async function textOf(page, selector) {
  await page.waitForSelector(selector, { timeout: 15000 })
  return page.$eval(selector, (el) => el.textContent.trim())
}

async function exists(page, selector) {
  return (await page.$(selector)) !== null
}

async function countOf(page, selector) {
  return page.$$eval(selector, (els) => els.length).catch(() => 0)
}

async function hasText(page, selector, needle) {
  const text = await textOf(page, selector)
  return text.includes(needle)
}

/** Numeric value of a currency-formatted field (e.g. "Rp -5.000" → -5000). */
async function amountOf(page, selector) {
  const text = await textOf(page, selector)
  const digits = text.replace(/[^\d-]/g, '')
  const value = Number(digits)
  assert(Number.isFinite(value), `cannot parse amount from "${text}"`)
  return value
}

async function setInput(page, selector, value) {
  await page.waitForSelector(selector, { timeout: 15000 })
  await page.$eval(
    selector,
    (el, val) => {
      el.focus()
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      ).set
      setter.call(el, val)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    },
    value,
  )
}

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

/** Open the app date-picker sheet and select the given `YYYY-MM-DD` date. */
async function pickDate(page, iso, trigger = '[data-testid="trx-date-input"]') {
  await click(page, trigger)
  await waitFor(page, '[data-testid="date-picker-sheet"]')

  const [targetYear, targetMonth] = iso.split('-').map(Number)
  await page.select('[data-testid="date-picker-year"]', String(targetYear))

  for (let i = 0; i < 36; i++) {
    const label = await page.$eval('[data-testid="date-picker-month-label"]', (el) =>
      el.textContent.trim(),
    )
    const [monthName, yearStr] = label.split(' ')
    const monthIndex = MONTH_NAMES.indexOf(monthName)
    const year = Number(yearStr)
    if (year === targetYear && monthIndex === targetMonth - 1) break
    const goBack = year > targetYear || (year === targetYear && monthIndex > targetMonth - 1)
    await click(page, goBack ? '[data-testid="date-picker-prev-month"]' : '[data-testid="date-picker-next-month"]')
  }

  await click(page, `[data-testid="date-picker-day-${iso}"]`)
  await waitGone(page, '[data-testid="date-picker-sheet"]')
}

async function setTextarea(page, selector, value) {
  await page.waitForSelector(selector, { timeout: 15000 })
  await page.$eval(
    selector,
    (el, val) => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value',
      ).set
      setter.call(el, val)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    },
    value,
  )
}

/** Click the first element whose data-testid starts with `prefix` and contains `text`. */
async function clickContaining(page, prefix, text) {
  const ok = await page.evaluate(
    (p, t) => {
      const el = [...document.querySelectorAll(`[data-testid^="${p}"]`)].find((node) =>
        node.textContent.includes(t),
      )
      if (!el) return false
      el.scrollIntoView({ block: 'center' })
      el.click()
      return true
    },
    prefix,
    text,
  )
  assert(ok, `element [${prefix}*] containing "${text}" not found`)
}

async function clickText(page, text) {
  const ok = await page.evaluate((txt) => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === txt)
    if (!btn) return false
    btn.click()
    return true
  }, text)
  assert(ok, `button "${text}" not found`)
}

async function pressKeys(page, keys, scope = '') {
  for (const key of keys) {
    await click(page, `${scope}[data-testid="numpad-${key === '.' ? 'dot' : key}"]`)
  }
}

/** data-testid of the transaction row whose amount cell equals `amountText`. */
async function rowTestIdByAmount(page, amountText, scope = '') {
  const id = await page.evaluate(
    (needle, sc) => {
      const rows = [...document.querySelectorAll(`${sc}[data-testid^="tx-row-"]`)]
      const row = rows.find(
        (el) => el.querySelector('[data-testid^="tx-amount-"]')?.textContent.trim() === needle,
      )
      return row?.getAttribute('data-testid') ?? null
    },
    amountText,
    scope,
  )
  assert(id, `no row with amount "${amountText}"`)
  return id
}

/** Click the back chevron inside a given overlay container. */
async function back(page, container) {
  await click(page, `${container} [aria-label="Kembali"]`)
}

/** Horizontal swipe (pointer sequence) across the transaction content area. */
async function swipe(page, deltaX) {
  await page.evaluate(
    (dx) => {
      const el = document.querySelector('[data-testid="trx-content"]')
      const rect = el.getBoundingClientRect()
      const y = Math.min(rect.top + 140, rect.bottom - 10)
      const x = rect.left + rect.width / 2
      const fire = (type, clientX) =>
        el.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            clientX,
            clientY: y,
            pointerId: 7,
            pointerType: 'touch',
            isPrimary: true,
          }),
        )
      fire('pointerdown', x)
      fire('pointerup', x + dx)
    },
    deltaX,
  )
}

async function gotoTransaksi(page) {
  await page.goto(`${BASE}/transaksi`, { waitUntil: 'networkidle0' })
  await waitFor(page, '[data-testid="trx-summary"]')
}

/** Open the FAB form and set the amount. */
async function openForm(page, keys = []) {
  await click(page, '[data-testid="trx-fab"]')
  await waitFor(page, '[data-testid="transaction-form"]')
  if (keys.length) await pressKeys(page, keys)
}

async function pickCategory(page, text) {
  await click(page, '[data-testid="trx-category-button"]')
  await waitFor(page, '[data-testid="category-picker"]')
  await waitFor(page, '[data-testid^="category-option-"]')
  await clickContaining(page, 'category-option-', text)
  await sleep(150)
  const stillOpen = await page.$('[data-testid="category-picker"]')
  if (stillOpen) {
    await clickContaining(page, 'category-option-', text)
  }
  await waitGone(page, '[data-testid="category-picker"]')
}

async function pickAsset(page, buttonTestId, uid) {
  await click(page, `[data-testid="${buttonTestId}"]`)
  await waitFor(page, '[data-testid="asset-picker"]')
  await click(page, `[data-testid="picker-option-${uid}"]`)
  await waitGone(page, '[data-testid="asset-picker"]')
}

/** Enter the transfer fee with the app's own pad (no native keyboard). */
async function setFee(page, digits) {
  await click(page, '[data-testid="trx-fee-button"]')
  await waitFor(page, '[data-testid="trx-fee-sheet"]')
  for (const key of String(digits)) {
    await click(page, `[data-testid="fee-numpad-${key}"]`)
  }
  await click(page, '[data-testid="trx-fee-sheet-done"]')
  await waitGone(page, '[data-testid="trx-fee-sheet"]')
}

async function saveForm(page) {
  await click(page, '[data-testid="trx-save"]')
  await waitGone(page, '[data-testid="transaction-form"]')
}

async function main() {
  await ensureServer()
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  currentPage = page
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })

  const consoleErrors = []
  page.on('console', (m) => {
    if (m.type() === 'error') {
      const url = m.location()?.url
      consoleErrors.push(url ? `${m.text()} (${url})` : m.text())
    }
  })
  page.on('pageerror', (e) => {
    const inner = e?.inner?.message ?? e?.inner ? ` inner:${e.inner.message}` : ''
    consoleErrors.push(`pageerror: ${e.name}: ${e.message}${inner}`)
  })

  // Capture the Excel export download triggered by "Tutup buku".
  await page.evaluateOnNewDocument(() => {
    window.__downloads = []
    const createUrl = URL.createObjectURL.bind(URL)
    URL.createObjectURL = (blob) => {
      blob.text().then((text) => {
        if (window.__downloads[0]) window.__downloads[0].content = text
      })
      return createUrl(blob)
    }
    const original = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function () {
      if (this.download) window.__downloads.push({ name: this.download, href: this.href })
      return original.call(this)
    }
  })

  // A tiny 1x1 PNG used by the photo attachment test.
  const fixtureDir = path.join(process.cwd(), 'test-results', 'fixtures')
  mkdirSync(fixtureDir, { recursive: true })
  const photoPath = path.join(fixtureDir, 'photo.png')
  writeFileSync(
    photoPath,
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
      'base64',
    ),
  )

  try {
    // ---------------------------------------------------------------------
    console.log('\n▶ TS-05: Tab Transaksi — tampilan dasar')
    await gotoTransaksi(page)

    await test('TC-NAV-TRX-01: header, 5 sub-tab, ringkasan, FAB', async () => {
      await waitFor(page, '[data-testid="month-navigator-label"]')
      assert(await exists(page, '[data-testid="trx-header-bookmark"]'), 'bookmark button missing')
      assert(await exists(page, '[data-testid="trx-header-search"]'), 'search button missing')
      assert(await exists(page, '[data-testid="trx-header-filter"]'), 'filter button missing')
      for (const view of ['daily', 'calendar', 'monthly', 'closebook', 'memo']) {
        assert(await exists(page, `[data-testid="trx-view-${view}"]`), `sub-tab ${view} missing`)
      }
      assert(await exists(page, '[data-testid="trx-summary-income"]'), 'income summary missing')
      assert(await exists(page, '[data-testid="trx-summary-expense"]'), 'expense summary missing')
      assert(await exists(page, '[data-testid="trx-summary-total"]'), 'total summary missing')
      assert(await exists(page, '[data-testid="trx-fab"]'), 'FAB missing')
      // The FAB must sit clear of the bottom navigation, never behind it.
      const fabGap = await page.evaluate(() => {
        const fab = document.querySelector('[data-testid="trx-fab"]')
        const nav = document.querySelector('nav[aria-label="Navigasi utama"]')
        return Math.round(
          nav.getBoundingClientRect().top - fab.getBoundingClientRect().bottom,
        )
      })
      assert(fabGap >= 8, `FAB should clear the bottom nav, gap was ${fabGap}px`)
      const navHeight = await page.evaluate(() =>
        Math.round(document.querySelector('nav[aria-label="Navigasi utama"]').getBoundingClientRect().height),
      )
      assert(navHeight <= 90, `bottom nav should stay compact, height was ${navHeight}px`)
    })

    await test('TC-TRX-21: periode kosong → "Tidak ada data" & ringkasan 0', async () => {
      await waitFor(page, '[data-testid="transactions-empty"]')
      assert(
        await hasText(page, '[data-testid="transactions-empty"]', 'Tidak ada data'),
        'empty text missing',
      )
      assert((await amountOf(page, '[data-testid="trx-summary-expense"]')) === 0, 'expense not 0')
      assert((await amountOf(page, '[data-testid="trx-summary-total"]')) === 0, 'total not 0')
    })

    // ---------------------------------------------------------------------
    console.log('\n▶ Input transaksi')
    await test('TC-TRX-07 + TC-TRX-22: catat pengeluaran 5.000 (total negatif)', async () => {
      await openForm(page, ['5', '0', '0', '0'])
      assert(
        (await textOf(page, '[data-testid="trx-amount-display"]')).includes('5.000'),
        'amount display wrong',
      )
      await pickCategory(page, 'Food')
      await pickAsset(page, 'trx-asset-button', 'ast_cash')
      await setInput(page, '#trx-note-input', 'makan siang')
      await saveForm(page)

      await waitFor(page, `[data-testid="day-group-${TODAY_ISO}"]`)
      assert(
        (await countOf(page, '[data-testid^="tx-row-"]')) === 1,
        'transaction row missing',
      )
      assert(
        await hasText(page, '[data-testid^="tx-category-"]', 'Food'),
        'category not shown on row',
      )
      assert(await hasText(page, '[data-testid^="tx-asset-"]', 'Cash'), 'asset not shown on row')
      assert((await amountOf(page, '[data-testid="trx-summary-expense"]')) === 5000, 'expense')
      assert((await amountOf(page, '[data-testid="trx-summary-total"]')) === -5000, 'negative total')
    })

    await test('TC-TRX-08: kategori & aset wajib (form tetap terbuka)', async () => {
      await openForm(page, ['1', '2', '3'])
      await click(page, '[data-testid="trx-save"]')
      await page.waitForSelector('[data-sonner-toast]', { timeout: 5000 })
      const toastText = await page.evaluate(() =>
        Array.from(document.querySelectorAll('[data-sonner-toast]')).map((el) => el.textContent ?? '').join(' '),
      )
      assert(toastText.includes('Kategori belum dipilih'), 'category error missing')
      assert(toastText.includes('Aset belum dipilih'), 'asset error missing')
      assert(await exists(page, '[data-testid="transaction-form"]'), 'form should stay open')
      await click(page, '[data-testid="trx-form-back"]')
      await waitGone(page, '[data-testid="transaction-form"]')
      assert(
        (await countOf(page, '[data-testid^="tx-row-"]')) === 1,
        'rejected save must not create a row',
      )
    })

    await test('TC-TRX-09: catat pendapatan 100.000', async () => {
      await openForm(page, ['1', '00', '00', '0'])
      await click(page, '[data-testid="trx-type-income"]')
      await pickCategory(page, 'Salary')
      await pickAsset(page, 'trx-asset-button', 'ast_accounts')
      await saveForm(page)
      assert(
        (await amountOf(page, '[data-testid="trx-summary-income"]')) === 100000,
        'income summary wrong',
      )
      assert(
        (await amountOf(page, '[data-testid="trx-summary-total"]')) === 95000,
        'total should be income - expense',
      )
    })

    await test('TC-TRX-10: transfer Cash → Accounts (blokir bila belum lengkap)', async () => {
      await openForm(page, ['2', '5', '00', '0'])
      await click(page, '[data-testid="trx-type-transfer"]')
      await waitFor(page, '[data-testid="trx-fee-button"]')
      assert(await exists(page, '[data-testid="trx-from-asset-button"]'), 'Uang keluar missing')
      assert(await exists(page, '[data-testid="trx-to-asset-button"]'), 'Uang masuk missing')

      await click(page, '[data-testid="trx-save"]')
      await page.waitForSelector('[data-sonner-toast]', { timeout: 5000 })
      assert(await exists(page, '[data-testid="transaction-form"]'), 'transfer save not blocked')

      await pickAsset(page, 'trx-from-asset-button', 'ast_cash')
      await pickAsset(page, 'trx-to-asset-button', 'ast_accounts')
      await setFee(page, '500')
      await saveForm(page)

      assert(
        (await countOf(page, '[data-testid^="tx-row-"]')) === 3,
        'transfer row not created',
      )
      assert((await amountOf(page, '[data-testid="trx-summary-income"]')) === 100000, 'income changed')
      assert((await amountOf(page, '[data-testid="trx-summary-expense"]')) === 5000, 'expense changed')
    })

    await test('TC-TRX-10b: Biaya transfer diisi lewat numpad aplikasi, bukan keyboard', async () => {
      await openForm(page, ['2', '5', '00', '0'])
      await click(page, '[data-testid="trx-type-transfer"]')
      await waitFor(page, '[data-testid="trx-fee-button"]')

      // The fee must not fall back to the native keyboard — no text field.
      assert(
        !(await exists(page, '#trx-fee-input, [data-testid="trx-fee-input"]')),
        'fee must not use a keyboard input',
      )
      assert(
        await hasText(page, '[data-testid="trx-fee-value"]', 'Rp 0'),
        'fee row should start at Rp 0',
      )

      await click(page, '[data-testid="trx-fee-button"]')
      await waitFor(page, '[data-testid="trx-fee-sheet"]')
      for (const key of ['1', '5', '0', '0', '0']) {
        await click(page, `[data-testid="fee-numpad-${key}"]`)
      }
      assert(
        (await textOf(page, '[data-testid="trx-fee-sheet-value"]')) === '15.000',
        `sheet should group per key press, got ${await textOf(page, '[data-testid="trx-fee-sheet-value"]')}`,
      )

      await click(page, '[data-testid="fee-numpad-back"]')
      await click(page, '[data-testid="trx-fee-sheet-done"]')
      await waitGone(page, '[data-testid="trx-fee-sheet"]')
      assert(
        await hasText(page, '[data-testid="trx-fee-value"]', 'Rp 1.500'),
        'fee row should show the value entered with the pad',
      )

      await click(page, '[data-testid="trx-form-back"]')
      await waitGone(page, '[data-testid="transaction-form"]')
    })

    await test('TC-TRX-11: "Lanjut" menyimpan lalu membuka form lagi', async () => {
      await openForm(page, ['1', '0', '0', '0'])
      await pickCategory(page, 'Food')
      await pickAsset(page, 'trx-asset-button', 'ast_cash')
      await click(page, '[data-testid="trx-save-next"]')
      await waitFor(page, '[data-testid="transaction-form"]')
      assert(
        (await textOf(page, '[data-testid="trx-amount-display"]')) === '0',
        'amount should reset after Lanjut',
      )
      await click(page, '[data-testid="trx-form-back"]')
      await waitGone(page, '[data-testid="transaction-form"]')
      assert((await countOf(page, '[data-testid^="tx-row-"]')) === 4, 'Lanjut row missing')
    })

    await test('TC-TRX-13: Berulang/cicil → Ulang (14 frekuensi) & Cicil', async () => {
      await openForm(page)
      await click(page, '[data-testid="trx-recurring-button"]')
      await waitFor(page, '[data-testid="recurring-sheet"]')
      assert(await exists(page, '[data-testid="recurring-menu-repeat"]'), 'Ulang option missing')
      assert(
        await exists(page, '[data-testid="recurring-menu-installment"]'),
        'Cicil option missing',
      )
      await click(page, '[data-testid="recurring-menu-repeat"]')
      await waitFor(page, '[data-testid="recurring-option-0"]')
      const frequencies = await countOf(page, '[data-testid^="recurring-option-"]')
      assert(frequencies === 14, `expected 14 frequencies, got ${frequencies}`)
      await click(page, '[data-testid="recurring-option-7"]')
      await waitGone(page, '[data-testid="recurring-sheet"]')
      assert(
        (await textOf(page, '[data-testid="trx-recurring-value"]')) === 'Setiap bulan',
        'repeat label not applied',
      )

      await click(page, '[data-testid="trx-recurring-button"]')
      await click(page, '[data-testid="recurring-menu-installment"]')
      await waitFor(page, '[data-testid="installment-screen"]')
      assert(
        await hasText(page, '[data-testid="installment-screen"]', 'Input cicilan bulanan'),
        'cicilan heading missing',
      )
      await pressKeys(page, ['3'], '[data-testid="installment-screen"] ')
      await click(page, '[data-testid="installment-save"]')
      await waitGone(page, '[data-testid="installment-screen"]')
      assert(
        (await textOf(page, '[data-testid="trx-recurring-value"]')) === 'Cicilan 3 bulan',
        'installment label not applied',
      )
      await click(page, '[data-testid="trx-form-back"]')
      await waitGone(page, '[data-testid="transaction-form"]')
    })

    await test('TC-TRX-01: grup tanggal + total harian (2 tanggal berbeda)', async () => {
      await openForm(page, ['2', '0', '0', '0'])
      await pickDate(page, YESTERDAY_ISO)
      await pickCategory(page, 'Transport')
      await pickAsset(page, 'trx-asset-button', 'ast_cash')
      await saveForm(page)

      await waitFor(page, `[data-testid="day-group-${TODAY_ISO}"]`)
      assert(
        await exists(page, `[data-testid="day-group-${YESTERDAY_ISO}"]`),
        'yesterday group missing',
      )
      assert((await countOf(page, '[data-testid^="day-group-"]')) === 2, 'expected 2 day groups')
      const groupHeader = await textOf(page, `[data-testid="day-group-${TODAY_ISO}"] h2`)
      assert(/\d{2}\.\d{4}/.test(groupHeader), `group header should show month.year: "${groupHeader}"`)
      assert(
        await exists(page, `[data-testid="day-total-${TODAY_ISO}"]`),
        'daily in/out totals missing',
      )
    })

    await test('TC-TRX-12: lampirkan foto pada transaksi', async () => {
      await openForm(page, ['3', '0', '0'])
      await pickCategory(page, 'Food')
      await pickAsset(page, 'trx-asset-button', 'ast_cash')
      const input = await page.$('[data-testid="trx-photo-input"]')
      await input.uploadFile(photoPath)
      await waitFor(page, '[data-testid="transaction-form"] img')
      await saveForm(page)

      const photoRow = await rowTestIdByAmount(page, 'Rp 300')
      await click(page, `[data-testid="${photoRow}"]`)
      await waitFor(page, '[data-testid="transaction-form"]')
      await waitFor(page, '[data-testid="transaction-form"] img')
      await click(page, '[data-testid="trx-form-back"]')
      await waitGone(page, '[data-testid="transaction-form"]')
    })

    // ---------------------------------------------------------------------
    console.log('\n▶ Sub-tab tampilan')
    await test('TC-TRX-02: Kalender — grid + total per sel + total periode', async () => {
      await click(page, '[data-testid="trx-view-calendar"]')
      await waitFor(page, '[data-testid="calendar-total"]')
      assert(
        await exists(page, `[data-testid="calendar-cell-${TODAY_ISO}"]`),
        'calendar cell for today missing',
      )
      const cell = await textOf(page, `[data-testid="calendar-cell-${TODAY_ISO}"]`)
      assert(/\d+\.\d+/.test(cell.replace(/\n/g, ' ')), `cell should show a total: "${cell}"`)
      assert(await exists(page, `[data-testid="calendar-cell-${YESTERDAY_ISO}"]`), 'yesterday cell')

      await click(page, `[data-testid="calendar-cell-${TODAY_ISO}"]`)
      await waitFor(page, '[data-testid="calendar-day-dialog"]')
      assert(
        await exists(page, '[data-testid="calendar-day-dialog"] [data-testid^="tx-row-"]'),
        'day dialog should list the day transactions',
      )
      await click(page, '[data-testid="calendar-day-dialog"] button[aria-label="Tutup"]')
      await waitGone(page, '[data-testid="calendar-day-dialog"]')
    })

    await test('TC-TRX-03: Bulanan — header tahun + baris bulan + pekanan + Total', async () => {
      await click(page, '[data-testid="trx-view-monthly"]')
      await waitFor(page, '[data-testid="monthly-view"]')
      const label = await textOf(page, '[data-testid="month-navigator-label"]')
      assert(/^\d{4}$/.test(label), `Bulanan header should show the year, got "${label}"`)
      assert(
        await exists(page, '[data-testid="monthly-total-row"]'),
        'Total row missing',
      )
      const monthRow = await page.$('[data-testid^="month-row-"]')
      assert(monthRow, 'month period row missing')
      const monthText = await (await monthRow.getProperty('textContent')).jsonValue()
      assert(/\d{2}\.\d{2} ~ \d{2}\.\d{2}/.test(monthText), `month range missing: "${monthText}"`)
      assert((await countOf(page, '[data-testid^="week-row-"]')) > 0, 'weekly rows missing')
      // The weekly rows must cover the whole month, including the partial
      // week that holds day 1.
      const [, day, mon] = monthText.match(/(\d{2})\.(\d{2})/) ?? []
      const monthStart = Number(mon) * 100 + Number(day)
      const coversDayOne = await page.$$eval(
        '[data-testid^="week-row-"]',
        (els, start) => {
          const key = (s) => Number(s.slice(3, 5)) * 100 + Number(s.slice(0, 2))
          return els.some((el) => {
            const m = el.textContent.match(/(\d{2}\.\d{2}) ~ (\d{2}\.\d{2})/)
            return m ? key(m[1]) <= start && key(m[2]) >= start : false
          })
        },
        monthStart,
      )
      assert(coversDayOne, 'weekly rows should cover the first day of the month')
    })

    await test('TC-TRX-06 + EC-04: navigasi periode memperbarui ringkasan', async () => {
      await click(page, '[data-testid="trx-view-daily"]')
      const before = await textOf(page, '[data-testid="month-navigator-label"]')
      await click(page, '[aria-label="Bulan sebelumnya"]')
      await page.waitForFunction(
        (prev) => document.querySelector('[data-testid="month-navigator-label"]')?.textContent !== prev,
        { timeout: 10000 },
        before,
      )
      assert((await amountOf(page, '[data-testid="trx-summary-total"]')) === 0, 'empty period not 0')
      await click(page, '[aria-label="Bulan selanjutnya"]')
      await page.waitForFunction(
        (prev) => document.querySelector('[data-testid="month-navigator-label"]')?.textContent === prev,
        { timeout: 10000 },
        before,
      )
      assert((await amountOf(page, '[data-testid="trx-summary-total"]')) !== 0, 'summary not restored')
    })

    await test('TC-TRX-06b: geser (swipe) mengganti periode, bukan sub-tab', async () => {
      // Header arrows are the oracle for the neighbouring periods.
      const label = () => textOf(page, '[data-testid="month-navigator-label"]')
      const start = await label()
      await click(page, '[aria-label="Bulan sebelumnya"]')
      const previous = await label()
      await click(page, '[aria-label="Bulan selanjutnya"]')
      assert((await label()) === start, 'arrows did not return to the starting period')
      await click(page, '[aria-label="Bulan selanjutnya"]')
      const forward = await label()
      assert(forward !== start, 'arrow did not move the period')
      await click(page, '[aria-label="Bulan sebelumnya"]')
      assert((await label()) === start, 'arrows did not return to the starting period')

      const activeView = () =>
        page.$eval('[data-testid="trx-view-daily"]', (el) => el.getAttribute('aria-selected'))

      const waitForLabel = (expected) =>
        page.waitForFunction(
          (value) =>
            document.querySelector('[data-testid="month-navigator-label"]')?.textContent === value,
          { timeout: 10000 },
          expected,
        )

      // Geser kanan→kiri = satu periode maju, geser kiri→kanan = satu periode
      // mundur (mengikuti jari, konsisten dengan tab Statistik).
      await swipe(page, -140)
      await waitForLabel(forward)
      assert((await activeView()) === 'true', 'swipe must not change the sub-tab')

      await swipe(page, 140)
      await waitForLabel(start)
      assert((await activeView()) === 'true', 'swipe kiri→kanan mundur satu periode')

      await swipe(page, 140)
      await waitForLabel(previous)
      assert((await activeView()) === 'true', 'swipe kiri→kanan mundur satu periode')

      await swipe(page, -140)
      await waitForLabel(start)

      // Mostly-vertical drags stay inert so the list can still be scrolled.
      await page.evaluate(() => {
        const el = document.querySelector('[data-testid="trx-content"]')
        const rect = el.getBoundingClientRect()
        const x = rect.left + rect.width / 2
        const fire = (type, clientY) =>
          el.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              cancelable: true,
              clientX: x,
              clientY,
              pointerId: 8,
              pointerType: 'touch',
              isPrimary: true,
            }),
          )
        fire('pointerdown', rect.top + 40)
        fire('pointerup', rect.top + 160)
      })
      assert(
        (await textOf(page, '[data-testid="month-navigator-label"]')) === start,
        'vertical drag should not change the period',
      )
    })

    await test('TC-TRX-04: Tutup buku — Anggaran, periode Aset, %, rincian, ekspor Excel', async () => {
      await click(page, '[data-testid="trx-view-closebook"]')
      await waitFor(page, '[data-testid="close-book-view"]')
      assert(await exists(page, '[data-testid="close-book-budget"]'), 'tautan Anggaran missing')
      assert(
        await hasText(page, '[data-testid="close-book-asset-period"]', '~'),
        'periode Aset missing',
      )
      const comparison = await textOf(page, '[data-testid="close-book-comparison"]')
      assert(/%/.test(comparison), `comparison % missing: "${comparison}"`)
      assert(await exists(page, '[data-testid="close-book-cash-expense"]'), 'cash expense missing')
      assert(await exists(page, '[data-testid="close-book-card-expense"]'), 'card expense missing')
      assert(await exists(page, '[data-testid="close-book-transfer"]'), 'transfer row missing')
      assert(
        await hasText(page, '[data-testid="close-book-transfer-fee"]', '500'),
        'transfer fee row missing',
      )

      await click(page, '[data-testid="close-book-export"]')
      await page.waitForFunction(() => window.__downloads.length > 0, { timeout: 10000 })
      await page.waitForFunction(() => Boolean(window.__downloads[0]?.content), { timeout: 10000 })
      const downloads = await page.evaluate(() => window.__downloads)
      assert(
        /^tutup-buku-\d{4}-\d{2}\.xls$/.test(downloads[0].name),
        `unexpected export name: ${downloads[0]?.name}`,
      )
      assert(
        downloads[0].content.includes('Biaya transfer') &&
          downloads[0].content.includes('Pengeluaran (Kartu)'),
        'export should contain the closing summary rows',
      )

      await click(page, '[data-testid="close-book-budget"]')
      await waitFor(page, '[data-testid="budget-notice"]')
      await click(page, '[data-testid="budget-notice"] button[aria-label="Tutup"]')
      await waitGone(page, '[data-testid="budget-notice"]')
    })

    await test('TC-TRX-05: Memo — "Tidak ada data"', async () => {
      await click(page, '[data-testid="trx-view-memo"]')
      await waitFor(page, '[data-testid="transactions-empty"]')
      assert(
        await hasText(page, '[data-testid="transactions-empty"]', 'Tidak ada data'),
        'memo empty state missing',
      )
      await click(page, '[data-testid="trx-view-daily"]')
    })

    // ---------------------------------------------------------------------
    console.log('\n▶ Edit, hapus, salin, bookmark')
    await test('TC-TRX-14/15: form edit (Hapus/Salin/Bookmark) & ubah jumlah', async () => {
      const expenseRow = await rowTestIdByAmount(page, 'Rp 5.000')
      await click(page, `[data-testid="${expenseRow}"]`)
      await waitFor(page, '[data-testid="transaction-form"]')
      assert(await exists(page, '[data-testid="trx-delete-button"]'), 'Hapus action missing')
      assert(await exists(page, '[data-testid="trx-copy-button"]'), 'Salin action missing')
      assert(await exists(page, '[data-testid="trx-mark-button"]'), 'Bookmark action missing')
      assert(
        (await textOf(page, '[data-testid="trx-amount-display"]')).includes('5.000'),
        'edit form should preload the amount',
      )

      await pressKeys(page, ['back', 'back', 'back', 'back'])
      await pressKeys(page, ['6', '0', '0', '0'])
      await saveForm(page)
      await rowTestIdByAmount(page, 'Rp 6.000')
      assert((await amountOf(page, '[data-testid="trx-summary-expense"]')) === 9300, 'expense total')
    })

    await test('TC-TRX-16: hapus transaksi dengan konfirmasi TIDAK/YA', async () => {
      const target = `[data-testid="day-group-${YESTERDAY_ISO}"] [data-testid^="tx-row-"]`
      await click(page, target)
      await waitFor(page, '[data-testid="transaction-form"]')
      await click(page, '[data-testid="trx-delete-button"]')
      await waitFor(page, '[data-testid="confirm-dialog"]')
      assert(
        await hasText(page, '[data-testid="confirm-dialog"]', 'Apakah anda yakin ingin menghapusnya?'),
        'confirmation text missing',
      )
      await clickText(page, 'Tidak')
      await waitGone(page, '[data-testid="confirm-dialog"]')
      assert(
        await exists(page, `[data-testid="day-group-${YESTERDAY_ISO}"]`),
        'TIDAK must keep the transaction',
      )

      await click(page, '[data-testid="trx-delete-button"]')
      await waitFor(page, '[data-testid="confirm-dialog"]')
      await clickText(page, 'Ya')
      await waitGone(page, '[data-testid="transaction-form"]')
      await waitGone(page, `[data-testid="day-group-${YESTERDAY_ISO}"]`)
      assert((await amountOf(page, '[data-testid="trx-summary-expense"]')) === 7300, 'expense total')
    })

    await test('TC-TRX-17: Salin transaksi → form baru terisi', async () => {
      const before = await countOf(page, '[data-testid^="tx-row-"]')
      const sourceRow = await rowTestIdByAmount(page, 'Rp 300')
      await click(page, `[data-testid="${sourceRow}"]`)
      await waitFor(page, '[data-testid="transaction-form"]')
      await click(page, '[data-testid="trx-copy-button"]')
      await waitFor(page, '[data-testid="trx-copy-dialog"]')
      assert(
        await hasText(page, '[data-testid="trx-copy-dialog"]', 'Salin dengan tanggal hari ini'),
        'copy option 1 missing',
      )
      assert(
        await hasText(page, '[data-testid="trx-copy-dialog"]', 'Salin dengan tanggal entri'),
        'copy option 2 missing',
      )
      await click(page, '[data-testid="trx-copy-entry"]')
      await click(page, '[data-testid="trx-copy-confirm"]')
      await waitGone(page, '[data-testid="trx-copy-dialog"]')
      await waitFor(page, '[data-testid="transaction-form"]')
      const display = await textOf(page, '[data-testid="trx-amount-display"]')
      assert(!display.startsWith('0'), `copy form should be prefilled, got "${display}"`)
      assert(
        (await textOf(page, '[data-testid="trx-category-value"]')) !== 'Pilih kategori',
        'copy form should keep the category',
      )
      await saveForm(page)
      assert((await countOf(page, '[data-testid^="tx-row-"]')) === before + 1, 'copy not saved')
      assert((await amountOf(page, '[data-testid="trx-summary-expense"]')) === 7600, 'copy amount')
    })

    await test('TC-TRX-18: Bookmark — tandai, buka daftar, hapus dari daftar', async () => {
      await click(page, '[data-testid^="tx-row-"]')
      await waitFor(page, '[data-testid="transaction-form"]')
      await click(page, '[data-testid="trx-mark-button"]')
      await click(page, '[data-testid="trx-form-bookmark-list"]')
      await waitFor(page, '[data-testid="bookmark-screen"]')
      assert(
        await hasText(page, '[data-testid="bookmark-screen"]', 'Bookmark'),
        'bookmark screen title missing',
      )
      assert(
        await hasText(page, '[data-testid="bookmark-screen"]', 'Tidak ada data'),
        'unsaved bookmark should not be listed yet',
      )
      await back(page, '[data-testid="bookmark-screen"]')
      await waitGone(page, '[data-testid="bookmark-screen"]')
      assert(await exists(page, '[data-testid="transaction-form"]'), 'form lost after bookmark list')
      await click(page, '[data-testid="trx-save"]')
      await waitGone(page, '[data-testid="transaction-form"]')

      await click(page, '[data-testid="trx-header-bookmark"]')
      await waitFor(page, '[data-testid="bookmark-screen"]')
      assert(
        (await countOf(page, '[data-testid="bookmark-screen"] [data-testid^="tx-row-"]')) === 1,
        'bookmarked transaction missing from the list',
      )
      await click(page, '[data-testid="bookmark-edit-button"]')
      await waitFor(page, '[data-testid^="bookmark-select-"]')
      await click(page, '[data-testid^="bookmark-select-"]')
      await click(page, '[data-testid="bookmark-remove-button"]')
      await waitFor(page, '[data-testid="bookmark-screen"] [data-testid="transactions-empty"]')
      await back(page, '[data-testid="bookmark-screen"]')
      await waitGone(page, '[data-testid="bookmark-screen"]')
    })

    // ---------------------------------------------------------------------
    console.log('\n▶ Cari & filter')
    await test('TC-TRX-19: Pencarian (Enter) — catatan ditemukan, kategori tidak', async () => {
      await click(page, '[data-testid="trx-header-search"]')
      await waitFor(page, '[data-testid="search-screen"]')
      await setInput(page, '[data-testid="search-input"]', 'makan')
      assert(
        await exists(page, '[data-testid="search-screen"] [data-testid="transactions-empty"]'),
        'search should wait for Enter',
      )
      await page.keyboard.press('Enter')
      await page.waitForFunction(
        () =>
          document.querySelectorAll('[data-testid="search-screen"] [data-testid^="tx-row-"]')
            .length > 0,
        { timeout: 10000 },
      )
      assert(
        (await countOf(page, '[data-testid="search-screen"] [data-testid^="tx-row-"]')) === 1,
        'keyword should match exactly one memo',
      )

      await setInput(page, '[data-testid="search-input"]', 'Food')
      await page.keyboard.press('Enter')
      await waitFor(page, '[data-testid="search-screen"] [data-testid="transactions-empty"]')
      await back(page, '[data-testid="search-screen"]')
      await waitGone(page, '[data-testid="search-screen"]')
    })

    await test('TC-TRX-20: Filter tipe + aset (+ periode/total di layar cari)', async () => {
      await click(page, '[data-testid="trx-header-filter"]')
      await waitFor(page, '[data-testid="filter-screen"]')
      assert(
        await hasText(page, '[data-testid="filter-screen"]', 'Silahkan pilih item yang ingin Anda filter'),
        'filter title missing',
      )
      assert(await exists(page, '[data-testid="filter-section-pendapatan"]'), 'PENDAPATAN section')
      assert(await exists(page, '[data-testid="filter-section-pengeluaran"]'), 'PENGELUARAN section')
      assert(await exists(page, '[data-testid="filter-section-aset"]'), 'ASET section')
      for (const id of ['pendapatan-all', 'pendapatan-income', 'pendapatan-transferIn', 'pengeluaran-all', 'pengeluaran-expense', 'pengeluaran-transferOut']) {
        assert(await exists(page, `[data-testid="filter-type-${id}"]`), `option ${id} missing`)
      }
      const optionText = await textOf(page, '[data-testid="filter-type-pendapatan-income"]')
      assert(/%/.test(optionText), `percentage missing on filter option: "${optionText}"`)
      assert(await exists(page, '[data-testid="filter-asset-Cash"] input'), 'asset checkbox missing')

      await click(page, '[data-testid="filter-type-pengeluaran-expense"]')
      await click(page, '[data-testid="filter-apply"]')
      await waitGone(page, '[data-testid="filter-screen"]')
      await waitFor(page, '[data-testid="filter-chip"]')
      const categories = await page.$$eval(
        'section [data-testid^="tx-category-"]',
        (els) => els.map((el) => el.textContent.trim()),
      )
      assert(categories.length > 0, 'filter result empty')
      assert(
        categories.every((label) => label !== 'Transfer' && label !== 'Salary'),
        `non-expense rows should be filtered out, got ${categories.join(', ')}`,
      )
      await click(page, '[data-testid="filter-clear"]')
      await waitGone(page, '[data-testid="filter-chip"]')

      await click(page, '[data-testid="trx-header-search"]')
      await waitFor(page, '[data-testid="search-screen"]')
      await click(page, '[data-testid="search-filter-button"]')
      await waitFor(page, '[data-testid="filter-section-periode"]')
      assert(await exists(page, '[data-testid="filter-section-total"]'), 'Total range missing')
      assert(await exists(page, '[data-testid="filter-period-weekly"]'), 'Periode options missing')
      assert(await exists(page, '[data-testid="filter-total-min"]'), 'Minimal input missing')
      assert(await exists(page, '[data-testid="filter-total-max"]'), 'Maksimal input missing')
      await click(page, '[data-testid="filter-apply"]')
      await back(page, '[data-testid="search-screen"]')
      await waitGone(page, '[data-testid="search-screen"]')
    })

    await test('NFR-04: saldo aset mengikuti transaksi', async () => {
      await page.goto(`${BASE}/aset`, { waitUntil: ['domcontentloaded', 'networkidle2'] })
      await waitFor(page, '[data-testid="asset-row-Cash"]')
      const cash = await amountOf(page, '[data-testid="asset-row-Cash"]')
      assert(cash === -33100, `Cash should be debited by transactions, got ${cash}`)
      const accounts = await amountOf(page, '[data-testid="asset-row-Accounts"]')
      assert(accounts === 125000, `Accounts should be credited, got ${accounts}`)
      await click(page, '[data-testid="asset-row-Cash"]')
      await waitFor(page, '[data-testid="asset-detail"]')
      const running = await amountOf(page, '[data-testid="detail-running-balance"]')
      assert(running === cash, `detail balance ${running} should match the list ${cash}`)
      assert(
        await exists(page, '[data-testid^="detail-tx-"]'),
        'asset detail should list the transactions',
      )
      await back(page, '[data-testid="asset-detail"]')
      await waitGone(page, '[data-testid="asset-detail"]')
    })

    // ---------------------------------------------------------------------
    await test('TC-NAV-TRX-01b: FAB & konten tidak tertutup nav di layar md+', async () => {
      await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
      await gotoTransaksi(page)
      await waitFor(page, '[data-testid="trx-fab"]')
      const metrics = await page.evaluate(() => {
        const nav = document.querySelector('nav[aria-label="Navigasi utama"]')
        const fab = document.querySelector('[data-testid="trx-fab"]')
        const main = document.querySelector('main')
        const navRect = nav.getBoundingClientRect()
        const fabRect = fab.getBoundingClientRect()
        return {
          gap: Math.round(navRect.top - fabRect.bottom),
          navHeight: Math.round(navRect.height),
          navTop: Math.round(navRect.top),
          fabRight: Math.round(fabRect.right),
          navRight: Math.round(navRect.right),
          paddingBottom: Math.round(parseFloat(getComputedStyle(main).paddingBottom)),
          viewportHeight: document.documentElement.clientHeight,
        }
      })
      assert(metrics.gap >= 8, `FAB harus di atas nav pada md+, gap ${metrics.gap}px`)
      assert(metrics.gap <= 40, `FAB terlalu jauh dari nav pada md+, gap ${metrics.gap}px`)
      assert(
        metrics.fabRight <= metrics.navRight,
        `FAB (${metrics.fabRight}) keluar dari container (${metrics.navRight})`,
      )
      assert(
        metrics.paddingBottom >= metrics.navHeight + 8,
        `padding konten ${metrics.paddingBottom}px < tinggi nav ${metrics.navHeight}px`,
      )
      const navOffset = metrics.viewportHeight - metrics.navTop
      assert(
        Math.abs(navOffset - (metrics.paddingBottom - 12)) <= 2,
        `padding konten (${metrics.paddingBottom}) tidak mengikuti posisi nav (offset ${navOffset})`,
      )
      await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
    })

    // ---------------------------------------------------------------------
    console.log('\n▶ T-36: tombol minus dan Selesai pada numpad')

    await test('TC-TRX-36a: tombol minus ada & tidak ada di transfer', async () => {
      await openForm(page)
      // Form bukan transfer → minus harus ada
      assert(
        await exists(page, '[data-testid="numpad-minus"]'),
        'tombol minus harus ada untuk pengeluaran/pendapatan',
      )
      // Ganti ke transfer → minus harus tidak tampil
      await click(page, '[data-testid="trx-type-transfer"]')
      assert(
        !(await exists(page, '[data-testid="numpad-minus"]')),
        'tombol minus harus tidak ada untuk transfer',
      )
      await click(page, '[data-testid="trx-form-back"]')
      await waitGone(page, '[data-testid="transaction-form"]')
    })

    await test('TC-TRX-36b: minus mengubah tanda, bergantian, tidak menumpuk', async () => {
      await openForm(page, ['5', '0', '0', '0'])
      // Cek tampilan awal positif
      let display = await textOf(page, '[data-testid="trx-amount-display"]')
      assert(display.includes('5.000') && !display.startsWith('-'), `tampilan awal harus positif, dapat: ${display}`)

      // Tekan minus → negatif
      await click(page, '[data-testid="numpad-minus"]')
      display = await textOf(page, '[data-testid="trx-amount-display"]')
      assert(display.startsWith('-') && display.includes('5.000'), `setelah minus harus negatif, dapat: ${display}`)

      // Tekan lagi → kembali positif (tidak menumpuk tanda)
      await click(page, '[data-testid="numpad-minus"]')
      display = await textOf(page, '[data-testid="trx-amount-display"]')
      assert(!display.startsWith('-') && display.includes('5.000'), `setelah minus kedua harus positif, dapat: ${display}`)

      await click(page, '[data-testid="trx-form-back"]')
      await waitGone(page, '[data-testid="transaction-form"]')
    })

    await test('TC-TRX-36c: minus pada nol tidak menghasilkan -0', async () => {
      await openForm(page)
      // amount = 0; tekan minus → display tetap 0 (tidak ada tanda minus)
      await click(page, '[data-testid="numpad-minus"]')
      const display = await textOf(page, '[data-testid="trx-amount-display"]')
      assert(!display.startsWith('-'), `minus pada nol tidak boleh menghasilkan -0, dapat: ${display}`)
      await click(page, '[data-testid="trx-form-back"]')
      await waitGone(page, '[data-testid="transaction-form"]')
    })

    await test('TC-TRX-36d: Selesai tutup numpad, form tetap terbuka & bisa disimpan', async () => {
      await openForm(page, ['3', '0', '0', '0'])
      // Klik Selesai → numpad harus hilang
      await click(page, '[data-testid="numpad-done"]')
      assert(
        !(await exists(page, '[data-testid="numpad-done"]')),
        'numpad harus tertutup setelah Selesai',
      )
      // Form masih terbuka
      assert(await exists(page, '[data-testid="transaction-form"]'), 'form harus tetap terbuka')
      // Total masih terbaca
      const display = await textOf(page, '[data-testid="trx-amount-display"]')
      assert(display.includes('3.000'), `nilai harus tetap setelah Selesai, dapat: ${display}`)
      // Bisa disimpan setelah pilih kategori & aset
      await pickCategory(page, 'Food')
      await pickAsset(page, 'trx-asset-button', 'ast_cash')
      await saveForm(page)
    })

    await test('TC-TRX-36e: tap Total membuka kembali numpad', async () => {
      await openForm(page, ['2', '0', '0', '0'])
      await click(page, '[data-testid="numpad-done"]')
      assert(!(await exists(page, '[data-testid="numpad-done"]')), 'numpad harus tertutup')
      // Tap area Total → numpad kembali terbuka
      await click(page, '[aria-label="Buka papan angka"]')
      assert(
        await exists(page, '[data-testid="numpad-done"]'),
        'numpad harus terbuka kembali setelah tap Total',
      )
      await click(page, '[data-testid="trx-form-back"]')
      await waitGone(page, '[data-testid="transaction-form"]')
    })

    await test('TC-TRX-36f: nominal negatif tidak merusak ringkasan (expense tetap positif)', async () => {
      const expenseBefore = await amountOf(page, '[data-testid="trx-summary-expense"]')
      // Buka form, ketik 2000, tekan minus → simpan sebagai expense
      await openForm(page, ['2', '0', '0', '0'])
      await click(page, '[data-testid="numpad-minus"]')
      await pickCategory(page, 'Food')
      await pickAsset(page, 'trx-asset-button', 'ast_cash')
      await saveForm(page)
      const expenseAfter = await amountOf(page, '[data-testid="trx-summary-expense"]')
      assert(
        expenseAfter === expenseBefore + 2000,
        `ringkasan expense harus bertambah 2000, sebelum ${expenseBefore} setelah ${expenseAfter}`,
      )
    })
    // ---------------------------------------------------------------------
    await test('tidak ada error di console', async () => {
      const real = consoleErrors.filter((e) => !/favicon|DevTools|Download the React|404/i.test(e))
      assert(
        real.length === 0,
        `${real.length} console error(s):\n         ${real.join('\n         ')}`,
      )
    })
  } finally {
    await browser.close()
    stopServer()
  }

  const failed = results.filter((r) => !r.ok)
  console.log(
    `\n=== RESULT: ${results.length - failed.length}/${results.length} passed, ${failed.length} failed ===`,
  )
  process.exit(failed.length > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('\nFatal:', err)
  stopServer()
  process.exit(1)
})
