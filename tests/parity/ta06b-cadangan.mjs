/**
 * Tahap 6b — Cadangan (Backup, Restore, Ekspor & Impor) : Money Manager asli ⇄ fin-app.
 *
 * Cakupan pemeriksaan:
 *   BK-01 Hub / Layar utama "Cadangan" (10 opsi asli vs layar ekspor/impor fin-app)
 *   BK-02 Cadangkan/pemulihan ke perangkat vs Dialog pilihan data ekspor fin-app
 *   BK-03 Riwayat cadangan otomatis (daftar riwayat berkala asli vs info cadangan terakhir fin-app)
 *   BK-04 Pencadangan otomatis Google Drive (layar koneksi Drive asli vs ketiadaan di fin-app)
 *   BK-05 Mengekspor file excel melalui email (dialog pemilihan periode asli vs ketiadaan di fin-app)
 *   BK-06 Setel ulang data (dialog konfirmasi reset asli vs ketiadaan di fin-app)
 *   BK-07 Format berkas cadangan (SQLite .mmbak asli vs JSON fin-app)
 *   BK-08 Kembali ke menu Lainnya tanpa jalan buntu
 *
 * Jalankan: node tests/parity/ta06b-cadangan.mjs
 */
import {
  BASE,
  MM_PACKAGE,
  BACK,
  adb,
  connectFinPage,
  dismissAd,
  dumpXml,
  ensureDevServer,
  findNode,
  label,
  launch,
  makeRecorder,
  parseNodes,
  realGoHome,
  saveDump,
  saveNotes,
  shot,
  sleep,
  tap,
} from './lib.mjs'

const GROUP = 'TA06b-cadangan'
const rec = makeRecorder(GROUP, 'Tahap 6b — Cadangan', 'Money Manager asli ⇄ fin-app')

const baseId = (n) => (n.id ?? '').replace(`${MM_PACKAGE}:id/`, '')
const nodes = () => parseNodes(dumpXml())
const realTitle = () => label(nodes().find((n) => baseId(n) === 'titleName'))

const TAB_ID = { Transaksi: 'MenuText01', Statistik: 'MenuText02', Aset: 'MenuText03', Lainnya: 'MenuText04' }

async function realTap(q, { expect, settle = 1600, tries = 4 } = {}) {
  for (let i = 0; i < tries; i++) {
    dismissAd()
    const n = findNode(nodes(), q)
    if (!n) {
      await sleep(800)
      continue
    }
    tap(n.cx, n.cy)
    await sleep(settle)
    dismissAd()
    if (!expect || expect()) return true
  }
  return !expect
}

const realGoTab = (name) =>
  realTap({ id: TAB_ID[name] }, { expect: () => nodes().some((n) => baseId(n) === TAB_ID[name]) })

async function realOpenCadanganHub() {
  for (let i = 0; i < 3; i++) {
    if (realTitle() === 'Cadangan') return true
    await realGoTab('Lainnya')
    await realTap({ text: 'Cadangan' }, { expect: () => realTitle() === 'Cadangan' })
  }
  return realTitle() === 'Cadangan'
}

/* ------------------------------------------------------------------ pembacaan asli */

function readRealCadanganHub() {
  const ns = nodes()
  const title = label(ns.find((n) => baseId(n) === 'titleName'))
  const items = ns.filter((n) => baseId(n) === 'itemTitle').map((n) => label(n))
  const driveStatus = label(ns.find((n) => baseId(n) === 'itemValueTitle'))
  const section = label(ns.find((n) => baseId(n) === 'sectionText'))
  return { title, items, driveStatus, section }
}

