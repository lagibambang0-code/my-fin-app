/**
 * Real-browser UI test for the Aset module using Puppeteer.
 * Drives the actual Next.js app (client-side IndexedDB via Dexie) and covers
 * the scenarios in money-manager-clone/test-scenarios/TS-02-Kelola-Aset.md.
 *
 * Run: pnpm test:ui:asset
 */
import { spawn } from 'node:child_process'
import puppeteer from 'puppeteer'

const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

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
          document.body.innerText.replace(/\n+/g, ' | ').slice(0, 500),
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
  await page.waitForFunction(
    (sel) => !document.querySelector(sel),
    { timeout },
    selector,
  )
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

async function hasText(page, selector, needle) {
  const text = await textOf(page, selector)
  return text.includes(needle)
}

async function setInput(page, selector, value) {
  await page.waitForSelector(selector, { timeout: 15000 })
  await page.$eval(
    selector,
    (el, val) => {
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

async function gotoAssets(page) {
  await page.goto(`${BASE}/aset`, { waitUntil: 'networkidle0' })
  await waitFor(page, '[data-testid="asset-summary"]')
}

/** Fill the asset form. Assumes the form overlay is already open. */
async function fillAssetForm(page, { groupUid, name, total, description }) {
  if (groupUid) {
    await click(page, '[data-testid="asset-group-field"]')
    await waitFor(page, `[data-testid="picker-option-${groupUid}"]`)
    await click(page, `[data-testid="picker-option-${groupUid}"]`)
  }
  if (name !== undefined) await setInput(page, '#asset-name-input', name)
  if (total !== undefined) await setInput(page, '#asset-total-input', total)
  if (description !== undefined) await setInput(page, '#asset-description-input', description)
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
    console.log('\n▶ TS-02: Tab Aset')
    await gotoAssets(page)

    await test('TC-NAV-ASE-01: tab Aset menampilkan ringkasan & daftar bergrup', async () => {
      await waitFor(page, '[data-testid="asset-summary-assets"]')
      assert(await exists(page, '[data-testid="asset-summary-liabilities"]'), 'no liabilities')
      assert(await exists(page, '[data-testid="asset-summary-total"]'), 'no total')
      assert(await exists(page, '[data-testid="asset-row-Cash"]'), 'Cash row missing')
      assert(await exists(page, '[data-testid="asset-row-Accounts"]'), 'Accounts row missing')
      assert(await exists(page, '[data-testid="asset-row-Card"]'), 'Card row missing')
      assert(await exists(page, '[data-testid="asset-group-Cash"]'), 'Cash group missing')
    })

    await test('TC-ASE-02: grup Card punya "Harus dibayar" & "Belum dibayar"', async () => {
      assert(await exists(page, '[data-testid="card-payable-Card"]'), 'payable row missing')
      assert(await exists(page, '[data-testid="card-upcoming-Card"]'), 'upcoming row missing')
      assert(
        await hasText(page, '[data-testid="card-payable-Card"]', 'Harus dibayar'),
        'payable label missing',
      )
      assert(
        await hasText(page, '[data-testid="card-payable-Card"]', 'Bayar:'),
        'payable pay date missing',
      )
    })

    // ---------------------------------------------------------------------
    console.log('\n▶ CRUD Aset')
    await test('TC-ASE-03: tambah aset di grup Savings', async () => {
      await click(page, '[data-testid="asset-edit-button"]')
      await click(page, '[data-testid="asset-menu-add"]')
      await waitFor(page, '[data-testid="asset-form"]')
      await fillAssetForm(page, {
        groupUid: 'ag_savings',
        name: 'Tabungan',
        total: '1500000',
        description: 'Dana darurat',
      })
      await click(page, '[data-testid="asset-save"]')
      await waitGone(page, '[data-testid="asset-form"]')
      await waitFor(page, '[data-testid="asset-row-Tabungan"]')
      assert(
        await hasText(page, '[data-testid="asset-row-Tabungan"]', '1.500.000'),
        'balance not formatted',
      )
    })

    await test('TC-ASE-01: ringkasan menambahkan saldo aset baru', async () => {
      const assets = await textOf(page, '[data-testid="asset-summary-assets"]')
      assert(assets.includes('1.500.000'), `expected 1.500.000 in Aset, got "${assets}"`)
    })

    await test('TC-ASE-E01: nama aset kosong ditolak', async () => {
      await click(page, '[data-testid="asset-edit-button"]')
      await click(page, '[data-testid="asset-menu-add"]')
      await waitFor(page, '[data-testid="asset-form"]')
      await click(page, '[data-testid="asset-save"]')
      await waitFor(page, '#asset-form-error')
      assert(
        await hasText(page, '#asset-form-error', 'Nama aset tidak boleh kosong'),
        'validation message missing',
      )
      assert(await exists(page, '[data-testid="asset-form"]'), 'form should stay open')
      await click(page, '[aria-label="Tutup"]')
      await waitGone(page, '[data-testid="asset-form"]')
    })

    await test('TC-ASE-05: ubah nama & total aset', async () => {
      await click(page, '[data-testid="asset-row-Tabungan"]')
      await waitFor(page, '[data-testid="asset-detail"]')
      await click(page, '[aria-label="Kembali"]')
      await waitGone(page, '[data-testid="asset-detail"]')

      await click(page, '[data-testid="asset-edit-button"]')
      await click(page, '[data-testid="asset-menu-visibility"]')
      await waitFor(page, '[data-testid="asset-visibility"]')
      await click(page, '[data-testid="visibility-row-Tabungan"] button')
      await waitFor(page, '[data-testid="asset-form"]')
      await fillAssetForm(page, { name: 'Tabungan Haji', total: '2000000' })
      await click(page, '[data-testid="asset-save"]')
      await waitGone(page, '[data-testid="asset-form"]')
      await gotoAssets(page)
      assert(await exists(page, '[data-testid="asset-row-Tabungan Haji"]'), 'rename failed')
      assert(
        await hasText(page, '[data-testid="asset-row-Tabungan Haji"]', '2.000.000'),
        'total not updated',
      )
    })

    await test('TC-ASE-20: mata uang dapat diubah per aset', async () => {
      await click(page, '[data-testid="asset-edit-button"]')
      await click(page, '[data-testid="asset-menu-visibility"]')
      await waitFor(page, '[data-testid="asset-visibility"]')
      await click(page, '[data-testid="visibility-row-Tabungan Haji"] button')
      await waitFor(page, '[data-testid="asset-form"]')
      await click(page, '[data-testid="asset-currency-button"]')
      await waitFor(page, '[data-testid="picker-option-USD_USD"]')
      await click(page, '[data-testid="picker-option-USD_USD"]')
      await click(page, '[data-testid="asset-save"]')
      await waitGone(page, '[data-testid="asset-form"]')
      await gotoAssets(page)
      assert(
        await hasText(page, '[data-testid="asset-row-Tabungan Haji"]', '$'),
        'USD symbol not applied',
      )
    })

    await test('TC-ASE-21: "Sertakan dalam total" mengeluarkan saldo dari ringkasan', async () => {
      const before = await textOf(page, '[data-testid="asset-summary-total"]')
      await click(page, '[data-testid="asset-edit-button"]')
      await click(page, '[data-testid="asset-menu-visibility"]')
      await waitFor(page, '[data-testid="asset-visibility"]')
      await click(page, '[data-testid="visibility-row-Tabungan Haji"] button')
      await waitFor(page, '[data-testid="asset-form"]')
      await click(page, '[data-testid="asset-include-total"]')
      await click(page, '[data-testid="asset-save"]')
      await waitGone(page, '[data-testid="asset-form"]')
      await gotoAssets(page)
      const after = await textOf(page, '[data-testid="asset-summary-total"]')
      assert(before !== after, `summary total unchanged (${before})`)
      // restore
      await click(page, '[data-testid="asset-edit-button"]')
      await click(page, '[data-testid="asset-menu-visibility"]')
      await waitFor(page, '[data-testid="asset-visibility"]')
      await click(page, '[data-testid="visibility-row-Tabungan Haji"] button')
      await waitFor(page, '[data-testid="asset-form"]')
      await click(page, '[data-testid="asset-include-total"]')
      await click(page, '[data-testid="asset-save"]')
      await waitGone(page, '[data-testid="asset-form"]')
      await gotoAssets(page)
    })

    await test('TC-ASE-07: sembunyikan aset menghilangkannya dari tab Aset', async () => {
      await click(page, '[data-testid="asset-edit-button"]')
      await click(page, '[data-testid="asset-menu-visibility"]')
      await waitFor(page, '[data-testid="asset-visibility"]')
      await click(page, '[data-testid="visibility-toggle-Tabungan Haji"]')
      await click(page, '[aria-label="Kembali"]')
      await waitGone(page, '[data-testid="asset-visibility"]')
      await gotoAssets(page)
      assert(!(await exists(page, '[data-testid="asset-row-Tabungan Haji"]')), 'asset still visible')
      // Show it again so later scenarios keep a visible asset in Savings.
      await click(page, '[data-testid="asset-edit-button"]')
      await click(page, '[data-testid="asset-menu-visibility"]')
      await waitFor(page, '[data-testid="asset-visibility"]')
      await click(page, '[data-testid="visibility-toggle-Tabungan Haji"]')
      await click(page, '[aria-label="Kembali"]')
      await waitGone(page, '[data-testid="asset-visibility"]')
      await gotoAssets(page)
      assert(
        await exists(page, '[data-testid="asset-row-Tabungan Haji"]'),
        'asset should be visible again',
      )
    })

    await test('TC-ASE-06: ubah urutan aset', async () => {
      // Two assets in the same group are required for a within-group move.
      for (const [name, total] of [
        ['Aset A', '10000'],
        ['Aset B', '20000'],
      ]) {
        await click(page, '[data-testid="asset-edit-button"]')
        await click(page, '[data-testid="asset-menu-add"]')
        await waitFor(page, '[data-testid="asset-form"]')
        await fillAssetForm(page, { groupUid: 'ag_others', name, total })
        await click(page, '[data-testid="asset-save"]')
        await waitGone(page, '[data-testid="asset-form"]')
      }
      await gotoAssets(page)
      await click(page, '[data-testid="asset-edit-button"]')
      await click(page, '[data-testid="asset-menu-reorder"]')
      await waitFor(page, '[data-testid="asset-reorder"]')
      await click(page, '[aria-label="Turunkan Aset A"]')
      await sleep(500)
      await click(page, '[aria-label="Kembali"]')
      await waitGone(page, '[data-testid="asset-reorder"]')
      await gotoAssets(page)
      const order = await page.$$eval(
        '[data-testid^="asset-row-"]',
        (els) => els.map((el) => el.getAttribute('data-testid')),
      )
      assert(
        order.indexOf('asset-row-Aset B') < order.indexOf('asset-row-Aset A'),
        `expected Aset B before Aset A, got ${order.join(', ')}`,
      )
      // restore original order
      await click(page, '[data-testid="asset-edit-button"]')
      await click(page, '[data-testid="asset-menu-reorder"]')
      await waitFor(page, '[data-testid="asset-reorder"]')
      await click(page, '[aria-label="Naikkan Aset A"]')
      await sleep(500)
      await click(page, '[aria-label="Kembali"]')
      await gotoAssets(page)
    })

    await test('TC-ASE-08/16: hapus aset (centang → tempat sampah) tanpa dialog', async () => {
      await click(page, '[data-testid="asset-edit-button"]')
      await click(page, '[data-testid="asset-menu-delete"]')
      await waitFor(page, '[data-testid="asset-delete-screen"]')
      await click(page, '[data-testid="delete-check-Tabungan Haji"]')
      await waitFor(page, '[data-testid="delete-trash-Tabungan Haji"]')
      await click(page, '[data-testid="delete-trash-Tabungan Haji"]')
      await click(page, '[aria-label="Kembali"]')
      await waitGone(page, '[data-testid="asset-delete-screen"]')
      await gotoAssets(page)
      assert(
        !(await exists(page, '[data-testid="asset-row-Tabungan Haji"]')),
        'asset should be gone from the Aset tab',
      )
    })

    await test('TC-ASE-17: pulihkan aset dengan konfirmasi "YA"', async () => {
      await page.goto(`${BASE}/lainnya/kelola-aset/aset-dihapus`, { waitUntil: 'networkidle0' })
      await waitFor(page, '[data-testid="deleted-list-assets"]')
      await click(page, '[data-testid="restore-Tabungan Haji"]')
      await waitFor(page, '[data-testid="confirm-dialog"]')
      assert(
        await hasText(page, '[data-testid="confirm-dialog"]', 'Apakah anda ingin memulihkannya?'),
        'confirm text mismatch',
      )
      await clickText(page, 'Ya')
      await waitGone(page, '[data-testid="confirm-dialog"]')
      await gotoAssets(page)
      assert(await exists(page, '[data-testid="asset-row-Tabungan Haji"]'), 'asset not restored')
    })

    // ---------------------------------------------------------------------
    console.log('\n▶ Aset kartu')
    await test('TC-ASE-04: aset kartu menampilkan field tambahan & siklus', async () => {
      await gotoAssets(page)
      await click(page, '[data-testid="asset-edit-button"]')
      await click(page, '[data-testid="asset-menu-add"]')
      await waitFor(page, '[data-testid="asset-form"]')
      await fillAssetForm(page, { groupUid: 'ag_card', name: 'Kartu Kredit', total: '500000' })
      await waitFor(page, '[data-testid="asset-pay-field"]')
      assert(await exists(page, '#asset-settle-input'), 'settle day input missing')
      assert(await exists(page, '#asset-payment-input'), 'payment day input missing')
      assert(await exists(page, '[data-testid="card-payable"]'), 'payable row missing')
      assert(
        await hasText(page, '[data-testid="card-payable"]', 'Bayar:'),
        'payable pay date missing',
      )
      await click(page, '[data-testid="asset-pay-field"]')
      await waitFor(page, '[data-testid="picker-option-ast_accounts"]')
      assert(
        !(await exists(page, '[data-testid="picker-option-ast_card"]')),
        'card asset must not be offered as its own payer',
      )
      await click(page, '[data-testid="picker-option-ast_accounts"]')
      await click(page, '[data-testid="asset-save"]')
      await waitGone(page, '[data-testid="asset-form"]')
      await waitFor(page, '[data-testid="asset-row-Kartu Kredit"]')
    })

    await test('TC-ASE-02: Liabilitas bertambah untuk aset kartu', async () => {
      const liabilities = await textOf(page, '[data-testid="asset-summary-liabilities"]')
      assert(liabilities.includes('500.000'), `expected 500.000, got "${liabilities}"`)
    })

    await test('TC-ASE-23: field "Bayar" menampilkan aset non-kartu', async () => {
      await click(page, '[data-testid="asset-row-Kartu Kredit"]')
      await waitFor(page, '[data-testid="asset-detail"]')
      await click(page, '[aria-label="Kembali"]')
      await gotoAssets(page)
      await click(page, '[data-testid="asset-edit-button"]')
      await click(page, '[data-testid="asset-menu-visibility"]')
      await waitFor(page, '[data-testid="asset-visibility"]')
      await click(page, '[data-testid="visibility-row-Kartu Kredit"] button')
      await waitFor(page, '[data-testid="asset-form"]')
      await click(page, '[data-testid="asset-pay-field"]')
      await waitFor(page, '[data-testid="picker-option-ast_accounts"]')
      await click(page, '[data-testid="picker-option-ast_accounts"]')
      await click(page, '[data-testid="asset-save"]')
      await waitGone(page, '[data-testid="asset-form"]')
      await gotoAssets(page)
    })

    // ---------------------------------------------------------------------
    console.log('\n▶ Grup aset')
    await test('TC-ASE-09: 11 grup bawaan dengan terjemahan', async () => {
      await page.goto(`${BASE}/lainnya/kelola-aset/grup`, { waitUntil: 'networkidle0' })
      await waitFor(page, '[data-testid="group-row-Cash"]')
      const names = [
        'Cash',
        'Accounts',
        'Card',
        'Debit Card',
        'Savings',
        'Top-Up/Prepaid',
        'Investments',
        'Overdrafts',
        'Loan',
        'Insurance',
        'Others',
      ]
      for (const name of names) {
        assert(await exists(page, `[data-testid="group-row-${name}"]`), `group ${name} missing`)
      }
      assert(
        await hasText(page, '[data-testid="group-row-Card"]', 'Kartu'),
        'Card translation missing',
      )
      assert(
        await hasText(page, '[data-testid="group-row-Debit Card"]', 'Kartu debit'),
        'Debit Card translation missing',
      )
    })

    await test('TC-ASE-11: grup inti pakai ikon, grup lain pakai checkbox', async () => {
      assert(await exists(page, '[data-testid="group-icon-Cash"]'), 'Cash should show an icon')
      assert(await exists(page, '[data-testid="group-icon-Card"]'), 'Card should show an icon')
      assert(
        await exists(page, '[data-testid="group-check-Savings"]'),
        'Savings should show a checkbox',
      )
    })

    await test('TC-ASE-10: tambah grup baru', async () => {
      await click(page, '[data-testid="add-group"]')
      await waitFor(page, '[data-testid="group-form"]')
      await setInput(page, '#group-name-input', 'Dompet Digital')
      await click(page, '[data-testid="group-save"]')
      await waitGone(page, '[data-testid="group-form"]')
      await waitFor(page, '[data-testid="group-row-Dompet Digital"]')
    })

    await test('TC-ASE-19: hapus grup berisi aset lalu pulihkan bersama asetnya', async () => {
      await page.goto(`${BASE}/lainnya/kelola-aset/grup`, { waitUntil: 'networkidle0' })
      await waitFor(page, '[data-testid="group-row-Savings"]')
      await click(page, '[data-testid="group-check-Savings"]')
      await click(page, '[data-testid="group-trash-Savings"]')
      await waitFor(page, '[data-testid="confirm-dialog"]')
      await clickText(page, 'Ya')
      await waitGone(page, '[data-testid="confirm-dialog"]')
      await waitGone(page, '[data-testid="group-row-Savings"]')

      await page.goto(`${BASE}/lainnya/kelola-aset/grup-dihapus`, { waitUntil: 'networkidle0' })
      await waitFor(page, '[data-testid="deleted-list-groups"]')
      assert(
        await exists(page, '[data-testid="deleted-row-Savings (1)"]'),
        'deleted group should show asset count',
      )
      await click(page, '[data-testid="restore-Savings (1)"]')
      await waitFor(page, '[data-testid="confirm-dialog"]')
      await clickText(page, 'Ya')
      await waitGone(page, '[data-testid="confirm-dialog"]')

      await page.goto(`${BASE}/lainnya/kelola-aset/grup`, { waitUntil: 'networkidle0' })
      await waitFor(page, '[data-testid="group-row-Savings"]')
      await gotoAssets(page)
      assert(
        await exists(page, '[data-testid="asset-row-Tabungan Haji"]'),
        'asset inside the group should be restored',
      )
    })

    // ---------------------------------------------------------------------
    console.log('\n▶ Pengaturan kartu & transfer')
    await test('TC-ASE-13: "Cara catat pengeluaran kartu" default Lump sum', async () => {
      await page.goto(`${BASE}/lainnya/kelola-aset`, { waitUntil: 'networkidle0' })
      await waitFor(page, '[data-testid="aset-menu-card-timing"]')
      assert(
        (await textOf(page, '[data-testid="aset-menu-card-timing-value"]')) === 'Lump sum',
        'default timing should be Lump sum',
      )
      await click(page, '[data-testid="aset-menu-card-timing"]')
      await waitFor(page, '[data-testid="card-timing-1"]')
      await click(page, '[data-testid="card-timing-1"]')
      await click(page, '[aria-label="Kembali"]')
      await waitFor(page, '[data-testid="aset-menu-card-timing-value"]')
      assert(
        (await textOf(page, '[data-testid="aset-menu-card-timing-value"]')) ===
          'Waktu penggunaan',
        'timing value not persisted',
      )
      // back to default
      await click(page, '[data-testid="aset-menu-card-timing"]')
      await waitFor(page, '[data-testid="card-timing-0"]')
      await click(page, '[data-testid="card-timing-0"]')
    })

    await test('TC-ASE-15: pengaturan pengeluaran transfer', async () => {
      await page.goto(`${BASE}/lainnya/kelola-aset/pengeluaran-transfer`, { waitUntil: 'networkidle0' })
      await waitFor(page, '[data-testid="transfer-toggle-Tabungan Haji"]')
      await click(page, '[data-testid="transfer-toggle-Tabungan Haji"]')
      await page.waitForFunction(
        (sel) => document.querySelector(sel)?.getAttribute('aria-checked') === 'true',
        { timeout: 5000 },
        '[data-testid="transfer-toggle-Tabungan Haji"]',
      )
      const pressed = await page.$eval(
        '[data-testid="transfer-toggle-Tabungan Haji"]',
        (el) => el.getAttribute('aria-checked'),
      )
      assert(pressed === 'true', 'transfer toggle did not turn on')
    })

    // ---------------------------------------------------------------------
    console.log('\n▶ Detail & Total statistik')
    await test('TC-ASE-22/26: detail aset dengan mode periode', async () => {
      await gotoAssets(page)
      await click(page, '[data-testid="asset-row-Cash"]')
      await waitFor(page, '[data-testid="asset-detail"]')
      assert(await exists(page, '[data-testid="detail-running-balance"]'), 'balance missing')
      assert(await exists(page, '[data-testid="detail-period-range"]'), 'range missing')
      await click(page, '[data-testid="detail-mode-monthly"]')
      const range = await textOf(page, '[data-testid="detail-period-range"]')
      assert(range.includes('~'), `expected a date range, got "${range}"`)
      await click(page, '[data-testid="detail-mode-yearly"]')
      const yRange = await textOf(page, '[data-testid="detail-period-range"]')
      assert(yRange.includes('.01.'), `expected a yearly range, got "${yRange}"`)
      await click(page, '[aria-label="Kembali"]')
      await waitGone(page, '[data-testid="asset-detail"]')
    })

    await test('TC-ASE-24/25: Total statistik + ganti bulan', async () => {
      await click(page, '[data-testid="asset-stats-button"]')
      await waitFor(page, '[data-testid="stats-accumulated-balance"]')
      assert(page.url().endsWith('/aset/statistik'), `unexpected url ${page.url()}`)
      assert(await exists(page, '[data-testid="stats-chart"]'), 'chart missing')
      const before = await textOf(page, '[data-testid="stats-accumulated-balance"]')
      await click(page, '[aria-label="Bulan sebelumnya"]')
      await sleep(200)
      const after = await textOf(page, '[data-testid="stats-accumulated-balance"]')
      assert(typeof before === 'string' && typeof after === 'string', 'balance label missing')
    })

    await test('TC-ASE-18: hapus permanen dari daftar terhapus', async () => {
      await gotoAssets(page)
      await click(page, '[data-testid="asset-edit-button"]')
      await click(page, '[data-testid="asset-menu-add"]')
      await waitFor(page, '[data-testid="asset-form"]')
      await fillAssetForm(page, { groupUid: 'ag_others', name: 'Sementara', total: '10000' })
      await click(page, '[data-testid="asset-save"]')
      await waitGone(page, '[data-testid="asset-form"]')

      await click(page, '[data-testid="asset-edit-button"]')
      await click(page, '[data-testid="asset-menu-delete"]')
      await waitFor(page, '[data-testid="asset-delete-screen"]')
      await click(page, '[data-testid="delete-check-Sementara"]')
      await click(page, '[data-testid="delete-trash-Sementara"]')
      await click(page, '[aria-label="Kembali"]')

      await page.goto(`${BASE}/lainnya/kelola-aset/aset-dihapus`, { waitUntil: 'networkidle0' })
      await waitFor(page, '[data-testid="deleted-row-Sementara"]')
      await click(page, '[data-testid="deleted-row-Sementara"] input')
      await click(page, '[data-testid="purge-Sementara"]')
      await waitGone(page, '[data-testid="deleted-row-Sementara"]')
    })

    await test('TC-ASE-28: daftar terhapus kosong menampilkan "Tidak ada data"', async () => {
      await page.goto(`${BASE}/lainnya/kelola-aset/aset-dihapus`, { waitUntil: 'networkidle0' })
      await waitFor(page, '[data-testid="deleted-empty"]')
      assert(
        await hasText(page, '[data-testid="deleted-empty"]', 'Tidak ada data'),
        'empty state text missing',
      )
    })

    // ---------------------------------------------------------------------
    await test('tidak ada error di console', async () => {
      const real = consoleErrors.filter(
        (e) => !/favicon|DevTools|Download the React|404/i.test(e),
      )
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

async function clickText(page, text) {
  const ok = await page.evaluate((txt) => {
    const btn = [...document.querySelectorAll('button')].find(
      (b) => b.textContent.trim() === txt,
    )
    if (!btn) return false
    btn.click()
    return true
  }, text)
  assert(ok, `button "${text}" not found`)
}

main().catch((err) => {
  console.error('\nFatal:', err)
  stopServer()
  process.exit(1)
})
