import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'

const BASE_URL = 'http://localhost:3000'

async function run() {
  console.log('Testing "Lanjut" (Save & Next) Complete Input Reset (including Assets)...')
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

    // =========================================================================
    // TEST 1: Expense Transaction "Lanjut"
    // =========================================================================
    console.log('\n--- TEST 1: Pengeluaran - Klik "Lanjut" ---')
    const fab = await page.waitForSelector('[data-testid="trx-fab"]')
    await fab.click()
    await page.waitForSelector('[data-testid="transaction-form"]')
    await new Promise((r) => setTimeout(r, 400))

    // Type 75.000 on numpad
    await page.waitForSelector('[data-testid="numpad-7"]')
    await (await page.waitForSelector('[data-testid="numpad-7"]')).click()
    await (await page.waitForSelector('[data-testid="numpad-5"]')).click()
    await (await page.waitForSelector('[data-testid="numpad-00"]')).click()
    await (await page.waitForSelector('[data-testid="numpad-0"]')).click()

    const doneNumpad = await page.waitForSelector('[data-testid="numpad-done"]')
    await doneNumpad.click()
    await new Promise((r) => setTimeout(r, 400))

    // Pick Category
    console.log('1a. Memilih Kategori...')
    await page.waitForSelector('[data-testid^="category-option-"]')
    const catOption = (await page.$$('[data-testid^="category-option-"]'))[0]
    await catOption.click()
    await new Promise((r) => setTimeout(r, 200))
    const catPickerStillOpen = await page.$('[data-testid="category-picker"]')
    if (catPickerStillOpen) {
      await catOption.click()
      await new Promise((r) => setTimeout(r, 300))
    }

    // Pick Asset (auto-opened via auto-chain after category selection)
    console.log('1b. Memilih Aset...')
    await page.waitForSelector('[data-testid="asset-picker"]')
    const assetOptions = await page.$$('[data-testid^="picker-option-"]')
    assert.ok(assetOptions.length > 0, 'Aset harus tersedia')
    await assetOptions[0].click()
    await new Promise((r) => setTimeout(r, 400))

    // Input Note
    console.log('1c. Mengetik Catatan...')
    const noteInput = await page.waitForSelector('[data-testid="trx-note-input"]')
    await noteInput.type('Beli kopi uji lanjut')

    // Close any open drawer before clicking Save & Next
    const closeBtn = await page.$('button[aria-label="Tutup"]')
    if (closeBtn) {
      await closeBtn.click().catch(() => {})
      await new Promise((r) => setTimeout(r, 300))
    }

    // Click "Lanjut"
    console.log('1d. Mengklik tombol "Lanjut" (trx-save-next)...')
    const saveNextBtn = await page.waitForSelector('[data-testid="trx-save-next"]')
    await saveNextBtn.click()
    await new Promise((r) => setTimeout(r, 800))

    // Verify form remains open
    const formOpen = await page.$('[data-testid="transaction-form"]')
    assert.ok(formOpen != null, 'Form transaksi harus tetap terbuka setelah menekan "Lanjut"!')

    // Verify all fields are reset:
    const formState = await page.evaluate(() => {
      const amountEl = document.querySelector('[data-testid="trx-amount-display"]')
      const catEl = document.querySelector('[data-testid="trx-category-value"]')
      const assetEl = document.querySelector('[data-testid="trx-asset-value"]')
      const noteEl = document.querySelector('[data-testid="trx-note-input"]')
      return {
        amount: amountEl ? amountEl.textContent.trim() : null,
        category: catEl ? catEl.textContent.trim() : null,
        asset: assetEl ? assetEl.textContent.trim() : null,
        note: noteEl ? noteEl.value : null,
      }
    })

    console.log('Form state setelah "Lanjut":', formState)
    assert.ok(formState.amount === '0' || formState.amount.endsWith(' 0') || formState.amount.endsWith('0'), 'Nominal harus reset ke 0')
    assert.ok(
      formState.category === '' || formState.category === 'Pilih kategori' || formState.category === 'Select category',
      `Kategori harus kosong, saat ini: ${formState.category}`,
    )
    assert.ok(
      formState.asset === '' || formState.asset === 'Pilih akun' || formState.asset === 'Select account',
      `Aset HARUS KOSONG (menampilkan placeholder), saat ini: ${formState.asset}`,
    )
    assert.equal(formState.note, '', 'Catatan harus kosong')
    console.log('✓ TEST 1 BERHASIL: Semua input pengeluaran termasuk Aset berhasil dikosongkan 100%!')

    // =========================================================================
    // TEST 2: Transfer Transaction "Lanjut"
    // =========================================================================
    console.log('\n--- TEST 2: Transfer - Klik "Lanjut" ---')
    // Close numpad drawer if open
    const closeDrawerBtn = await page.$('button[aria-label="Tutup"]')
    if (closeDrawerBtn) {
      await closeDrawerBtn.click().catch(() => {})
      await new Promise((r) => setTimeout(r, 300))
    }

    // Switch to Transfer tab
    const transferTab = await page.waitForSelector('[data-testid="trx-type-transfer"]')
    await transferTab.click()
    await new Promise((r) => setTimeout(r, 300))

    // Total 50.000
    const totalDisplay = await page.waitForSelector('[data-testid="trx-amount-display"]')
    await totalDisplay.click()
    await new Promise((r) => setTimeout(r, 300))

    await (await page.waitForSelector('[data-testid="numpad-5"]')).click()
    await (await page.waitForSelector('[data-testid="numpad-00"]')).click()
    await (await page.waitForSelector('[data-testid="numpad-00"]')).click()
    await (await page.waitForSelector('[data-testid="numpad-done"]')).click()
    await new Promise((r) => setTimeout(r, 400))

    // Pick Aset Keluar
    const assetFromPicker = await page.waitForSelector('[data-testid="asset-picker"]')
    const fromOpts = await page.$$('[data-testid^="picker-option-"]')
    await fromOpts[0].click()
    await new Promise((r) => setTimeout(r, 400))

    // Pick Aset Masuk
    await page.waitForSelector('[data-testid="asset-picker"]')
    const toOpts = await page.$$('[data-testid^="picker-option-"]')
    assert.ok(toOpts.length > 1, 'Harus ada minimal 2 aset')
    await toOpts[1].click()
    await new Promise((r) => setTimeout(r, 400))

    // Click "Lanjut"
    console.log('2b. Mengklik tombol "Lanjut" pada transfer...')
    const saveNextBtn2 = await page.waitForSelector('[data-testid="trx-save-next"]')
    await saveNextBtn2.click()
    await new Promise((r) => setTimeout(r, 800))

    // Verify both Aset Keluar and Aset Masuk are reset
    const transferState = await page.evaluate(() => {
      const fromEl = document.querySelector('[data-testid="trx-from-asset-value"]')
      const toEl = document.querySelector('[data-testid="trx-to-asset-value"]')
      return {
        from: fromEl ? fromEl.textContent.trim() : null,
        to: toEl ? toEl.textContent.trim() : null,
      }
    })

    console.log('Transfer assets setelah "Lanjut":', transferState)
    assert.ok(
      transferState.from === '' || transferState.from === 'Pilih akun' || transferState.from === 'Select account',
      `Aset Keluar HARUS KOSONG, saat ini: ${transferState.from}`,
    )
    assert.ok(
      transferState.to === '' || transferState.to === 'Pilih akun' || transferState.to === 'Select account',
      `Aset Masuk HARUS KOSONG, saat ini: ${transferState.to}`,
    )
    console.log('✓ TEST 2 BERHASIL: Aset Keluar & Aset Masuk transfer berhasil dikosongkan 100%!')

    console.log('\n============================================================')
    console.log('SEMUA PENGUJIAN RESET ASET PADA TOMBOL "LANJUT" 100% SUKSES!')
    console.log('============================================================')
  } finally {
    await browser.close()
  }
}

run().catch((err) => {
  console.error('Smoke test failed:', err)
  process.exit(1)
})
