/**
 * Real-browser UI test for the Statistik module (PRD-13) using Puppeteer.
 * Drives the actual Next.js app (client-side IndexedDB via Dexie) and covers the
 * scenarios in money-manager-clone/test-scenarios/TS-07-Tab-Statistik.md.
 *
 * Run: pnpm test:ui:statistik
 */
import { spawn } from 'node:child_process'
import puppeteer from 'puppeteer'

const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const toIso = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const NOW = new Date()
const TODAY_ISO = toIso(NOW)
const MONTH_LABEL = `${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][NOW.getMonth()]} ${NOW.getFullYear()}`

const DEFAULT_EXPENSE_UID = 'cat_exp_1' // 🍜 Food
const TRANSPORT_UID = 'cat_exp_4' // 🚖 Transport
const SALARY_UID = 'cat_inc_2' // 💰 Salary

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
  return (await textOf(page, selector)).includes(needle)
}

/** Numeric value of a currency-formatted field (e.g. "Rp 7.500" → 7500). */
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
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      setter.call(el, val)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
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

async function pressKeys(page, keys, scope = '') {
  for (const key of keys) {
    await click(page, `${scope}[data-testid="numpad-${key === '.' ? 'dot' : key}"]`)
  }
}

async function back(page, container) {
  await click(page, `${container} [aria-label="Kembali"]`)
}

async function gotoStatistik(page) {
  await page.goto(`${BASE}/statistik`, { waitUntil: 'networkidle0' })
  await waitFor(page, '[data-testid="stats-content"]')
}

async function gotoTransaksi(page) {
  await page.goto(`${BASE}/transaksi`, { waitUntil: 'networkidle0' })
  await waitFor(page, '[data-testid="trx-summary"]')
}

/** Open the mode picker (header, right side) and choose one of the 4 modes. */
async function pickMode(page, mode) {
  await click(page, '[data-testid="stats-mode-button"]')
  await waitFor(page, '[data-testid="stats-mode-picker"]')
  await click(page, `[data-testid="stats-mode-picker"] [data-testid="picker-option-${mode}"]`)
  await waitGone(page, '[data-testid="stats-mode-picker"]')
}

/** Horizontal drag on the statistics content; negative `deltaX` = finger→left. */
async function swipeStats(page, deltaX) {
  await page.evaluate((dx) => {
    const el = document.querySelector('[data-testid="stats-content"]')
    const rect = el.getBoundingClientRect()
    const y = Math.min(rect.top + 120, rect.bottom - 10)
    const x = rect.left + rect.width / 2
    const fire = (type, clientX) =>
      el.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX,
          clientY: y,
          pointerId: 11,
          pointerType: 'touch',
          isPrimary: true,
        }),
      )
    fire('pointerdown', x)
    fire('pointerup', x + dx)
  }, deltaX)
}

/** Number of category rows currently listed. */
async function rowCount(page) {
  return countOf(page, '[data-testid^="stats-row-"]')
}

async function pickAsset(page, buttonTestId, uid) {
  await click(page, `[data-testid="${buttonTestId}"]`)
  await waitFor(page, '[data-testid="asset-picker"]')
  await click(page, `[data-testid="picker-option-${uid}"]`)
  await waitGone(page, '[data-testid="asset-picker"]')
}

async function pickSubCategory(page, parentText, subText) {
  await click(page, '[data-testid="trx-category-button"]')
  await waitFor(page, '[data-testid="category-picker"]')
  await clickContaining(page, 'category-option-', parentText)
  await waitFor(page, `[data-testid="subcategory-option-${subText}"]`)
  await click(page, `[data-testid="subcategory-option-${subText}"]`)
  await waitGone(page, '[data-testid="category-picker"]')
}

async function pickCategory(page, text) {
  await click(page, '[data-testid="trx-category-button"]')
  await waitFor(page, '[data-testid="category-picker"]')
  await clickContaining(page, 'category-option-', text)
  await waitGone(page, '[data-testid="category-picker"]')
}

/**
 * Add one transaction through the real form.
 * `category` is `{ parent, sub }` (sub-category) or `{ parent }` (plain).
 */
