import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'

const BASE_URL = 'http://localhost:3000'

async function run() {
  console.log('Testing Transfer Auto-Focus with Fee & 3-Column Asset Grid...')
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844 })

  await page.goto(`${BASE_URL}/transactions`, { waitUntil: 'networkidle2' })

  const onboardingBtn = await page.$('[data-testid="onboarding-submit"]')
  if (onboardingBtn) {
    await onboardingBtn.click()
    await new Promise((r) => setTimeout(r, 1500))
  }

  // =========================================================================
  // SKENARIO 1: Transfer DENGAN membuka kolom biaya
  // Alur: Buka Transfer -> Buka Biaya (+ Biaya) -> Ketik Total -> Selesai
  //       -> Otomatis ke Biaya -> Ketik Biaya -> Selesai
  //       -> Otomatis ke Aset Keluar (Grid 3 Kolom) -> Pilih Aset
  //       -> Otomatis ke Aset Masuk (Grid 3 Kolom) -> Pilih Aset
  //       -> Selesai, fokus ke Catatan!
  // =========================================================================
  console.log('\n--- SKENARIO 1: Transfer dengan membuka kolom biaya ---')
  const fab = await page.waitForSelector('[data-testid="trx-fab"]')
  await fab.click()
  await page.waitForSelector('[data-testid="transaction-form"]')
  await new Promise((r) => setTimeout(r, 400))

  // Tutup drawer numpad default agar bisa memilih tab Transfer
  const closeDrawerBtn = await page.waitForSelector('button[aria-label="Tutup"]')
  await closeDrawerBtn.click()
  await new Promise((r) => setTimeout(r, 300))

  // Pilih tab Transfer
  console.log('1a. Memilih tab Transfer...')
  const transferTab = await page.waitForSelector('[data-testid="trx-type-transfer"]')
  await transferTab.click()
  await new Promise((r) => setTimeout(r, 300))

  // Buka kolom biaya dengan menekan tombol "+ Biaya"
  console.log('1b. Membuka kolom biaya lewat tombol "+ Biaya"...')
  const feeBtn = await page.waitForSelector('[data-testid="trx-fee-button"]')
  await feeBtn.click()
  await new Promise((r) => setTimeout(r, 300))

  // Verifikasi drawer Biaya terbuka
  const feeSheet = await page.waitForSelector('[data-testid="trx-fee-sheet"]')
  assert.ok(feeSheet != null, 'Drawer Biaya harus terbuka!')
  console.log('✓ Drawer Biaya berhasil terbuka!')

  // Tutup drawer Biaya sebentar untuk mulai dari Total
  const closeFeeDrawer = await page.waitForSelector('button[aria-label="Tutup"]')
  await closeFeeDrawer.click()
  await new Promise((r) => setTimeout(r, 300))

  // Buka Total
  console.log('1c. Membuka numpad Total dan mengetik 100.000...')
  const totalDisplay = await page.waitForSelector('[data-testid="trx-amount-display"]')
  await totalDisplay.click()
  await new Promise((r) => setTimeout(r, 300))

  // Ketik 100.000
  await (await page.waitForSelector('[data-testid="numpad-1"]')).click()
  await (await page.waitForSelector('[data-testid="numpad-00"]')).click()
  await (await page.waitForSelector('[data-testid="numpad-000"]', { timeout: 1000 }).catch(async () => {
    await (await page.waitForSelector('[data-testid="numpad-00"]')).click()
    await (await page.waitForSelector('[data-testid="numpad-0"]')).click()
  }))

  // Tekan Selesai pada Total
  console.log('1d. Menekan "Selesai" pada Total -> Harus auto-focus ke Biaya...')
  const doneNumpad = await page.waitForSelector('[data-testid="numpad-done"]')
  await doneNumpad.click()
  await new Promise((r) => setTimeout(r, 400))

  // Drawer Biaya HARUS otomatis terbuka!
  const feeDrawerAuto = await page.waitForSelector('[data-testid="trx-fee-sheet"]', { timeout: 3000 })
  assert.ok(feeDrawerAuto != null, 'Drawer Biaya HARUS otomatis terbuka setelah Total!')
  console.log('✓ Auto-focus: Biaya otomatis terbuka setelah Total!')

  // Ketik nominal biaya 2.500
  console.log('1e. Mengetik biaya 2.500...')
  await (await page.waitForSelector('[data-testid="fee-numpad-2"]')).click()
  await (await page.waitForSelector('[data-testid="fee-numpad-5"]')).click()
  await (await page.waitForSelector('[data-testid="fee-numpad-00"]')).click()

  // Tekan Selesai pada Biaya
  console.log('1f. Menekan "Selesai" pada Biaya -> Harus auto-focus ke Aset Keluar...')
  const doneFee = await page.waitForSelector('[data-testid="trx-fee-sheet-done"]')
  await doneFee.click()
  await new Promise((r) => setTimeout(r, 400))

  // Drawer Aset Keluar HARUS otomatis terbuka
  const assetFromPicker = await page.waitForSelector('[data-testid="asset-picker"]', { timeout: 3000 })
  assert.ok(assetFromPicker != null, 'Drawer Aset Keluar HARUS otomatis terbuka setelah Biaya!')
  console.log('✓ Auto-focus: Aset Keluar otomatis terbuka setelah Biaya!')

  // Verifikasi Tampilan Aset menggunakan Grid 3 Kolom!
  console.log('1g. Memverifikasi layout grid 3 kolom pada pemilih aset...')
  const isGrid3Cols = await page.$eval('[data-testid="asset-picker"] .grid', (el) =>
    el.classList.contains('grid-cols-3')
  )
  assert.equal(isGrid3Cols, true, 'Pemilih aset HARUS menggunakan grid-cols-3!')
  console.log('✓ Layout pemilih aset terverifikasi: grid 3 kolom (grid-cols-3)!')

  // Pilih Aset Keluar (opsi pertama)
  console.log('1h. Memilih Aset Keluar...')
  const assetOptions = await page.$$('[data-testid^="picker-option-"]')
  assert.ok(assetOptions.length >= 2, 'Harus ada minimal 2 akun untuk transfer')
  await assetOptions[0].click()
  await new Promise((r) => setTimeout(r, 400))

  // Drawer Aset Masuk HARUS otomatis terbuka!
  console.log('1i. Memverifikasi Aset Masuk otomatis terbuka...')
  const assetToPicker = await page.waitForSelector('[data-testid="asset-picker"]', { timeout: 3000 })
  assert.ok(assetToPicker != null, 'Drawer Aset Masuk HARUS otomatis terbuka!')
  console.log('✓ Auto-focus: Aset Masuk otomatis terbuka setelah Aset Keluar!')

  // Pilih Aset Masuk (opsi kedua)
  console.log('1j. Memilih Aset Masuk...')
  const assetOptionsTo = await page.$$('[data-testid^="picker-option-"]')
  await assetOptionsTo[1].click()
  await new Promise((r) => setTimeout(r, 400))

  // Kursor HARUS fokus ke Catatan
  console.log('1k. Memverifikasi input Catatan otomatis menerima fokus...')
  const isNoteFocused = await page.$eval('[data-testid="trx-note-input"]', (el) => el === document.activeElement)
  assert.ok(isNoteFocused, 'Input Catatan HARUS menerima fokus setelah alur transfer selesai!')
  console.log('✓ Input Catatan otomatis menerima fokus!')

  // Tutup form
  const backBtn = await page.waitForSelector('[data-testid="trx-form-back"]')
  await backBtn.click()
  await new Promise((r) => setTimeout(r, 500))

  // =========================================================================
  // SKENARIO 2: Transfer TANPA membuka kolom biaya (Default)
  // Alur: Buka Transfer -> Total -> Selesai -> Langsung ke Aset Keluar (skip Biaya)
  // =========================================================================
  console.log('\n--- SKENARIO 2: Transfer TANPA membuka kolom biaya ---')
  await fab.click()
  await page.waitForSelector('[data-testid="transaction-form"]')
  await new Promise((r) => setTimeout(r, 400))

  const closeDrawerBtn2 = await page.waitForSelector('button[aria-label="Tutup"]')
  await closeDrawerBtn2.click()
  await new Promise((r) => setTimeout(r, 300))

  const transferTab2 = await page.waitForSelector('[data-testid="trx-type-transfer"]')
  await transferTab2.click()
  await new Promise((r) => setTimeout(r, 300))

  // Buka Total dan ketik nominal
  const totalDisplay2 = await page.waitForSelector('[data-testid="trx-amount-display"]')
  await totalDisplay2.click()
  await new Promise((r) => setTimeout(r, 300))

  await (await page.waitForSelector('[data-testid="numpad-5"]')).click()
  await (await page.waitForSelector('[data-testid="numpad-00"]')).click()

  // Tekan Selesai pada Total
  const doneNumpad2 = await page.waitForSelector('[data-testid="numpad-done"]')
  await doneNumpad2.click()
  await new Promise((r) => setTimeout(r, 400))

  // Drawer Biaya TIDAK boleh muncul, harus langsung ke Aset Keluar
  const feeDrawerCheck = await page.$('[data-testid="trx-fee-sheet"]')
  assert.equal(feeDrawerCheck, null, 'Drawer Biaya TIDAK boleh terbuka jika kolom biaya tidak dibuka!')
  const assetPickerNoFee = await page.waitForSelector('[data-testid="asset-picker"]', { timeout: 3000 })
  assert.ok(assetPickerNoFee != null, 'Drawer Aset Keluar HARUS langsung terbuka!')
  console.log('✓ Sukses: Tanpa membuka biaya, alur langsung melompat ke Aset Keluar!')

  await browser.close()
  console.log('\n============================================================')
  console.log('SEMUA PENGUJIAN AUTO-FOCUS TRANSFER & GRID ASET 100% SUKSES!')
  console.log('============================================================')
}

run().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
