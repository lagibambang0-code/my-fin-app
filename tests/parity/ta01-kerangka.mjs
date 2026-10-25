/**
 * Tahap 1 — Kerangka & navigasi.
 *
 * Membandingkan rangka aplikasi: bilah sub-tab Transaksi, tab bawah, dan daftar
 * menu "Lainnya". Fokusnya struktur & alur, bukan piksel.
 *
 * Metode pembacaan (lihat readRealScreen / readFinScreen di lib.mjs):
 *  - sisi asli  : uiautomator dump, dipetakan lewat resource-id semantik
 *                 (itemTitle = label baris, itemValueTitle = nilainya,
 *                  tVConfigGridBtn = tombol grid, MenuText01..04 = tab bawah).
 *  - sisi fin   : DOM, dipetakan lewat peran ARIA & data-testid yang sudah ada.
 *
 * Yang dibandingkan selalu *label*, bukan nilai setelan. Versi pertama skrip
 * ini membandingkan teks mentah sehingga nilai seperti "Aktif", "USD ($)",
 * "Kamis", atau "Bag.A" salah terhitung sebagai item menu.
 *
 * Jalankan: node tests/parity/ta01-kerangka.mjs
 */
import {
  BACK,
  BASE,
  MM_PACKAGE,
  connectFinPage,
  dumpXml,
  ensureDevServer,
  expectForeground,
  findNode,
  launch,
  makeRecorder,
  parseNodes,
  readFinScreen,
  readRealScreen,
  saveDump,
  saveNotes,
  shot,
  sleep,
  swipe,
  tap,
  tapId,
} from './lib.mjs'

const GROUP = 'TA01-kerangka'
const rec = makeRecorder(GROUP, 'Tahap 1 — Kerangka & navigasi', 'Money Manager asli ↔ fin-app')

await ensureDevServer()

/* ------------------------------------------------------------- util sisi real */

async function realCapture(name) {
  await sleep(1200)
  const xml = dumpXml()
  saveDump(GROUP, name, xml)
  const file = shot(GROUP, name)
  const screen = readRealScreen(xml)
  saveNotes(GROUP, `${name}-screen`, screen.text.join('\n'))
  return { file, xml, screen }
}

/**
 * Kumpulkan baris setelan dari daftar yang perlu digulir (sisi asli).
 * Baris digabung berdasarkan labelnya; berhenti saat menggulir tidak lagi
 * memunculkan label baru. Judul seksi juga dikumpulkan karena sebagian baru
 * terlihat setelah menggulir.
 */
async function realScrollSettings(name, { max = 8 } = {}) {
  const seen = new Map()
  const sections = []
  let lastXml = ''
  for (let i = 0; i < max; i++) {
    lastXml = dumpXml()
    const screen = readRealScreen(lastXml)
    const before = seen.size + sections.length
    for (const r of screen.settings) {
      if (!seen.has(r.label) || (!seen.get(r.label) && r.value)) seen.set(r.label, r.value)
    }
    for (const s of screen.sections) if (!sections.includes(s)) sections.push(s)
    if (i > 0 && seen.size + sections.length === before) break
    swipe(540, 1450, 540, 700, 300)
    await sleep(900)
  }
  saveDump(GROUP, `${name}-all`, lastXml)
  return { rows: [...seen].map(([label, value]) => ({ label, value })), sections }
}

/* -------------------------------------------------------------- sisi fin-app */

async function finCapture(page, name) {
  await sleep(500)
  const file = await page.screenshotTo(GROUP, name)
  const screen = await readFinScreen(page)
  const body = (await page.bodyText()).split('\n').map((s) => s.trim()).filter(Boolean)
  // `labels` = struktur menu saja (untuk membandingkan item), `body` = seluruh
  // teks layar (untuk hal seperti keadaan kosong).
  const labels = [
    screen.title,
    ...screen.sections.map((s) => s.toUpperCase()),
    ...screen.items.map((i) => i.label),
    ...screen.nav,
  ].filter(Boolean)
  saveNotes(GROUP, `${name}-labels`, body.join('\n'))
  return { file, screen, labels, body }
}

/* ============================== FASE A — Money Manager asli ============== */

launch(MM_PACKAGE)
await expectForeground(MM_PACKAGE)
await sleep(2500)

// Pastikan berada di tab Transaksi.
tapId('MenuText01', { settle: 1500 })

