import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'

const BASE_URL = 'http://localhost:3000'

async function run() {
  console.log('Testing Parity of Asset Order: Tab Aset vs Form Transaksi...')
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844 })

  // 1. Ambil urutan aset di Tab Aset (/accounts)
  console.log('1. Mengambil urutan aset di Tab Aset (/accounts)...')
  await page.goto(`${BASE_URL}/accounts`, { waitUntil: 'networkidle2' })

  const onboardingBtn = await page.$('[data-testid="onboarding-submit"]')
  if (onboardingBtn) {
    await onboardingBtn.click()
    await new Promise((r) => setTimeout(r, 1500))
  }

  await page.waitForSelector('[data-testid^="asset-group-"]')
  const tabAsetNames = await page.$$eval('[data-testid^="asset-row-"]', (els) =>
    els.map((el) => {
      const nameSpan = el.querySelector('span span')
      return nameSpan ? nameSpan.textContent.trim() : el.textContent.trim()
    }).filter(Boolean)
  )
  console.log('Urutan aset di Tab Aset:', tabAsetNames)
  assert.ok(tabAsetNames.length > 0, 'Harus ada aset di Tab Aset')

  // 2. Buka Form Transaksi di /transactions dan buka pemilih aset
  console.log('2. Membuka form transaksi di /transactions...')
  await page.goto(`${BASE_URL}/transactions`, { waitUntil: 'networkidle2' })

  const fab = await page.waitForSelector('[data-testid="trx-fab"]')
  await fab.click()
  await page.waitForSelector('[data-testid="transaction-form"]')
  await new Promise((r) => setTimeout(r, 400))

  // Buka pemilih aset (klik tombol baris Aset)
  console.log('3. Membuka pemilih aset di Form Transaksi...')
  // Jika numpad terbuka, tutup dulu atau klik tombol aset
  const closeNumpad = await page.$('button[aria-label="Tutup"]')
  if (closeNumpad) {
    await closeNumpad.click()
    await new Promise((r) => setTimeout(r, 300))
  }

  const assetRowBtn = await page.waitForSelector('[data-testid="trx-asset-button"]')
  await assetRowBtn.click()
  await page.waitForSelector('[data-testid="asset-picker"]')
  await new Promise((r) => setTimeout(r, 300))

  // Ambil urutan opsi aset pada grid 3 kolom
  const formTrxAssetNames = await page.$$eval('[data-testid^="picker-option-"]', (els) =>
    els.map((el) => {
      // Ambil elemen span label nama aset
      const nameEl = el.querySelector('span')
      return nameEl ? nameEl.textContent.trim() : el.textContent.trim()
    }).filter(Boolean)
  )
  console.log('Urutan aset di Form Transaksi:', formTrxAssetNames)

  // 4. Verifikasi kecocokan urutan 100%
  console.log('4. Memverifikasi apakah urutan keduanya identik...')
  assert.deepEqual(
    formTrxAssetNames,
    tabAsetNames,
    `Urutan aset di Form Transaksi (${JSON.stringify(formTrxAssetNames)}) HARUS sama persis dengan Tab Aset (${JSON.stringify(tabAsetNames)})!`
  )
  console.log('✓ SUKSES: Urutan aset pada form transaksi 100% identik dengan urutan di Tab Aset!')

  await browser.close()
  console.log('\n============================================================')
  console.log('PENGUJIAN PARITAS URUTAN ASET 100% TERVERIFIKASI & LULUS!')
  console.log('============================================================')
}

run().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
