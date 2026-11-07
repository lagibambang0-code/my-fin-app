import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'

const BASE_URL = 'http://localhost:3000'

async function run() {
  console.log('Testing Navigation Stack: Asset Tab -> Asset Detail -> Asset Form -> Back -> Asset Detail...')
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

    // Step 2: Click on an asset to open AssetDetail
    console.log('2. Clicking on an asset row to open AssetDetail...')
    await page.waitForSelector('[data-testid^="asset-row-"]', { timeout: 10000 })
    const assetRow = await page.$('[data-testid^="asset-row-"]')
    assert.ok(assetRow, 'Asset row must exist')
    await assetRow.click()
    await new Promise((r) => setTimeout(r, 500))

    // Step 3: Verify AssetDetail is open
    console.log('3. Verifying AssetDetail is open...')
    await page.waitForSelector('[data-testid="asset-detail"]', { timeout: 5000 })
    const detailVisible = await page.$eval('[data-testid="asset-detail"]', (el) => el !== null)
    assert.equal(detailVisible, true, 'AssetDetail must be open')
    console.log('✓ AssetDetail is open')

    // Step 4: Click the Edit button in AssetDetail header
    console.log('4. Clicking Edit button inside AssetDetail...')
    const editBtn = await page.$('[data-testid="asset-detail-edit-button"]')
    assert.ok(editBtn, 'Edit button must exist in AssetDetail')
    await editBtn.click()
    await new Promise((r) => setTimeout(r, 500))

    // Step 5: Verify AssetForm is open
    console.log('5. Verifying AssetForm is open...')
    await page.waitForSelector('[data-testid="asset-form"]', { timeout: 5000 })
    const formVisible = await page.$eval('[data-testid="asset-form"]', (el) => el !== null)
    assert.equal(formVisible, true, 'AssetForm must be open')
    console.log('✓ AssetForm is open on top of AssetDetail')

    // Step 6: Click Back / Close button in AssetForm header
    console.log('6. Clicking Close button on AssetForm...')
    const closeFormBtn = await page.$('[data-testid="asset-form"] header button[aria-label="Tutup"]')
    assert.ok(closeFormBtn, 'Close button must exist in AssetForm')
    await closeFormBtn.click()
    await new Promise((r) => setTimeout(r, 500))

    // Step 7: CRITICAL CHECK: AssetDetail MUST STILL BE VISIBLE!
    console.log('7. Verifying AssetDetail is STILL VISIBLE after closing AssetForm...')
    const isFormStillThere = await page.$('[data-testid="asset-form"]')
    assert.equal(isFormStillThere, null, 'AssetForm must be closed')

    const isDetailStillThere = await page.$('[data-testid="asset-detail"]')
    assert.ok(isDetailStillThere !== null, 'AssetDetail MUST STILL BE IN VIEW after closing AssetForm!')
    console.log('✓ SUCCESS: AssetDetail remained in view as expected (did not drop back to Tab Aset)!')

    // Step 8: Click Back button in AssetDetail header
    console.log('8. Clicking Back button on AssetDetail...')
    const closeDetailBtn = await page.$('[data-testid="asset-detail"] header button[aria-label="Kembali"]')
    assert.ok(closeDetailBtn, 'Close button must exist in AssetDetail')
    await closeDetailBtn.click()
    await new Promise((r) => setTimeout(r, 500))

    // Step 9: Verify user is now back on Tab Aset
    console.log('9. Verifying user returned to Tab Aset...')
    const isDetailGone = await page.$('[data-testid="asset-detail"]')
    assert.equal(isDetailGone, null, 'AssetDetail must now be closed')

    const isTabAset = await page.$('[data-testid="asset-summary"]')
    assert.ok(isTabAset !== null, 'User is now back on main Tab Aset')
    console.log('✓ Returned to Tab Aset cleanly on second back!')

    console.log('\n===========================================')
    console.log('NAVIGATION STACK TEST PASSED (100%)!')
    console.log('===========================================')
  } finally {
    await browser.close()
  }
}

run().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