const SUBTABS = [
  { key: 'harian', realId: 'tbMainDayBtn1', finId: 'trx-view-daily', label: 'Harian' },
  { key: 'kalender', realId: 'tbMainCalBtn', finId: 'trx-view-calendar', label: 'Kalender' },
  { key: 'bulanan', realId: 'tbMainMonthBtn', finId: 'trx-view-monthly', label: 'Bulanan' },
  { key: 'tutupbuku', realId: 'tbMainSummaryBtn', finId: 'trx-view-closebook', label: 'Tutup buku' },
  { key: 'memo', realId: 'tbMainMemoBtn', finId: 'trx-view-memo', label: 'Memo' },
]

const realSubtabs = {}
for (const { key, realId, label } of SUBTABS) {
  tapId(realId, { settle: 1800 })
  realSubtabs[key] = await realCapture(`real-10-transaksi-${key}`)
  rec.note(`asli · sub-tab ${label} → ${realSubtabs[key].file}`)
}

const NAV = [
  { key: 'statistik', realId: 'MenuText02', label: 'Statistik' },
  { key: 'aset', realId: 'MenuText03', label: 'Aset' },
  { key: 'lainnya', realId: 'MenuText04', label: 'Lainnya' },
]

const realNav = {}
for (const { key, realId, label } of NAV) {
  tapId(realId, { settle: 2000 })
  realNav[key] = await realCapture(`real-20-${key}`)
  rec.note(`asli · tab ${label} → ${realNav[key].file}`)
}

// Kembali ke Transaksi untuk meninggalkan device pada keadaan awal.
tapId('MenuText01', { settle: 1500 })

// "Kelola pengaturan" adalah padanan daftar pengaturan fin-app; buka submenunya.
tapId('MenuText04', { settle: 1800 })
const kelolaNode = findNode(parseNodes(dumpXml()), { id: 'tVConfigGridBtn', text: 'Kelola pengaturan' })
let realKelola = null
let realKelolaSettings = []
let realKelolaSections = []
if (kelolaNode) {
  tap(kelolaNode.cx, kelolaNode.cy)
  await sleep(1500)
  realKelola = await realCapture('real-21-kelola-pengaturan')
  const collected = await realScrollSettings('real-21-kelola-pengaturan')
  realKelolaSettings = collected.rows
  realKelolaSections = collected.sections
  rec.note(`asli · submenu Kelola pengaturan → ${realKelola.file}`)
  BACK()
  await sleep(1500)
}
tapId('MenuText01', { settle: 1500 })

/* ==================================== FASE B — fin-app =================== */

const page = await connectFinPage({ route: '/transaksi' })

const finSubtabs = {}
for (const { key, finId, label } of SUBTABS) {
  await page.tapTestId(finId, { settle: 700 })
  finSubtabs[key] = await finCapture(page, `fin-10-transaksi-${key}`)
  rec.note(`fin · sub-tab ${label} → ${finSubtabs[key].file}`)
}

// Kembali ke Harian sebelum pindah tab.
await page.tapTestId('trx-view-daily', { settle: 700 })

const finNav = {}
for (const { key, label } of NAV) {
  await page.tapHref(`/${key}`, { settle: 900 })
  finNav[key] = await finCapture(page, `fin-20-${key}`)
  rec.note(`fin · tab ${label} → ${finNav[key].file}`)
}

/* ====================================== PERBANDINGAN ===================== */

const dedupe = (arr) => [...new Set(arr)]
const sameList = (a, b) => a.length === b.length && a.every((v, i) => v === b[i])

const SUBLABELS = SUBTABS.map((s) => s.label)
const NAV_LABELS = ['Transaksi', 'Statistik', 'Aset', 'Lainnya']

/* ---- bilah sub-tab --------------------------------------------------- */
const realSubBar = SUBLABELS.filter((l) => realSubtabs.harian.screen.text.includes(l))
const finSubBar = finSubtabs.harian.screen.subtabs.filter(Boolean)

rec.check(
  'TA1-01',
  realSubBar.length === 5 && finSubBar.length === 5 ? '✅' : '❌',
  `bar sub-tab — asli ${realSubBar.length}/5, fin ${finSubBar.length}/5`,
)
rec.check(
  'TA1-02',
  sameList(realSubBar, finSubBar) ? '✅' : '⚠️',
  `urutan sub-tab — asli [${realSubBar.join(' · ')}] vs fin [${finSubBar.join(' · ')}]`,
)

