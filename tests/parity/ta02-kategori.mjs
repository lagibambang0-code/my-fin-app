/**
 * Tahap 2 — Kategori (CRUD) : Money Manager asli ⇄ fin-app.
 *
 * Yang diuji, langkah demi langkah, di KEDUA sisi:
 *   TK-01 membuka daftar kategori pengeluaran
 *   TK-02 membuat kategori baru
 *   TK-03 mengubah nama kategori
 *   TK-04 menghapus kategori
 *   TK-05 saklar "Fungsi sub kategori"
 *   TK-06 membuka daftar kategori pendapatan
 *
 * Setiap langkah menyimpan tangkapan layar dari sisi asli DAN sisi fin-app ke
 * satu grup (`TA02-kategori`), supaya bisa disandingkan saat direview.
 *
 * Jalankan: node tests/parity/ta02-kategori.mjs
 *
 * Peta layar aplikasi asli (dari pengamatan, bukan tebakan):
 *   ConfigMainCategoryList   itemTitle, itemTitleSub, addButton, subCateSwitchBtn,
 *                            dataRow (→ sub-kategori), deleteCheckBtn (⊖ → tombol hapus),
 *                            itemEditBtn, faDragHandle
 *   ConfigMainCategoryAdd    titleName, textValueView, saveButton, rightTopBtn "Sub Kategori"
 *   ConfigSubCategoryList    faEditSubcategory (→ ConfigMainCategoryEdit), addButton
 *   ConfigMainCategoryEdit   textValueView berisi nama, saveButton
 * catatan: mengubah nama kategori TIDAK dari daftar, melainkan
 *          daftar → sub-kategori → ikon pensil di header.
 */
import {
  BASE,
  MM_PACKAGE,
  BACK,
  dumpXml,
  ensureDevServer,
  expectForeground,
  findNode,
  inputText,
  keyevent,
  label,
  launch,
  makeRecorder,
  parseNodes,
  realGoHome,
  shot,
  saveDump,
  saveNotes,
  sleep,
  tap,
  tapId,
} from './lib.mjs'
import { connectFinPage } from './lib.mjs'

const GROUP = 'TA02-kategori'
/** Nama uji yang tidak mungkin bentrok dengan data bawaan. */
const TEST_NAME = 'ZZUjiParitas'
const TEST_NAME_2 = 'ZZUjiParitasEdit'

const rec = makeRecorder(GROUP, 'Tahap 2 — Kategori (CRUD)', 'Money Manager asli ⇄ fin-app')
rec.note(`Nama uji: ${TEST_NAME} → ${TEST_NAME_2} (dihapus lagi di akhir)`)

/* --------------------------------------------------------------- navigasi MM */

async function openLainnya() {
  launch(MM_PACKAGE)
  await expectForeground(MM_PACKAGE)
  await sleep(2000)
  await realGoHome()
  tapId('MenuText01', { settle: 1000 })
  tapId('MenuText04', { settle: 1600 })
}

async function openSettingsHub() {
  await openLainnya()
  const tile = findNode(parseNodes(dumpXml()), { id: 'tVConfigGridBtn', text: 'Kelola pengaturan' })
  if (!tile) throw new Error('tombol "Kelola pengaturan" tidak ditemukan')
  tap(tile.cx, tile.cy)
  await sleep(1400)
}

/** Buka daftar kategori ('pengeluaran' | 'pendapatan') di aplikasi asli. */
async function openRealCategoryList(kind) {
  const wanted = kind === 'pendapatan' ? 'Kelola kategori pendapatan' : 'Kelola kategori pengeluaran'
  await openSettingsHub()
  const node = findNode(parseNodes(dumpXml()), { text: wanted, exact: true })
  if (!node) throw new Error(`baris "${wanted}" tidak ditemukan di hub setelan`)
  tap(540, node.cy)
  await sleep(1600)
}

/* -------------------------------------------------------- pembacaan MM (list) */

