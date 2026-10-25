/**
 * Tahap 8 — Setelan Lanjutan (PRD-06): Money Manager asli ⇄ fin-app.
 *
 * Cakupan pemeriksaan:
 *   SL-01 Hub Kelola pengaturan: daftar baris setelan di kedua sisi
 *   SL-02 Tanggal mulai bulanan: pemilih tanggal (1..31) & aturan akhir pekan
 *   SL-03 Mulai hari: 7 hari (Minggu s.d. Sabtu)
 *   SL-04 Pengaturan geser: opsi Ubah tab, Ubah tanggal, Tidak digunakan
 *   SL-05 Pengaturan warna pendapatan-pengeluaran: Bag.A vs Bag.B
 *   SL-06 Layar utama: Harian vs Kalender
 *   SL-07 Pengaturan pindah saldo: penjelasan & status Mati/Aktif
 *   SL-08 Masukan waktu & urutan input form
 *
 * Jalankan: node tests/parity/ta08-setelan-lanjutan.mjs
 */
import {
  BASE,
  MM_PACKAGE,
  BACK,
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
  shot,
  sleep,
  tap,
} from './lib.mjs'

const GROUP = 'TA08-setelan-lanjutan'
const rec = makeRecorder(GROUP, 'Tahap 8 — Setelan Lanjutan', 'Money Manager asli ⇄ fin-app')

const baseId = (n) => (n.id ?? '').replace(`${MM_PACKAGE}:id/`, '')
const nodes = () => parseNodes(dumpXml())
const realTitle = () => label(nodes().find((n) => baseId(n) === 'titleName'))

const TAB_ID = { Lainnya: 'MenuText04' }

async function realTap(q, { expect, settle = 1400, tries = 4 } = {}) {
  for (let i = 0; i < tries; i++) {
    dismissAd()
    const n = findNode(nodes(), q)
    if (!n) {
      await sleep(700)
      continue
    }
    tap(n.cx, n.cy)
    await sleep(settle)
    dismissAd()
    if (!expect || expect()) return true
  }
  return !expect
}

async function realEnsureKelolaPengaturan() {
  for (let i = 0; i < 5; i++) {
    if (realTitle() === 'Kelola pengaturan') return true
    const tab = findNode(nodes(), { id: TAB_ID.Lainnya })
    if (tab) {
      tap(tab.cx, tab.cy)
      await sleep(1000)
      const kelola = findNode(nodes(), { text: 'Kelola pengaturan' })
      if (kelola) {
        tap(kelola.cx, kelola.cy)
        await sleep(1400)
      }
      continue
    }
    BACK()
    await sleep(1000)
    dismissAd()
  }
  return realTitle() === 'Kelola pengaturan'
}

function readRealRows() {
  const ns = nodes()
  const rows = []
  const items = ns.filter((n) => baseId(n) === 'itemTitle')
  for (const item of items) {
    const valNode = ns.find(
      (n) => baseId(n) === 'itemValueTitle' && Math.abs((n.bounds?.y1 ?? 0) - (item.bounds?.y1 ?? 0)) < 30,
    )
    rows.push({ label: label(item), value: valNode ? label(valNode) : '' })
  }
  return rows
}

function readDialogOptions() {
  const ns = nodes()
  const titles = ns.filter((n) => baseId(n) === 'tvTitle').map((n) => label(n))
  const dialogTitle = titles[0] ?? ''
  const options = titles.slice(1)
  return { title: dialogTitle, options }
}

