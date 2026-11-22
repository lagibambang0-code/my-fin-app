import puppeteer from 'puppeteer'

const BASE_URL = 'http://localhost:3000'

async function run() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844 })

  await page.goto(`${BASE_URL}/transactions`, { waitUntil: 'networkidle2' })

  const onboardingBtn = await page.$('[data-testid="onboarding-submit"]')
  if (onboardingBtn) {
    await onboardingBtn.click()
    await new Promise((r) => setTimeout(r, 1500))
  }

  const fab = await page.waitForSelector('[data-testid="trx-fab"]')
  await fab.click()
  await page.waitForSelector('[data-testid="transaction-form"]')
  await new Promise((r) => setTimeout(r, 300))

  const closeBtn = await page.waitForSelector('button[aria-label="Tutup"]')
  await closeBtn.click()
  await new Promise((r) => setTimeout(r, 300))

  const transferTab = await page.waitForSelector('[data-testid="trx-type-transfer"]')
  await transferTab.click()
  await new Promise((r) => setTimeout(r, 300))

  // 1. Screenshot Transfer Form default (+ Biaya button)
  await page.screenshot({ path: 'test-results/transfer-01-default.png' })
  console.log('Saved test-results/transfer-01-default.png')

  // Click + Biaya
  const feeBtn = await page.waitForSelector('[data-testid="trx-fee-button"]')
  await feeBtn.click()
  await new Promise((r) => setTimeout(r, 400))

  // 2. Screenshot Fee Numpad inside Unified Drawer
  await page.screenshot({ path: 'test-results/transfer-02-fee-drawer.png' })
  console.log('Saved test-results/transfer-02-fee-drawer.png')

  // Type fee 2500 and click Selesai
  await (await page.waitForSelector('[data-testid="fee-numpad-2"]')).click()
  await (await page.waitForSelector('[data-testid="fee-numpad-5"]')).click()
  await (await page.waitForSelector('[data-testid="fee-numpad-00"]')).click()
  await (await page.waitForSelector('[data-testid="trx-fee-sheet-done"]')).click()
  await new Promise((r) => setTimeout(r, 400))

  // 3. Screenshot Asset Picker (Grid 3 Columns)
  await page.screenshot({ path: 'test-results/transfer-03-asset-grid.png' })
  console.log('Saved test-results/transfer-03-asset-grid.png')

  await browser.close()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