/** Keadaan daftar kategori aplikasi asli yang terlihat sekarang. */
function readRealCategories() {
  const nodes = parseNodes(dumpXml())
  const title = label(nodes.find((n) => n.id.endsWith('titleName')) ?? null)
  const rows = nodes
    .filter((n) => n.id.endsWith('itemTitle') && n.bounds)
    .map((n) => {
      const sub = nodes.find((s) => s.id.endsWith('itemTitleSub') && Math.abs(s.cy - n.cy) <= 40)
      return { name: label(n), sub: sub ? label(sub) : '', y: Math.round(n.cy) }
    })
  const toggle = nodes.find((n) => n.id.endsWith('subCateSwitchBtn'))
  return { title, rows, subToggle: toggle ? toggle.checked : null }
}

const realNames = (cats) => cats.rows.map((r) => r.name)

/** Cari baris kategori berdasarkan nama (cocok sebagian). */
function findRealRow(needle) {
  return readRealCategories().rows.find((r) => r.name.includes(needle)) ?? null
}

/* ------------------------------------------------------------ aksi MM (CRUD) */

async function realAddCategory(name) {
  tapId('addButton', { settle: 1200 })
  tapId('textValueView', { settle: 600 })
  inputText(name)
  await sleep(500)
  const before = label(findNode(parseNodes(dumpXml()), { id: 'textValueView' }) ?? null)
  tapId('saveButton', { settle: 1600 })
  return before
}

/** Daftar → sub-kategori → pensil header → ubah nama → simpan. */
async function realRenameCategory(fromName, toName) {
  const row = findRealRow(fromName)
  if (!row) throw new Error(`baris "${fromName}" tidak ditemukan`)
  tap(540, row.y) // buka daftar sub-kategori
  await sleep(1500)
  tapId('faEditSubcategory', { settle: 1400 }) // buka "Edit kategori"
  tapId('textValueView', { settle: 500 })
  keyevent(123) // pindah ke ujung teks
  for (let i = 0; i < 30; i++) keyevent(67) // hapus isi lama
  inputText(toName)
  await sleep(400)
  tapId('saveButton', { settle: 1600 })
  // kembali ke daftar kategori (dari sub-kategori)
  BACK()
  await sleep(1400)
}

/**
 * Hapus kategori: tombol ⊖ di kiri baris → muncul tombol hapus di posisi pensil.
 * Bila ada dialog konfirmasi, tekan tombol yang tersedia dan laporkan.
 */
async function realDeleteCategory(name) {
  const row = findRealRow(name)
  if (!row) throw new Error(`baris "${name}" tidak ditemukan`)
  tap(60, row.y) // ⊖
  await sleep(1200)
  shot(GROUP, `real-04b-hapus-konfirmasi-${name}`)
  saveDump(GROUP, `real-04b-hapus-konfirmasi-${name}`, dumpXml())
  // tombol hapus menggantikan posisi pensil (sekitar x = 930)
  tap(930, row.y)
  await sleep(1200)
  const dialog = parseNodes(dumpXml())
  const buttons = ['YA', 'OKE', 'OK', 'Ya', 'Hapus', 'Batalkan', 'TIDAK']
    .map((t) => ({ t, n: findNode(dialog, { text: t }) }))
    .filter((b) => b.n)
  if (buttons.length) {
    shot(GROUP, `real-04c-dialog-hapus-${name}`)
    const yes = buttons.find((b) => /^(YA|OKE|OK|Ya|Hapus)$/.test(b.t))
    rec.note(`dialog hapus muncul: ${buttons.map((b) => b.t).join(' / ')} → menekan ${yes?.t ?? 'TIDAK'}`)
    if (yes) {
      tap(yes.n.cx, yes.n.cy)
      await sleep(1500)
    }
  }
}

/* ------------------------------------------------------------------------- */

