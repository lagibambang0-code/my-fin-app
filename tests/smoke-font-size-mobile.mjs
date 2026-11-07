import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'

const BASE_URL = 'http://localhost:3000'

async function run() {
  console.log('Testing Mobile Viewport Font Size & No-Truncation on Summary Cards (360x640)...')
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    // Small mobile viewport (360px width)
    await page.setViewport({ width: 360, height: 640 })

    await page.goto(`${BASE_URL}/transaksi`, { waitUntil: 'networkidle2' })
    await new Promise((r) => setTimeout(r, 1000))

    // Handle onboarding if open
    const onboardingBtn = await page.$('[data-testid="onboarding-submit"]')
    if (onboardingBtn) {
      await onboardingBtn.click()
      await new Promise((r) => setTimeout(r, 1500))
    }

    // Seed transaction with amount 1384000 (expense)
    console.log('1. Seeding transaction with Rp 1.384.000...')
    await page.evaluate(async () => {
      const d = new Date()
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const tx = {
        uid: 'test_large_amount',
        assetUid: 'ast_cash',
        DO_TYPE: 'expense',
        ZMONEY: '1384000',
        AMOUNT_ACCOUNT: 1384000,
        ctgUid: 'cat_exp_1',
        CATEGORY_NAME: 'Makanan',
        ZDATE: today,
        WDATE: `${today} 12:00:00`,
        wtime: '12:00',
        IS_DEL: 0,
        currencyUid: 'IDR_IDR',
        FEE: 0,
        MARK: 0,
        UTIME: Date.now(),
      }
      return new Promise((resolve, reject) => {
        const req = indexedDB.open('DompetkuDB')
        req.onsuccess = () => {
          const db = req.result
          const t = db.transaction(['transactions'], 'readwrite')
          t.objectStore('transactions').put(tx)
          t.oncomplete = () => resolve(true)
          t.onerror = () => reject(t.error)
        }
      })
    })

    // Reload /transaksi
    await page.goto(`${BASE_URL}/transaksi`, { waitUntil: 'networkidle2' })
    await new Promise((r) => setTimeout(r, 1000))

    // Check trx-summary-total
    console.log('2. Verifying Total on /transaksi summary card...')
    await page.waitForSelector('[data-testid="trx-summary-total"]', { timeout: 5000 })
    const totalElement = await page.$('[data-testid="trx-summary-total"]')
    assert.ok(totalElement, 'Total summary element must exist')

    const { text, scrollWidth, clientWidth } = await totalElement.evaluate((el) => ({
      text: el.textContent.trim(),
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }))

    console.log('Rendered Total text:', text)
    console.log(`Dimensions: clientWidth=${clientWidth}px, scrollWidth=${scrollWidth}px`)

    assert.equal(text, '-Rp 1.384.000', 'Total must be formatted as -Rp 1.384.000')
    assert.ok(!text.includes('...'), 'Total text must NOT be truncated with ellipsis')
    // Ensure text fits within client width (tolerance 2px for font rendering subpixels)
    assert.ok(scrollWidth <= clientWidth + 2, `Text overflow detected: scrollWidth (${scrollWidth}) > clientWidth (${clientWidth})`)
    console.log('✓ Total fits completely on 360px mobile screen without truncation!')

    // Check /accounts summary cards
    console.log('3. Checking /accounts summary cards on 360px screen...')
    await page.goto(`${BASE_URL}/accounts`, { waitUntil: 'networkidle2' })
    await new Promise((r) => setTimeout(r, 1000))

    await page.waitForSelector('[data-testid="asset-summary-total"]', { timeout: 5000 })
    const assetTotal = await page.$('[data-testid="asset-summary-total"]')
    const assetMetrics = await assetTotal.evaluate((el) => ({
      text: el.textContent.trim(),
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }))

    console.log('Asset Total text:', assetMetrics.text)
    console.log(`Asset dimensions: clientWidth=${assetMetrics.clientWidth}px, scrollWidth=${assetMetrics.scrollWidth}px`)
    assert.ok(!assetMetrics.text.includes('...'), 'Asset Total text must NOT be truncated with ellipsis')
    assert.ok(assetMetrics.scrollWidth <= assetMetrics.clientWidth + 2, 'Asset Total text fits without overflow')
    console.log('✓ Asset Total fits completely on 360px mobile screen without truncation!')

    console.log('\n=============================================')
    console.log('ALL MOBILE FONT SIZE TESTS PASSED (100%)!')
    console.log('=============================================')
  } finally {
    await browser.close()
  }
}

run().catch((err) => {
  console.error('Mobile font size test failed:', err)
  process.exit(1)
})
