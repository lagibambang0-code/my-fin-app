import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'

const BASE_URL = 'http://localhost:3000'

async function run() {
  console.log('Testing Add Transaction via Date Header in AssetDetail (POV Per Aset)...')
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 390, height: 844 })

    // Step 1: Open Tab Aset (/accounts)
    console.log('1. Loading /accounts...')
    await page.goto(`${BASE_URL}/accounts`, { waitUntil: 'networkidle2' })
    await new Promise((r) => setTimeout(r, 1000))

    // Handle onboarding if open
    const onboardingBtn = await page.$('[data-testid="onboarding-submit"]')
    if (onboardingBtn) {
      await onboardingBtn.click()
      await new Promise((r) => setTimeout(r, 1500))
    }

    // Step 2: Click on an asset row to open AssetDetail
    console.log('2. Clicking on an asset row to open AssetDetail...')
    await page.waitForSelector('[data-testid^="asset-row-"]', { timeout: 10000 })
    const assetRow = await page.$('[data-testid^="asset-row-"]')
    assert.ok(assetRow, 'Asset row must exist')
    await assetRow.click()
    await new Promise((r) => setTimeout(r, 1000))

    // Step 3: Verify AssetDetail is open
    console.log('3. Verifying AssetDetail is open...')
    await page.waitForSelector('[data-testid="asset-detail"]', { timeout: 5000 })

    // Step 4: Check if there are date headers in AssetDetail.
    // If no transactions yet, record one first via FAB so we have a date header
    let dateHeader = await page.$('[data-testid="asset-detail"] [data-testid^="day-group-"] h2')
    if (!dateHeader) {
      console.log('No transactions yet in this asset. Creating one via FAB...')
      const fabBtn = await page.$('[data-testid="asset-detail-fab"]')
      assert.ok(fabBtn, 'FAB must exist in AssetDetail')
      await fabBtn.click()
      await new Promise((r) => setTimeout(r, 800))

      // Type amount 10000
      await page.waitForSelector('[data-testid="numpad-1"]', { timeout: 5000 })
      await page.click('[data-testid="numpad-1"]')
      await page.click('[data-testid="numpad-0"]')
      await page.click('[data-testid="numpad-0"]')
      await page.click('[data-testid="numpad-0"]')
      await page.click('[data-testid="numpad-0"]')
      await page.click('[data-testid="numpad-done"]')
      await new Promise((r) => setTimeout(r, 300))

      // Select category
      await page.click('[data-testid="trx-category-button"]')
      await page.waitForSelector('[data-testid^="category-option-"]', { timeout: 5000 })
      const catOption = await page.$('[data-testid^="category-option-"]')
      assert.ok(catOption, 'Category option must exist')
      await catOption.click()
      await new Promise((r) => setTimeout(r, 500))

      // Save
      await page.click('[data-testid="trx-save"]')
      await new Promise((r) => setTimeout(r, 1500))
    }

    // Now verify date header exists in AssetDetail
    console.log('4. Locating date header in AssetDetail...')
    await page.waitForSelector('[data-testid="asset-detail"] [data-testid^="day-group-"] h2', { timeout: 5000 })
    dateHeader = await page.$('[data-testid="asset-detail"] [data-testid^="day-group-"] h2')
    assert.ok(dateHeader, 'Date header must exist in AssetDetail')

    const dateText = await dateHeader.evaluate((el) => el.getAttribute('aria-label') || el.textContent)
    console.log('Clicking date header:', dateText)

    // Step 5: Click on the date header!
    await dateHeader.click()
    await new Promise((r) => setTimeout(r, 800))

    // Step 6: Verify TransactionForm opens!
    console.log('5. Verifying TransactionForm opened from clicking date header...')
    await page.waitForSelector('[data-testid="transaction-form"]', { timeout: 5000 })
    const formVisible = await page.$eval('[data-testid="transaction-form"]', (el) => el !== null)
    assert.equal(formVisible, true, 'TransactionForm MUST open when clicking on date header in AssetDetail!')
    console.log('✓ TransactionForm successfully opened from date header in AssetDetail!')

    // Close form
    const closeBtn = await page.$('[data-testid="transaction-form"] header button[aria-label="Kembali"]')
    assert.ok(closeBtn, 'Close button must exist')
    await closeBtn.click()
    await new Promise((r) => setTimeout(r, 500))

    // Verify still in AssetDetail
    const detailStillOpen = await page.$('[data-testid="asset-detail"]')
    assert.ok(detailStillOpen !== null, 'AssetDetail must remain open after closing form')
    console.log('✓ AssetDetail remains open after closing form')

    console.log('\n===========================================')
    console.log('ASSET DETAIL ADD BY DATE TEST PASSED (100%)!')
    console.log('===========================================')
  } finally {
    await browser.close()
  }
}

run().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
