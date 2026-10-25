import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import {
  adb,
  BACK,
  connectFinPage,
  dismissAd,
  dumpXml,
  ensureDevServer,
  sleep,
} from './parity/lib.mjs'

const OUT_DIR = path.resolve('test-results/audit_rea_version/11-tab-dan-form-transaksi/screenshots')
const XML_DIR = path.resolve('test-results/audit_rea_version/11-tab-dan-form-transaksi')
mkdirSync(OUT_DIR, { recursive: true })

function shotMM(name) {
  const file = path.join(OUT_DIR, `${name}.png`)
  const buf = adb(['exec-out', 'screencap', '-p'], { binary: true })
  writeFileSync(file, buf)
  console.log(`[MM] Screenshot saved: ${name}.png`)
  return file
}

function saveXml(name) {
  const file = path.join(XML_DIR, `${name}.xml`)
  const xml = dumpXml()
  writeFileSync(file, xml, 'utf8')
  console.log(`[MM] XML dumped: ${name}.xml`)
  return file
}

async function shotFin(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`)
  const buf = await page.puppeteerPage.screenshot({ type: 'png' })
  writeFileSync(file, buf)
  console.log(`[Fin] Screenshot saved: ${name}.png`)
  return file
}

async function runMMAudit() {
  console.log('=== Memulai Pengujian & Pengambilan Screenshot Sisi Money Manager ===')

  // Pastikan di MainActivity Tab Transaksi
  // Tap menu Transaksi di bottom bar (MenuButton01 at 135, 1866)
  adb(['shell', 'input', 'tap', '135', '1866'])
  await sleep(1500)
  dismissAd()

  // Pastikan di sub-tab Harian (x: 97, y: 173)
  adb(['shell', 'input', 'tap', '97', '173'])
  await sleep(1000)

  // 1. Sub-tab Harian
  shotMM('mm-01-harian')
  saveXml('dump_harian')

  // 2. Form Tambah Transaksi (Pengeluaran)
  // Tap FAB (center 992, 1731)
  adb(['shell', 'input', 'tap', '992', '1731'])
  await sleep(1500)
  dismissAd()
  shotMM('mm-02-form-tambah-expense')
  saveXml('dump_form_input')

  // 3. Form Tambah Transaksi (Transfer)
  // Tap tbTransferBtn (center 885, 198)
  adb(['shell', 'input', 'tap', '885', '198'])
  await sleep(1200)
  shotMM('mm-03-form-tambah-transfer')
  saveXml('dump_form_transfer')

  // Keluar dari Form Tambah (backButton at 47, 92)
  adb(['shell', 'input', 'tap', '47', '92'])
  await sleep(1000)
  dismissAd()

  // 4. Form Edit Transaksi
  // Tap baris transaksi Makanan pada center: 540, 430
  adb(['shell', 'input', 'tap', '540', '430'])
  await sleep(1500)
  dismissAd()
  shotMM('mm-04-form-edit-transaksi')
  saveXml('dump_form_edit')

  // 5. Dialog Salin Transaksi
  // Tap lLCopy pada center: 540, 982
  adb(['shell', 'input', 'tap', '540', '982'])
  await sleep(1200)
  shotMM('mm-05-dialog-salin')
  saveXml('dump_dialog_salin')

  // Tutup dialog salin dan form edit
  BACK()
  await sleep(800)
  adb(['shell', 'input', 'tap', '47', '92'])
  await sleep(1000)
  dismissAd()

  // 6. Sub-tab Kalender
  // Tap tbMainCalBtn (center 307, 173)
  adb(['shell', 'input', 'tap', '307', '173'])
  await sleep(1200)
  shotMM('mm-06-subtab-kalender')
  saveXml('dump_kalender')

  // 7. Sub-tab Bulanan
  // Tap tbMainMonthBtn (center 526, 173)
  adb(['shell', 'input', 'tap', '526', '173'])
  await sleep(1200)
  shotMM('mm-07-subtab-bulanan')
  saveXml('dump_bulanan')

  // 8. Sub-tab Tutup Buku (Ringkasan)
  // Tap tbMainSummaryBtn (center 761, 173)
  adb(['shell', 'input', 'tap', '761', '173'])
  await sleep(1200)
  shotMM('mm-08-subtab-tutup-buku')
  saveXml('dump_tutup_buku')

  // 9. Sub-tab Memo
  // Tap tbMainMemoBtn (center 984, 173)
  adb(['shell', 'input', 'tap', '984', '173'])
  await sleep(1200)
  shotMM('mm-09-subtab-memo')
  saveXml('dump_memo')

  // Kembalikan ke sub-tab Harian
  adb(['shell', 'input', 'tap', '97', '173'])
  await sleep(1000)

  // 10. Layar Filter Transaksi
  // Tap filterButton (center 1017, 92)
  adb(['shell', 'input', 'tap', '1017', '92'])
  await sleep(1200)
  shotMM('mm-10-layar-filter')
  saveXml('dump_filter')

  // Tutup filter
  adb(['shell', 'input', 'tap', '1017', '92'])
  await sleep(1000)

  // 11. Layar Bookmark Transaksi
  // Tap faAlignJustify (center 847, 92)
  adb(['shell', 'input', 'tap', '847', '92'])
  await sleep(1500)
  dismissAd()
  shotMM('mm-11-layar-bookmark')
  saveXml('dump_bookmark')

  // Kembali ke MainActivity
  adb(['shell', 'input', 'tap', '47', '92'])
  await sleep(1000)
  dismissAd()
}

async function runFinAudit() {
  console.log('=== Memulai Pengujian & Pengambilan Screenshot Sisi Fin-App ===')
  await ensureDevServer()
  const page = await connectFinPage({ route: '/transactions', waitFor: '[data-testid="trx-fab"]' })
  await sleep(800)

  // 1. Buat transaksi uji jika daftar masih kosong
  const hasRows = await page.puppeteerPage.evaluate(() => {
    return document.querySelectorAll('[data-testid^="tx-row-"]').length > 0
  })

  if (!hasRows) {
    console.log('[Fin] Menambahkan transaksi pengeluaran Food $50.00 untuk data uji...')
    await page.tapTestId('trx-fab')
    await sleep(600)

    // Pilih kategori Food
    await page.tapTestId('trx-category-button')
    await sleep(400)
    await page.puppeteerPage.evaluate(() => {
      const btns = [...document.querySelectorAll('button')]
      const foodBtn = btns.find((b) => b.innerText.includes('Food') || b.innerText.includes('Makanan'))
      if (foodBtn) foodBtn.click()
    })
    await sleep(400)

    // Pilih aset Cash
    await page.tapTestId('trx-asset-button')
    await sleep(400)
    await page.puppeteerPage.evaluate(() => {
      const btns = [...document.querySelectorAll('button')]
      const cashBtn = btns.find((b) => b.innerText.includes('Cash') || b.innerText.includes('Tunai'))
      if (cashBtn) cashBtn.click()
    })
    await sleep(400)

    // Ketik 50.00
    await page.tapTestId('numpad-5')
    await page.tapTestId('numpad-0')
    await page.tapTestId('numpad-0')
    await page.tapTestId('numpad-0')
    await sleep(300)

    // Simpan
    await page.tapTestId('trx-save')
    await sleep(1000)
  }

  // 1. Sub-tab Harian (Daily)
  await shotFin(page, 'fin-01-harian')

  // 2. Form Tambah Transaksi (Pengeluaran)
  await page.tapTestId('trx-fab')
  await sleep(700)
  await shotFin(page, 'fin-02-form-tambah-expense')

  // 3. Form Tambah Transaksi (Transfer)
  await page.tapTestId('trx-type-transfer')
  await sleep(500)
  await shotFin(page, 'fin-03-form-tambah-transfer')

  // Tutup form
  await page.tapTestId('trx-form-back')
  await sleep(600)

  // 4. Form Edit Transaksi
  await page.puppeteerPage.evaluate(() => {
    const row = document.querySelector('[data-testid^="tx-row-"]')
    if (row) row.click()
  })
  await shotFin(page, 'fin-04-form-edit-transaksi')

  // 5. Dialog Salin Transaksi
  const hasCopy = await page.puppeteerPage.evaluate(() => {
    const copyBtn = document.querySelector('[data-testid="trx-copy-button"]')
    if (copyBtn) {
      copyBtn.click()
      return true
    }
    return false
  })
  if (hasCopy) {
    await sleep(600)
    await shotFin(page, 'fin-05-dialog-salin')
    // Tutup dialog salin
    await page.puppeteerPage.evaluate(() => {
      const btns = [...document.querySelectorAll('[data-testid="trx-copy-dialog"] button')]
      const tidak = btns.find((b) => b.innerText.includes('Tidak') || b.innerText.includes('No') || b.innerText.includes('Batal'))
      if (tidak) tidak.click()
    })
    await sleep(400)
  }

  // Tutup form edit
  await page.tapTestId('trx-form-back')
  await sleep(600)

  // 6. Sub-tab Kalender
  await page.puppeteerPage.evaluate(() => {
    const tabs = [...document.querySelectorAll('[role="tab"]')]
    const cal = tabs.find((t) => t.innerText.includes('Kalender') || t.innerText.includes('Calendar'))
    if (cal) cal.click()
  })
  await sleep(800)
  await shotFin(page, 'fin-06-subtab-kalender')

  // 7. Sub-tab Bulanan
  await page.puppeteerPage.evaluate(() => {
    const tabs = [...document.querySelectorAll('[role="tab"]')]
    const mo = tabs.find((t) => t.innerText.includes('Bulanan') || t.innerText.includes('Monthly'))
    if (mo) mo.click()
  })
  await sleep(800)
  await shotFin(page, 'fin-07-subtab-bulanan')

  // 8. Sub-tab Tutup Buku (Summary)
  await page.puppeteerPage.evaluate(() => {
    const tabs = [...document.querySelectorAll('[role="tab"]')]
    const sum = tabs.find((t) => t.innerText.includes('Tutup buku') || t.innerText.includes('Summary'))
    if (sum) sum.click()
  })
  await sleep(800)
  await shotFin(page, 'fin-08-subtab-tutup-buku')

  // 9. Sub-tab Memo
  await page.puppeteerPage.evaluate(() => {
    const tabs = [...document.querySelectorAll('[role="tab"]')]
    const memo = tabs.find((t) => t.innerText.includes('Memo'))
    if (memo) memo.click()
  })
  await sleep(800)
  await shotFin(page, 'fin-09-subtab-memo')

  // Kembalikan ke Harian
  await page.puppeteerPage.evaluate(() => {
    const tabs = [...document.querySelectorAll('[role="tab"]')]
    const daily = tabs.find((t) => t.innerText.includes('Harian') || t.innerText.includes('Daily'))
    if (daily) daily.click()
  })
  await sleep(600)

  // 10. Layar Filter Transaksi
  await page.tapTestId('trx-header-filter')
  await sleep(700)
  await shotFin(page, 'fin-10-layar-filter')

  // Tutup filter
  await page.puppeteerPage.evaluate(() => {
    const closeBtn = document.querySelector('[data-testid="filter-screen"] button[aria-label="Tutup"]')
    if (closeBtn) closeBtn.click()
  })
  await sleep(600)
  // 11. Layar Bookmark Transaksi
  await page.tapTestId('trx-header-bookmark')
  await sleep(800)
  await shotFin(page, 'fin-11-layar-bookmark')

  // Tutup bookmark
  await page.puppeteerPage.evaluate(() => {
    const backBtn = document.querySelector('[data-testid="bookmark-screen"] button[aria-label="Kembali"]')
    if (backBtn) backBtn.click()
  })
  await sleep(600)

  await page.close()
  console.log('=== Selesai Mengambil Seluruh Bukti Fin-App ===')
}

async function main() {
  await runMMAudit()
  await runFinAudit()
  console.log('Audit Tangkapan Layar Tab & Form Transaksi Selesai!')
}

main().catch((err) => {
  console.error('Audit gagal:', err)
  process.exit(1)
})