async function main() {
  /* ============================================================ SISI APLIKASI ASLI */
  rec.note('— sisi aplikasi asli —')
  launch(MM_PACKAGE)
  await sleep(2000)
  dismissAd()

  // Pastikan masuk ke hub Kelola pengaturan
  await realEnsureKelolaPengaturan()

  // SL-01: Hub Kelola pengaturan
  console.log('[1/8] Memeriksa hub Kelola pengaturan...')
  const realRows = readRealRows()
  saveDump(GROUP, 'real-01-hub-kelola-pengaturan', dumpXml())
  shot(GROUP, 'real-01-hub-kelola-pengaturan')
  const rowLabels = realRows.map((r) => r.label)
  rec.note(`asli · baris kelola pengaturan (${realRows.length}): ${realRows.map((r) => `${r.label}=${r.value || '-'}`).join(' · ')}`)
  rec.check(
    'SL-01',
    realRows.length >= 8 && rowLabels.includes('Mulai hari') ? '✅' : '⚠️',
    `asli: ${realRows.length} baris setelan di Kelola pengaturan`,
  )

  // SL-02: Tanggal mulai bulanan
  console.log('[2/8] Memeriksa Tanggal mulai bulanan...')
  const tglRow = realRows.find((r) => r.label.includes('Tanggal mulai bulanan'))
  if (tglRow) {
    await realTap({ text: 'Tanggal mulai bulanan' })
    saveDump(GROUP, 'real-02-tanggal-mulai-bulanan', dumpXml())
    shot(GROUP, 'real-02-tanggal-mulai-bulanan')
    const ns = nodes()
    const tglTitle = realTitle()
    const hasWeekendOpt = ns.some((n) => label(n).includes('akhir pekan') || label(n).includes('jumat'))
    rec.note(`asli · tanggal mulai: judul "${tglTitle}" · opsi akhir pekan: ${hasWeekendOpt}`)
    rec.check(
      'SL-02',
      tglTitle === 'Tanggal mulai bulanan' && hasWeekendOpt ? '✅' : '⚠️',
      `asli: layar Tanggal mulai bulanan dengan penanganan akhir pekan`,
    )
    BACK()
    await sleep(1000)
  }

  // SL-03: Mulai hari
  console.log('[3/8] Memeriksa Mulai hari...')
  await realTap({ text: 'Mulai hari' })
  const realMulaiHari = readDialogOptions()
  saveDump(GROUP, 'real-03-mulai-hari', dumpXml())
  shot(GROUP, 'real-03-mulai-hari')
  rec.note(`asli · mulai hari: ${realMulaiHari.options.join(' · ')}`)
  rec.check(
    'SL-03',
    realMulaiHari.options.length === 7 && realMulaiHari.options.includes('Senin') ? '✅' : '⚠️',
    `asli: 7 opsi hari (Minggu s.d. Sabtu)`,
  )
  BACK()
  await sleep(1000)

  // SL-04: Geser (Gesture)
  console.log('[4/8] Memeriksa Pengaturan Geser...')
  await realTap({ text: 'Geser' })
  const realGeser = readDialogOptions()
  saveDump(GROUP, 'real-04-geser', dumpXml())
  shot(GROUP, 'real-04-geser')
  rec.note(`asli · geser: ${realGeser.options.join(' · ')}`)
  rec.check(
    'SL-04',
    realGeser.options.includes('Ubah tanggal') && realGeser.options.includes('Ubah tab') ? '✅' : '⚠️',
    `asli: opsi geser (${realGeser.options.join(', ')})`,
  )
  BACK()
  await sleep(1000)

  // SL-05: Warna pendapatan-pengeluaran
  console.log('[5/8] Memeriksa Warna pendapatan-pengeluaran...')
  await realTap({ text: 'Warna pendapatan-pengeluaran' })
  const realWarna = readDialogOptions()
  saveDump(GROUP, 'real-05-warna', dumpXml())
  shot(GROUP, 'real-05-warna')
  rec.note(`asli · warna: ${realWarna.options.join(' · ')}`)
  rec.check(
    'SL-05',
    realWarna.options.includes('Bag.A') && realWarna.options.includes('Bag.B') ? '✅' : '⚠️',
    `asli: opsi Bag.A & Bag.B`,
  )
  BACK()
  await sleep(1000)

  // SL-06: Layar utama (Harian/Kalender)
  console.log('[6/8] Memeriksa Layar utama...')
  await realTap({ text: 'Layar utama(Harian/Kalender)' })
  const realLayar = readDialogOptions()
  saveDump(GROUP, 'real-06-layar-utama', dumpXml())
  shot(GROUP, 'real-06-layar-utama')
  rec.note(`asli · layar utama: ${realLayar.options.join(' · ')}`)
  rec.check(
    'SL-06',
    realLayar.options.includes('Harian') && realLayar.options.includes('Kalender') ? '✅' : '⚠️',
    `asli: opsi Harian & Kalender`,
  )
  BACK()
  await sleep(1000)

  // SL-07: Pengaturan pindah saldo
  console.log('[7/8] Memeriksa Pengaturan pindah saldo...')
  await realTap({ text: 'Pengaturan pindah saldo' })
  const realSaldo = readDialogOptions()
  saveDump(GROUP, 'real-07-pindah-saldo', dumpXml())
  shot(GROUP, 'real-07-pindah-saldo')
  rec.note(`asli · pindah saldo: ${realSaldo.options.join(' · ')}`)
  rec.check(
    'SL-07',
    realSaldo.options.includes('Mati') && realSaldo.options.includes('Aktif') ? '✅' : '⚠️',
    `asli: opsi Mati & Aktif pindah saldo`,
  )
  BACK()
  await sleep(1000)

  // SL-08: Masukan waktu
  console.log('[8/8] Memeriksa Masukan waktu...')
  await realTap({ text: 'Masukan waktu' })
  const realWaktu = readDialogOptions()
  saveDump(GROUP, 'real-08-masukan-waktu', dumpXml())
  shot(GROUP, 'real-08-masukan-waktu')
  rec.note(`asli · masukan waktu: ${realWaktu.options.join(' · ')}`)
  rec.check(
    'SL-08',
    realWaktu.options.length >= 6 ? '✅' : '⚠️',
    `asli: ${realWaktu.options.length} opsi format masukan waktu`,
  )
  BACK()
  await sleep(1000)

  /* ============================================================ SISI FIN-APP */
  rec.note('— sisi fin-app —')
  await ensureDevServer()
  const page = await connectFinPage({ route: '/lainnya', waitFor: '[data-testid="settings-item-pengaturan-umum"]' })

  // SL-01b: Hub pengaturan di fin-app
  console.log('[fin 1/8] Memeriksa menu setelan fin-app...')
  const finItems = await page.puppeteerPage.evaluate(() => {
    return [...document.querySelectorAll('a[href^="/lainnya/"]')].map((a) => a.innerText.trim().split('\n')[0])
  })
  await page.screenshotTo(GROUP, 'fin-01-hub-setelan')
  rec.note(`fin · item setelan: ${finItems.join(' · ')}`)
  rec.check(
    'SL-01b',
    finItems.length === 14 && finItems.includes('Pengaturan umum') ? '✅' : '⚠️',
    `fin: 14 menu setelan lengkap di tab Lainnya`,
  )

  // SL-02b: Layar Pengaturan umum fin-app
  console.log('[fin 2/8] Memeriksa Pengaturan umum fin-app...')
  await page.navigate(`${BASE}/lainnya/pengaturan-umum`, { waitFor: '[data-testid="general-settings-screen"]' })
  await page.screenshotTo(GROUP, 'fin-02-pengaturan-umum')
  const finGeneralTxt = await page.puppeteerPage.evaluate(() => document.body.innerText)
  rec.check(
    'SL-02b',
    finGeneralTxt.includes('Mata uang utama') && finGeneralTxt.includes('Mulai hari') ? '✅' : '⚠️',
    `fin: layar Pengaturan umum menampilkan ringkasan setelan utama`,
  )

  // SL-04b: Layar Pengaturan geser fin-app
  console.log('[fin 4/8] Memeriksa Pengaturan geser fin-app...')
  await page.navigate(`${BASE}/lainnya/pengaturan-geser`, { waitFor: '[data-testid="swipe-settings"]' })
  await page.screenshotTo(GROUP, 'fin-04-geser')
  const finGeserOpts = await page.puppeteerPage.evaluate(() => {
    return [...document.querySelectorAll('[data-testid^="swipe-option-"]')].map((el) => el.innerText.trim())
  })
  rec.note(`fin · opsi geser: ${finGeserOpts.join(' · ')}`)
  rec.check(
    'SL-04b',
    finGeserOpts.length >= 3 ? '✅' : '⚠️',
    `fin: 3 opsi gesture geser (${finGeserOpts.map((o) => o.split('\n')[0]).join(', ')})`,
  )

  // SL-05b: Layar Tema & Warna fin-app
  console.log('[fin 5/8] Memeriksa Pengaturan Tema & Warna fin-app...')
  await page.navigate(`${BASE}/lainnya/tema`, { waitFor: '[data-testid="theme-settings-screen"]' })
  await page.screenshotTo(GROUP, 'fin-05-tema-warna')
  const finThemes = await page.puppeteerPage.evaluate(() => {
    return [...document.querySelectorAll('[data-testid^="theme-mode-"], [data-testid^="theme-palette-"]')].map((el) =>
      el.innerText.trim(),
    )
  })
  rec.note(`fin · tema & palet: ${finThemes.join(' · ')}`)
  rec.check(
    'SL-05b',
    finThemes.length >= 5 ? '✅' : '⚠️',
    `fin: pengaturan tema & palet warna (${finThemes.map((t) => t.split('\n')[0]).join(', ')})`,
  )

  await page.close()
  rec.save()
  console.log('Tahap 8 (Setelan Lanjutan) selesai!')
}

main().catch((err) => {
  console.error('Gagal menjalankan ta08-setelan-lanjutan:', err)
  process.exit(1)
})