/* ---- tab bawah ------------------------------------------------------- */
const realBottom = realSubtabs.harian.screen.nav
const finBottom = finSubtabs.harian.screen.nav
rec.check(
  'TA1-03',
  sameList(realBottom, finBottom) ? '✅' : '❌',
  `urutan tab bawah — asli [${realBottom.join(' · ')}] vs fin [${finBottom.join(' · ')}]`,
)

rec.check(
  'TA1-04',
  realNav.statistik.screen.text.includes('Pendapatan') && realNav.statistik.screen.text.includes('Pengeluaran')
    ? '✅'
    : '⚠️',
  `layar Statistik terbuka di kedua sisi — asli: tombol Pendapatan/Pengeluaran + judul "${realNav.statistik.screen.title}"; fin: judul "${finNav.statistik.screen.title}"`,
)
rec.note(
  'Catatan: kepala layar Statistik berbeda — aplikasi asli menaruh periode ("Okt 2026") di judul ' +
    `dan pemilih periode di kanan atas, fin-app menaruh kata "${finNav.statistik.screen.title}".`,
)
rec.check(
  'TA1-05',
  realNav.aset.screen.title.includes('Aset') && finNav.aset.screen.title.includes('Aset') ? '✅' : '⚠️',
  `layar Aset — asli "${realNav.aset.screen.title}" vs fin "${finNav.aset.screen.title}"`,
)

/* ---- bentuk menu "Lainnya" ------------------------------------------ */
// Sisi asli : grid 9 tombol; sebagian langsung membuka fitur, sebagian masuk
//             ke submenu daftar setelan "Kelola pengaturan" (24 baris).
// Sisi fin  : satu daftar berseksi (4 seksi, 14 item).
// Pembandingnya harus seluruh kosakata menu asli — tombol grid *dan* baris
// setelan — supaya "Kelola aset" dan "Cadangan" tidak salah dihitung sebagai
// milik fin-app saja.
const realTiles = dedupe(realNav.lainnya.screen.tiles)
const realSettingsRows = dedupe([
  ...realKelolaSettings,
  ...realKelola.screen.settings,
].map((r) => r.label))
/**
 * "Kelola pengaturan" pada sisi asli adalah tombol grid yang hanya membuka
 * submenu, bukan fitur. Padanannya di fin-app adalah judul seksi (dibandingkan
 * terpisah di TA1-09), jadi tombol ini tidak dihitung sebagai item.
 */
const HUBS = ['Kelola pengaturan']
const realVocabulary = dedupe([
  ...realTiles.filter((t) => !HUBS.includes(t)),
  ...realSettingsRows,
])
const finSections = finNav.lainnya.screen.sections
const finItems = dedupe(finNav.lainnya.screen.items.map((i) => i.label))

rec.note(`asli · grid "Lainnya" (${realTiles.length}): ${realTiles.join(' · ') || '—'}`)
rec.note(`asli · setelan di "Kelola pengaturan" (${realSettingsRows.length}): ${realSettingsRows.join(' · ') || '—'}`)
rec.note(`fin · seksi "Lainnya" (${finSections.length}): ${finSections.join(' · ') || '—'}`)
rec.note(`fin · item "Lainnya" (${finItems.length}): ${finItems.join(' · ') || '—'}`)

const shared = finItems.filter((l) => realVocabulary.includes(l))
const onlyReal = realVocabulary.filter((l) => !finItems.includes(l))
const onlyFin = finItems.filter((l) => !realVocabulary.includes(l))

rec.note(`item sama (${shared.length}): ${shared.join(' · ') || '—'}`)
rec.note(`hanya di asli (${onlyReal.length}): ${onlyReal.join(' · ') || '—'}`)
rec.note(`hanya di fin (${onlyFin.length}): ${onlyFin.join(' · ') || '—'}`)
rec.note(
  'Pemasangan label↔nilai memakai resource-id (itemTitle ↔ itemValueTitle), bukan tebakan posisi teks. ' +
    'Validasi: baris "Geser = Ubah tanggal" memang dua hal berbeda — PRD-06 §2.7 ' +
    'mendokumentasikan "Geser" sebagai setelan gesture tersendiri, jadi "Ubah tanggal" ' +
    'adalah nilainya, bukan label yang bocor.',
)

/**
 * Fitur yang memang diputuskan dilewati saat analisis (money-manager-clone/README.md).
 * Dipisahkan supaya jumlah "hanya di asli" tidak terlihat seperti 17 kekurangan.
 */
