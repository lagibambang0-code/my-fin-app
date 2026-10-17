/** Capture screenshots of the Statistik module (Fase 4) for visual review. */
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import puppeteer from 'puppeteer'

const BASE = 'http://localhost:3000'
const OUT = 'test-results'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync(OUT, { recursive: true })

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
  throw new Error('server timeout')
}

const click = async (page, sel) => {
  await page.waitForSelector(sel, { visible: true, timeout: 20000 })
  await page.$eval(sel, (el) => {
    el.scrollIntoView({ block: 'center' })
    el.click()
  })
}
const shot = async (page, name) => {
  await sleep(260)
  await page.screenshot({ path: `${OUT}/${name}.png` })
}
const type = async (page, keys) => {
  for (const k of keys) await click(page, `[data-testid="numpad-${k}"]`)
}

async function pickMode(page, mode) {
  await click(page, '[data-testid="stats-mode-button"]')
  await page.waitForSelector('[data-testid="stats-mode-picker"]')
  await click(page, `[data-testid="stats-mode-picker"] [data-testid="picker-option-${mode}"]`)
  await page.waitForFunction(() => !document.querySelector('[data-testid="stats-mode-picker"]'))
}

async function main() {
  await ensureServer()
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })

  // Empty state first.
  await page.goto(`${BASE}/statistik`, { waitUntil: 'networkidle0' })
  await page.waitForSelector('[data-testid="stats-empty"]')
  await shot(page, 's01-statistik-kosong')

  // Mode picker.
  await click(page, '[data-testid="stats-mode-button"]')
  await page.waitForSelector('[data-testid="stats-mode-picker"]')
  await shot(page, 's02-pemilih-mode')
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => !document.querySelector('[data-testid="stats-mode-picker"]'))

  // Seed sub-categories + transactions.
  await page.goto(`${BASE}/lainnya/kategori-pengeluaran`, { waitUntil: 'networkidle0' })
  await click(page, '[data-testid="sub-toggle"]')

  const add = async (keys, categoryPicker, income = false) => {
    await page.goto(`${BASE}/transaksi`, { waitUntil: 'networkidle0' })
    await page.waitForSelector('[data-testid="trx-summary"]')
    await click(page, '[data-testid="trx-fab"]')
    await page.waitForSelector('[data-testid="transaction-form"]')
    await type(page, keys)
    if (income) await click(page, '[data-testid="trx-type-income"]')
    await categoryPicker(page)
    await click(page, '[data-testid="trx-asset-button"]')
    await page.waitForSelector('[data-testid="asset-picker"]')
    await click(page, '[data-testid="picker-option-ast_cash"]')
    await page.waitForFunction(() => !document.querySelector('[data-testid="asset-picker"]'))
    await click(page, '[data-testid="trx-save"]')
    await page.waitForFunction(() => !document.querySelector('[data-testid="transaction-form"]'))
  }

  const subCategory = (parent, sub) => async (page2) => {
    await click(page2, '[data-testid="trx-category-button"]')
    await page2.waitForSelector('[data-testid="category-picker"]')
    await page2.$eval(
      '[data-testid="category-picker"]',
      (el, p) => {
        const target = [...el.querySelectorAll('[data-testid^="category-option-"]')].find((n) =>
          n.textContent.includes(p),
        )
        target.click()
      },
      parent,
    )
    await page2.waitForSelector(`[data-testid="subcategory-option-${sub}"]`)
    await click(page2, `[data-testid="subcategory-option-${sub}"]`)
    await page2.waitForFunction(() => !document.querySelector('[data-testid="category-picker"]'))
  }

  const plainCategory = (parent) => async (page2) => {
    await click(page2, '[data-testid="trx-category-button"]')
    await page2.waitForSelector('[data-testid="category-picker"]')
    await page2.$eval(
      '[data-testid="category-picker"]',
      (el, p) => {
        const target = [...el.querySelectorAll('[data-testid^="category-option-"]')].find((n) =>
          n.textContent.includes(p),
        )
        target.click()
      },
      parent,
    )
    await page2.waitForFunction(() => !document.querySelector('[data-testid="category-picker"]'))
  }

  await add(['7', '5', '0', '0'], subCategory('🍜 Food', 'Lunch'))
  await add(['2', '5', '0', '0'], subCategory('🚖 Transport', 'Bus'))
  await add(['1', '5', '0', '0', '0'], subCategory('🧥 Apparel', 'Clothing'))
  await add(['3', '0', '0', '0', '0'], subCategory('🍜 Food', 'Dinner'))
  await add(['2', '5', '0', '0'], subCategory('🧘🏼 Health', 'Medicine'))
  await add(['9', '0', '0', '0', '0', '0'], plainCategory('💰 Salary'), true)

  // Expense report (bar chart + list).
  await page.goto(`${BASE}/statistik`, { waitUntil: 'networkidle0' })
  await page.waitForSelector('[data-testid="stats-chart"]')
  await shot(page, 's03-statistik-pengeluaran')

  // Income report.
  await click(page, '[data-testid="stats-type-income"]')
  await page.waitForSelector('[data-testid="stats-chart"]')
  await shot(page, 's04-statistik-pendapatan')

  // Yearly + weekly + period headers.
  await pickMode(page, 'yearly')
  await shot(page, 's05-statistik-tahunan')
  await pickMode(page, 'weekly')
  await shot(page, 's06-statistik-mingguan')
  await pickMode(page, 'period')
  await click(page, '[data-testid="stats-period-button"]')
  await page.waitForSelector('[data-testid="stats-period-sheet"]')
  await shot(page, 's07-statistik-periode')
  await click(page, '[data-testid="stats-period-apply"]')
  await page.waitForFunction(() => !document.querySelector('[data-testid="stats-period-sheet"]'))

  // Drill-down detail.
  await pickMode(page, 'monthly')
  await click(page, '[data-testid="stats-type-expense"]')
  await page.waitForSelector('[data-testid="stats-chart"]')
  await click(page, '[data-testid^="stats-row-"]')
  await page.waitForSelector('[data-testid="stats-detail"]')
  await shot(page, 's08-detail-kategori')

  // Dark mode detail.
  await page.goto(`${BASE}/lainnya/tema`, { waitUntil: 'networkidle0' })
  await click(page, '[data-testid="theme-mode-dark"]')
  await page.goto(`${BASE}/statistik`, { waitUntil: 'networkidle0' })
  await page.waitForSelector('[data-testid="stats-chart"]')
  await shot(page, 's09-statistik-gelap')
  await click(page, '[data-testid^="stats-row-"]')
  await page.waitForSelector('[data-testid="stats-detail"]')
  await shot(page, 's10-detail-kategori-gelap')

  await browser.close()
  if (server?.pid) {
    try {
      process.kill(-server.pid, 'SIGTERM')
    } catch {
      /* ignore */
    }
  }
  console.log('Screenshots written to', OUT)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
