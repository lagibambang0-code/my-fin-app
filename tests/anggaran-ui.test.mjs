/**
 * Real-browser UI test for the Anggaran module (PRD-04) using Puppeteer.
 * Drives the actual Next.js app (client-side IndexedDB via Dexie) and walks the
 * verified behaviours in PRD-04 §9.1 (TC-BUD-*) plus the Tutup buku integration
 * (§8.1).
 *
 * Run: pnpm test:ui:anggaran
 */
import { spawn } from 'node:child_process'
import puppeteer from 'puppeteer'

const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const NOW = new Date()
const YEAR = NOW.getFullYear()
const MONTH = NOW.getMonth() // 0-based
const FOOD_UID = 'cat_exp_1' // 🍜 Food

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
  server = spawn('pnpm', ['dev'], { cwd: process.cwd(), stdio: 'ignore', detached: true })
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
          document.body.innerText.replace(/\n+/g, ' | ').slice(0, 700),
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
  return (await textOf(page, selector)).includes(needle)
}

/** Numeric value of a currency-formatted field (e.g. "Rp 7.500" → 7500). */
async function amountOf(page, selector) {
  const text = await textOf(page, selector)
  const value = Number(text.replace(/[^\d-]/g, ''))
  assert(Number.isFinite(value), `cannot parse amount from "${text}"`)
  return value
}

async function pressKeys(page, keys, scope = '') {
  for (const key of keys) {
    await click(page, `${scope}[data-testid="numpad-${key === '.' ? 'dot' : key}"]`)
  }
}

/** Click a button inside `container` by its exact label (TIDAK / YA dialogs). */
async function clickLabel(page, container, label) {
  const ok = await page.evaluate(
    (sel, text) => {
      const root = document.querySelector(sel)
      if (!root) return false
      const button = [...root.querySelectorAll('button')].find(
        (el) => el.textContent.trim().toUpperCase() === text.toUpperCase(),
      )
      if (!button) return false
      button.click()
      return true
    },
    container,
    label,
  )
  assert(ok, `button "${label}" inside ${container} not found`)
}

/** Wait until the budget list holds exactly `n` rows (the list reloads async). */
async function waitForRowCount(page, n, timeout = 10000) {
  await page.waitForFunction(
    (count) => document.querySelectorAll('[data-testid^="budget-row-"]').length === count,
    { timeout },
    n,
  )
}

/** All budget rows as plain text. */
async function budgetRows(page) {
  return page.$$eval('[data-testid^="budget-row-"]', (els) => els.map((el) => el.textContent))
}

/** Click the budget row whose text contains `name`. */
async function openBudget(page, name) {
  const ok = await page.evaluate((needle) => {
    const row = [...document.querySelectorAll('[data-testid^="budget-row-"]')].find((el) =>
      el.textContent.includes(needle),
    )
    if (!row) return false
    row.querySelector('[data-testid^="budget-open-"]').click()
    return true
  }, name)
  assert(ok, `budget row "${name}" not found`)
}

/** Fill the budget number pad (opened by the caller) and confirm it. */
async function setBudgetAmount(page, keys) {
  await waitFor(page, '[data-testid="budget-pad"]')
  // The sheet opens prefilled — clear it first so the typed value is exact.
  const value = await textOf(page, '[data-testid="budget-pad-value"]')
  if (value.replace(/[^\d]/g, '') !== '' && value.replace(/[^\d]/g, '') !== '0') {
    const digits = value.replace(/[^\d]/g, '').length
    for (let i = 0; i < digits; i += 1) {
      await click(page, '[data-testid="budget-pad"] [data-testid="numpad-back"]')
    }
  }
  await pressKeys(page, keys, '[data-testid="budget-pad"] ')
  await click(page, '[data-testid="budget-pad-done"]')
  await waitGone(page, '[data-testid="budget-pad"]')
}

async function gotoAnggaran(page) {
  await page.goto(`${BASE}/lainnya/anggaran`, { waitUntil: 'networkidle0' })
  await waitFor(page, '[data-testid="budget-list"]')
}

