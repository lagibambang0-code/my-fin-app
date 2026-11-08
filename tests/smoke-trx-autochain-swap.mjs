import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'

const BASE_URL = 'http://localhost:3000'

async function run() {
  console.log('Testing User Flow: Auto-Chaining (Total -> Selesai -> Kategori -> Aset) & Edit Mode...')
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
  // SKENARIO 1: Tambah Transaksi Baru
  // Alur: Total auto-focus (numpad open) -> Selesai -> Kategori auto-open ->
  //       Pilih Kategori -> Aset auto-open -> Pilih Aset -> Fokus Catatan
  // =========================================================================
  console.log('\n--- SKENARIO 1: Tambah Transaksi Baru ---')
  console.log('1. Membuka form transaksi via FAB...')
  const fab = await page.waitForSelector('[data-testid="trx-fab"]')
  await fab.click()
  await page.waitForSelector('[data-testid="transaction-form"]')
  await new Promise((r) => setTimeout(r, 400))

  // 1a. Input total otomatis aktif dan numpad otomatis terbuka
  console.log('1a. Memverifikasi Numpad otomatis terbuka saat form tambah baru dibuka...')
  const numpadKey1 = await page.waitForSelector('[data-testid="numpad-1"]', { timeout: 3000 })
  assert.ok(numpadKey1 != null, 'Numpad HARUS otomatis terbuka saat buka form transaksi baru!')
  console.log('✓ Numpad otomatis terbuka!')

  // 1b. Ketik nominal 25000 di Numpad
  console.log('1b. Mengetik 25.000 di Numpad...')
  await numpadKey1.click()
  const numpadKey2 = await page.waitForSelector('[data-testid="numpad-2"]')
  await numpadKey2.click()
  const numpadKey5 = await page.waitForSelector('[data-testid="numpad-5"]')
  await numpadKey5.click()
  const numpadKey00 = await page.waitForSelector('[data-testid="numpad-00"]')
  await numpadKey00.click()

  // 1c. Tekan tombol Selesai di Numpad
  console.log('1c. Menekan tombol "Selesai" di Numpad...')
  const numpadDone = await page.waitForSelector('[data-testid="numpad-done"]')
  await numpadDone.click()
  await new Promise((r) => setTimeout(r, 400))

  // 1d. Numpad menutup dan modal Kategori otomatis terbuka
  console.log('1d. Memverifikasi modal Kategori otomatis terbuka setelah Selesai ditekan...')
  const catPicker = await page.waitForSelector('[data-testid="category-picker"]', { timeout: 3000 })
  assert.ok(catPicker != null, 'Modal Kategori HARUS otomatis terbuka setelah Selesai ditekan!')
  console.log('✓ Modal Kategori otomatis terbuka!')

  // 1e. Pilih salah satu kategori
  console.log('1e. Memilih kategori...')
  const catOption = await page.waitForSelector('[data-testid^="category-option-"]')
  const catName = await catOption.evaluate((el) => el.textContent.trim())
  console.log('Memilih:', catName)
  await catOption.click()
  await new Promise((r) => setTimeout(r, 400))

  // 1f. Modal Aset otomatis terbuka (bukan Kas default)
  console.log('1f. Memverifikasi modal Aset otomatis terbuka setelah kategori dipilih...')
  const assetPicker = await page.waitForSelector('[data-testid="asset-picker"]', { timeout: 3000 })
  assert.ok(assetPicker != null, 'Modal Aset HARUS otomatis terbuka setelah kategori dipilih!')
  console.log('✓ Modal Aset otomatis terbuka!')

  // 1g. Pilih salah satu aset
  console.log('1g. Memilih aset...')
  const assetOptions = await page.$$('[data-testid^="picker-option-"]')
  assert.ok(assetOptions.length > 0, 'Opsi aset harus tersedia')
  await assetOptions[0].click()
  await new Promise((r) => setTimeout(r, 400))

  // 1h. Memverifikasi kursor langsung fokus ke input Catatan
  console.log('1h. Memverifikasi fokus kursor otomatis berpindah ke Catatan...')
  const isNoteFocused = await page.$eval('[data-testid="trx-note-input"]', (el) => el === document.activeElement)
  assert.ok(isNoteFocused, 'Input Catatan HARUS menerima fokus setelah aset dipilih!')
  console.log('✓ Input Catatan otomatis menerima fokus!')

  // 1i. Simpan transaksi
  console.log('1i. Menyimpan transaksi...')
  const saveBtn = await page.waitForSelector('[data-testid="trx-save"]')
  await saveBtn.click()
  await new Promise((r) => setTimeout(r, 1000))
  console.log('✓ Skenario 1 LULUS 100%!')

  // =========================================================================
  // SKENARIO 2: Form Edit Transaksi
  // Alur: Tidak ada numpad/modal/popup yang otomatis terbuka saat form edit dibuka.
  //       Tap total -> Numpad buka -> Tekan Selesai -> Numpad LANGSUNG MENUTUP
  //       (TIDAK membuka kategori).
  // =========================================================================
  console.log('\n--- SKENARIO 2: Form Edit Transaksi ---')
  console.log('2a. Mengklik transaksi yang baru dibuat untuk masuk ke mode edit...')
  const trxRow = await page.waitForSelector('[data-testid^="tx-row-"]')
  await trxRow.click()
  await page.waitForSelector('[data-testid="transaction-form"]')
  await new Promise((r) => setTimeout(r, 500))

  // 2b. Verifikasi tidak ada numpad atau modal yang otomatis terbuka
  console.log('2b. Memverifikasi Numpad TIDAK terbuka pada mode edit...')
  const numpadInEdit = await page.$('[data-testid="numpad-1"]')
  assert.equal(numpadInEdit, null, 'Numpad TIDAK BOLEH terbuka otomatis pada form edit!')
  const catInEdit = await page.$('[data-testid="category-picker"]')
  assert.equal(catInEdit, null, 'Modal Kategori TIDAK BOLEH terbuka otomatis pada form edit!')
  console.log('✓ Form edit bersih: tidak ada numpad/modal/popup yang otomatis terbuka!')

  // 2c. Tap Total untuk membuka Numpad manual
  console.log('2c. Mengetuk Total untuk membuka Numpad secara manual...')
  const amountDisplay = await page.waitForSelector('[data-testid="trx-amount-display"]')
  await amountDisplay.click()
  await new Promise((r) => setTimeout(r, 300))
  const numpadOpenedManual = await page.waitForSelector('[data-testid="numpad-1"]', { timeout: 3000 })
  assert.ok(numpadOpenedManual != null, 'Numpad harus terbuka setelah baris Total diketuk!')
  console.log('✓ Numpad berhasil dibuka manual!')

  // 2d. Tekan Selesai di Numpad pada mode edit -> Numpad LANGSUNG MENUTUP, TIDAK buka Kategori
  console.log('2d. Menekan "Selesai" di Numpad pada mode edit...')
  const doneEditBtn = await page.waitForSelector('[data-testid="numpad-done"]')
  await doneEditBtn.click()
  await new Promise((r) => setTimeout(r, 400))

  const numpadClosedEdit = await page.$('[data-testid="numpad-1"]')
  assert.equal(numpadClosedEdit, null, 'Numpad HARUS langsung menutup!')
  const catAfterDoneEdit = await page.$('[data-testid="category-picker"]')
  assert.equal(catAfterDoneEdit, null, 'Modal Kategori TIDAK BOLEH terbuka saat Selesai ditekan pada mode edit!')
  console.log('✓ Numpad langsung menutup dan TIDAK membuka kategori pada mode edit!')

  // Tutup form edit
  const backBtn = await page.waitForSelector('[data-testid="trx-form-back"]')
  await backBtn.click()
  await new Promise((r) => setTimeout(r, 500))
  console.log('✓ Skenario 2 LULUS 100%!')

  // =========================================================================
  // SKENARIO 3: Mode Transfer & Tombol Quick Swap
  // =========================================================================
  console.log('\n--- SKENARIO 3: Mode Transfer & Tombol Quick Swap ---')
  await fab.click()
  await page.waitForSelector('[data-testid="transaction-form"]')
  await new Promise((r) => setTimeout(r, 400))

  const transferTab = await page.waitForSelector('[data-testid="trx-type-transfer"]')
  await transferTab.click()
  await new Promise((r) => setTimeout(r, 400))

  const swapBtn = await page.waitForSelector('[data-testid="trx-swap-assets-button"]')
  assert.ok(swapBtn != null, 'Tombol swap cepat HARUS ada pada mode transfer!')
  console.log('✓ Tombol swap cepat ada!')

  // Pilih akun asal
  const fromBtn = await page.waitForSelector('[data-testid="trx-from-asset-button"]')
  await fromBtn.click()
  await page.waitForSelector('[data-testid="asset-picker"]')
  const fromOptions = await page.$$('[data-testid^="picker-option-"]')
  assert.ok(fromOptions.length >= 2, 'Harus ada minimal 2 akun')
  await fromOptions[0].click()
  await new Promise((r) => setTimeout(r, 400))

  // Karena transfer dan to belum ada, auto-buka akun tujuan!
  const toPicker = await page.waitForSelector('[data-testid="asset-picker"]')
  assert.ok(toPicker != null, 'Modal akun tujuan harus otomatis terbuka!')
  const toOptions = await page.$$('[data-testid^="picker-option-"]')
  await toOptions[1].click()
  await new Promise((r) => setTimeout(r, 400))

  const fromBefore = await page.$eval('[data-testid="trx-from-asset-value"]', (el) => el.textContent.trim())
  const toBefore = await page.$eval('[data-testid="trx-to-asset-value"]', (el) => el.textContent.trim())
  console.log(`Sebelum swap: Asal = "${fromBefore}", Tujuan = "${toBefore}"`)

  await swapBtn.click()
  await new Promise((r) => setTimeout(r, 300))
  const fromAfter = await page.$eval('[data-testid="trx-from-asset-value"]', (el) => el.textContent.trim())
  const toAfter = await page.$eval('[data-testid="trx-to-asset-value"]', (el) => el.textContent.trim())
  console.log(`Setelah swap: Asal = "${fromAfter}", Tujuan = "${toAfter}"`)
  assert.equal(fromAfter, toBefore, 'Akun asal harus bertukar posisi dengan akun tujuan!')
  assert.equal(toAfter, fromBefore, 'Akun tujuan harus bertukar posisi dengan akun asal!')
  console.log('✓ Swap berhasil!')

  await browser.close()
  console.log('\n============================================================')
  console.log('SELURUH SKENARIO ALUR PENGGUNA 100% TERVERIFIKASI & LULUS!')
  console.log('============================================================')
}

run().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
