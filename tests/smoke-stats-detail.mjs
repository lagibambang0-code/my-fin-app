import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'

const BASE_URL = 'http://localhost:3000'

async function run() {
  console.log('Testing StatistikDetail: (1) No 0 Lainnya subcategory, (2) Click date header to add transaction...')
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 390, height: 844 })
    page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message, e.stack))
    page.on('console', (m) => {
      if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text())
    })

    // Step 1: Open /stats
    console.log('1. Loading /stats...')
    await page.goto(`${BASE_URL}/stats`, { waitUntil: 'networkidle2' })
    await new Promise((r) => setTimeout(r, 1000))

    // Handle onboarding if open
    const onboardingBtn = await page.$('[data-testid="onboarding-submit"]')
    if (onboardingBtn) {
      await onboardingBtn.click()
      await new Promise((r) => setTimeout(r, 1500))
    }
    // Seed an expense transaction directly into IndexedDB so a category appears in stats
    const seededCat = await page.evaluate(async () => {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open('DompetkuDB')
        req.onsuccess = () => {
          const db = req.result
          const t = db.transaction(['categories', 'transactions'], 'readwrite')
          const catReq = t.objectStore('categories').getAll()
          catReq.onsuccess = () => {
            const cats = catReq.result.filter((c) => c.TYPE === 1)
            const firstCat = cats[0]
            const d = new Date()
            const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            const tx = {
              uid: 'smoke_stat_tx',
              assetUid: 'ast_cash',
              DO_TYPE: 'expense',
              ZMONEY: '25000',
              AMOUNT_ACCOUNT: 25000,
              ctgUid: firstCat ? firstCat.uid : 'cat_exp_1',
              CATEGORY_NAME: firstCat ? firstCat.NAME : 'Makanan',
              ZDATE: today,
              WDATE: `${today} 14:00:00`,
              wtime: '14:00',
              IS_DEL: 0,
              currencyUid: 'IDR_IDR',
              FEE: 0,
              MARK: 0,
              UTIME: Date.now(),
            }
            t.objectStore('transactions').put(tx)
            t.oncomplete = () => resolve(firstCat)
          }
          t.onerror = () => reject(t.error)
        }
      })
    })
    console.log('Seeded transaction for category:', seededCat?.NAME)

    // Reload /stats to pick up the new transaction
    await page.goto(`${BASE_URL}/stats`, { waitUntil: 'networkidle2' })
    await new Promise((r) => setTimeout(r, 1000))
    console.log('DOM on /stats:', (await page.evaluate(() => document.body.innerText)).slice(0, 400))

    // Step 3: Click on the category row to open StatistikDetail
    console.log('2. Clicking on a category in /stats to open StatistikDetail...')
    await page.waitForSelector('[data-testid^="stats-row-"]', { timeout: 10000 })
    const categoryRow = await page.$('[data-testid^="stats-row-"]')
    await categoryRow.evaluate((el) => {
      el.scrollIntoView({ block: 'center' })
      el.click()
    })
    await new Promise((r) => setTimeout(r, 1000))

    // Step 4: Verify StatistikDetail is open
    console.log('3. Verifying StatistikDetail is open...')
    await page.waitForSelector('[data-testid="stats-detail"]', { timeout: 5000 })
    console.log('✓ StatistikDetail is open')

    // Step 5: Verify that "Lainnya" with 0 is NOT rendered!
    console.log('4. Checking that sub-category "Lainnya" (0%) is NOT rendered...')
    const restRow = await page.$('[data-testid="stats-detail-sub-rest"]')
    if (restRow) {
      const restText = await restRow.evaluate((el) => el.textContent)
      console.log('Found rest row content:', restText)
      assert.ok(!restText.match(/\b0%\b/) && !restText.includes('Rp 0'), 'Subcategory Lainnya with 0 amount must not be displayed!')
    } else {
      console.log('✓ Subcategory "Lainnya" with 0 is not rendered (null)!')
    }

    // Step 6: Verify clicking the date header in StatistikDetail opens TransactionForm!
    console.log('5. Clicking date header inside StatistikDetail...')
    await page.waitForSelector('[data-testid="stats-detail-transactions"] [data-testid^="day-group-"] h2', { timeout: 5000 })
    const dateHeader = await page.$('[data-testid="stats-detail-transactions"] [data-testid^="day-group-"] h2')
    assert.ok(dateHeader, 'Date header must exist in StatistikDetail')
    await dateHeader.click()
    await new Promise((r) => setTimeout(r, 800))

    // Step 7: Verify TransactionForm is open
    console.log('6. Verifying TransactionForm is open...')
    await page.waitForSelector('[data-testid="transaction-form"]', { timeout: 5000 })
    const formVisible = await page.$eval('[data-testid="transaction-form"]', (el) => el !== null)
    assert.equal(formVisible, true, 'TransactionForm must open when date header is clicked in StatistikDetail!')
    console.log('✓ TransactionForm opened successfully from date header in StatistikDetail!')

    // Step 8: Close form and verify still in StatistikDetail
    console.log('7. Closing TransactionForm...')
    const closeBtn = await page.$('[data-testid="transaction-form"] header button[aria-label="Kembali"]')
    assert.ok(closeBtn, 'Close button must exist')
    await closeBtn.click()
    await new Promise((r) => setTimeout(r, 500))

    const statsDetailStillOpen = await page.$('[data-testid="stats-detail"]')
    assert.ok(statsDetailStillOpen !== null, 'StatistikDetail must remain open after closing TransactionForm')
    console.log('✓ StatistikDetail remains open after closing TransactionForm!')

    console.log('\n=============================================')
    console.log('ALL STATS DETAIL SMOKE TESTS PASSED (100%)!')
    console.log('=============================================')
  } finally {
    await browser.close()
  }
}

run().catch((err) => {
  console.error('Smoke test failed:', err)
  process.exit(1)
})
