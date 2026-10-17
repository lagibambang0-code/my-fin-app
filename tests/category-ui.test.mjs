/**
 * Real-browser UI test for category & sub-category CRUD using Puppeteer.
 * Drives the actual Next.js app (client-side IndexedDB via Dexie), covering
 * the scenarios in money-manager-clone/test-scenarios/TS-01 & TS-06.
 *
 * Run: pnpm test:ui
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

// ---------------------------------------------------------------------------
// Small assertion helpers
// ---------------------------------------------------------------------------
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

async function waitFor(page, selector, timeout = 12000) {
  await page.waitForSelector(selector, { timeout })
}

async function click(page, selector) {
  await page.waitForSelector(selector, { timeout: 12000, visible: true })
  const ok = await page.$eval(selector, (el) => {
    el.scrollIntoView({ block: 'center', inline: 'center' })
    el.click()
    return true
  })
  assert(ok, `click failed: ${selector}`)
}

async function clickText(page, selector, text) {
  await page.waitForSelector(selector, { timeout: 12000 })
  const ok = await page.evaluate(
    (sel, txt) => {
      const el = [...document.querySelectorAll(`${sel} button`)].find(
        (b) => b.textContent.trim() === txt,
      )
      if (!el) return false
      el.click()
      return true
    },
    selector,
    text,
  )
  assert(ok, `Button "${text}" not found inside ${selector}`)
}

async function setInput(page, selector, value) {
  await page.waitForSelector(selector, { timeout: 12000 })
  // React-safe controlled-input update (native value setter + input event).
  await page.$eval(
    selector,
    (el, val) => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set
      setter?.call(el, val)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    },
    value,
  )
}

async function rowNames(page) {
  return page.$$eval('[data-testid^="category-row-"]', (els) =>
    els.map((e) => e.getAttribute('data-testid').replace('category-row-', '')),
  )
}

async function subNames(page) {
  return page.$$eval('[data-testid^="sub-row-"]', (els) =>
    els.map((e) => e.getAttribute('data-testid').replace('sub-row-', '')),
  )
}

async function textOf(page, selector) {
  return page.$eval(selector, (el) => el.textContent.trim())
}

async function exists(page, selector) {
  return (await page.$(selector)) !== null
}

async function hasText(page, selector, text) {
  try {
    await page.waitForFunction(
      (sel, txt) => {
        const el = document.querySelector(sel)
        return el && el.textContent.includes(txt)
      },
      { timeout: 12000 },
      selector,
      text,
    )
    return true
  } catch {
    return false
  }
}

/**
 * Snapshot of the applied theme. Chrome may resolve `--background` to a
 * colour, so lightness is derived from either raw `oklch()` or resolved
 * `lab()`/`oklab()` output.
 */