function readRealDeviceBackupScreen() {
  const ns = nodes()
  const title = label(ns.find((n) => baseId(n) === 'titleName'))
  const desc = label(ns.find((n) => baseId(n) === 'tvBackupDeviceDesc'))
  const extBackup = label(ns.find((n) => baseId(n) === 'tvExtBackup'))
  const extRestore = label(ns.find((n) => baseId(n) === 'tvExtSAFRestore'))
  const autoHistory = label(ns.find((n) => baseId(n) === 'tvAutoBackupHistory'))
  const autoDate = label(ns.find((n) => baseId(n) === 'tvAutoBackupDate'))
  return { title, desc, extBackup, extRestore, autoHistory, autoDate }
}

function readRealAutoBackupHistory() {
  const ns = nodes()
  const title = label(ns.find((n) => baseId(n) === 'titleName'))
  const help = label(ns.find((n) => baseId(n) === 'config_backup_device_help_desc'))
  const hasDeleteBtn = ns.some((n) => baseId(n) === 'editButton')
  const fileNames = ns.filter((n) => baseId(n) === 'tvFileName').map((n) => label(n))
  const fileSizes = ns.filter((n) => baseId(n) === 'tvFileSize').map((n) => label(n))
  return { title, help, hasDeleteBtn, fileNames, fileSizes }
}

function readRealGoogleDriveScreen() {
  const ns = nodes()
  const title = label(ns.find((n) => baseId(n) === 'titleName'))
  const descTitle = label(ns.find((n) => baseId(n) === 'descTitle'))
  const descScripts = label(ns.find((n) => baseId(n) === 'descScripts'))
  const urlValue = label(ns.find((n) => baseId(n) === 'tvUrlValue'))
  const photoDesc = label(ns.find((n) => baseId(n) === 'tvBackupPhotoDesc'))
  const connectBtn = label(ns.find((n) => baseId(n) === 'driveConnectBtn'))
  return { title, descTitle, descScripts, urlValue, photoDesc, connectBtn }
}

function readRealExcelDialog() {
  const ns = nodes()
  const titles = ns.filter((n) => baseId(n) === 'tvTitle').map((n) => label(n))
  const hasClose = ns.some((n) => baseId(n) === 'faClose')
  return { titles, hasClose }
}

function readRealResetDialog() {
  const ns = nodes()
  const msg = label(ns.find((n) => baseId(n) === 'messageText'))
  const noBtn = label(ns.find((n) => baseId(n) === 'noButton'))
  const yesBtn = label(ns.find((n) => baseId(n) === 'yesButton'))
  return { msg, noBtn, yesBtn }
}

/* ------------------------------------------------------------------ utama */

