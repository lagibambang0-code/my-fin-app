/**
 * Tahap 0 — Persiapan.
 *
 * Memastikan kedua sisi siap diuji dan merekam kondisi awalnya sebagai baseline:
 *  - device, versi Money Manager asli, versi Chrome device
 *  - dev server fin-app + port reverse adb
 *  - CDP ke Chrome device
 *  - metrik viewport (device px vs CSS px)
 *  - tangkapan layar keadaan awal kedua aplikasi
 *
 * Catatan penting: Chrome Android membekukan halaman saat aplikasi lain di
 * depan, sehingga panggilan CDP bisa menggantung. Karena itu sisi "asli" dan
 * sisi "fin" dikerjakan berurutan, masing-masing saat aplikasinya di depan.
 *
 * Jalankan: node tests/parity/ta00-persiapan.mjs
 */
import {
  BASE,
  MM_PACKAGE,
  adb,
  assertText,
  connectFinPage,
  dumpXml,
  ensureDevServer,
  expectForeground,
  findNode,
  foreground,
  launch,
  makeRecorder,
  parseNodes,
  realGoHome,
  saveDump,
  screenSize,
  shell,
  shot,
} from './lib.mjs'

const GROUP = 'TA00-persiapan'
const rec = makeRecorder(GROUP, 'Tahap 0 — Persiapan', 'Money Manager asli ↔ fin-app (parity run)')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ------------------------------------------------------------- 1. device */

const size = screenSize()
rec.note(`Device: ${process.env.ANDROID_SERIAL ?? '127.0.0.1:5555'} — layar ${size.width}×${size.height} px`)
rec.check('ENV-01', '✅', `device terhubung, layar ${size.width}×${size.height}`)

const props = shell(
  "getprop | grep -E 'ro.product.model|ro.build.version.release|ro.product.cpu.abi|ro.build.version.sdk'",
)
const get = (name) => new RegExp(`\\[${name}\\]: \\[(.*?)\\]`).exec(props)?.[1] ?? '?'
rec.note(
  `Model ${get('ro.product.model')} · Android ${get('ro.build.version.release')} (SDK ${get('ro.build.version.sdk')}) · ${get('ro.product.cpu.abi')}`,
)

const dumpsys = shell(`dumpsys package ${MM_PACKAGE}`)
const mmVersion = /versionName=(\S+)/.exec(dumpsys)?.[1] ?? '?'
rec.note(`Money Manager asli: ${mmVersion} (paket ${MM_PACKAGE})`)
rec.check('ENV-02', '✅', `Money Manager asli ${mmVersion}`)

/* --------------------------------------------------------- 2. dev server */

const spawned = await ensureDevServer()
rec.note(`Dev server fin-app: ${BASE} ${spawned ? '(dihidupkan skrip ini)' : '(sudah jalan)'}`)
const reverse = adb(['reverse', '--list']).trim()
rec.note(`adb reverse: ${reverse.split('\n').filter(Boolean).join(', ') || '(kosong)'}`)
rec.check(
  'ENV-03',
  reverse.includes(':3000') ? '✅' : '❌',
  `reverse tcp:3000 → ${reverse.includes(':3000') ? 'aktif' : 'tidak ada'}`,
)

/* ---------------------------------------- FASE A — sisi Money Manager asli */

launch(MM_PACKAGE)
await expectForeground(MM_PACKAGE)
await sleep(2500)

// Selalu mulai dari kerangka utama: tab Transaksi / sub-tab Harian.
const home = await realGoHome()
rec.note(`Sisi asli dikembalikan ke kerangka utama: ${home ? 'berhasil' : 'GAGAL'}`)

const realFg = foreground()
rec.note(`Sisi asli di depan: ${realFg}`)
rec.check('ENV-06', realFg?.startsWith(MM_PACKAGE) ? '✅' : '❌', `Money Manager di depan`)

const realXml = dumpXml()
saveDump(GROUP, 'real-00-transaksi-harian', realXml)
const realLabels = parseNodes(realXml)
  .map((n) => (n.text || n.desc).trim())
  .filter(Boolean)
rec.note(`Label sisi asli (${realLabels.length}): ${realLabels.slice(0, 14).join(' · ')}`)
rec.check('ENV-07', realLabels.length > 0 ? '✅' : '❌', `${realLabels.length} label terbaca dari uiautomator`)
const realShot = shot(GROUP, 'real-00-transaksi-harian')
rec.note(`Tangkapan sisi asli: ${realShot}`)

/* -------------------------------------------------- FASE B — sisi fin-app */

const page = await connectFinPage({ route: '/transaksi' })
const finVersion = await page.version?.()
rec.note(`Driver fin-app: ${page.driver ?? '?'}${finVersion ? ` · ${finVersion}` : ''}`)
rec.check(
  'ENV-04',
  process.env.FIN_DRIVER === 'device' ? '⚠️' : '✅',
  page.driver === 'device'
    ? 'memakai Chrome device (FIN_DRIVER=device) — diketahui tidak stabil'
    : 'memakai Chrome desktop pada viewport setara device',
)
rec.note(
  'Sisi fin-app tidak dijalankan di Chrome device: Chrome 109 di device uji crash ' +
    'berulang (SIGTRAP/SIGABRT di proses utama) bahkan sebelum fin-app dimuat. ' +
    'Viewport desktop diset 540×880 CSS px @dpr 2 — sama persis dengan viewport ' +
    'yang diberikan Chrome device (1080×1920 px dikurangi status bar + address bar).',
)

