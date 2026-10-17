/**
 * Visual capture of every mode × palette combination.
 * Writes test-results/theme-<mode>-<palette>-<screen>.png
 *
 * Run: node tests/screenshot-tema.mjs
 */
import { spawn } from 'node:child_process'
import puppeteer from 'puppeteer'

const BASE = 'http://localhost:3000'
const OUT = 'test-results'
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
  if (await isUp()) return
  server = spawn('pnpm', ['dev'], { cwd: process.cwd(), stdio: 'ignore', detached: true })
  const start = Date.now()
  while (Date.now() - start < 90000) {
    if (await isUp()) return
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

const combos = []
for (const mode of ['light', 'dark']) {
  for (const palette of ['teal', 'ocean', 'lavender']) combos.push({ mode, palette })
}

async function main() {
  await ensureServer()
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })

  for (const { mode, palette } of combos) {
    await page.evaluateOnNewDocument(
      (m, p) => {
        localStorage.setItem('dompetku:mode', m)
        localStorage.setItem('dompetku:palette', p)
      },
      mode,
      palette,
    )

    await page.goto(`${BASE}/lainnya/tema`, { waitUntil: 'networkidle0' })
    await page.waitForSelector('[data-testid="theme-palette-lavender"]')
    await sleep(500)
    await page.screenshot({
      path: `${OUT}/theme-${mode}-${palette}-tema.png`,
      fullPage: true,
    })

    await page.goto(`${BASE}/transaksi`, { waitUntil: 'networkidle0' })
    await page.waitForSelector('[data-testid="trx-fab"]')
    await sleep(800)
    await page.screenshot({ path: `${OUT}/theme-${mode}-${palette}-transaksi.png` })

    await page.goto(`${BASE}/lainnya`, { waitUntil: 'networkidle0' })
    await page.waitForSelector('[data-testid="settings-item-tema"]')
    await sleep(400)
    await page.screenshot({ path: `${OUT}/theme-${mode}-${palette}-lainnya.png` })

    console.log(`· captured ${mode}/${palette}`)
  }

  await browser.close()
  stopServer()
  console.log(`Screenshots written to ${OUT}`)
}

main().catch((err) => {
  console.error(err)
  stopServer()
  process.exit(1)
})