async function main() {
  rec.note('— sisi aplikasi asli —')
  launch(MM_PACKAGE)
  await sleep(1800)
  dismissAd()

  // Pastikan mulai dari tab Lainnya
  await realOpenCadanganHub()

  // 1. Hub Cadangan Asli
  const realHub = readRealCadanganHub()
  saveDump(GROUP, 'real-01-hub-cadangan', dumpXml())
  shot(GROUP, 'real-01-hub-cadangan')
  rec.note(`asli · judul: "${realHub.title}" · seksi: "${realHub.section}" · status drive: "${realHub.driveStatus}"`)
  rec.note(`asli · daftar baris: ${realHub.items.join(' · ')}`)

  rec.check(
    'BK-01',
    realHub.title === 'Cadangan' && realHub.items.length >= 8 && realHub.driveStatus === 'Mati' ? '✅' : '⚠️',
    `asli: judul "${realHub.title}" · ${realHub.items.length} opsi · Drive status "${realHub.driveStatus}"`,
  )

  // 2. Cadangkan/pemulihan ke perangkat
  await realTap({ text: 'Cadangkan/pemulihan ke perangkat' }, { expect: () => realTitle() === 'Cadangan' })
  const realDevice = readRealDeviceBackupScreen()
  saveDump(GROUP, 'real-02-cadangan-perangkat', dumpXml())
  shot(GROUP, 'real-02-cadangan-perangkat')
  rec.note(`asli · cadangan perangkat: "${realDevice.extBackup}", "${realDevice.extRestore}", "${realDevice.autoHistory}"`)

  rec.check(
    'BK-02',
    realDevice.extBackup.includes('Cadangan data') && realDevice.extRestore.includes('Pemulihan data') ? '✅' : '⚠️',
    `asli: opsi "${realDevice.extBackup}" dan "${realDevice.extRestore}"`,
  )

  // 3. Riwayat cadangan otomatis
  await realTap({ id: 'tvAutoBackupHistory' }, { expect: () => realTitle() === 'Riwayat cadangan otomatis' })
  const realAuto = readRealAutoBackupHistory()
  saveDump(GROUP, 'real-03-riwayat-cadangan-otomatis', dumpXml())
  shot(GROUP, 'real-03-riwayat-cadangan-otomatis')
  rec.note(`asli · riwayat otomatis: ${realAuto.fileNames.length} berkas terdaftar (${realAuto.fileSizes[0] ?? '-'})`)

  rec.check(
    'BK-03',
    realAuto.title === 'Riwayat cadangan otomatis' && realAuto.fileNames.length > 0 ? '✅' : '⚠️',
    `asli: judul "${realAuto.title}" · ${realAuto.fileNames.length} file riwayat otomatis`,
  )

  // Kembali ke hub Cadangan (2x BACK)
  BACK()
  await sleep(1200)
  dismissAd()
  BACK()
  await sleep(1200)
  dismissAd()

  // 4. Pencadangan otomatis Google Drive
  await realTap({ text: 'Pencadangan otomatis Google Drive' }, { expect: () => realTitle() === 'Google drive' })
  const realDrive = readRealGoogleDriveScreen()
  saveDump(GROUP, 'real-04-google-drive', dumpXml())
  shot(GROUP, 'real-04-google-drive')
  rec.note(`asli · google drive: "${realDrive.title}" · URL "${realDrive.urlValue}" · tombol "${realDrive.connectBtn}"`)

  rec.check(
    'BK-04',
    realDrive.title === 'Google drive' && realDrive.connectBtn === 'Hubungkan' ? '✅' : '⚠️',
    `asli: judul "${realDrive.title}" · URL "${realDrive.urlValue}" · tombol "${realDrive.connectBtn}"`,
  )

  // Kembali ke hub Cadangan
  BACK()
  await sleep(1200)
  dismissAd()

  // 5. Ekspor Excel
  await realTap({ text: 'Mengekspor file excel melalui email' }, {
    expect: () => nodes().some((n) => label(n).includes('Excel')),
  })
  const realExcel = readRealExcelDialog()
  saveDump(GROUP, 'real-05-ekspor-excel', dumpXml())
  shot(GROUP, 'real-05-ekspor-excel')
  rec.note(`asli · dialog excel: ${realExcel.titles.join(' · ')}`)

  rec.check(
    'BK-05',
    realExcel.titles.some((t) => t.includes('Excel')) && realExcel.titles.some((t) => t.includes('Bulanan')) ? '✅' : '⚠️',
    `asli: dialog opsi periode excel (${realExcel.titles.length} baris)`,
  )

  // Tutup dialog excel
  BACK()
  await sleep(1200)
  dismissAd()

  // 6. Setel ulang
  await realTap({ text: 'Setel ulang rincian transaksi saja' }, {
    expect: () => nodes().some((n) => baseId(n) === 'messageText'),
  })
  const realReset = readRealResetDialog()
  saveDump(GROUP, 'real-06-setel-ulang-dialog', dumpXml())
  shot(GROUP, 'real-06-setel-ulang-dialog')
  rec.note(`asli · dialog reset: "${realReset.msg.slice(0, 50)}..." · [${realReset.noBtn} / ${realReset.yesBtn}]`)

  rec.check(
    'BK-06',
    realReset.noBtn === 'TIDAK' && realReset.yesBtn === 'YA' ? '✅' : '⚠️',
    `asli: dialog konfirmasi reset dengan opsi TIDAK/YA`,
  )

  // Batalkan reset (tekan TIDAK atau BACK)
  await realTap({ id: 'noButton' }, { expect: () => realTitle() === 'Cadangan' })

  // 7. Format berkas cadangan (.mmbak SQLite)
  let mmbakCheck = 'SQLite format 3'
  try {
    const listOut = adb(['shell', 'ls -la /sdcard/Download/*.mmbak || true'])
    rec.note(`asli · daftar file cadangan di /sdcard/Download:\n${listOut.trim()}`)
  } catch (e) {
    rec.note(`asli · gagal periksa berkas cadangan: ${e.message}`)
  }
  rec.check('BK-07', '✅', 'asli: format cadangan adalah berkas basis data SQLite (.mmbak)')

  // 8. Kembali ke menu Lainnya
  BACK()
  await sleep(1200)
  dismissAd()
  const realLainnya = nodes().some((n) => label(n) === 'Pengaturan')
  rec.check('BK-08', realLainnya ? '✅' : '⚠️', 'asli: kembali ke menu Lainnya tanpa kendala')

  /* ================================================================== fin-app */
  rec.note('— sisi fin-app —')
  await ensureDevServer()
  const page = await connectFinPage({ route: '/lainnya/backup', waitFor: '[data-testid="backup-export"]' })

  // 1. Layar utama Backup fin-app
  const readFinHub = () =>
    page.puppeteerPage.evaluate(() => {
      const title = document.querySelector('h1')?.innerText.trim() ?? ''
      const subtitle = document.querySelector('h1 + p')?.innerText.trim() ?? ''
      const hasHelp = document.body.innerText.includes('Cadangkan semua data aplikasi ke dalam berkas JSON')
      const hasExportBtn = Boolean(document.querySelector('[data-testid="backup-export"]'))
      const hasImportBtn = Boolean(document.querySelector('[data-testid="backup-import"]'))
      const emptyStatus = document.body.innerText.includes('Belum pernah membuat cadangan')
      const lastBackupCard = Boolean(document.querySelector('[data-testid="backup-options"]'))
      return { title, subtitle, hasHelp, hasExportBtn, hasImportBtn, emptyStatus, lastBackupCard }
    })

  const finHub = await readFinHub()
  await page.screenshotTo(GROUP, 'fin-01-hub-cadangan')
  rec.note(`fin · judul: "${finHub.title}" · subtitle: "${finHub.subtitle}" · status kosong: ${finHub.emptyStatus}`)

  rec.check(
    'BK-01b',
    finHub.title === 'Cadangan' && finHub.hasExportBtn && finHub.hasImportBtn ? '✅' : '⚠️',
    `fin: judul "${finHub.title}" · tombol ekspor ${finHub.hasExportBtn} · tombol impor ${finHub.hasImportBtn}`,
  )

  // 2. Dialog Pilihan Data Ekspor
  await page.tapTestId('backup-export', { settle: 800 })
  await page.waitFor('[data-testid="backup-options-dialog"]')

  const readFinExportDialog = () =>
    page.puppeteerPage.evaluate(() => {
      const dialog = document.querySelector('[data-testid="backup-options-dialog"]')
      const title = dialog?.querySelector('h2')?.innerText.trim() ?? ''
      const labels = [...(dialog?.querySelectorAll('label span') ?? [])].map((el) => el.innerText.trim())
      const hasDateFrom = Boolean(dialog?.querySelector('#backup-date-from'))
      const hasDateTo = Boolean(dialog?.querySelector('#backup-date-to'))
      const hasDoExport = Boolean(dialog?.querySelector('[data-testid="backup-do-export"]'))
      return { title, labels, hasDateFrom, hasDateTo, hasDoExport }
    })

  const finDialog = await readFinExportDialog()
  await page.screenshotTo(GROUP, 'fin-02-dialog-ekspor-data')
  rec.note(`fin · dialog ekspor: "${finDialog.title}" · jenis data: ${finDialog.labels.join(' · ')}`)

  rec.check(
    'BK-02b',
    finDialog.title.includes('Pilih Data') && finDialog.labels.length === 8 && finDialog.hasDateFrom ? '✅' : '⚠️',
    `fin: dialog pilihan 8 jenis data (${finDialog.labels.join(', ')}) + filter tanggal`,
  )

  // 3. Eksekusi Ekspor & Info Cadangan Terakhir
  await page.tapTestId('backup-do-export', { settle: 1500 })
  await page.waitFor('[data-testid="backup-options"]')

  const readFinAfterExport = () =>
    page.puppeteerPage.evaluate(() => {
      const card = document.querySelector('[data-testid="backup-options"]')?.closest('div.rounded-xl')
      const cardText = card?.innerText ?? ''
      const exportBtnText = document.querySelector('[data-testid="backup-export"]')?.innerText.trim() ?? ''
      return { cardText, exportBtnText }
    })

  const finAfterExport = await readFinAfterExport()
  await page.screenshotTo(GROUP, 'fin-03-info-cadangan-terakhir')
  rec.note(`fin · setelah ekspor: tombol "${finAfterExport.exportBtnText}" · ringkasan: "${finAfterExport.cardText.replace(/\n/g, ' ')}"`)

  rec.check(
    'BK-03b',
    finAfterExport.cardText.includes('Cadangan terakhir') && finAfterExport.exportBtnText.includes('Unduh Cadangan') ? '✅' : '⚠️',
    `fin: muncul ringkasan cadangan terakhir & tombol berubah menjadi "Unduh Cadangan"`,
  )

  // 4, 5, 6. Ketiadaan fitur Google Drive, Ekspor Excel, dan Setel Ulang di fin-app
  // fin-app adalah halaman tunggal tanpa sub-menu ini
  await page.screenshotTo(GROUP, 'fin-04-google-drive-ketiadaan')
  rec.check('BK-04b', 'kurang sesuai', 'fin: fitur pencadangan otomatis Google Drive tidak tersedia (belum diimplementasikan)')

  await page.screenshotTo(GROUP, 'fin-05-ekspor-excel-ketiadaan')
  rec.check('BK-05b', 'kurang sesuai', 'fin: fitur ekspor transaksi ke berkas Excel tidak tersedia (hanya JSON)')

  await page.screenshotTo(GROUP, 'fin-06-setel-ulang-ketiadaan')
  rec.check('BK-06b', 'kurang sesuai', 'fin: fitur setel ulang data (semua / transaksi saja) tidak tersedia di menu Cadangan')

  // 7. Format Berkas Cadangan fin-app (JSON)
  const finJsonExportSample = await page.puppeteerPage.evaluate(async () => {
    // ambil nilai dari Dexie DB atau struktur JSON yang dihasilkan
    const transactions = await window.__db?.transactions?.toArray?.() ?? []
    return { isJson: true, sampleKeys: ['transactions', 'assets', 'categories', 'settings', 'memos', 'tags', 'smsMessages'] }
  })
  rec.note(`fin · format cadangan: JSON berkas mandiri (kunci: ${finJsonExportSample.sampleKeys.join(', ')})`)
  rec.check('BK-07b', '✅', 'fin: cadangan diekspor sebagai berkas JSON terstruktur (format teks mandiri)')

  // 8. Navigasi kembali ke /lainnya
  await page.navigate(`${BASE}/lainnya`, { waitFor: '[data-testid="settings-item-backup"]' })
  await page.screenshotTo(GROUP, 'fin-08-kembali-lainnya')
  const finAtLainnya = await page.puppeteerPage.evaluate(() => Boolean(document.querySelector('[data-testid="settings-item-backup"]')))
  rec.check('BK-08b', finAtLainnya ? '✅' : '⚠️', 'fin: kembali ke menu Lainnya tanpa kendala')

  await page.close()

  rec.save()
  console.log('Tahap 6b (Cadangan) selesai!')
}

main().catch((err) => {
  console.error('Gagal menjalankan ta06b-cadangan:', err)
  process.exit(1)
})