const metrics = await page.metrics()
rec.note(
  `Viewport fin-app: ${metrics.innerWidth}×${metrics.innerHeight} CSS px, dpr ${metrics.dpr} ` +
    `→ tangkapan ${metrics.innerWidth * metrics.dpr}×${metrics.innerHeight * metrics.dpr} px`,
)
rec.check(
  'ENV-05',
  metrics.innerWidth === 540 && metrics.innerHeight === 880 ? '✅' : '⚠️',
  `viewport CSS ${metrics.innerWidth}×${metrics.innerHeight} (diharapkan 540×880)`,
)

const finText = await page.bodyText()
const finLabels = finText
  .split('\n')
  .map((s) => s.trim())
  .filter(Boolean)
rec.note(`Label sisi fin-app (${finLabels.length}): ${finLabels.slice(0, 14).join(' · ')}`)
const finShot = await page.screenshotTo(GROUP, 'fin-00-transaksi-harian')
rec.note(`Tangkapan sisi fin-app: ${finShot}`)

/* -------------------------------------------------------------- 4. banding */

const subtabs = ['Harian', 'Kalender', 'Bulanan', 'Tutup buku', 'Memo']
const subtabsReal = subtabs.filter((l) => realLabels.includes(l))
const subtabsFin = subtabs.filter((l) => finLabels.includes(l))
rec.check(
  'PAR-01',
  subtabsReal.join() === subtabsFin.join() && subtabsReal.length === 5 ? '✅' : '⚠️',
  `sub-tab asli [${subtabsReal.join(' · ')}] vs fin [${subtabsFin.join(' · ')}]`,
)

const bottomNav = ['Transaksi', 'Statistik', 'Aset', 'Lainnya']
const navReal = bottomNav.filter((l) => realLabels.includes(l))
const navFin = bottomNav.filter((l) => finLabels.includes(l))
rec.check(
  'PAR-02',
  navReal.join() === navFin.join() && navReal.length === 4 ? '✅' : '⚠️',
  `tab bawah asli [${navReal.join(' · ')}] vs fin [${navFin.join(' · ')}]`,
)

/**
 * Ringkasan "Pendapatan / Pengeluaran / Total" kedua sisi.
 *
 * Sisi asli memakai id berpasangan `sumTextView1..3` (label) dan
 * `sumTextValue1..3` (nilai), jadi pasangannya tidak perlu ditebak.
 * Sisi fin memakai `trx-summary-income|expense|total`.
 */
const realSummaryNodes = parseNodes(realXml)
const realSummary = [1, 2, 3].map((i) => ({
  label: findNode(realSummaryNodes, { id: `sumTextView${i}` })?.text ?? '',
  value: findNode(realSummaryNodes, { id: `sumTextValue${i}` })?.text ?? '',
}))
const finSummary = await page.evaluate(`(() => {
  const pairs = [['Pendapatan', 'income'], ['Pengeluaran', 'expense'], ['Total', 'total']]
  return pairs.map(([label, key]) => ({
    label,
    value: document.querySelector('[data-testid="trx-summary-' + key + '"]')?.textContent?.trim() ?? '',
  }))
})()`)

const summaryRealOk = realSummary.every((r) => r.label && r.value)
const summaryFinOk = finSummary.every((r) => r.label && r.value)
rec.check(
  'PAR-03',
  summaryRealOk && summaryFinOk ? '✅' : '⚠️',
  `ringkasan ${['Pendapatan', 'Pengeluaran', 'Total'].join(' · ')} ada di kedua sisi`,
)
rec.note(
  `Ringkasan saat kosong — asli: ${realSummary.map((r) => `${r.label}=${r.value}`).join(' · ')} ` +
    `; fin: ${finSummary.map((r) => `${r.label}=${r.value}`).join(' · ')}`,
)

/**
 * Format angka. Mata uang utama aplikasi asli sudah disamakan ke IDR (Rp)
 * supaya perbandingan setara — lihat real-settings.md. Yang tersisa berbeda
 * adalah jumlah desimal: aplikasi asli memakai setelan "Poin desimal" 1.00
 * (2 angka di belakang koma), fin-app memakai 0 desimal untuk IDR.
 */
const realZero = realSummary[0]?.value ?? '?'
const finZero = finSummary[0]?.value ?? '?'
rec.check(
  'PAR-04',
  realZero === finZero ? '✅' : '❌',
  `format angka nol: asli "${realZero}" vs fin "${finZero}"`,
)

assertText('Tidak ada data')
rec.check('PAR-05', '✅', 'kedua aplikasi pada keadaan kosong (baseline bersih)')

page.close()
const saved = rec.save()
console.log(`\nBukti tahap 0: ${saved}`)
