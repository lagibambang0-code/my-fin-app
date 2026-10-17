/**
 * Real-browser UI test for the Memo module (PRD-11 sub-tab "Memo") using
 * Puppeteer, driving the real Next.js app and its IndexedDB (Dexie) storage.
 *
 * Run: pnpm test:ui:memo
 */
import { spawn } from 'node:child_process'
import puppeteer from 'puppeteer'

const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

const NOW = new Date()
const YEAR = NOW.getFullYear()
const MONTH = NOW.getMonth() // 0-based

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

async function setTextarea(page, selector, value) {
  await page.waitForSelector(selector, { timeout: 15000 })
  await page.$eval(
    selector,
    (el, val) => {
      el.focus()
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

/** uids of every memo row currently rendered, in DOM order. */
async function memoUids(page) {
  await waitFor(page, '[data-testid="memo-list"]')
  return page.$$eval('[data-testid^="memo-row-"]', (els) =>
    els.map((el) => el.getAttribute('data-testid').replace('memo-row-', '')),
  )
}

async function memoTexts(page) {
  return page.$$eval('[data-testid^="memo-row-"]', (els) => els.map((el) => el.textContent))
}

async function waitForMemoCount(page, n, timeout = 10000) {
  await page.waitForFunction(
    (count) => document.querySelectorAll('[data-testid^="memo-row-"]').length === count,
    { timeout },
    n,
  )
}

async function goToMemo(page) {
  await page.goto(`${BASE}/transaksi`, { waitUntil: 'networkidle0' })
  await waitFor(page, '[data-testid="trx-fab"]')
  await click(page, '[data-testid="trx-view-memo"]')
  await waitFor(page, '[data-testid="memo-list"]')
}

/** Open the memo form, fill it and save. Returns nothing (asserts success). */
async function addMemo(page, { title, content, date, colorIndex = 0, pinned = false }) {
  await click(page, '[data-testid="memo-fab"]')
  await waitFor(page, '[data-testid="memo-form"]')
  await setInput(page, '[data-testid="memo-title-input"]', title)
  if (content) await setTextarea(page, '[data-testid="memo-content-input"]', content)
  if (date) await setInput(page, '[data-testid="memo-date-input"]', date)
  if (colorIndex > 0) await click(page, `[data-testid="memo-color-${colorIndex}"]`)
  if (pinned) await click(page, '[data-testid="memo-pin-toggle"]')
  await click(page, '[data-testid="memo-save"]')
  await waitGone(page, '[data-testid="memo-form"]')
}

/** `YYYY-MM-DD` for a day inside a shifted month. */
function isoInMonth(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function monthLabel(year, month) {
  return `${MONTHS_SHORT[month]} ${year}`
}

const PREV_MONTH = MONTH === 0 ? 11 : MONTH - 1
const PREV_YEAR = MONTH === 0 ? YEAR - 1 : YEAR

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
    console.log('\n▶ PRD-11: sub-tab Memo — daftar & kosong')
    await goToMemo(page)

    await test('TC-MEMO-01: Memo kosong → "Tidak ada data"', async () => {
      await waitFor(page, '[data-testid="memo-empty"]')
      assert(
        await hasText(page, '[data-testid="transactions-empty"]', 'Tidak ada data'),
        'empty text missing',
      )
      assert(await exists(page, '[data-testid="memo-fab"]'), 'memo FAB missing')
      assert(
        await hasText(page, '[data-testid="memo-count"]', '0 memo'),
        'memo count should start at 0',
      )
    })

    console.log('\n▶ Tambah memo')
    await test('TC-MEMO-02: form kosong → peringatan, tidak tersimpan', async () => {
      await click(page, '[data-testid="memo-fab"]')
      await waitFor(page, '[data-testid="memo-form"]')
      await click(page, '[data-testid="memo-save"]')
      await waitFor(page, '[data-testid="memo-form-error"]')
      assert(await exists(page, '[data-testid="memo-form"]'), 'form must stay open')
      await click(page, '[data-testid="memo-form-back"]')
      await waitGone(page, '[data-testid="memo-form"]')
      assert((await countOf(page, '[data-testid^="memo-row-"]')) === 0, 'no memo saved')
    })

    await test('TC-MEMO-03: simpan memo (judul, isi, warna)', async () => {
      await addMemo(page, {
        title: 'Catatan uji',
        content: 'Bayar listrik bulan ini',
        colorIndex: 2,
      })
      await waitForMemoCount(page, 1)
      const [uid] = await memoUids(page)
      assert(
        await hasText(page, `[data-testid="memo-title-${uid}"]`, 'Catatan uji'),
        'title missing',
      )
      assert(
        await hasText(page, `[data-testid="memo-content-${uid}"]`, 'Bayar listrik'),
        'content missing',
      )
    })

    await test('TC-MEMO-04: tanggal & waktu memo tampil (17/10/26 · HH:MM)', async () => {
      const [uid] = await memoUids(page)
      const stamp = await textOf(page, `[data-testid="memo-date-${uid}"]`)
      const expectedDate = `${String(NOW.getDate()).padStart(2, '0')}/${String(MONTH + 1).padStart(2, '0')}/${String(YEAR % 100).padStart(2, '0')}`
      assert(stamp.includes(expectedDate), `date "${expectedDate}" missing from "${stamp}"`)
      assert(/·\s*\d{2}:\d{2}/.test(stamp), `time missing from "${stamp}"`)
      assert(await hasText(page, '[data-testid="memo-count"]', '1 memo'), 'count should be 1')
    })

    console.log('\n▶ Filter periode & sematan')
    await test('TC-MEMO-05: memo bulan lain hanya tampil di bulan itu', async () => {
      await addMemo(page, {
        title: 'Memo bulan lalu',
        content: 'Arsip',
        date: isoInMonth(PREV_YEAR, PREV_MONTH, 15),
      })
      // Saving outside the viewed month jumps the period to the memo's month.
      await page.waitForFunction(
        (label) =>
          document.querySelector('[data-testid="month-navigator-label"]')?.textContent.trim() ===
          label,
        { timeout: 10000 },
        monthLabel(PREV_YEAR, PREV_MONTH),
      )
      await waitForMemoCount(page, 1)
      const [uid] = await memoUids(page)
      assert(
        await hasText(page, `[data-testid="memo-title-${uid}"]`, 'Memo bulan lalu'),
        'previous-month memo missing',
      )

      // Back to the current month → only the first memo shows.
      await click(page, '[aria-label="Bulan selanjutnya"]')
      await page.waitForFunction(
        (label) =>
          document.querySelector('[data-testid="month-navigator-label"]')?.textContent.trim() ===
          label,
        { timeout: 10000 },
        monthLabel(YEAR, MONTH),
      )
      await waitForMemoCount(page, 1)
      const [current] = await memoUids(page)
      assert(
        await hasText(page, `[data-testid="memo-title-${current}"]`, 'Catatan uji'),
        'current-month memo missing',
      )
    })

    await test('TC-MEMO-06: sematkan memo → urutan berubah, pin tampil', async () => {
      await addMemo(page, { title: 'Memo kedua', content: 'Tanpa sematan' })
      await waitForMemoCount(page, 2)
      const before = await memoTexts(page)
      // Newest first while nothing is pinned.
      assert(before[0].includes('Memo kedua'), `unexpected order: ${before[0]}`)

      // Pin the *oldest* memo — it must float above the newer one.
      const uids = await memoUids(page)
      const newest = uids[0]
      const oldest = uids[uids.length - 1]
      await click(page, `[data-testid="memo-pin-${oldest}"]`)
      await page.waitForFunction(
        (uid) =>
          document
            .querySelectorAll('[data-testid^="memo-row-"]')[0]
            ?.getAttribute('data-testid') === `memo-row-${uid}`,
        { timeout: 10000 },
        oldest,
      )
      assert(await exists(page, `[data-testid="memo-pinned-${oldest}"]`), 'pin badge missing')

      // Unpin again → natural (newest first) order returns.
      await click(page, `[data-testid="memo-pin-${oldest}"]`)
      await page.waitForFunction(
        (uid) =>
          document
            .querySelectorAll('[data-testid^="memo-row-"]')[0]
            ?.getAttribute('data-testid') === `memo-row-${uid}`,
        { timeout: 10000 },
        newest,
      )
      assert(
        !(await exists(page, `[data-testid="memo-pinned-${oldest}"]`)),
        'pin badge must disappear',
      )
    })

    console.log('\n▶ Ubah & hapus')
    await test('TC-MEMO-07: buka memo → form terisi → ubah judul', async () => {
      const [uid] = await memoUids(page)
      await click(page, `[data-testid="memo-open-${uid}"]`)
      await waitFor(page, '[data-testid="memo-form"]')
      const title = await page.$eval('[data-testid="memo-title-input"]', (el) => el.value)
      assert(title === 'Memo kedua', `form not prefilled (got "${title}")`)
      await setInput(page, '[data-testid="memo-title-input"]', 'Memo kedua (diubah)')
      await click(page, '[data-testid="memo-save"]')
      await waitGone(page, '[data-testid="memo-form"]')
      await page.waitForFunction(
        (id) =>
          document
            .querySelector(`[data-testid="memo-title-${id}"]`)
            ?.textContent.includes('(diubah)'),
        { timeout: 10000 },
        uid,
      )
    })

    await test('TC-MEMO-08: hapus lewat mode ubah (TIDAK lalu YA)', async () => {
      await click(page, '[data-testid="memo-edit-toggle"]')
      await waitFor(page, '[data-testid="memo-delete-selected"]')
      const [uid] = await memoUids(page)
      await click(page, `[data-testid="memo-select-${uid}"]`)
      await click(page, '[data-testid="memo-delete-selected"]')
      await waitFor(page, '[data-testid="confirm-dialog"]')
      await clickLabel(page, '[data-testid="confirm-dialog"]', 'TIDAK')
      await waitGone(page, '[data-testid="confirm-dialog"]')
      assert((await countOf(page, '[data-testid^="memo-row-"]')) === 2, 'TIDAK must keep memos')

      await click(page, '[data-testid="memo-delete-selected"]')
      await waitFor(page, '[data-testid="confirm-dialog"]')
      await clickLabel(page, '[data-testid="confirm-dialog"]', 'YA')
      await waitGone(page, '[data-testid="confirm-dialog"]')
      await waitForMemoCount(page, 1)
      assert(!(await exists(page, `[data-testid="memo-row-${uid}"]`)), 'memo not deleted')
    })

    await test('TC-MEMO-09: hapus dari dalam form memo', async () => {
      const [uid] = await memoUids(page)
      await click(page, `[data-testid="memo-open-${uid}"]`)
      await waitFor(page, '[data-testid="memo-form"]')
      await click(page, '[data-testid="memo-delete"]')
      await waitFor(page, '[data-testid="confirm-dialog"]')
      await clickLabel(page, '[data-testid="confirm-dialog"]', 'YA')
      await waitGone(page, '[data-testid="memo-form"]')
      await waitFor(page, '[data-testid="memo-empty"]')
      assert(
        await hasText(page, '[data-testid="memo-count"]', '0 memo'),
        'count should be back to 0',
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
  console.error(err)
  stopServer()
  process.exit(1)
})
