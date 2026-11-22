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

  // Close initial numpad drawer
  const closeBtn = await page.waitForSelector('button[aria-label="Tutup"]')
  await closeBtn.click()
  await new Promise((r) => setTimeout(r, 300))

  // Switch to transfer
  const transferTab = await page.waitForSelector('[data-testid="trx-type-transfer"]')
  await transferTab.click()
  await new Promise((r) => setTimeout(r, 300))

  // Open asset picker
  const fromBtn = await page.waitForSelector('[data-testid="trx-from-asset-button"]')
  await fromBtn.click()
  await page.waitForSelector('[data-testid="asset-picker"]')
  await new Promise((r) => setTimeout(r, 400))

  await page.screenshot({ path: 'test-results/asset-grid-3cols.png' })
  console.log('Saved test-results/asset-grid-3cols.png')

  await browser.close()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