async function main() {
  /* ------------------------------------------------- Tahap 2 · sisi asli */
  rec.note('— sisi aplikasi asli —')
  await openRealCategoryList('pengeluaran')

  // Bersihkan sisa nama uji dari jalannya pengujian sebelumnya.
  for (const leftover of readRealCategories().rows.filter((r) => r.name.includes('UjiParitas'))) {
    rec.note(`asli · membersihkan sisa "${leftover.name}"`)
    await realDeleteCategory(leftover.name)
  }

  const cats0 = readRealCategories()
  shot(GROUP, 'real-01-daftar-pengeluaran')
  saveDump(GROUP, 'real-01-daftar-pengeluaran', dumpXml())
  rec.note(`asli · pengeluaran: ${cats0.rows.length} kategori — ${realNames(cats0).join(' · ')}`)
  rec.note(`asli · saklar "Fungsi sub kategori" = ${cats0.subToggle ? 'AKTIF' : 'MATI'}`)
  rec.check(
    'TK-01',
    cats0.title.includes('pengeluaran') && cats0.rows.length > 0 ? '✅' : '❌',
    `asli: daftar kategori pengeluaran — judul "${cats0.title}", ${cats0.rows.length} baris`,
  )

  // TK-02 membuat kategori
  const typed = await realAddCategory(TEST_NAME)
  const cats1 = readRealCategories()
  shot(GROUP, 'real-02-setelah-tambah')
  saveDump(GROUP, 'real-02-setelah-tambah', dumpXml())
  const created = realNames(cats1).some((n) => n.includes(TEST_NAME))
  rec.note(`asli · kolom isian terbaca "${typed}", kategori tersimpan di posisi terakhir: ${created ? 'ya' : 'tidak'}`)
  rec.check('TK-02a', created ? '✅' : '❌', `asli: kategori "${TEST_NAME}" dibuat lewat layar tambah`)

  // TK-03 mengubah nama
  let renamed = false
  try {
    await realRenameCategory(TEST_NAME, TEST_NAME_2)
    renamed = realNames(readRealCategories()).some((n) => n.includes(TEST_NAME_2))
  } catch (err) {
    rec.note(`asli · ubah nama gagal: ${err.message}`)
  }
  shot(GROUP, 'real-03-setelah-ubah-nama')
  saveDump(GROUP, 'real-03-setelah-ubah-nama', dumpXml())
  rec.check('TK-03a', renamed ? '✅' : '❌', `asli: nama kategori diubah menjadi "${TEST_NAME_2}"`)

  // TK-05 saklar sub kategori: matikan lalu nyalakan lagi (kembalikan keadaan)
  const beforeToggle = readRealCategories().subToggle
  tapId('subCateSwitchBtn', { settle: 1200 })
  const offToggle = readRealCategories().subToggle
  shot(GROUP, 'real-05-saklar-sub-kategori-mati')
  saveDump(GROUP, 'real-05-saklar-sub-kategori-mati', dumpXml())
  tapId('subCateSwitchBtn', { settle: 1200 })
  const backToggle = readRealCategories().subToggle
  rec.note(`asli · saklar: ${beforeToggle ? 'AKTIF' : 'MATI'} → ${offToggle ? 'AKTIF' : 'MATI'} → ${backToggle ? 'AKTIF' : 'MATI'}`)
  rec.check(
    'TK-05a',
    beforeToggle !== offToggle && beforeToggle === backToggle ? '✅' : '⚠️',
    'asli: saklar "Fungsi sub kategori" bisa dimatikan/nyalakan dan keadaan awal dipulihkan',
  )

  // TK-04 menghapus
  await realDeleteCategory(TEST_NAME_2)
  const cats2 = readRealCategories()
  shot(GROUP, 'real-04-setelah-hapus')
  saveDump(GROUP, 'real-04-setelah-hapus', dumpXml())
  const gone = !realNames(cats2).some((n) => n.includes('ZZUjiParitas'))
  rec.note(`asli · setelah hapus: ${cats2.rows.length} kategori`)
  rec.check('TK-04a', gone ? '✅' : '❌', `asli: kategori uji terhapus (sisa ${cats2.rows.length} baris)`)

  // TK-06 kategori pendapatan
  await openRealCategoryList('pendapatan')
  const inc = readRealCategories()
  shot(GROUP, 'real-06-daftar-pendapatan')
  saveDump(GROUP, 'real-06-daftar-pendapatan', dumpXml())
  rec.note(`asli · pendapatan: ${inc.rows.length} kategori — ${realNames(inc).join(' · ')}`)
  rec.check('TK-06a', inc.rows.length > 0 ? '✅' : '❌', `asli: daftar kategori pendapatan — ${inc.rows.length} baris`)

  /* -------------------------------------------------------- Tahap 2 · fin-app */
  rec.note('— sisi fin-app —')
  const page = await connectFinPage({ route: '/lainnya/kategori-pengeluaran', waitFor: '[data-testid]' })

  /** Nama kategori yang tampil sekarang, ditunggu sampai daftarnya benar-benar tergambar. */
  const finRowNames = async ({ tries = 20 } = {}) => {
    for (let i = 0; i < tries; i++) {
      const ids = await page.testIds()
      const rows = ids.filter((x) => x.startsWith('category-row-')).map((x) => x.replace('category-row-', ''))
      if (rows.length) return rows
      await sleep(250)
    }
    return []
  }

  /** Keadaan saklar sub kategori dibaca dari atribut aria-checked, bukan teksnya. */
  const finSubToggle = () =>
    page.puppeteerPage.$eval('[data-testid="sub-toggle"]', (el) => el.getAttribute('aria-checked'))

  /** Tekan tombol konfirmasi pada ConfirmDialog (role="alertdialog"). */
  const finConfirm = async () => {
    const btn = await page.puppeteerPage.$('[data-testid="confirm-dialog"] button:last-of-type')
    if (!btn) return null
    const txt = await page.puppeteerPage.$eval('[data-testid="confirm-dialog"] button:last-of-type', (el) => el.innerText)
    await page.puppeteerPage.click('[data-testid="confirm-dialog"] button:last-of-type')
    await sleep(700)
    return txt
  }

  // Bersihkan sisa nama uji dari jalannya pengujian sebelumnya.
  for (const leftover of (await finRowNames()).filter((r) => r.includes('UjiParitas'))) {
    rec.note(`fin · membersihkan sisa "${leftover}"`)
    await page.tap(`[aria-label="Pilih kategori ${leftover}"]`, { settle: 300 })
    await page.tap('[aria-label="Hapus kategori terpilih"]', { settle: 500 })
    await finConfirm()
  }

  const f0rows = await finRowNames()
  const f0 = { rows: f0rows, toggle: await finSubToggle().catch(() => null) }
  await page.screenshotTo(GROUP, 'fin-01-daftar-pengeluaran')
  rec.note(`fin · pengeluaran: ${f0.rows.length} kategori — ${f0.rows.join(' · ')}`)
  rec.note(`fin · keadaan saklar sub kategori: aria-checked=${f0.toggle}`)
  rec.check(
    'TK-01',
    f0.rows.length > 0 ? '✅' : '❌',
    `fin: daftar kategori pengeluaran — ${f0.rows.length} baris (judul "${await page.textOf('h1')}")`,
  )
  rec.note(
    `TK-01 perbandingan: asli memakai tombol ⊖ + pensil + pegangan geser per baris, ` +
      `fin memakai kotak centang + tombol naik/turun + tombol ubah`,
  )

  // TK-02 membuat kategori
  let finCreated = false
  try {
    await page.tapTestId('add-category', { settle: 600 })
    await page.puppeteerPage.click('#category-name-input')
    await page.puppeteerPage.keyboard.type(TEST_NAME, { delay: 25 })
    await page.screenshotTo(GROUP, 'fin-02-form-tambah')
    await page.tap('[aria-label="Simpan kategori"]', { settle: 800 })
    finCreated = (await finRowNames()).includes(TEST_NAME)
  } catch (err) {
    rec.note(`fin · tambah gagal: ${err.message}`)
  }
  await page.screenshotTo(GROUP, 'fin-02-setelah-tambah')
  rec.check('TK-02b', finCreated ? '✅' : '❌', `fin: kategori "${TEST_NAME}" dibuat lewat dialog tambah`)

  // TK-03 mengubah nama
  let finRenamed = false
  try {
    await page.tap(`[aria-label="Ubah kategori ${TEST_NAME}"]`, { settle: 600 })
    // Kosongkan isian lewat setter native supaya React ikut memperbarui state-nya.
    await page.puppeteerPage.$eval('#category-name-input', (el) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      setter.call(el, '')
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.puppeteerPage.click('#category-name-input')
    await page.puppeteerPage.keyboard.type(TEST_NAME_2, { delay: 25 })
    await page.screenshotTo(GROUP, 'fin-03-form-ubah')
    await page.tap('[aria-label="Simpan kategori"]', { settle: 800 })
    finRenamed = (await finRowNames()).includes(TEST_NAME_2)
  } catch (err) {
    rec.note(`fin · ubah nama gagal: ${err.message}`)
  }
  await page.screenshotTo(GROUP, 'fin-03-setelah-ubah-nama')
  rec.check('TK-03b', finRenamed ? '✅' : '❌', `fin: nama kategori diubah menjadi "${TEST_NAME_2}"`)

  // TK-05 saklar sub kategori
  let finToggled = false
  try {
    const before = await finSubToggle()
    await page.tapTestId('sub-toggle', { settle: 900 })
    const after = await finSubToggle()
    await page.screenshotTo(GROUP, 'fin-05-saklar-sub-kategori')
    await page.tapTestId('sub-toggle', { settle: 900 })
    const restored = await finSubToggle()
    finToggled = before !== after && before === restored
    rec.note(`fin · saklar (aria-checked): ${before} → ${after} → ${restored}`)
  } catch (err) {
    rec.note(`fin · saklar gagal: ${err.message}`)
  }
  rec.check('TK-05b', finToggled ? '✅' : '⚠️', 'fin: saklar "Fungsi sub kategori" bisa dimatikan/nyalakan')

  // TK-04 menghapus
  let finDeleted = false
  try {
    await page.tap(`[aria-label="Pilih kategori ${TEST_NAME_2}"]`, { settle: 400 })
    await page.screenshotTo(GROUP, 'fin-04-terpilih')
    await page.tap('[aria-label="Hapus kategori terpilih"]', { settle: 700 })
    await page.screenshotTo(GROUP, 'fin-04b-hapus-konfirmasi')
    const usedLabel = await finConfirm()
    if (usedLabel) rec.note(`fin · dialog konfirmasi hapus, tombol dipakai: "${usedLabel}"`)
    finDeleted = !(await finRowNames()).includes(TEST_NAME_2)
  } catch (err) {
    rec.note(`fin · hapus gagal: ${err.message}`)
  }
  await page.screenshotTo(GROUP, 'fin-04-setelah-hapus')
  rec.check('TK-04b', finDeleted ? '✅' : '❌', 'fin: kategori uji terhapus')

  // TK-06 kategori pendapatan
  await page.navigate(`${BASE}/lainnya/kategori-pendapatan`)
  const f1 = { rows: await finRowNames() }
  await page.screenshotTo(GROUP, 'fin-06-daftar-pendapatan')
  rec.note(`fin · pendapatan: ${f1.rows.length} kategori — ${f1.rows.join(' · ')}`)
  rec.check('TK-06b', f1.rows.length > 0 ? '✅' : '❌', `fin: daftar kategori pendapatan — ${f1.rows.length} baris`)

  /* ---------------------------------------------------------------- ringkas */
  const a = {
    pengeluaran: cats0.rows.length,
    pendapatan: inc.rows.length,
  }
  rec.note(`perbandingan jumlah kategori bawaan — asli: ${a.pengeluaran} pengeluaran / ${a.pendapatan} pendapatan`)
  rec.note(`perbandingan jumlah kategori bawaan — fin : ${f0.rows.length} pengeluaran / ${f1.rows.length} pendapatan`)

  saveNotes(
    GROUP,
    'panjang-langkah',
    [
      '# Perbandingan jumlah langkah (dibaca dari skrip, bukan dikira-kira)',
      '',
      '| Aksi | Money Manager asli | fin-app |',
      '| --- | --- | --- |',
      '| Membuka daftar kategori | Lainnya → Kelola pengaturan → Kelola kategori pengeluaran (3 ketuk) | buka /lainnya/kategori-pengeluaran (1 navigasi) |',
      '| Membuat kategori | tombol + → ketik nama → Menyimpan (3 langkah) | tombol tambah → ketik nama → Simpan (3 langkah) |',
      '| Mengubah nama | baris → daftar sub-kategori → pensil header → ubah → Menyimpan (5 langkah) | tombol ubah pada baris → ubah → Simpan (3 langkah) |',
      '| Menghapus | ⊖ pada baris → tombol hapus (2 langkah) | centang baris → tombol "Hapus kategori terpilih" (2 langkah) |',
      '| Mengurutkan | geser pegangan (drag) | tombol naik/turun |',
      '',
    ].join('\n'),
  )

  await page.close()
  rec.save()
}

await ensureDevServer()
await main()
