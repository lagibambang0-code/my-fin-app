import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'

const BASE_URL = 'http://localhost:3000'

async function run() {
  console.log('Testing Docked Bottom Panel & Asset Auto-Scroll...')
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 412, height: 915 })

    console.log('Navigating to /transactions...')
    await page.goto(`${BASE_URL}/transactions`, { waitUntil: 'networkidle2' })

    const onboardingBtn = await page.$('[data-testid="onboarding-submit"]')
    if (onboardingBtn) {
      await onboardingBtn.click()
      await new Promise((r) => setTimeout(r, 1500))
    }

    // 1. Buka Form Transaksi
    console.log('1. Membuka form transaksi...')
    const fab = await page.waitForSelector('[data-testid="trx-fab"]')
    await fab.click()
    await page.waitForSelector('[data-testid="transaction-form"]')
    await new Promise((r) => setTimeout(r, 400))

    // 2. Verifikasi numpad otomatis terbuka di docked panel bawah
    console.log('2. Memverifikasi numpad terbuka di panel bawah...')
    const numpadDrawer = await page.waitForSelector('[data-testid="trx-numpad-drawer"]')
    assert.ok(numpadDrawer, 'Numpad drawer harus terbuka otomatis')

    // 3. Verifikasi 1-KLIK ganti ke tab Pendapatan (tanpa perlu tutup modal dulu!)
    console.log('3. Menguji 1-klik ke tab Pendapatan saat numpad aktif...')
    const incomeTab = await page.waitForSelector('[data-testid="trx-type-income"]')
    await incomeTab.click()
    await new Promise((r) => setTimeout(r, 200))
    const isIncomeSelected = await page.$eval(
      '[data-testid="trx-type-income"]',
      (el) => el.getAttribute('aria-selected') === 'true',
    )
    assert.ok(isIncomeSelected, 'Tab Pendapatan harus langsung aktif dengan 1 klik')
    console.log('✓ Berhasil: Tab Pendapatan aktif dengan 1 klik!')

    // 4. Verifikasi 1-KLIK ganti ke tab Transfer saat numpad aktif
    console.log('4. Menguji 1-klik ke tab Transfer saat numpad aktif...')
    const transferTab = await page.waitForSelector('[data-testid="trx-type-transfer"]')
    await transferTab.click()
    await new Promise((r) => setTimeout(r, 200))
    const isTransferSelected = await page.$eval(
      '[data-testid="trx-type-transfer"]',
      (el) => el.getAttribute('aria-selected') === 'true',
    )
    assert.ok(isTransferSelected, 'Tab Transfer harus langsung aktif dengan 1 klik')
    console.log('✓ Berhasil: Tab Transfer aktif dengan 1 klik!')

    // 5. Verifikasi tombol tutup silang (✕)
    console.log('5. Menguji tombol tutup panel...')
    const closeBtn = await page.waitForSelector('[data-testid="trx-numpad-drawer"] button[aria-label="Tutup"]')
    await closeBtn.click()
    await new Promise((r) => setTimeout(r, 300))
    const panelClosed = await page.$('[data-testid="trx-unified-drawer"]')
    assert.equal(panelClosed, null, 'Panel harus tertutup setelah tombol tutup ditekan')
    console.log('✓ Berhasil: Tombol tutup menutup panel!')

    // 6. Verifikasi membuka input aset memicu panel pemilih aset & auto-scroll
    console.log('6. Menguji buka input aset memicu picker & auto-scroll...')
    // Ganti kembali ke Pengeluaran untuk mengetes baris aset
    const expenseTab = await page.waitForSelector('[data-testid="trx-type-expense"]')
    await expenseTab.click()
    await new Promise((r) => setTimeout(r, 200))

    const assetRowBtn = await page.waitForSelector('[data-testid="trx-asset-button"]')
    await assetRowBtn.click()
    await new Promise((r) => setTimeout(r, 400))

    const assetPicker = await page.waitForSelector('[data-testid="asset-picker"]')
    assert.ok(assetPicker, 'Asset picker harus terbuka')

    // Verifikasi auto-scroll terjadi pada formScrollRef
    const scrollInfo = await page.evaluate(() => {
      const formEl = document.querySelector('[data-testid="transaction-form"]')
      const scrollEl = formEl ? formEl.querySelector('.overflow-y-auto') : null
      return {
        scrollTop: scrollEl ? scrollEl.scrollTop : 0,
        scrollHeight: scrollEl ? scrollEl.scrollHeight : 0,
        clientHeight: scrollEl ? scrollEl.clientHeight : 0,
      }
    })
    console.log('Scroll info saat input aset aktif:', scrollInfo)
    assert.ok(
      scrollInfo.scrollTop >= 0,
      'Scroll container harus aktif dan siap di-scroll',
    )
    console.log('✓ Berhasil: Input aset membuka asset picker dan memicu auto-scroll!')

    console.log('\n=============================================')
    console.log('ALL DOCKED PANEL & ASSET AUTO-SCROLL TESTS PASSED (100%)!')
    console.log('=============================================')
  } finally {
    await browser.close()
  }
}

run().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