async function addTransaction(page, { keys, type = 'expense', category, assetUid }) {
  await click(page, '[data-testid="trx-fab"]')
  await waitFor(page, '[data-testid="transaction-form"]')
  await pressKeys(page, keys)
  if (type === 'income') await click(page, '[data-testid="trx-type-income"]')
  if (category.sub) await pickSubCategory(page, category.parent, category.sub)
  else await pickCategory(page, category.parent)
  await pickAsset(page, 'trx-asset-button', assetUid)
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

  try {
    // ---------------------------------------------------------------------
    console.log('\n▶ TS-07: Tab Statistik — tampilan dasar')
    await gotoStatistik(page)

    await test('TC-NAV-STA-01: header, pemilih mode, toggle jenis, area laporan', async () => {
      assert(await exists(page, '[data-testid="month-navigator-label"]'), 'period nav missing')
      assert(await exists(page, '[data-testid="stats-mode-button"]'), 'mode picker missing')
      assert(await exists(page, '[data-testid="stats-type-income"]'), 'income toggle missing')
      assert(await exists(page, '[data-testid="stats-type-expense"]'), 'expense toggle missing')
      assert(await exists(page, '[data-testid="stats-total-income"]'), 'income total missing')
      assert(await exists(page, '[data-testid="stats-total-expense"]'), 'expense total missing')
      assert(await exists(page, '[data-testid="stats-empty"]'), 'empty state missing')
      assert(
        await hasText(page, '[data-testid="stats-empty"]', 'Tidak ada data'),
        'empty text missing',
      )
      assert((await amountOf(page, '[data-testid="stats-total-expense"]')) === 0, 'expense not 0')
      assert((await textOf(page, '[data-testid="month-navigator-label"]')) === MONTH_LABEL, 'month label')
    })

    await test('TC-STA-01: pemilih mode berisi 4 opsi', async () => {
      await click(page, '[data-testid="stats-mode-button"]')
      await waitFor(page, '[data-testid="stats-mode-picker"]')
      for (const [mode, label] of [
        ['weekly', 'Mingguan'],
        ['monthly', 'Bulanan'],
        ['yearly', 'Tahunan'],
        ['period', 'Periode'],
      ]) {
        assert(
          await exists(page, `[data-testid="stats-mode-picker"] [data-testid="picker-option-${mode}"]`),
          `mode option ${mode} missing`,
        )
        assert(
          await hasText(page, `[data-testid="stats-mode-picker"] [data-testid="picker-option-${mode}"]`, label),
          `mode option ${mode} label wrong`,
        )
      }
      await click(page, '[data-testid="stats-mode-picker"] [aria-label="Tutup"]')
      await waitGone(page, '[data-testid="stats-mode-picker"]')
    })

    await test('TC-STA-02: ganti ke Tahunan → judul periode jadi tahun', async () => {
      await pickMode(page, 'yearly')
      assert(
        (await textOf(page, '[data-testid="stats-mode-button"]')).includes('Tahunan'),
        'mode label not Tahunan',
      )
      assert(
        (await textOf(page, '[data-testid="month-navigator-label"]')).includes(String(NOW.getFullYear())),
        'year label missing',
      )
      await pickMode(page, 'monthly')
      assert(
        (await textOf(page, '[data-testid="stats-mode-button"]')).includes('Bulanan'),
        'mode label not Bulanan',
      )
    })

    await test('TC-STA-04: navigasi periode ◀ / ▶', async () => {
      const shift = (month) => {
        const index = NOW.getFullYear() * 12 + NOW.getMonth() + month
        return `${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][((index % 12) + 12) % 12]} ${Math.floor(index / 12)}`
      }
      await click(page, 'button[aria-label="Bulan sebelumnya"]')
      await waitFor(page, '[data-testid="stats-empty"]')
      assert(
        (await textOf(page, '[data-testid="month-navigator-label"]')) === shift(-1),
        'previous month label wrong',
      )
      await click(page, 'button[aria-label="Bulan selanjutnya"]')
      assert(
        (await textOf(page, '[data-testid="month-navigator-label"]')) === MONTH_LABEL,
        'next month should return to the current month',
      )
    })

    await test('TC-STA-E01: periode tanpa data → "Tidak ada data"', async () => {
      await click(page, 'button[aria-label="Bulan sebelumnya"]')
      await waitFor(page, '[data-testid="stats-empty"]')
      assert(
        await hasText(page, '[data-testid="stats-empty"]', 'Tidak ada data'),
        'empty text missing',
      )
      await click(page, 'button[aria-label="Bulan selanjutnya"]')
      await waitFor(page, '[data-testid="stats-empty"]')
    })

    // ---------------------------------------------------------------------
    console.log('\n▶ Data uji (sub kategori aktif + 3 transaksi)')
    await test('persiapan: aktifkan "Fungsi sub kategori"', async () => {
      await page.goto(`${BASE}/lainnya/kategori-pengeluaran`, { waitUntil: 'networkidle0' })
      await waitFor(page, '[data-testid="sub-toggle"]')
      await click(page, '[data-testid="sub-toggle"]')
      await waitFor(page, '[data-testid="sub-toggle-state"]')
      assert(
        (await textOf(page, '[data-testid="sub-toggle-state"]')) === 'Aktif',
        'sub toggle did not activate',
      )
    })

    await test('persiapan: catat 7.500 (Food/Lunch), 2.500 (Transport/Bus), 100.000 (Salary)', async () => {
      await gotoTransaksi(page)
      await addTransaction(page, {
        keys: ['7', '5', '0', '0'],
        category: { parent: '🍜 Food', sub: 'Lunch' },
        assetUid: 'ast_cash',
      })
      await addTransaction(page, {
        keys: ['2', '5', '0', '0'],
        category: { parent: '🚖 Transport', sub: 'Bus' },
        assetUid: 'ast_cash',
      })
      await addTransaction(page, {
        keys: ['1', '0', '0', '0', '0', '0'],
        type: 'income',
        category: { parent: '💰 Salary' },
        assetUid: 'ast_accounts',
      })
      assert(
        (await countOf(page, '[data-testid^="tx-row-"]')) === 3,
        'three transactions should be listed',
      )
    })

    // ---------------------------------------------------------------------
    console.log('\n▶ Laporan')
    await gotoStatistik(page)

    await test('TC-STA-05: laporan pengeluaran per kategori (chart + daftar)', async () => {
      await waitFor(page, '[data-testid="stats-chart"]')
      assert((await rowCount(page)) === 2, `expected 2 category rows, got ${await rowCount(page)}`)
      const foodAmount = await amountOf(page, `[data-testid="stats-amount-${DEFAULT_EXPENSE_UID}"]`)
      const transportAmount = await amountOf(page, `[data-testid="stats-amount-${TRANSPORT_UID}"]`)
      assert(foodAmount === 7500, `Food should be 7.500, got ${foodAmount}`)
      assert(transportAmount === 2500, `Transport should be 2.500, got ${transportAmount}`)
      assert(
        (await textOf(page, `[data-testid="stats-percent-${DEFAULT_EXPENSE_UID}"]`)) === '75%',
        'Food ratio should be 75%',
      )
      assert(
        (await textOf(page, `[data-testid="stats-percent-${TRANSPORT_UID}"]`)) === '25%',
        'Transport ratio should be 25%',
      )
      assert(
        await hasText(page, `[data-testid="stats-bar-${DEFAULT_EXPENSE_UID}"]`, '🍜 Food'),
        'bar chart label missing',
      )
      assert((await amountOf(page, '[data-testid="stats-total-expense"]')) === 10000, 'expense total')
      assert((await amountOf(page, '[data-testid="stats-total-income"]')) === 100000, 'income total')
    })

    await test('TC-STA-06: transaksi ber-sub dihitung pada kategori induk', async () => {
      assert(
        await exists(page, `[data-testid="stats-row-${DEFAULT_EXPENSE_UID}"]`),
        'parent category row missing',
      )
      const names = await page.$$eval('[data-testid^="stats-row-"]', (els) =>
        els.map((el) => el.textContent),
      )
      assert(
        !names.some((text) => text.includes('Lunch')),
        `sub-category should roll up to its parent, got ${names.join(' / ')}`,
      )
    })

    await test('TC-STA-07: rasio tiap kategori dihitung & jumlahnya 100%', async () => {
      const ratios = await page.$$eval('[data-testid^="stats-percent-"]', (els) =>
        els.map((el) => Number(el.textContent.replace('%', ''))),
      )
      const sum = ratios.reduce((acc, value) => acc + value, 0)
      assert(sum === 100, `ratios should total 100%, got ${sum} (${ratios.join(', ')})`)
    })

    await test('TC-STA-03: toggle Pendapatan / Pengeluaran', async () => {
      await click(page, '[data-testid="stats-type-income"]')
      await waitFor(page, `[data-testid="stats-row-${SALARY_UID}"]`)
      assert((await rowCount(page)) === 1, 'income report should list only Salary')
      assert(
        (await textOf(page, `[data-testid="stats-percent-${SALARY_UID}"]`)) === '100%',
        'Salary ratio should be 100%',
      )
      assert(
        (await amountOf(page, `[data-testid="stats-amount-${SALARY_UID}"]`)) === 100000,
        'Salary amount wrong',
      )
      await click(page, '[data-testid="stats-type-expense"]')
      await waitFor(page, `[data-testid="stats-row-${DEFAULT_EXPENSE_UID}"]`)
      assert((await rowCount(page)) === 2, 'expense report should list 2 categories')
    })

    await test('TC-STA-E02: jenis tanpa data → "Tidak ada data"', async () => {
      await click(page, 'button[aria-label="Bulan sebelumnya"]')
      await click(page, '[data-testid="stats-type-income"]')
      await waitFor(page, '[data-testid="stats-empty"]')
      assert(
        await hasText(page, '[data-testid="stats-empty"]', 'Tidak ada data'),
        'empty text missing',
      )
      await click(page, '[data-testid="stats-type-expense"]')
      await click(page, 'button[aria-label="Bulan selanjutnya"]')
      await waitFor(page, '[data-testid="stats-chart"]')
    })

    await test('TC-STA-02b: mode Tahunan mencakup transaksi bulan berjalan', async () => {
      await pickMode(page, 'yearly')
      await waitFor(page, '[data-testid="stats-chart"]')
      assert((await amountOf(page, '[data-testid="stats-total-expense"]')) === 10000, 'expense total')
      assert((await rowCount(page)) === 2, 'year report should list 2 categories')
      await pickMode(page, 'monthly')
      await waitFor(page, '[data-testid="stats-chart"]')
    })

    await test('TC-STA-E04 (Mingguan): judul berupa rentang tanggal pekan', async () => {
      await pickMode(page, 'weekly')
      await waitFor(page, '[data-testid="stats-period-label"]')
      const label = await textOf(page, '[data-testid="stats-period-label"]')
      assert(
        /^\d{2}\.\d{2}\.\d{2} ~ \d{2}\.\d{2}\.\d{2}$/.test(label),
        `weekly label should be a dot range, got "${label}"`,
      )
      const startOfWeek = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate())
      const day = startOfWeek.getDay()
      startOfWeek.setDate(startOfWeek.getDate() + (day === 0 ? -6 : 1 - day))
      const expected = `${String(startOfWeek.getDate()).padStart(2, '0')}.${String(startOfWeek.getMonth() + 1).padStart(2, '0')}.${String(startOfWeek.getFullYear()).slice(-2)}`
      assert(label.startsWith(expected), `weekly range should start ${expected}, got "${label}"`)
      assert(
        (await amountOf(page, '[data-testid="stats-total-expense"]')) === 10000,
        'weekly expense total should include today',
      )
    })

    await test('TC-STA-E04 (Periode): dua tanggal dapat dipilih', async () => {
      await pickMode(page, 'period')
      await waitFor(page, '[data-testid="stats-period-button"]')
      assert(
        (await textOf(page, '[data-testid="stats-period-button"]')).includes('~'),
        'period label should show two dates',
      )
      await click(page, '[data-testid="stats-period-button"]')
      await waitFor(page, '[data-testid="stats-period-sheet"]')
      await setInput(page, '[data-testid="stats-period-from"]', '2020-01-01')
      await setInput(page, '[data-testid="stats-period-to"]', '2020-01-31')
      await click(page, '[data-testid="stats-period-apply"]')
      await waitGone(page, '[data-testid="stats-period-sheet"]')
      await waitFor(page, '[data-testid="stats-empty"]')
      assert(
        await hasText(page, '[data-testid="stats-period-button"]', '01/01/20'),
        'period label should follow the picked dates',
      )

      await click(page, '[data-testid="stats-period-button"]')
      await waitFor(page, '[data-testid="stats-period-sheet"]')
      await setInput(page, '[data-testid="stats-period-from"]', TODAY_ISO)
      await setInput(page, '[data-testid="stats-period-to"]', TODAY_ISO)
      await click(page, '[data-testid="stats-period-apply"]')
      await waitGone(page, '[data-testid="stats-period-sheet"]')
      await waitFor(page, '[data-testid="stats-chart"]')
      assert((await amountOf(page, '[data-testid="stats-total-expense"]')) === 10000, 'period total')
    })

    await test('TC-STA-E03: tap baris kategori → detail (total, sub, chart, transaksi)', async () => {
      await pickMode(page, 'monthly')
      await waitFor(page, `[data-testid="stats-row-${DEFAULT_EXPENSE_UID}"]`)
      await click(page, `[data-testid="stats-row-${DEFAULT_EXPENSE_UID}"]`)
      await waitFor(page, '[data-testid="stats-detail"]')
      assert(
        (await textOf(page, '[data-testid="stats-detail-title"]')).includes('🍜 Food'),
        'detail title wrong',
      )
      assert(
        await hasText(page, '[data-testid="stats-detail"]', 'Total bulanan'),
        'total row label missing',
      )
      assert((await amountOf(page, '[data-testid="stats-detail-total"]')) === 7500, 'detail total')
      assert(
        await hasText(page, '[data-testid="stats-detail-sub-all"]', 'Semua'),
        '"Semua" row missing',
      )
      const subText = await textOf(page, '[data-testid="stats-detail-sub-all"]')
      assert(subText.includes('100%') && subText.includes('7.500'), `"Semua" row wrong: ${subText}`)
      const subRows = await page.$$eval('[data-testid^="stats-detail-sub-"]', (els) =>
        els.map((el) => el.textContent),
      )
      assert(
        subRows.some((text) => text.includes('Lunch') && text.includes('7.500')),
        `sub-category row "Lunch" missing: ${subRows.join(' / ')}`,
      )
      assert((await countOf(page, '[data-testid^="stats-detail-bar-"]')) === 8, 'chart need 8 months')
      assert(
        (await countOf(page, '[data-testid^="tx-row-"]')) === 1,
        'detail should list the transactions',
      )

      // Row → edit form
      await click(page, '[data-testid^="tx-row-"]')
      await waitFor(page, '[data-testid="transaction-form"]')
      assert(
        (await textOf(page, '[data-testid="trx-amount-display"]')).includes('7.500'),
        'form should be prefilled with the transaction',
      )
      await click(page, '[data-testid="trx-form-back"]')
      await waitGone(page, '[data-testid="transaction-form"]')

      await back(page, '[data-testid="stats-detail"]')
      await waitGone(page, '[data-testid="stats-detail"]')
      await waitFor(page, '[data-testid="stats-chart"]')
    })

    await test('geser (swipe) mengubah periode', async () => {
      const label = () => textOf(page, '[data-testid="month-navigator-label"]')
      const start = await label()
      await click(page, '[aria-label="Bulan sebelumnya"]')
      const previous = await label()
      await click(page, '[aria-label="Bulan selanjutnya"]')
      assert((await label()) === start, 'arrows did not return to the starting period')

      const swipe = (deltaX) =>
        page.evaluate((dx) => {
          const el = document.querySelector('[data-testid="stats-content"]')
          const rect = el.getBoundingClientRect()
          const y = Math.min(rect.top + 120, rect.bottom - 10)
          const x = rect.left + rect.width / 2
          const fire = (type, clientX) =>
            el.dispatchEvent(
              new PointerEvent(type, {
                bubbles: true,
                cancelable: true,
                clientX,
                clientY: y,
                pointerId: 11,
                pointerType: 'touch',
                isPrimary: true,
              }),
            )
          fire('pointerdown', x)
          fire('pointerup', x + dx)
        }, deltaX)

      const waitForLabel = (expected) =>
        page.waitForFunction(
          (value) =>
            document.querySelector('[data-testid="month-navigator-label"]')?.textContent.trim() ===
            value,
          { timeout: 8000 },
          expected,
        )

      // Sama seperti tab Transaksi: geser kiri mundur, geser kanan maju.
      await swipe(-120)
      await waitForLabel(previous)
      await swipe(120)
      await waitForLabel(start)
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