const SENGAJA_DILEWATI = ['CalcBox', 'Pengelola PC', 'Masukan', 'Bantuan', 'Rekomendasi']
const onlyRealSkipped = onlyReal.filter((l) => SENGAJA_DILEWATI.includes(l))
const onlyRealReal = onlyReal.filter((l) => !SENGAJA_DILEWATI.includes(l))
rec.note(
  `hanya di asli — sengaja dilewati (${onlyRealSkipped.length}): ${onlyRealSkipped.join(' · ') || '—'}`,
)
rec.note(`hanya di asli — beda nyata (${onlyRealReal.length}): ${onlyRealReal.join(' · ') || '—'}`)

rec.check(
  'TA1-06',
  onlyRealReal.length === 0 && onlyFin.length === 0 ? '✅' : shared.length >= 8 ? '⚠️' : '❌',
  `menu pengaturan: ${shared.length} sama, ${onlyRealReal.length} hanya di asli (${onlyRealSkipped.length} lainnya sengaja dilewati), ${onlyFin.length} hanya di fin`,
)

rec.check(
  'TA1-07',
  '⚠️',
  `bentuk menu "Lainnya" berbeda: asli = grid ${realTiles.length} tombol + submenu "Kelola pengaturan" (${realSettingsRows.length} setelan), fin = daftar ${finSections.length} seksi (${finItems.length} item)`,
)

/* ---- judul kelompok ------------------------------------------------- */
// Aplikasi asli memakai judul seksi di dalam submenu; fin-app memakainya di
// layar "Lainnya" langsung. Yang dibandingkan: judul yang dipakai kedua sisi.
const realGroupTitles = dedupe([...realKelolaSections, ...realKelola.screen.sections, ...HUBS])
const sharedGroups = finSections.filter((s) => realGroupTitles.includes(s))
rec.note(
  `judul kelompok — asli [${realGroupTitles.join(' · ')}] vs fin [${finSections.join(' · ')}] · sama: [${sharedGroups.join(' · ')}]`,
)
rec.check(
  'TA1-09',
  sharedGroups.length >= 2 ? '⚠️' : '❌',
  `judul kelompok sama ${sharedGroups.length}: ${sharedGroups.join(' · ')}; hanya di fin: ${finSections.filter((s) => !realGroupTitles.includes(s)).join(' · ') || '—'}`,
)

const realEmpty = realSubtabs.harian.screen.text.includes('Tidak ada data')
const finEmpty = finSubtabs.harian.body.includes('Tidak ada data')
rec.check(
  'TA1-08',
  realEmpty && finEmpty ? '✅' : '⚠️',
  `keadaan kosong Harian — asli ${realEmpty ? 'ada' : 'tidak ada'} · fin ${finEmpty ? 'ada' : 'tidak ada'}`,
)

/* ---- integritas tautan menu fin ------------------------------------- */
// Item menu yang menuju rute tidak ada = jalan buntu bagi pengguna, dan tidak
// akan terlihat dari perbandingan label saja.
const linkStatus = []
for (const item of finNav.lainnya.screen.items) {
  if (!item.href) continue
  let status = 0
  try {
    status = (await fetch(`${BASE}${item.href}`, { redirect: 'manual' })).status
  } catch {
    status = 0
  }
  linkStatus.push({ ...item, status })
}
const brokenLinks = linkStatus.filter((l) => l.status >= 400 || l.status === 0)
rec.note(
  `tautan menu fin: ${linkStatus.length} diperiksa, ${brokenLinks.length} gagal — ` +
    `${brokenLinks.map((b) => `${b.label} (${b.href} → ${b.status})`).join(' · ') || '—'}`,
)
rec.check(
  'TA1-10',
  brokenLinks.length === 0 ? '✅' : '❌',
  `${brokenLinks.length} dari ${linkStatus.length} tautan menu tidak dapat dibuka`,
)

/* ---- baseline setelan asli (bukti, bukan verdict) -------------------- */
saveNotes(
  GROUP,
  'real-settings-baseline',
  ['# Setelan Money Manager asli saat pengujian', '', ...realKelolaSettings.map((r) => (r.value ? `${r.label} = ${r.value}` : r.label))].join(
    '\n',
  ),
)

page.close()
const saved = rec.save()
console.log(`\nBukti tahap 1: ${saved}`)
