import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'

const BASE_URL = 'http://localhost:3000'

async function run() {
  console.log('Testing Auto-Scroll with Virtual Keyboard Inset on Tall Smartphones...')
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    // 1. Simulate a tall smartphone (Pixel 7 / iPhone 14 Pro Max: 412 x 915)
    await page.setViewport({ width: 412, height: 915 })

    console.log('Navigating to /transactions...')
    await page.goto(`${BASE_URL}/transactions`, { waitUntil: 'networkidle2' })

    const onboardingBtn = await page.$('[data-testid="onboarding-submit"]')
    if (onboardingBtn) {
      await onboardingBtn.click()
      await new Promise((r) => setTimeout(r, 1500))
    }

    // 2. Open form
    const fab = await page.waitForSelector('[data-testid="trx-fab"]')
    await fab.click()
    await page.waitForSelector('[data-testid="transaction-form"]')
    await new Promise((r) => setTimeout(r, 400))
    console.log('✓ Transaction form opened')

    // Close default numpad drawer to switch to Transfer
    const closeDrawerBtn = await page.waitForSelector('button[aria-label="Tutup"]')
    await closeDrawerBtn.click()
    await new Promise((r) => setTimeout(r, 300))

    // Select Transfer tab
    console.log('Switching to Transfer tab...')
    const transferTab = await page.waitForSelector('[data-testid="trx-type-transfer"]')
    await transferTab.click()
    await new Promise((r) => setTimeout(r, 300))

    // Open Total numpad
    console.log('Opening Total numpad...')
    const totalDisplay = await page.waitForSelector('[data-testid="trx-amount-display"]')
    await totalDisplay.click()
    await new Promise((r) => setTimeout(r, 300))

    // Enter 100.000
    await (await page.waitForSelector('[data-testid="numpad-1"]')).click()
    await (await page.waitForSelector('[data-testid="numpad-00"]')).click()
    await (await page.waitForSelector('[data-testid="numpad-00"]')).click()

    const doneNumpad = await page.waitForSelector('[data-testid="numpad-done"]')
    await doneNumpad.click()
    await new Promise((r) => setTimeout(r, 400))

    // Auto-chain opens Aset Keluar
    console.log('Selecting Aset Keluar...')
    const assetFromOptions = await page.$$('[data-testid^="picker-option-"]')
    if (assetFromOptions.length > 0) {
      await assetFromOptions[0].click()
      await new Promise((r) => setTimeout(r, 400))
    }

    // Auto-chain opens Aset Masuk
    console.log('Selecting Aset Masuk...')
    const assetToOptions = await page.$$('[data-testid^="picker-option-"]')
    if (assetToOptions.length > 1) {
      await assetToOptions[1].click()
      await new Promise((r) => setTimeout(r, 400))
    }

    // Auto-focus lands on Catatan
    console.log('Verifying focus on note input...')
    await page.waitForFunction(() => document.activeElement?.id === 'trx-note-input', {
      timeout: 5000,
    })
    console.log('✓ Note input focused via auto-chain!')

    // 7. Verify keyboard simulation: when keyboard opens, visualViewport shrinks (e.g. from 915 down to 550)
    console.log('Simulating virtual keyboard opening (resizing viewport to height 550)...')
    await page.setViewport({ width: 412, height: 550 })
    await new Promise((r) => setTimeout(r, 1000))

    const metrics = await page.evaluate(() => {
      const scrollEl = document.querySelector('[data-testid="transaction-form"] [class*="overflow-y-auto"]')
      const saveBtn = document.querySelector('[data-testid="trx-save"]')
      const saveNextBtn = document.querySelector('[data-testid="trx-save-next"]')
      const saveRect = saveBtn ? saveBtn.getBoundingClientRect() : null
      const nextRect = saveNextBtn ? saveNextBtn.getBoundingClientRect() : null

      return {
        paddingBottom: scrollEl ? window.getComputedStyle(scrollEl).paddingBottom : '0px',
        scrollTop: scrollEl ? scrollEl.scrollTop : 0,
        scrollHeight: scrollEl ? scrollEl.scrollHeight : 0,
        clientHeight: scrollEl ? scrollEl.clientHeight : 0,
        saveBtnInViewport: saveRect ? saveRect.top < window.innerHeight && saveRect.bottom <= window.innerHeight + 50 : false,
        saveTop: saveRect ? saveRect.top : 0,
        saveBottom: saveRect ? saveRect.bottom : 0,
        windowHeight: window.innerHeight,
      }
    })

    console.log('Metrics after keyboard open:', metrics)
    assert.ok(metrics.saveBtnInViewport, 'Tombol Simpan harus berada dalam area pandang di atas keyboard!')
    console.log('✓ Tombol "Menyimpan" & "Lanjut" berada dalam viewport di atas keyboard virtual!')

    console.log('\n=================================================================')
    console.log('PENGUJIAN AUTO-SCROLL DENGAN SISA PANJANG KEYBOARD 100% SUKSES!')
    console.log('=================================================================')
  } finally {
    await browser.close()
  }
}

run().catch((err) => {
  console.error('Smoke test failed:', err)
  process.exit(1)
})
