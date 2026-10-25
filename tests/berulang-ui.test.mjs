/**
 * Real-browser UI test for the recurring-transactions module (PRD-05) using
 * Puppeteer. Covers the verified UI behaviours (TC-REP-*) plus the execution
 * engine that writes due occurrences into the Transaksi tab (§8.2).
 *
 * Run: pnpm test:ui:berulang
 */
import { spawn } from 'node:child_process'
import puppeteer from 'puppeteer'

const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const NOW = new Date()
const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
]
const FOOD_UID = 'cat_exp_1' // 🍜 Food
const TRANSPORT_UID = 'cat_exp_4' // 🚖 Transport

/** Seed date for every series: end of January, so February needs a clamp. */
const SEED_DATE = '2026-01-31'

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
    await click(
      page,
      goBack ? '[data-testid="date-picker-prev-month"]' : '[data-testid="date-picker-next-month"]',
    )
  }

  await click(page, `[data-testid="date-picker-day-${iso}"]`)
  await waitGone(page, '[data-testid="date-picker-sheet"]')
}

async function pressKeys(page, keys) {
  for (const key of keys) {
    await click(page, `[data-testid="numpad-${key === '.' ? 'dot' : key}"]`)
  }
}

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

/** Month label used by the transaction header ("Okt 2026"). */
function monthLabel(year, month) {
  return `${MONTHS_SHORT[((month % 12) + 12) % 12]} ${year + Math.floor(month / 12)}`
}

/** "Feb 2026" → 24322, so the navigator can be stepped in either direction. */
function monthIndex(label) {
  const [short, year] = label.split(' ')
  return Number(year) * 12 + MONTHS_SHORT.indexOf(short)
}

/** Step the Transaksi period until `label` is shown (either direction). */
async function gotoMonth(page, label) {
  const target = monthIndex(label)
  for (let i = 0; i < 80; i += 1) {
    const current = await textOf(page, '[data-testid="month-navigator-label"]')
    if (current === label) return
    const direction = monthIndex(current) > target ? 'sebelumnya' : 'selanjutnya'
    await click(page, `button[aria-label="Bulan ${direction}"]`)
    await page.waitForFunction(
      (prev) =>
        document.querySelector('[data-testid="month-navigator-label"]')?.textContent.trim() !==
        prev,
      { timeout: 8000 },
      current,
    )
  }
  const reached = await textOf(page, '[data-testid="month-navigator-label"]')
  throw new Error(`month ${label} not reached (at ${reached})`)
}

async function pickCategory(page, text) {
  await click(page, '[data-testid="trx-category-button"]')
  await waitFor(page, '[data-testid="category-picker"]')
  const ok = await page.evaluate((needle) => {
    const el = [...document.querySelectorAll('[data-testid^="category-option-"]')].find((n) =>
      n.textContent.includes(needle),
    )
    if (!el) return false
    el.click()
    return true
  }, text)
  assert(ok, `category "${text}" not found`)
  await waitGone(page, '[data-testid="category-picker"]')
}

async function pickAsset(page, uid) {
  await click(page, '[data-testid="trx-asset-button"]')
  await waitFor(page, '[data-testid="asset-picker"]')
  await click(page, `[data-testid="picker-option-${uid}"]`)
  await waitGone(page, '[data-testid="asset-picker"]')
}

