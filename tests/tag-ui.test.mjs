/**
 * Real-browser UI test for the Tag module (TAG + TX_TAG) using Puppeteer,
 * driving the real Next.js app and its IndexedDB (Dexie) storage.
 *
 * Run: pnpm test:ui:tag
 */
import { spawn } from 'node:child_process'
import puppeteer from 'puppeteer'

const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const PREPAYMENT = 'system_prepayment'
const EXCEPTION = 'system_card_usage_exception'

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

async function pressKeys(page, keys) {
  for (const key of keys) {
    await click(page, `[data-testid="numpad-${key === '.' ? 'dot' : key}"]`)
  }
}

async function waitForTagCount(page, n, timeout = 10000) {
  await page.waitForFunction(
    (count) => document.querySelectorAll('[data-testid^="tag-row-"]').length === count,
    { timeout },
    n,
  )
}

async function tagNames(page) {
  return page.$$eval('[data-testid^="tag-name-"]', (els) => els.map((el) => el.textContent.trim()))
}

async function gotoTagSettings(page) {
  await page.goto(`${BASE}/lainnya/tag`, { waitUntil: 'networkidle0' })
  await waitFor(page, '[data-testid="tag-list"]')
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
    console.log('\n▶ Tag: entri di Lainnya & tag bawaan')
    await test('TC-TAG-01: "Kelola tag" + 2 tag sistem (Prepayment, Exception)', async () => {
      await page.goto(`${BASE}/lainnya`, { waitUntil: 'networkidle0' })
      await waitFor(page, '[data-testid="settings-item-tag"]')
      assert(
        await hasText(page, '[data-testid="settings-item-tag"]', 'Kelola tag'),
        'label wrong',
      )
      await click(page, '[data-testid="settings-item-tag"]')
      await waitFor(page, '[data-testid="tag-list"]')
      assert(page.url().endsWith('/lainnya/tag'), `wrong url ${page.url()}`)
      await waitForTagCount(page, 2)
      const names = await tagNames(page)
      assert(names.includes('Prepayment'), `Prepayment missing (${names.join(', ')})`)
      assert(names.includes('Exception'), `Exception missing (${names.join(', ')})`)
      assert(
        await hasText(page, `[data-testid="tag-name-${PREPAYMENT}"]`, 'Prepayment'),
        'system uid Prepayment wrong',
      )
      assert(
        await exists(page, `[data-testid="tag-row-${EXCEPTION}"]`),
        'system uid Exception wrong',
      )
    })

    console.log('\n▶ CRUD & urutan tag')
    await test('TC-TAG-02: tambah tag baru + tolak nama kembar', async () => {
      await gotoTagSettings(page)
      await setInput(page, '[data-testid="tag-new-input"]', 'Liburan')
      await click(page, '[data-testid="tag-add"]')
      await waitForTagCount(page, 3)
      assert((await tagNames(page)).includes('Liburan'), 'new tag missing')

      // Duplicate name (case-insensitive) must be rejected.
      await setInput(page, '[data-testid="tag-new-input"]', 'liburan')
      await click(page, '[data-testid="tag-add"]')
      await waitFor(page, '[data-testid="tag-error"]')
      assert(
        await hasText(page, '[data-testid="tag-error"]', 'sudah ada'),
        'duplicate warning missing',
      )
      assert((await countOf(page, '[data-testid^="tag-row-"]')) === 3, 'duplicate must not be added')
      await setInput(page, '[data-testid="tag-new-input"]', '')
    })

    await test('TC-TAG-03: ubah nama tag', async () => {
      await gotoTagSettings(page)
      const rows = await page.$$eval('[data-testid^="tag-row-"]', (els) =>
        els.map((el) => el.getAttribute('data-testid').replace('tag-row-', '')),
      )
      const uid = rows[rows.length - 1]
      await click(page, `[data-testid="tag-edit-${uid}"]`)
      await setInput(page, `[data-testid="tag-rename-input-${uid}"]`, 'Liburan 2026')
      await click(page, `[data-testid="tag-rename-save-${uid}"]`)
      await page.waitForFunction(
        (id) =>
          document.querySelector(`[data-testid="tag-name-${id}"]`)?.textContent.trim() ===
          'Liburan 2026',
        { timeout: 10000 },
        uid,
      )
    })

    await test('TC-TAG-04: urutkan tag (naik/turun)', async () => {
      await gotoTagSettings(page)
      const before = await tagNames(page)
      assert(before[before.length - 1] === 'Liburan 2026', `unexpected tail: ${before.at(-1)}`)
      const rows = await page.$$eval('[data-testid^="tag-row-"]', (els) =>
        els.map((el) => el.getAttribute('data-testid').replace('tag-row-', '')),
      )
      const last = rows[rows.length - 1]

      const waitForOrder = (expected) =>
        page.waitForFunction(
          (names) =>
            JSON.stringify(
              [...document.querySelectorAll('[data-testid^="tag-name-"]')].map((el) =>
                el.textContent.trim(),
              ),
            ) === JSON.stringify(names),
          { timeout: 10000 },
          expected,
        )

      // Naik satu posisi, lalu turun lagi → urutan kembali seperti semula.
      const raised = [...before]
      ;[raised[raised.length - 1], raised[raised.length - 2]] = [
        raised[raised.length - 2],
        raised[raised.length - 1],
      ]
      await click(page, `[data-testid="tag-up-${last}"]`)
      await waitForOrder(raised)

      await click(page, `[data-testid="tag-down-${last}"]`)
      await waitForOrder(before)
    })

    console.log('\n▶ Tag pada form transaksi (TX_TAG)')
    await test('TC-TAG-05: pilih tag saat mencatat transaksi', async () => {
      await page.goto(`${BASE}/transaksi`, { waitUntil: 'networkidle0' })
      await waitFor(page, '[data-testid="trx-fab"]')
      await click(page, '[data-testid="trx-fab"]')
      await waitFor(page, '[data-testid="transaction-form"]')
      await pressKeys(page, ['1', '0', '0', '0', '0'])
      await click(page, '[data-testid="trx-category-button"]')
      await waitFor(page, '[data-testid="category-picker"]')
      await clickContaining(page, 'category-option-', 'Food')
      await waitGone(page, '[data-testid="category-picker"]')
      await click(page, '[data-testid="trx-asset-button"]')
      await waitFor(page, '[data-testid="asset-picker"]')
      await click(page, '[data-testid="picker-option-ast_cash"]')
      await waitGone(page, '[data-testid="asset-picker"]')

      // Pick "Prepayment" + quick-create "Perjalanan" from inside the sheet.
      await click(page, '[data-testid="trx-tag-button"]')
      await waitFor(page, '[data-testid="trx-tag-picker"]')
      await click(page, `[data-testid="trx-tag-option-${PREPAYMENT}"]`)
      await setInput(page, '[data-testid="trx-tag-input"]', 'Perjalanan')
      await click(page, '[data-testid="trx-tag-add"]')
      await page.waitForFunction(
        () =>
          [...document.querySelectorAll('[data-testid^="trx-tag-option-"]')].length === 4 &&
          [...document.querySelectorAll('[data-testid^="trx-tag-option-"]')].some((el) =>
            el.textContent.includes('Perjalanan'),
          ),
        { timeout: 10000 },
      )
      await click(page, '[data-testid="trx-tag-done"]')
      await waitGone(page, '[data-testid="trx-tag-picker"]')
      const label = await textOf(page, '[data-testid="trx-tag-value"]')
      assert(label.includes('Prepayment'), `tag row label wrong: ${label}`)
      assert(label.includes('Perjalanan'), `quick-created tag missing: ${label}`)

      await click(page, '[data-testid="trx-save"]')
      await waitGone(page, '[data-testid="transaction-form"]')

      // Reopen the saved transaction: the tags must come back selected.
      await waitFor(page, '[data-testid^="tx-row-"]')
      const uid = await page.$eval('[data-testid^="tx-row-"]', (el) =>
        el.getAttribute('data-testid').replace('tx-row-', ''),
      )
      await click(page, `[data-testid="tx-row-${uid}"]`)
      await waitFor(page, '[data-testid="transaction-form"]')
      const reopened = await textOf(page, '[data-testid="trx-tag-value"]')
      assert(reopened.includes('Prepayment'), `tag not reloaded: ${reopened}`)
      assert(reopened.includes('Perjalanan'), `quick tag not reloaded: ${reopened}`)
      await click(page, '[data-testid="trx-tag-button"]')
      await waitFor(page, '[data-testid="trx-tag-picker"]')
      const pressed = await page.$eval(
        `[data-testid="trx-tag-option-${PREPAYMENT}"]`,
        (el) => el.getAttribute('aria-pressed'),
      )
      assert(pressed === 'true', 'Prepayment should be pressed in the picker')
      await click(page, '[data-testid="trx-tag-done"]')
      await click(page, '[data-testid="trx-form-back"]')
      await waitGone(page, '[data-testid="transaction-form"]')
    })

    await test('TC-TAG-06: hapus tag (TIDAK lalu YA) & lepas dari transaksi', async () => {
      await gotoTagSettings(page)
      const rowsBefore = await countOf(page, '[data-testid^="tag-row-"]')
      const rows = await page.$$eval('[data-testid^="tag-row-"]', (els) =>
        els.map((el) => ({ uid: el.getAttribute('data-testid').replace('tag-row-', '') })),
      )
      const target = rows.find((row) => row.uid === PREPAYMENT)
      assert(target, 'Prepayment row missing')

      await click(page, `[data-testid="tag-delete-${PREPAYMENT}"]`)
      await waitFor(page, '[data-testid="confirm-dialog"]')
      await clickLabel(page, '[data-testid="confirm-dialog"]', 'TIDAK')
      await waitGone(page, '[data-testid="confirm-dialog"]')
      assert(
        (await countOf(page, '[data-testid^="tag-row-"]')) === rowsBefore,
        'TIDAK must keep the tag',
      )

      await click(page, `[data-testid="tag-delete-${PREPAYMENT}"]`)
      await waitFor(page, '[data-testid="confirm-dialog"]')
      await clickLabel(page, '[data-testid="confirm-dialog"]', 'YA')
      await waitGone(page, '[data-testid="confirm-dialog"]')
      await waitForTagCount(page, rowsBefore - 1)
      assert(
        !(await exists(page, `[data-testid="tag-row-${PREPAYMENT}"]`)),
        'tag still listed after YA',
      )

      // The transaction keeps its other tag but loses the deleted one.
      await page.goto(`${BASE}/transaksi`, { waitUntil: 'networkidle0' })
      await waitFor(page, '[data-testid^="tx-row-"]')
      const uid = await page.$eval('[data-testid^="tx-row-"]', (el) =>
        el.getAttribute('data-testid').replace('tx-row-', ''),
      )
      await click(page, `[data-testid="tx-row-${uid}"]`)
      await waitFor(page, '[data-testid="transaction-form"]')
      const label = await textOf(page, '[data-testid="trx-tag-value"]')
      assert(!label.includes('Prepayment'), `deleted tag still attached: ${label}`)
      assert(label.includes('Perjalanan'), `remaining tag lost: ${label}`)
      await click(page, '[data-testid="trx-form-back"]')
      await waitGone(page, '[data-testid="transaction-form"]')
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