async function themeState(page) {
  return page.evaluate(() => {
    const root = document.documentElement
    const bg = getComputedStyle(root).getPropertyValue('--background').trim()
    const m = bg.match(/(?:lab|lch|oklab|oklch)\(\s*([\d.]+)(%)?/)
    return {
      mode: root.dataset.mode ?? null,
      palette: root.dataset.palette ?? null,
      dark: root.classList.contains('dark'),
      light: root.classList.contains('light'),
      colorScheme: getComputedStyle(root).colorScheme,
      bg,
      bgLightness: m ? (m[2] ? parseFloat(m[1]) / 100 : parseFloat(m[1])) : null,
      primary: getComputedStyle(root).getPropertyValue('--primary').trim(),
    }
  })
}

// ---------------------------------------------------------------------------

async function main() {
  await ensureServer()

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

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
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`))
  page.on('response', (res) => {
    if (res.status() === 404) consoleErrors.push(`404: ${res.url()}`)
  })

  try {
    // -----------------------------------------------------------------------
    console.log('\n▶ TS-01: Kategori Pengeluaran')
    await page.goto(`${BASE}/lainnya/kategori-pengeluaran`, { waitUntil: 'networkidle0' })
    await waitFor(page, '[data-testid="add-category"]')
    await waitFor(page, '[data-testid="category-row-🍜 Food"]')

    await test('12 kategori pengeluaran bawaan tampil', async () => {
      const names = await rowNames(page)
      for (const n of [
        '🍜 Food',
        '👬🏻 Social Life',
        '🐶 Pets',
        '🚖 Transport',
        '🖼 Culture',
        '🪑 Household',
        '🧥 Apparel',
        '💄 Beauty',
        '🧘🏼 Health',
        '📙 Education',
        '🎁 Gift',
        'Other',
      ]) {
        assert(names.includes(n), `missing default category: ${n} (got ${names.length})`)
      }
    })

    await test('TC-PNG-U01: ubah "Food" → "Makanan" (emoji dipertahankan)', async () => {
      await click(page, '[aria-label="Ubah kategori 🍜 Food"]')
      await setInput(page, '#category-name-input', 'Makanan')
      await click(page, '[aria-label="Simpan kategori"]')
      await waitFor(page, '[data-testid="category-row-🍜 Makanan"]')
      const names = await rowNames(page)
      assert(names.includes('🍜 Makanan'), 'renamed category "🍜 Makanan" not found')
      assert(!names.includes('🍜 Food'), 'old name "🍜 Food" still present')
    })

    await test('TC-CMN-C02: nama kosong ditolak', async () => {
      await click(page, '[data-testid="add-category"]')
      await waitFor(page, '#category-name-input')
      await click(page, '[aria-label="Simpan kategori"]')
      assert(
        await hasText(page, '#category-form-error', 'tidak boleh kosong'),
        'empty-name error not shown',
      )
      await clickText(page, '[role="dialog"]', 'Batal')
    })

    await test('TC-CMN-C03: nama duplikat ditolak', async () => {
      await click(page, '[data-testid="add-category"]')
      await setInput(page, '#category-name-input', 'makanan')
      await click(page, '[aria-label="Simpan kategori"]')
      assert(
        await hasText(page, '#category-form-error', 'sudah digunakan'),
        'duplicate-name error not shown',
      )
      await clickText(page, '[role="dialog"]', 'Batal')
    })

    await test('TC-PNG-C01: tambah kategori "Streaming"', async () => {
      await click(page, '[data-testid="add-category"]')
      await setInput(page, '#category-name-input', 'Streaming')
      await click(page, '[aria-label="Simpan kategori"]')
      await waitFor(page, '[data-testid="category-row-Streaming"]')
    })

    await test('TC-CMN-D02: hapus "Streaming" dengan konfirmasi', async () => {
      await click(page, '[aria-label="Pilih kategori Streaming"]')
      await click(page, '[aria-label="Hapus kategori terpilih"]')
      await waitFor(page, '[data-testid="confirm-dialog"]')
      await clickText(page, '[data-testid="confirm-dialog"]', 'Hapus')
      await page.waitForFunction(
        () => !document.querySelector('[data-testid="category-row-Streaming"]'),
        { timeout: 12000 },
      )
    })

    await test('Pulihkan kategori yang dihapus', async () => {
      await click(page, '[role="status"] button') // Pulihkan
      await waitFor(page, '[data-testid="category-row-Streaming"]')
      // clean up again so later counts stay tidy
      await click(page, '[aria-label="Pilih kategori Streaming"]')
      await click(page, '[aria-label="Hapus kategori terpilih"]')
      await clickText(page, '[data-testid="confirm-dialog"]', 'Hapus')
      await page.waitForFunction(
        () => !document.querySelector('[data-testid="category-row-Streaming"]'),
        { timeout: 12000 },
      )
    })

    await test('TC-CMN-O01: ubah urutan kategori', async () => {
      const before = await rowNames(page)
      await click(page, '[aria-label="Turunkan 🍜 Makanan"]')
      await page.waitForFunction(
        (first) => {
          const el = document.querySelector('[data-testid^="category-row-"]')
          return el && el.getAttribute('data-testid') !== `category-row-${first}`
        },
        { timeout: 12000 },
        before[0],
      )
      const after = await rowNames(page)
      assert(after[1] === before[0], `expected "${before[0]}" at index 1, got ${after[1]}`)
    })

    // -----------------------------------------------------------------------
    console.log('\n▶ TS-06: Sub Kategori')
    await test('TC-SUB-01/02: aktifkan "Fungsi sub kategori"', async () => {
      await click(page, '[data-testid="sub-toggle"]')
      assert(
        (await textOf(page, '[data-testid="sub-toggle-state"]')) === 'Aktif',
        'toggle state did not become Aktif',
      )
    })

    await test('TC-SUB-03: kategori ber-sub menampilkan jumlah', async () => {
      assert(
        await hasText(page, '[data-testid="sub-count-🍜 Makanan"]', '(4)'),
        'Food sub count (4) not shown',
      )
      assert(
        await hasText(page, '[data-testid="sub-count-🚖 Transport"]', '(4)'),
        'Transport sub count (4) not shown',
      )
      assert(
        await hasText(page, '[data-testid="sub-count-🪑 Household"]', '(5)'),
        'Household sub count (5) not shown',
      )
    })

    await test('TC-SUB-11/12/13: tambah, ubah, hapus sub kategori', async () => {
      await click(page, '[aria-label="Kelola sub kategori 🍜 Makanan"]')
      await waitFor(page, '[data-testid="sub-category-manager"]')
      const initial = await subNames(page)
      assert(initial.length === 4, `expected 4 subs, got ${initial.length}`)

      // add
      await click(page, '[aria-label="Tambah sub kategori"]')
      await setInput(page, '#sub-name-input', 'Brunch')
      await click(page, '[aria-label="Simpan sub kategori"]')
      await waitFor(page, '[data-testid="sub-row-Brunch"]')

      // rename
      await click(page, '[aria-label="Ubah sub kategori Brunch"]')
      await setInput(page, '#sub-name-input', 'Brunch2')
      await click(page, '[aria-label="Simpan sub kategori"]')
      await waitFor(page, '[data-testid="sub-row-Brunch2"]')

      // delete
      await click(page, '[aria-label="Pilih sub kategori Brunch2"]')
      await click(page, '[aria-label="Hapus sub terpilih"]')
      await clickText(page, '[data-testid="confirm-dialog"]', 'Hapus')
      await page.waitForFunction(
        () => !document.querySelector('[data-testid="sub-row-Brunch2"]'),
        { timeout: 12000 },
      )
      const final = await subNames(page)
      assert(final.length === 4, `expected 4 subs after delete, got ${final.length}`)
    })

    await test('TC-SUB-E02: alihkan sub → kategori utama', async () => {
      await click(page, '[aria-label="Ubah sub kategori Lunch"]')
      await waitFor(page, '#sub-name-input')
      await click(page, '[aria-label="Jadikan kategori utama"]')
      await clickText(page, '[data-testid="confirm-dialog"]', 'Ya')
      await page.waitForFunction(
        () => !document.querySelector('[data-testid="sub-row-Lunch"]'),
        { timeout: 12000 },
      )
      const subs = await subNames(page)
      assert(!subs.includes('Lunch'), 'Lunch still listed as sub after promote')

      // back to main list, promoted sub should appear as a main category
      await click(page, '[aria-label="Kembali ke daftar kategori"]')
      await waitFor(page, '[data-testid="category-row-Lunch"]')
    })

    // -----------------------------------------------------------------------
    console.log('\n▶ TS-01: Kategori Pendapatan')
    await page.goto(`${BASE}/lainnya/kategori-pendapatan`, { waitUntil: 'networkidle0' })
    await waitFor(page, '[data-testid="category-row-🤑 Allowance"]')

    await test('5 kategori pendapatan bawaan tampil', async () => {
      const names = await rowNames(page)
      for (const n of ['🤑 Allowance', '💰 Salary', '💵 Petty cash', '🏅 Bonus', 'Other']) {
        assert(names.includes(n), `missing income category: ${n}`)
      }
    })

    await test('TC-PND-U01: ubah "Allowance" → "Uang Saku"', async () => {
      await click(page, '[aria-label="Ubah kategori 🤑 Allowance"]')
      await setInput(page, '#category-name-input', 'Uang Saku')
      await click(page, '[aria-label="Simpan kategori"]')
      await waitFor(page, '[data-testid="category-row-🤑 Uang Saku"]')
    })

    await test('TC-CMN-D01: tambah & hapus kategori pendapatan', async () => {
      await click(page, '[data-testid="add-category"]')
      await setInput(page, '#category-name-input', 'Side Job')
      await click(page, '[aria-label="Simpan kategori"]')
      await waitFor(page, '[data-testid="category-row-Side Job"]')
      await click(page, '[aria-label="Pilih kategori Side Job"]')
      await click(page, '[aria-label="Hapus kategori terpilih"]')
      await clickText(page, '[data-testid="confirm-dialog"]', 'Hapus')
      await page.waitForFunction(
        () => !document.querySelector('[data-testid="category-row-Side Job"]'),
        { timeout: 12000 },
      )
    })

    // -----------------------------------------------------------------------
    console.log('\n▶ Persistensi (reload)')
    await test('data tersimpan setelah reload', async () => {
      await page.goto(`${BASE}/lainnya/kategori-pengeluaran`, { waitUntil: 'networkidle0' })
      await waitFor(page, '[data-testid="category-row-🍜 Makanan"]')
      assert(
        (await textOf(page, '[data-testid="sub-toggle-state"]')) === 'Aktif',
        'sub toggle state not persisted',
      )
      assert(
        await hasText(page, '[data-testid="sub-count-🍜 Makanan"]', '(3)'),
        'Food should have 3 subs after promote (4 - Lunch)',
      )
    })

    // -----------------------------------------------------------------------
    console.log('\n▶ Tema (Lainnya → Tema)')
    await test('TC-THEME-01: halaman "Tema" — 2 mode + 3 warna, default Terang/Teal', async () => {
      // Default harus Terang, jadi preferensi OS gelap tidak boleh menang.
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }])
      await page.goto(`${BASE}/lainnya`, { waitUntil: 'networkidle0' })
      await waitFor(page, '[data-testid="settings-item-tema"]')
      await click(page, '[data-testid="settings-item-tema"]')
      await waitFor(page, '[data-testid="theme-mode-light"]')
      assert(page.url().endsWith('/lainnya/tema'), `unexpected url: ${page.url()}`)
      for (const id of ['light', 'dark']) {
        assert(await exists(page, `[data-testid="theme-mode-${id}"]`), `mode ${id} missing`)
      }
      for (const id of ['teal', 'ocean', 'lavender']) {
        assert(
          await exists(page, `[data-testid="theme-palette-${id}"]`),
          `palette ${id} missing`,
        )
      }

      const state = await themeState(page)
      assert(state.mode === 'light', `default mode = ${state.mode}`)
      assert(state.palette === 'teal', `default palette = ${state.palette}`)
      assert(state.light && !state.dark, 'default must use the .light class')
      assert(state.colorScheme === 'light', `color-scheme=${state.colorScheme}`)
      assert(
        state.bgLightness !== null && state.bgLightness > 0.8,
        `default background must be light, got ${state.bg}`,
      )
      assert(
        (await page.$eval('[data-testid="theme-mode-light"]', (el) =>
          el.getAttribute('aria-checked'),
        )) === 'true',
        'Terang should be marked selected by default',
      )
    })

    await test('TC-THEME-02: mode Gelap ↔ Terang hanya mengubah permukaan', async () => {
      await click(page, '[data-testid="theme-mode-dark"]')
      const dark = await themeState(page)
      assert(dark.dark && !dark.light, 'Gelap must use the .dark class')
      assert(dark.colorScheme === 'dark', `color-scheme=${dark.colorScheme}`)
      assert(
        dark.bgLightness !== null && dark.bgLightness < 0.3,
        `dark background must be dark, got ${dark.bg}`,
      )
      assert(dark.palette === 'teal', `palette must not change, got ${dark.palette}`)

      await click(page, '[data-testid="theme-mode-light"]')
      const light = await themeState(page)
      assert(light.light && !light.dark, 'Terang must use the .light class')
      assert(
        light.bgLightness !== null && light.bgLightness > 0.8,
        `light background must be light, got ${light.bg}`,
      )
    })

    await test('TC-THEME-03: Samudra & Lavender tetap netral di mode Terang', async () => {
      await click(page, '[data-testid="theme-palette-teal"]')
      const teal = await themeState(page)

      await click(page, '[data-testid="theme-palette-ocean"]')
      const ocean = await themeState(page)
      assert(ocean.palette === 'ocean', `data-palette=${ocean.palette}`)
      assert(ocean.primary !== teal.primary, 'Samudra must change the accent colour')
      assert(!ocean.dark, 'Samudra must not force dark mode')
      assert(
        ocean.bgLightness !== null && ocean.bgLightness > 0.8,
        `Samudra background must stay light, got ${ocean.bg}`,
      )
      // Permukaan sama netralnya dengan Teal — hanya hue aksen yang berubah.
      assert(
        ocean.bgLightness === teal.bgLightness,
        `Samudra surface differs from Teal (${ocean.bg} vs ${teal.bg})`,
      )

      await click(page, '[data-testid="theme-palette-lavender"]')
      const lavender = await themeState(page)
      assert(lavender.palette === 'lavender', `data-palette=${lavender.palette}`)
      assert(
        lavender.primary !== ocean.primary && lavender.primary !== teal.primary,
        'Lavender must use its own accent colour',
      )
      assert(
        lavender.bgLightness !== null && lavender.bgLightness > 0.8,
        `Lavender background must stay light, got ${lavender.bg}`,
      )
    })

    await test('TC-THEME-04: palet juga berlaku di mode Gelap', async () => {
      await click(page, '[data-testid="theme-mode-dark"]')
      await click(page, '[data-testid="theme-palette-teal"]')
      const darkTeal = await themeState(page)

      await click(page, '[data-testid="theme-palette-ocean"]')
      const darkOcean = await themeState(page)
      assert(darkOcean.dark && darkOcean.mode === 'dark', 'mode should stay Gelap')
      assert(
        darkOcean.bgLightness !== null && darkOcean.bgLightness < 0.3,
        `dark surface must stay dark, got ${darkOcean.bg}`,
      )
      assert(
        darkOcean.primary !== darkTeal.primary,
        'Samudra accent must also apply in dark mode',
      )
    })

    await test('TC-THEME-05: mode & warna tersimpan setelah reload', async () => {
      await page.reload({ waitUntil: 'networkidle0' })
      await waitFor(page, '[data-testid="theme-palette-ocean"]')
      await page.waitForFunction(
        () =>
          document.querySelector('[data-testid="theme-palette-ocean"]')?.getAttribute('aria-checked') ===
          'true',
        { timeout: 12000 },
      )
      const persisted = await themeState(page)
      assert(
        persisted.mode === 'dark' && persisted.palette === 'ocean',
        `after reload mode=${persisted.mode} palette=${persisted.palette}`,
      )
      assert(persisted.dark, 'Gelap must survive a reload')
      assert(
        (await page.$eval('[data-testid="theme-mode-dark"]', (el) =>
          el.getAttribute('aria-checked'),
        )) === 'true',
        'Gelap should still be marked selected after reload',
      )
    })

    await test('TC-THEME-06: migrasi kunci lama dompetku:theme', async () => {
      await page.evaluate(() => {
        localStorage.removeItem('dompetku:mode')
        localStorage.removeItem('dompetku:palette')
        localStorage.setItem('dompetku:theme', 'lavender')
      })
      await page.reload({ waitUntil: 'networkidle0' })
      await waitFor(page, '[data-testid="theme-palette-lavender"]')
      const migrated = await themeState(page)
      assert(
        migrated.mode === 'light' && migrated.palette === 'lavender',
        `migration gave mode=${migrated.mode} palette=${migrated.palette}`,
      )
      const storage = await page.evaluate(() => ({
        legacy: localStorage.getItem('dompetku:theme'),
        mode: localStorage.getItem('dompetku:mode'),
        palette: localStorage.getItem('dompetku:palette'),
      }))
      assert(storage.legacy === null, 'legacy key should be removed after migration')
      assert(
        storage.mode === 'light' && storage.palette === 'lavender',
        `storage after migration ${JSON.stringify(storage)}`,
      )

      // Kembalikan ke default supaya sisa suite bersih.
      await click(page, '[data-testid="theme-palette-teal"]')
      const restored = await themeState(page)
      assert(restored.palette === 'teal' && restored.mode === 'light', 'restore to defaults failed')
    })

    // -----------------------------------------------------------------------
    console.log('\n▶ Console errors')
    const realErrors = consoleErrors.filter(
      (e) => !/favicon|DevTools|Download the React/i.test(e),
    )
    await test('tidak ada error di console', async () => {
      assert(
        realErrors.length === 0,
        `${realErrors.length} console error(s):\n         ${realErrors.join('\n         ')}`,
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
