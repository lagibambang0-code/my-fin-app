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

const OUT_DIR = path.resolve('test-results/audit_rea_version/10-tab-statistik/screenshots')
mkdirSync(OUT_DIR, { recursive: true })

function shotMM(name) {
  const file = path.join(OUT_DIR, `${name}.png`)
  const buf = adb(['exec-out', 'screencap', '-p'], { binary: true })
  writeFileSync(file, buf)
  console.log(`[MM] Screenshot saved: ${name}.png`)
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
  
  // Pastikan berada di layar Stats
  // Tap menu Statistik di bottom bar (MenuButton02 at 405, 1866)
  adb(['shell', 'input', 'tap', '405', '1866'])
  await sleep(2000)
  dismissAd()

  // 1. Layar Utama Statistik (Pengeluaran)
  shotMM('mm-01-tab-statistik-main')
  
  // Dump xml untuk analisis layout
  const xml1 = dumpXml()
  writeFileSync(path.resolve('test-results/audit_rea_version/10-tab-statistik/dump.xml'), xml1, 'utf8')

  // 2. Pemilih Mode Rentang
  // tVSearchMenu bounds: { x1: 879, y1: 62, x2: 1052, y2: 122 } -> center 965, 92
  adb(['shell', 'input', 'tap', '965', '92'])
  await sleep(1000)
  shotMM('mm-02-pemilih-mode-rentang')
  const xmlMenu = dumpXml()
  writeFileSync(path.resolve('test-results/audit_rea_version/10-tab-statistik/dump_menu.xml'), xmlMenu, 'utf8')

  // Tutup popup menu
  BACK()
  await sleep(1000)
  dismissAd()

  // 3. Detail Kategori (Drill-down StatsDetail)
  // Tap dataRow kategori Makanan pada center: 540, 884
  adb(['shell', 'input', 'tap', '540', '884'])
  await sleep(2000)
  dismissAd()
  shotMM('mm-03-detail-kategori')
  const xmlDetail = dumpXml()
  writeFileSync(path.resolve('test-results/audit_rea_version/10-tab-statistik/dump_detail.xml'), xmlDetail, 'utf8')

  // Kembali ke layar utama Stats
  BACK()
  await sleep(1000)
  dismissAd()

  // 4. Toggle Pendapatan (Income)
  // tbInButton bounds: { x1: 0, y1: 136, x2: 540, y2: 216 } -> center 270, 176
  adb(['shell', 'input', 'tap', '270', '176'])
  await sleep(1500)
  dismissAd()
  shotMM('mm-04-tab-pendapatan')

  // Kembalikan ke Pengeluaran (Expense)
  // tbOutButton bounds: { x1: 540, y1: 136, x2: 1080, y2: 216 } -> center 810, 176
  adb(['shell', 'input', 'tap', '810', '176'])
  await sleep(1000)
}

async function runFinAudit() {
  console.log('=== Memulai Pengujian & Pengambilan Screenshot Sisi Fin-App ===')
  await ensureDevServer()
  const page = await connectFinPage({ route: '/transactions', waitFor: '[data-testid="trx-fab"]' })
  await sleep(600)

  // 1. Buat transaksi uji pengeluaran: Food $50.00
  console.log('[Fin] Menambahkan transaksi pengeluaran Food $50.00 untuk data statistik...')
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

  // Ketik nominal 50.00
  await page.tapTestId('numpad-5')
  await page.tapTestId('numpad-0')
  await page.tapTestId('numpad-0')
  await page.tapTestId('numpad-0')
  await sleep(300)

  // Simpan transaksi
  await page.tapTestId('trx-save')
  await sleep(1000)

  // 2. Arahkan ke /stats
  await page.navigate('http://localhost:3000/stats', { waitFor: '[data-testid="stats-content"]' })
  await sleep(1000)

  // Screenshot 1: Layar Utama Statistik (Pengeluaran - Donat)
  await shotFin(page, 'fin-01-tab-statistik-main')

  // Screenshot 2: Pemilih Mode Rentang
  await page.tapTestId('stats-mode-button')
  await sleep(600)
  await shotFin(page, 'fin-02-pemilih-mode-rentang')

  // Tutup dialog pemilih mode
  await page.puppeteerPage.evaluate(() => {
    const btn = document.querySelector('[data-testid="picker-sheet-close"]') || document.querySelector('button[aria-label="Tutup"]')
    if (btn) btn.click()
    else {
      const backdrop = document.querySelector('[data-testid="stats-mode-picker"]')
      if (backdrop) backdrop.click()
    }
  })
  await sleep(600)

  // Screenshot 3: Detail Kategori (Drill-down)
  const openedDetail = await page.puppeteerPage.evaluate(() => {
    const row = document.querySelector('[data-testid^="stats-row-"]')
    if (row) {
      row.click()
      return true
    }
    return false
  })
  if (openedDetail) {
    await sleep(800)
    await shotFin(page, 'fin-03-detail-kategori')

    // Tutup detail
    await page.puppeteerPage.evaluate(() => {
      const backBtn = document.querySelector('[data-testid="stats-detail"] button[aria-label="Kembali"]')
      if (backBtn) backBtn.click()
    })
  }

  // Screenshot 4: Toggle Pendapatan (Income)
  await page.tapTestId('stats-type-income')
  await sleep(600)
  await shotFin(page, 'fin-04-tab-pendapatan')

  // Kembalikan ke Pengeluaran
  await page.tapTestId('stats-type-expense')
  await sleep(600)

  // Screenshot 5: Tampilan Grafik Batang
  await page.puppeteerPage.evaluate(() => {
    const barBtn = document.querySelector('button[aria-label="Tampilan batang"]')
    if (barBtn) barBtn.click()
  })
  await shotFin(page, 'fin-05-grafik-batang')

  await page.close()
  console.log('=== Selesai Mengambil Seluruh Bukti Fin-App ===')
}

async function main() {
  await runMMAudit()
  await runFinAudit()
  console.log('Audit Tangkapan Layar Tab Statistik Selesai!')
}

main().catch((err) => {
  console.error('Audit gagal:', err)
  process.exit(1)
})