/** Create a recurring series through the real form (frequency picked first). */
async function addRecurring(page, { frequencyIndex, keys, category, uid, amount }) {
  await page.goto(`${BASE}/lainnya/berulang`, { waitUntil: 'networkidle0' })
  await waitFor(page, '[data-testid="repeat-settings"]')
  await click(page, '[data-testid="repeat-add"]')
  await waitFor(page, '[data-testid="repeat-type-screen"]')
  await click(page, `[data-testid="repeat-option-${frequencyIndex}"]`)
  await waitFor(page, '[data-testid="transaction-form"]')
  await pressKeys(page, keys)
  await pickDate(page, SEED_DATE)
  await pickCategory(page, category)
  await pickAsset(page, uid)
  await click(page, '[data-testid="trx-save"]')
  await waitGone(page, '[data-testid="transaction-form"]')
  assert(amount > 0, 'amount helper argument unused')
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
    console.log('\n▶ PRD-05: Kelola berulang — layar & waktu peninjauan')
    await page.goto(`${BASE}/lainnya`, { waitUntil: 'networkidle0' })
    await test('TC-REP-00: baris "Kelola berulang" ada di Lainnya', async () => {
      await waitFor(page, '[data-testid="settings-item-berulang"]')
      assert(
        await hasText(page, '[data-testid="settings-item-berulang"]', 'Kelola berulang'),
        'label wrong',
      )
      await click(page, '[data-testid="settings-item-berulang"]')
      await waitFor(page, '[data-testid="repeat-settings"]')
      assert(page.url().endsWith('/lainnya/berulang'), `wrong url ${page.url()}`)
    })

    await test('TC-REP-01: teks bantuan, baris pengaturan, tombol +', async () => {
      assert(
        await hasText(page, '[data-testid="repeat-settings"]', 'Bagaimana cara mengatur transaksi berulang?'),
        'help question missing',
      )
      assert(
        await hasText(page, '[data-testid="repeat-settings"]', 'ikon daur ulang (Rep/Inst.)'),
        'help text missing',
      )
      assert(
        await hasText(page, '[data-testid="repeat-review-row"]', 'Waktu peninjauan ulang'),
        'setting row missing',
      )
      assert(await exists(page, '[data-testid="repeat-add"]'), 'add button missing')
    })

    await test('TC-REP-02/03: dialog 2 opsi, default "Tanggal yang bersangkutan"', async () => {
      assert(
        (await textOf(page, '[data-testid="repeat-review-value"]')) === 'Tanggal yang bersangkutan',
        'default review value wrong',
      )
      await click(page, '[data-testid="repeat-review-row"]')
      await waitFor(page, '[data-testid="repeat-review-sheet"]')
      assert(
        await exists(page, '[data-testid="repeat-review-option-actual_date"]'),
        'option 1 missing',
      )
      assert(
        await exists(page, '[data-testid="repeat-review-option-first_of_month"]'),
        'option 2 missing',
      )
      assert(
        await hasText(page, '[data-testid="repeat-review-option-first_of_month"]', 'Hari pertama setiap bulan'),
        'option 2 label wrong',
      )
    })

    await test('TC-REP-04/05: pilih "Hari pertama" → konfirmasi, TIDAK membatalkan', async () => {
      await click(page, '[data-testid="repeat-review-option-first_of_month"]')
      await waitFor(page, '[data-testid="confirm-dialog"]')
      const description = await textOf(page, '[data-testid="confirm-dialog"]')
      assert(
        description.includes('diterapkan pada hari pertama setiap bulan'),
        `confirmation text wrong: ${description}`,
      )
      assert(
        /hingga \d{2}\/\d{2} direfleksikan di awal/.test(description),
        `confirmation should mention the last day of the month: ${description}`,
      )
      await clickLabel(page, '[data-testid="confirm-dialog"]', 'TIDAK')
      await waitGone(page, '[data-testid="confirm-dialog"]')
      assert(await exists(page, '[data-testid="repeat-review-sheet"]'), 'options dialog should stay')
      assert(
        (await textOf(page, '[data-testid="repeat-review-value"]')) === 'Tanggal yang bersangkutan',
        'TIDAK must not change the stored value',
      )
    })

    await test('TC-REP-06/07: YA menerapkan & label ikut berubah', async () => {
      await click(page, '[data-testid="repeat-review-option-first_of_month"]')
      await waitFor(page, '[data-testid="confirm-dialog"]')
      await clickLabel(page, '[data-testid="confirm-dialog"]', 'YA')
      await waitGone(page, '[data-testid="confirm-dialog"]')
      await waitGone(page, '[data-testid="repeat-review-sheet"]')
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-testid="repeat-review-value"]')
            ?.textContent.includes('Hari pertama setiap bulan'),
        { timeout: 8000 },
      )
      // NFR-01: pilihan tersimpan (bertahan setelah reload).
      await page.reload({ waitUntil: 'networkidle0' })
      await waitFor(page, '[data-testid="repeat-review-value"]')
      assert(
        (await textOf(page, '[data-testid="repeat-review-value"]')) === 'Hari pertama setiap bulan',
        'review mode should persist',
      )
    })

    await test('TC-REP-13: kembali ke "Tanggal yang bersangkutan" tanpa konfirmasi', async () => {
      await click(page, '[data-testid="repeat-review-row"]')
      await waitFor(page, '[data-testid="repeat-review-sheet"]')
      await click(page, '[data-testid="repeat-review-option-actual_date"]')
      await waitGone(page, '[data-testid="repeat-review-sheet"]')
      assert(!(await exists(page, '[data-testid="confirm-dialog"]')), 'no confirmation expected')
      assert(
        (await textOf(page, '[data-testid="repeat-review-value"]')) === 'Tanggal yang bersangkutan',
        'switching back should apply immediately',
      )
    })

    await test('TC-REP-08/09: tombol + membuka daftar 14 frekuensi', async () => {
      await click(page, '[data-testid="repeat-add"]')
      await waitFor(page, '[data-testid="repeat-type-screen"]')
      assert(await hasText(page, '[data-testid="repeat-type-screen"]', 'Ulang'), 'header wrong')
      const labels = await page.$$eval('[data-testid^="repeat-option-"]', (els) =>
        els.map((el) => el.textContent.trim()),
      )
      assert(labels.length === 14, `expected 14 frequencies, got ${labels.length}`)
      const expected = [
        'Tidak ada',
        'Setiap hari',
        'Hari biasa',
        'Akhir pekan',
        'Setiap minggu',
        'Setiap 2 minggu',
        'Setiap 4 minggu',
        'Setiap bulan',
        'Akhir bulan',
        'Setiap 2 bulan',
        'Setiap 3 bulan',
        'Setiap 4 bulan',
        'Setiap 6 bulan',
        'Setiap 1 tahun',
      ]
      assert(
        JSON.stringify(labels) === JSON.stringify(expected),
        `frequency labels wrong: ${labels.join(' / ')}`,
      )
    })

    // ---------------------------------------------------------------------
    console.log('\n▶ PRD-05 §8.2: eksekusi transaksi berulang')
    await test('TC-REP-10/11: pilih "Setiap bulan" → form transaksi ber-flag frekuensi', async () => {
      await click(page, '[data-testid="repeat-option-7"]')
      await waitFor(page, '[data-testid="transaction-form"]')
      assert(
        (await textOf(page, '[data-testid="trx-recurring-value"]')) === 'Setiap bulan',
        'form should show the picked frequency',
      )
      await pressKeys(page, ['1', '0', '0', '0', '0', '0'])
      await pickDate(page, SEED_DATE)
      await pickCategory(page, '🍜 Food')
      await pickAsset(page, 'ast_cash')
      await click(page, '[data-testid="trx-save"]')
      await waitGone(page, '[data-testid="transaction-form"]')
    })

    await test('mesin: occurrence bulanan digenerate dengan clamp akhir bulan', async () => {
      await page.goto(`${BASE}/transaksi`, { waitUntil: 'networkidle0' })
      await waitFor(page, '[data-testid="trx-summary"]')
      // Seed (31/01) tetap ada sebagai transaksi biasa.
      await gotoMonth(page, monthLabel(2026, 0))
      await waitFor(page, '[data-testid="day-group-2026-01-31"]')

      // Jan 31 + 1 bulan = 28 Feb (2026 bukan kabisat) — bukan 3 Mar.
      await gotoMonth(page, monthLabel(2026, 1))
      await waitFor(page, '[data-testid="day-group-2026-02-28"]')
      assert(
        (await countOf(page, '[data-testid="day-group-2026-02-28"] [data-testid^="tx-row-"]')) === 1,
        'February should hold exactly one generated row',
      )
      assert(
        !(await exists(page, '[data-testid="day-group-2026-03-01"]')),
        'a naive +1 month would spill into March',
      )
      const rowText = await textOf(
        page,
        '[data-testid="day-group-2026-02-28"] [data-testid^="tx-row-"]',
      )
      assert(rowText.includes('🍜 Food'), `generated row should keep the category: ${rowText}`)
      assert(rowText.includes('100.000'), `generated row should keep the amount: ${rowText}`)

      // Generasi berulang bersifat idempoten (NFR-02).
      await page.reload({ waitUntil: 'networkidle0' })
      await gotoMonth(page, monthLabel(2026, 1))
      assert(
        (await countOf(page, '[data-testid="day-group-2026-02-28"] [data-testid^="tx-row-"]')) === 1,
        'reloading must not duplicate generated rows',
      )
    })

    await test('BR-03/EC-03: mode "Hari pertama" → occurrence dibukukan tanggal 1', async () => {
      // Setel mode lebih dulu, lalu buat series kedua.
      await page.goto(`${BASE}/lainnya/berulang`, { waitUntil: 'networkidle0' })
      await waitFor(page, '[data-testid="repeat-review-row"]')
      await click(page, '[data-testid="repeat-review-row"]')
      await waitFor(page, '[data-testid="repeat-review-sheet"]')
      await click(page, '[data-testid="repeat-review-option-first_of_month"]')
      await waitFor(page, '[data-testid="confirm-dialog"]')
      await clickLabel(page, '[data-testid="confirm-dialog"]', 'YA')
      await waitGone(page, '[data-testid="confirm-dialog"]')

      await addRecurring(page, {
        frequencyIndex: 7,
        keys: ['5', '0', '0', '0', '0'],
        category: '🚖 Transport',
        uid: 'ast_cash',
        amount: 50000,
      })

      await page.goto(`${BASE}/transaksi`, { waitUntil: 'networkidle0' })
      await waitFor(page, '[data-testid="trx-summary"]')
      await gotoMonth(page, monthLabel(2026, 1))
      // Series kedua jatuh tempo 28 Feb → dibukukan 01 Feb.
      await waitFor(page, '[data-testid="day-group-2026-02-01"]')
      const firstOfMonth = await textOf(
        page,
        '[data-testid="day-group-2026-02-01"] [data-testid^="tx-row-"]',
      )
      assert(
        firstOfMonth.includes('🚖 Transport'),
        `01/02 should hold the Transport occurrence: ${firstOfMonth}`,
      )
      // Series pertama (mode tanggal asli) tidak berpindah.
      assert(
        (await countOf(page, '[data-testid="day-group-2026-02-28"] [data-testid^="tx-row-"]')) === 1,
        'already-materialised rows must stay put',
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