/** Add a budget through the real form. `uid` = null picks "· Semua". */
async function addBudget(page, { uid, keys }) {
  await gotoAnggaran(page)
  await click(page, '[data-testid="budget-add"]')
  await waitFor(page, '[data-testid="budget-form"]')
  await click(page, `[data-testid="budget-category-option-${uid ?? 'all'}"]`)
  await click(page, '[data-testid="budget-total-button"]')
  await setBudgetAmount(page, keys)
  await click(page, '[data-testid="budget-save"]')
  await waitGone(page, '[data-testid="budget-form"]')
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
    consoleErrors.push(`pageerror: ${e.name}: ${e.message}`)
  })

  try {
    // ---------------------------------------------------------------------
    console.log('\n▶ PRD-04: Pengaturan anggaran — daftar & tambah')
    await page.goto(`${BASE}/lainnya`, { waitUntil: 'networkidle0' })
    await test('TC-BUD-00: baris "Pengaturan anggaran" ada di Lainnya', async () => {
      await waitFor(page, '[data-testid="settings-item-anggaran"]')
      assert(
        await hasText(page, '[data-testid="settings-item-anggaran"]', 'Pengaturan anggaran'),
        'label wrong',
      )
      await click(page, '[data-testid="settings-item-anggaran"]')
      await waitFor(page, '[data-testid="budget-list"]')
      assert(page.url().endsWith('/lainnya/anggaran'), `wrong url ${page.url()}`)
    })

    await test('TC-BUD-01: empty state + teks bantuan', async () => {
      await waitFor(page, '[data-testid="budget-empty"]')
      assert(await hasText(page, '[data-testid="budget-empty"]', 'Tidak ada data'), 'empty text')
      assert(await exists(page, '[data-testid="budget-add"]'), 'add button missing')
      assert(await exists(page, '[data-testid="budget-back"]'), 'back button missing')
      assert(
        await hasText(page, '[data-testid="budget-list"]', 'tab transaksi'),
        'help text missing',
      )
    })

    await test('TC-BUD-02: tombol + membuka "Tambah anggaran"', async () => {
      await click(page, '[data-testid="budget-add"]')
      await waitFor(page, '[data-testid="budget-form"]')
      assert(
        await hasText(page, '[data-testid="budget-form"]', 'Tambah anggaran'),
        'title should be "Tambah anggaran"',
      )
      assert(
        (await textOf(page, '[data-testid="budget-category-value"]')) === 'Pilih kategori',
        'category should start empty',
      )
      assert((await amountOf(page, '[data-testid="budget-total-value"]')) === 0, 'total should be 0')
      assert(
        await hasText(page, '[data-testid="budget-category-option-all"]', '· Semua'),
        '"· Semua" option missing',
      )
      assert(
        await exists(page, `[data-testid="budget-category-option-${FOOD_UID}"]`),
        'default expense categories missing',
      )
    })

    await test('TC-BUD-16: Menyimpan tanpa kategori → "Silahkan pilih kategori"', async () => {
      await click(page, '[data-testid="budget-save"]')
      await waitFor(page, '[data-testid="budget-category-alert"]')
      assert(
        await hasText(page, '[data-testid="budget-category-alert"]', 'Silahkan pilih kategori'),
        'alert text wrong',
      )
      await click(page, '[data-testid="budget-category-alert-ok"]')
      await waitGone(page, '[data-testid="budget-category-alert"]')
      assert(await exists(page, '[data-testid="budget-form"]'), 'form should stay open')
    })

    await test('TC-BUD-03: pilih kategori "🍜 Food" → form terisi', async () => {
      await click(page, `[data-testid="budget-category-option-${FOOD_UID}"]`)
      assert(
        (await textOf(page, '[data-testid="budget-category-value"]')) === '🍜 Food',
        'category value should show the picked category',
      )
    })

    await test('TC-BUD-04/05: number pad muncul & format ribuan', async () => {
      await click(page, '[data-testid="budget-total-button"]')
      await waitFor(page, '[data-testid="budget-pad"]')
      assert(
        await exists(page, '[data-testid="budget-pad"] [data-testid="numpad-5"]'),
        'number pad keys missing',
      )
      await pressKeys(page, ['5', '0', '0', '0'], '[data-testid="budget-pad"] ')
      assert(
        (await textOf(page, '[data-testid="budget-pad-value"]')) === '5.000',
        `thousands format wrong: ${await textOf(page, '[data-testid="budget-pad-value"]')}`,
      )
    })

    await test('TC-BUD-06: "Selesai" menyimpan nilai & menutup pad', async () => {
      await click(page, '[data-testid="budget-pad-done"]')
      await waitGone(page, '[data-testid="budget-pad"]')
      assert(
        (await amountOf(page, '[data-testid="budget-total-value"]')) === 5000,
        'total should be 5.000',
      )
    })

    await test('TC-BUD-07: Menyimpan → item muncul di daftar', async () => {
      await click(page, '[data-testid="budget-save"]')
      await waitGone(page, '[data-testid="budget-form"]')
      await waitForRowCount(page, 1)
      const rows = await budgetRows(page)
      assert(rows[0].includes('🍜 Food'), `row name wrong: ${rows[0]}`)
      assert(rows[0].includes('5.000'), `row amount wrong: ${rows[0]}`)
    })

    await test('TC-BUD-08/09/10: detail bulanan — anggaran dasar + 12 bulan', async () => {
      await openBudget(page, '🍜 Food')
      await waitFor(page, '[data-testid="budget-monthly"]')
      assert(await hasText(page, '[data-testid="budget-monthly-title"]', '🍜 Food'), 'title wrong')
      assert((await amountOf(page, '[data-testid="budget-base-value"]')) === 5000, 'base wrong')
      assert(
        (await countOf(page, '[data-testid^="budget-month-row-"]')) === 12,
        'expected 12 month rows',
      )
      for (let m = 0; m < 12; m += 1) {
        const value = await amountOf(page, `[data-testid="budget-month-value-${m}"]`)
        assert(value === 5000, `month ${m} should be 5.000, got ${value}`)
      }
    })

    await test('TC-BUD-11: navigasi tahun ‹ ›', async () => {
      assert((await textOf(page, '[data-testid="budget-year"]')) === String(YEAR), 'year wrong')
      await click(page, '[data-testid="budget-year-prev"]')
      assert(
        (await textOf(page, '[data-testid="budget-year"]')) === String(YEAR - 1),
        'previous year failed',
      )
      assert(
        (await amountOf(page, `[data-testid="budget-month-value-${MONTH}"]`)) === 5000,
        'past year should follow the base budget',
      )
      await click(page, '[data-testid="budget-year-next"]')
      assert(
        (await textOf(page, '[data-testid="budget-year"]')) === String(YEAR),
        'next year failed',
      )
      await click(page, '[data-testid="budget-monthly-back"]')
      await waitGone(page, '[data-testid="budget-monthly"]')
      await waitFor(page, '[data-testid="budget-list"]')
    })

    // ---------------------------------------------------------------------
    console.log('\n▶ PRD-04: "Semua", duplikat & rollover')
    await test('TC-BUD-19: budget "· Semua" tampil sebagai "Total anggaran"', async () => {
      await click(page, '[data-testid="budget-add"]')
      await waitFor(page, '[data-testid="budget-form"]')
      await click(page, '[data-testid="budget-category-option-all"]')
      assert(
        (await textOf(page, '[data-testid="budget-category-value"]')).includes('Semua'),
        '"· Semua" should fill the category field',
      )
      await click(page, '[data-testid="budget-total-button"]')
      await setBudgetAmount(page, ['1', '0', '0', '0', '0'])
      await click(page, '[data-testid="budget-save"]')
      await waitGone(page, '[data-testid="budget-form"]')
      await waitForRowCount(page, 2)
      const rows = await budgetRows(page)
      const total = rows.find((text) => text.includes('Total anggaran'))
      assert(Boolean(total), `"Total anggaran" row missing: ${rows.join(' / ')}`)
      assert(total.includes('10.000'), `total amount wrong: ${total}`)
      assert(rows.indexOf(total) === 1, '"Total anggaran" should be listed last')
    })

    await test('TC-BUD-15/TC-BUD-20: duplikat kategori = override, hanya bulan berjalan', async () => {
      await click(page, '[data-testid="budget-add"]')
      await waitFor(page, '[data-testid="budget-form"]')
      await click(page, `[data-testid="budget-category-option-${FOOD_UID}"]`)
      await click(page, '[data-testid="budget-total-button"]')
      await setBudgetAmount(page, ['0'])
      await click(page, '[data-testid="budget-save"]')
      await waitGone(page, '[data-testid="budget-form"]')
      await waitForRowCount(page, 2)
      const rows = await budgetRows(page)
      const food = rows.filter((text) => text.includes('🍜 Food'))
      assert(food.length === 1, 'only one row per category (BR-05)')

      await openBudget(page, '🍜 Food')
      await waitFor(page, '[data-testid="budget-monthly"]')
      assert((await amountOf(page, '[data-testid="budget-base-value"]')) === 5000, 'base changed!')
      assert(
        (await amountOf(page, `[data-testid="budget-month-value-${MONTH}"]`)) === 0,
        'the month in view should hold the new value',
      )
      const other = MONTH === 0 ? 11 : MONTH - 1
      assert(
        (await amountOf(page, `[data-testid="budget-month-value-${other}"]`)) === 5000,
        'other months should keep the base value',
      )
    })

    await test('BR-01/BR-02: ubah "Anggaran dasar" → bulan berjalan tetap, bulan depan ikut', async () => {
      await click(page, '[data-testid="budget-base-row"]')
      await setBudgetAmount(page, ['6', '0', '0', '0'])
      assert(
        (await amountOf(page, '[data-testid="budget-base-value"]')) === 6000,
        'base should be 6.000',
      )
      assert(
        (await amountOf(page, `[data-testid="budget-month-value-${MONTH}"]`)) === 0,
        'current month override must survive a base change (BR-02)',
      )
      if (MONTH < 11) {
        assert(
          (await amountOf(page, `[data-testid="budget-month-value-${MONTH + 1}"]`)) === 6000,
          'next month should follow the new base (BR-01)',
        )
      }
    })

    await test('TC-BUD-18/12: hapus budget dengan konfirmasi TIDAK / YA', async () => {
      await click(page, '[data-testid="budget-delete"]')
      await waitFor(page, '[data-testid="confirm-dialog"]')
      assert(
        await hasText(page, '[data-testid="confirm-dialog"]', 'Apakah anda yakin ingin menghapusnya?'),
        'confirmation text wrong',
      )
      // TIDAK → batal
      await clickLabel(page, '[data-testid="confirm-dialog"]', 'TIDAK')
      await waitGone(page, '[data-testid="confirm-dialog"]')
      assert(await exists(page, '[data-testid="budget-monthly"]'), 'sheet should stay open')
      // YA → hapus
      await click(page, '[data-testid="budget-delete"]')
      await waitFor(page, '[data-testid="confirm-dialog"]')
      await clickLabel(page, '[data-testid="confirm-dialog"]', 'YA')
      await waitGone(page, '[data-testid="budget-monthly"]')
      await waitForRowCount(page, 1)
      const rows = await budgetRows(page)
      assert(!rows[0].includes('🍜 Food'), 'Food budget should be gone')
    })

    // ---------------------------------------------------------------------
    console.log('\n▶ PRD-04 §8.1: status anggaran di Tutup buku')
    await test('persiapan: buat anggaran Food 5.000 (bulan berjalan)', async () => {
      await addBudget(page, { uid: FOOD_UID, keys: ['5', '0', '0', '0'] })
      await waitForRowCount(page, 2)
    })

    await test('persiapan: catat pengeluaran Food 7.500 hari ini', async () => {
      await page.goto(`${BASE}/transaksi`, { waitUntil: 'networkidle0' })
      await waitFor(page, '[data-testid="trx-summary"]')
      await click(page, '[data-testid="trx-fab"]')
      await waitFor(page, '[data-testid="transaction-form"]')
      await pressKeys(page, ['7', '5', '0', '0'])
      await click(page, '[data-testid="trx-category-button"]')
      await waitFor(page, '[data-testid="category-picker"]')
      const picked = await page.evaluate(() => {
        const el = [...document.querySelectorAll('[data-testid^="category-option-"]')].find((n) =>
          n.textContent.includes('Food'),
        )
        if (!el) return false
        el.click()
        return true
      })
      assert(picked, 'Food category not found')
      await waitGone(page, '[data-testid="category-picker"]')
      await click(page, '[data-testid="trx-asset-button"]')
      await waitFor(page, '[data-testid="asset-picker"]')
      await click(page, '[data-testid="picker-option-ast_cash"]')
      await waitGone(page, '[data-testid="asset-picker"]')
      await click(page, '[data-testid="trx-save"]')
      await waitGone(page, '[data-testid="transaction-form"]')
    })

    await test('TC-BUD-21: baris Anggaran menampilkan realisasi & membuka rincian', async () => {
      await click(page, '[data-testid="trx-view-closebook"]')
      await waitFor(page, '[data-testid="close-book-view"]')
      const subtitle = await textOf(page, '[data-testid="close-book-budget-value"]')
      // "Total anggaran" (10.000) drives the headline figure of the month.
      assert(subtitle.includes('7.500'), `subtitle should show spending: ${subtitle}`)
      assert(subtitle.includes('10.000'), `subtitle should show the budget: ${subtitle}`)

      await click(page, '[data-testid="close-book-budget"]')
      await waitFor(page, '[data-testid="budget-notice"]')
      assert(
        (await countOf(page, '[data-testid^="budget-status-"]')) === 2,
        'budget status list should show both budgets',
      )
      const texts = await page.$$eval('[data-testid^="budget-status-"]', (els) =>
        els.map((el) => el.textContent),
      )
      const total = texts.find((t) => t.includes('Total anggaran'))
      assert(
        total?.includes('7.500') && total?.includes('10.000'),
        `total budget row wrong: ${total}`,
      )
      assert(total?.includes('Sisa'), `total budget should have a remainder: ${total}`)
      const food = texts.find((t) => t.includes('🍜 Food'))
      assert(food?.includes('Lebih'), `overspent budget should read "Lebih": ${food}`)
      assert(
        await exists(page, '[data-testid="budget-open-settings"]'),
        'link to the settings screen missing',
      )
    })

    // ---------------------------------------------------------------------
    await test('tidak ada error di console', async () => {
      const real = consoleErrors.filter((e) => !/favicon|DevTools|Download the React|404/i.test(e))
      assert(real.length === 0, `${real.length} console error(s):\n         ${real.join('\n         ')}`)
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
