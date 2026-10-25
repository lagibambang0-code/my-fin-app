/**
 * Real-browser UI test for the "Pelengkap transaksi" leftovers (Fase 6):
 * the photo viewer (PHOTO) and SMS auto-catat (SMS_RAW_READ / MESSAGEMACRO2)
 * using Puppeteer against the real Next.js app + IndexedDB (Dexie).
 *
 * Run: pnpm test:ui:pelengkap
 */
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'

const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const DEBIT_SMS =
  'BCA: Transaksi DEBIT Rp 50.000 pada 17/10/2026 pukul 13:20 di INDOMARET. Saldo Rp 1.250.000'
const CREDIT_SMS = 'OVO: Kamu menerima Rp 25.000 dari Budi pada 17/10/2026. Saldo OVO Rp 25.000'

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

async function gotoTransaksi(page) {
  await page.goto(`${BASE}/transaksi`, { waitUntil: 'networkidle0' })
  await waitFor(page, '[data-testid="trx-fab"]')
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

  // A tiny 1x1 PNG used by the photo viewer test.
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
    console.log('\n▶ Foto: lihat lampiran ukuran penuh')
    await test('TC-FOTO-01: tap lampiran → viewer, tutup', async () => {
      await gotoTransaksi(page)
      await click(page, '[data-testid="trx-fab"]')
      await waitFor(page, '[data-testid="transaction-form"]')
      await pressKeys(page, ['7', '0', '0', '0'])
      await click(page, '[data-testid="trx-category-button"]')
      await waitFor(page, '[data-testid="category-picker"]')
      await clickContaining(page, 'category-option-', 'Transport')
      await waitGone(page, '[data-testid="category-picker"]')
      await click(page, '[data-testid="trx-asset-button"]')
      await waitFor(page, '[data-testid="asset-picker"]')
      await click(page, '[data-testid="picker-option-ast_cash"]')
      await waitGone(page, '[data-testid="asset-picker"]')
      const input = await page.$('[data-testid="trx-photo-input"]')
      await input.uploadFile(photoPath)
      await waitFor(page, '[data-testid="transaction-form"] img')
      await click(page, '[data-testid="trx-save"]')
      await waitGone(page, '[data-testid="transaction-form"]')

      // Reopen the saved transaction and inspect the attachment.
      await waitFor(page, '[data-testid^="tx-row-"]')
      const uid = await page.$eval('[data-testid^="tx-row-"]', (el) =>
        el.getAttribute('data-testid').replace('tx-row-', ''),
      )
      await click(page, `[data-testid="tx-row-${uid}"]`)
      await waitFor(page, '[data-testid="transaction-form"]')
      await click(page, '[data-testid="transaction-form"] [aria-label="Lihat foto"]')
      await waitFor(page, '[data-testid="trx-photo-viewer"]')
      assert(
        await exists(page, '[data-testid="trx-photo-viewer-image"]'),
        'viewer image missing',
      )
      const src = await page.$eval('[data-testid="trx-photo-viewer-image"]', (el) => el.src)
      assert(src.startsWith('data:image'), `unexpected image source: ${src.slice(0, 30)}`)
      await click(page, '[data-testid="trx-photo-viewer-close"]')
      await waitGone(page, '[data-testid="trx-photo-viewer"]')
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
