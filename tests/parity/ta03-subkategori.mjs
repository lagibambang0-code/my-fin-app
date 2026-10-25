/**
 * Tahap 3 — Sub-kategori : Money Manager asli ⇄ fin-app.
 *
 *   SK-01 membuka daftar sub-kategori sebuah kategori
 *   SK-02 membuat sub-kategori
 *   SK-03 mengubah nama sub-kategori
 *   SK-04 menghapus sub-kategori
 *   SK-05 aksi "jadikan kategori utama"
 *   SK-06 mengubah kategori induk
 *   SK-07 membuka sub-kategori saat saklar global dimatikan
 *
 * Jalankan: node tests/parity/ta03-subkategori.mjs
 *
 * Peta layar aplikasi asli (dari pengamatan):
 *   ConfigSubCategoryList  titleName (nama kategori), faEditSubcategory (pensil header →
 *                          layar "Edit kategori" = kategori induk), addButton; baris:
 *                          dataRow, deleteCheckBtn (⊖ kiri), itemTitle, itemEditBtn,
 *                          faDragHandle
 *   tambah/edit sub        titleName "Sub kategori" | "Edit sub kategori",
 *                          rightTopBtn "Kategori utama", categoryValueBlock +
 *                          categoryTextView (kategori induk), textValueView, saveButton;
 *                          menekan categoryValueBlock memunculkan subTitleName "Kategori"
 *                          + 12 kindButton (grid 3 kolom)
 */
import {
  MM_PACKAGE,
  BACK,
  connectFinPage,
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
  saveDump,
  saveNotes,
  shot,
  sleep,
  tap,
  tapId,
} from './lib.mjs'

const GROUP = 'TA03-subkategori'
/** Kategori bawaan yang dipakai sebagai induk (4 sub-kategori bawaan). */
const PARENT = 'Food'
const TEST_NAME = 'ZzSub'
const TEST_NAME_2 = 'ZzSubEdit'

const HUB_TITLE = 'Kelola pengaturan'
const CAT_TITLE = 'Kategori pengeluaran'

const rec = makeRecorder(GROUP, 'Tahap 3 — Sub-kategori', 'Money Manager asli ⇄ fin-app')
rec.note(`Induk uji: ${PARENT} · nama uji: ${TEST_NAME} → ${TEST_NAME_2} (dibersihkan di akhir)`)

/* ========================================================= pembacaan layar MM */

const realTitle = () => label(parseNodes(dumpXml()).find((n) => n.id.endsWith('titleName')) ?? null)

/** Baris pada daftar yang sedang tampil (kategori maupun sub memakai itemTitle). */
function realRows() {
  return parseNodes(dumpXml())
    .filter((n) => n.id.endsWith('itemTitle') && n.bounds && n.bounds.y1 >= 157 && n.bounds.y2 <= 1669)
    .map((n) => ({ name: label(n), y: Math.round(n.cy) }))
}

function readRealCategories() {
  const nodes = parseNodes(dumpXml())
  return {
    title: label(nodes.find((n) => n.id.endsWith('titleName')) ?? null),
    rows: nodes
      .filter((n) => n.id.endsWith('itemTitle') && n.bounds && n.bounds.y1 >= 157 && n.bounds.y2 <= 1669)
      .map((n) => ({ name: label(n), y: Math.round(n.cy) })),
    subToggle: nodes.find((n) => n.id.endsWith('subCateSwitchBtn'))?.checked ?? null,
  }
}

function readRealSubs() {
  const nodes = parseNodes(dumpXml())
  return {
    title: label(nodes.find((n) => n.id.endsWith('titleName')) ?? null),
    rows: realRows(),
    empty: nodes.some((n) => (n.text ?? '').includes('Tidak ada data')),
  }
}

const names = (r) => r.rows.map((x) => x.name)

const realOnSubList = () => {
  const t = readRealSubs()
  return t.rows.length > 0 || t.empty
}

/** Teks yang terlihat di badan layar (di luar bilah atas/bawah). */
const realTexts = () =>
  parseNodes(dumpXml())
    .filter((n) => n.bounds && n.bounds.y1 > 136 && n.bounds.y2 < 1782 && (n.text ?? '').trim())
    .map((n) => label(n).trim())

/* ========================================================== navigasi layar MM */

/** Buka aplikasi sampai layar "Lainnya" (papan ubin), lalu masuk "Kelola pengaturan". */
async function realOpenHub() {
  launch(MM_PACKAGE)
  await expectForeground(MM_PACKAGE)
  await sleep(2000)
  await realGoHome()
  for (let i = 0; i < 3; i++) {
    tapId('MenuText01', { settle: 1000 })
    tapId('MenuText04', { settle: 1600 })
    if (realTitle() === HUB_TITLE) return true
    const tile = findNode(parseNodes(dumpXml()), { id: 'tVConfigGridBtn', text: 'Kelola pengaturan' })
    if (tile) {
      tap(tile.cx, tile.cy)
      await sleep(1400)
    }
    if (realTitle() === HUB_TITLE) return true
    await realGoHome()
  }
  return realTitle() === HUB_TITLE
}

/** Berdiri di daftar kategori pengeluaran, dari layar mana pun. */
async function realGoCategoryList() {
  for (let i = 0; i < 6; i++) {
    const t = realTitle()
    if (t === CAT_TITLE) return true
    if (t === HUB_TITLE) {
      const row = findNode(parseNodes(dumpXml()), { text: 'Kelola kategori pengeluaran', exact: true })
      if (!row) return false
      tap(540, row.cy)
      await sleep(1400)
      continue
    }
    // papan ubin tab "Lainnya"
    const tile = findNode(parseNodes(dumpXml()), { id: 'tVConfigGridBtn', text: 'Kelola pengaturan' })
    if (tile) {
      tap(tile.cx, tile.cy)
      await sleep(1400)
      continue
    }
    BACK()
    await sleep(1200)
  }
  return realTitle() === CAT_TITLE
}

/** Berdiri di daftar sub-kategori `parent`, dari layar mana pun. */
async function realGoSubList(parent) {
  for (let i = 0; i < 5; i++) {
    const t = realTitle()
    if (t.includes(parent) && realOnSubList()) return true
    if (t === CAT_TITLE) {
      const row = readRealCategories().rows.find((r) => r.name.includes(parent))
      if (!row) return false
      tap(540, row.y)
      await sleep(1400)
      continue
    }
    if (t === HUB_TITLE) {
      if (!(await realGoCategoryList())) return false
      continue
    }
    BACK()
    await sleep(1200)
  }
  return realTitle().includes(parent) && realOnSubList()
}

/** Tekan baris sub hingga masuk layar "Edit sub kategori". */
async function realOpenSubEdit(name) {
  if (/edit sub kategori/i.test(realTitle())) return true
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!(await realGoSubList(PARENT))) return false
    const sub = readRealSubs().rows.find((r) => r.name.includes(name))
    if (!sub) return false
    tap(540, sub.y)
    await sleep(1400)
    if (/edit sub kategori/i.test(realTitle())) return true
  }
  return false
}

/** Tutup dialog: tekan tombol negatif bila ada, kalau tidak tekan BACK. */
async function realDismissDialog() {
  const negative = parseNodes(dumpXml()).find(
    (n) => n.clickable && /^(tidak|tidak,|batalkan|batal|kembali|no)$/i.test((n.text ?? '').trim()),
  )
  if (negative) {
    rec.note(`asli · menutup dialog lewat tombol "${label(negative)}"`)
    tap(negative.cx, negative.cy)
    await sleep(1200)
    return true
  }
  BACK()
  await sleep(1200)
  return false
}

/**
 * Pastikan saklar "Fungsi sub kategori" bernilai `want`.
 * Tap pada saklar kadang tidak diterima saat layar baru selesai berpindah,
 * jadi nilainya selalu dibaca ulang dan tap diulang bila perlu.
 */
async function realSetSubToggle(want, { tries = 3 } = {}) {
  for (let i = 0; i < tries; i++) {
    if (readRealCategories().subToggle === want) return true
    tapId('subCateSwitchBtn', { settle: 1500 })
  }
  const final = readRealCategories().subToggle
  rec.note(`asli · saklar tidak mencapai ${want ? 'AKTIF' : 'MATI'} (terbaca ${final})`)
  return final === want
}

/* ============================================================ aksi CRUD MM */

async function realAddSub(name) {
  tapId('addButton', { settle: 1300 })
  shot(GROUP, 'real-02a-form-tambah-sub')
  saveDump(GROUP, 'real-02a-form-tambah-sub', dumpXml())
  tapId('textValueView', { settle: 600 })
  inputText(name)
  await sleep(400)
  tapId('saveButton', { settle: 1500 })
  return readRealSubs()
}

/** Tekan baris sub → layar "Edit sub kategori" → ganti nama → simpan. */
async function realRenameSub(fromName, toName) {
  if (!(await realOpenSubEdit(fromName))) throw new Error(`layar edit " ${fromName} " tidak terbuka`)
  shot(GROUP, 'real-03a-form-ubah-nama')
  saveDump(GROUP, 'real-03a-form-ubah-nama', dumpXml())
  tapId('textValueView', { settle: 500 })
  keyevent(123) // MOVE_END
  for (let i = 0; i < 30; i++) keyevent(67) // DEL
  inputText(toName)
  await sleep(400)
  tapId('saveButton', { settle: 1500 })
  return readRealSubs()
}

/** ⊖ pada baris → tombol sampah menggantikan pensil → tekan. */
async function realDeleteSub(name) {
  if (!(await realGoSubList(PARENT))) return null
  const sub = readRealSubs().rows.find((r) => r.name.includes(name))
  if (!sub) return null
  tap(60, sub.y) // ⊖
  await sleep(1200)
  shot(GROUP, 'real-04b-tombol-hapus-sub')
  saveDump(GROUP, 'real-04b-tombol-hapus-sub', dumpXml())
  tap(930, sub.y) // tombol sampah
  await sleep(1400)
  return readRealSubs()
}

/* ==================================================================== */

async function main() {
  /* ------------------------------------------------ Tahap 3 · sisi asli */
  rec.note('— sisi aplikasi asli —')
  if (!(await realOpenHub())) throw new Error(`tidak sampai layar "${HUB_TITLE}"`)
  if (!(await realGoCategoryList())) throw new Error(`tidak sampai layar "${CAT_TITLE}"`)
  rec.note(
    `asli · saklar "Fungsi sub kategori" pada awal uji: ${(await realSetSubToggle(true)) ? 'AKTIF' : '(gagal dinyalakan)'}`,
  )

  // Bersihkan sisa nama uji (kategori) dari jalannya pengujian sebelumnya.
  for (const leftover of readRealCategories().rows.filter((r) => r.name.includes('Zz'))) {
    rec.note(`asli · membersihkan sisa kategori "${leftover.name}"`)
    const cat = readRealCategories().rows.find((r) => r.name === leftover.name)
    if (!cat) continue
    tap(60, cat.y)
    await sleep(1100)
    tap(930, cat.y)
    await sleep(1300)
  }

  if (!(await realGoSubList(PARENT))) throw new Error(`daftar sub "${PARENT}" tidak terbuka`)

  // Bersihkan sisa sub nama uji.
  for (const leftover of readRealSubs().rows.filter((r) => r.name.includes('Zz'))) {
    rec.note(`asli · membersihkan sisa sub "${leftover.name}"`)
    await realDeleteSub(leftover.name)
  }

  // ---- SK-01 daftar sub-kategori
  const sub0 = readRealSubs()
  shot(GROUP, 'real-01-daftar-sub')
  saveDump(GROUP, 'real-01-daftar-sub', dumpXml())
  rec.note(`asli · sub "${PARENT}": ${names(sub0).join(' · ')}`)
  rec.check(
    'SK-01a',
    sub0.title.includes(PARENT) && sub0.rows.length > 0 ? '✅' : '❌',
    `asli: daftar sub-kategori "${sub0.title}" — ${names(sub0).join(', ')}`,
  )

  // ---- SK-05 tambahan: tombol "Kategori utama" pada layar TAMBAH sub
  let addShortcut = null
  tapId('addButton', { settle: 1300 })
  {
    const nodes = parseNodes(dumpXml())
    const rightTop = label(nodes.find((n) => n.id.endsWith('rightTopBtn')) ?? null)
    rec.note(`asli · layar tambah sub: judul "${realTitle()}", tombol kanan atas "${rightTop}"`)
    if (rightTop) {
      tapId('rightTopBtn', { settle: 1500 })
      const dialog = realTexts()
      addShortcut = dialog.find((t) => /utama/i.test(t)) ?? '(tanpa teks)'
      shot(GROUP, 'real-05c-tombol-kategori-utama-saat-tambah')
      saveDump(GROUP, 'real-05c-tombol-kategori-utama-saat-tambah', dumpXml())
      rec.note(`asli · tombol "${rightTop}" pada layar tambah sub memunculkan: ${dialog.join(' | ')}`)
      await realDismissDialog()
      rec.note(`asli · setelah menutup: judul "${realTitle()}"`)
    }
  }
  rec.check(
    'SK-05c',
    addShortcut ? '✅' : '⚠️',
    `asli: layar tambah sub juga punya pintasan "Kategori utama" → "${addShortcut ?? '(tidak ada)'}"`,
  )
  if (!(await realGoSubList(PARENT))) throw new Error('gagal kembali ke daftar sub setelah menutup layar pintasan')

  // ---- SK-02 buat sub
  const afterAdd = await realAddSub(TEST_NAME)
  shot(GROUP, 'real-02-setelah-tambah-sub')
  saveDump(GROUP, 'real-02-setelah-tambah-sub', dumpXml())
  rec.note(`asli · setelah tambah: ${names(afterAdd).join(' · ')}`)
  rec.check(
    'SK-02a',
    names(afterAdd).some((n) => n.includes(TEST_NAME)) ? '✅' : '❌',
    `asli: sub "${TEST_NAME}" dibuat dan muncul di akhir daftar`,
  )

  // ---- SK-03 ubah nama sub
  let renamed = []
  try {
    renamed = names(await realRenameSub(TEST_NAME, TEST_NAME_2))
  } catch (err) {
    rec.note(`asli · ubah nama sub gagal: ${err.message}`)
  }
  shot(GROUP, 'real-03-setelah-ubah-nama')
  saveDump(GROUP, 'real-03-setelah-ubah-nama', dumpXml())
  rec.check(
    'SK-03a',
    renamed.some((n) => n.includes(TEST_NAME_2)) ? '✅' : '❌',
    `asli: sub diubah menjadi "${TEST_NAME_2}" (tekan baris → layar "Edit sub kategori" → simpan)`,
  )

  // ---- SK-05 tombol "Kategori utama"
  let fixedTexts = []
  if (await realOpenSubEdit(TEST_NAME_2)) {
    shot(GROUP, 'real-05-layar-edit-sub')
    saveDump(GROUP, 'real-05-layar-edit-sub', dumpXml())
    const nodes = parseNodes(dumpXml())
    const rightTop = label(nodes.find((n) => n.id.endsWith('rightTopBtn')) ?? null)
    const parentField = label(nodes.find((n) => n.id.endsWith('categoryTextView')) ?? null)
    rec.note(`asli · layar edit sub: judul "${realTitle()}", tombol kanan atas "${rightTop}", kategori induk "${parentField}"`)

    tapId('rightTopBtn', { settle: 1500 })
    shot(GROUP, 'real-05b-tombol-kategori-utama')
    saveDump(GROUP, 'real-05b-tombol-kategori-utama', dumpXml())
    fixedTexts = realTexts()
    rec.note(`asli · setelah "Kategori utama": ${fixedTexts.slice(0, 6).join(' | ') || '(layar kosong)'}`)
    rec.check(
      'SK-05a',
      fixedTexts.some((t) => /utama/i.test(t)) ? '✅' : '⚠️',
      `asli: sub dapat dinaikkan jadi kategori utama lewat tombol kanan atas, dengan konfirmasi "${fixedTexts.find((t) => /utama/i.test(t)) ?? '(tidak terbaca)'}"`,
    )
    await realDismissDialog() // jawab TIDAK supaya data tidak berubah
    rec.note(`asli · setelah menutup konfirmasi: judul "${realTitle()}"`)
  }

  // ---- SK-06 kategori induk dapat diganti
  let parentOptions = []
  if (await realOpenSubEdit(TEST_NAME_2)) {
    const block = parseNodes(dumpXml()).find((n) => n.id.endsWith('categoryValueBlock'))
    if (block) {
      tap(block.cx, block.cy)
      await sleep(1400)
      shot(GROUP, 'real-06-pilih-kategori-induk')
      saveDump(GROUP, 'real-06-pilih-kategori-induk', dumpXml())
      const picker = parseNodes(dumpXml())
      parentOptions = picker.filter((n) => n.id.endsWith('kindButton')).map((n) => label(n))
      rec.note(
        `asli · menekan baris "Kategori" memunculkan ${parentOptions.length} pilihan di tempat (grid ${picker.some((n) => n.id.endsWith('subTitleName')) ? 'dengan judul "Kategori"' : 'tanpa judul'}): ${parentOptions.join(' · ')}`,
      )
      rec.check(
        'SK-06a',
        parentOptions.length > 1 ? '✅' : '⚠️',
        `asli: kategori induk dapat diganti — muncul ${parentOptions.length} kategori utama sebagai pilihan`,
      )
      BACK() // tutup grid pilihan
      await sleep(1100)
    }
    if (!realOnSubList()) {
      BACK()
      await sleep(1300)
    }
  }

  // ---- SK-04 hapus sub
  const afterDelete = await realDeleteSub(TEST_NAME_2)
  shot(GROUP, 'real-04-setelah-hapus-sub')
  saveDump(GROUP, 'real-04-setelah-hapus-sub', dumpXml())
  const gone = Boolean(afterDelete) && !names(afterDelete).some((n) => n.includes('ZzSub'))
  rec.note(`asli · setelah hapus: ${afterDelete ? names(afterDelete).join(' · ') : '(tidak terbaca)'}`)
  rec.check(
    'SK-04a',
    gone ? '✅' : '❌',
    `asli: sub uji terhapus lewat ⊖ + tombol sampah, tanpa dialog konfirmasi (sisa ${afterDelete ? afterDelete.rows.length : '?'} baris)`,
  )

  // ---- SK-07 perilaku saat saklar global dimatikan
  await realGoCategoryList()
  const toggleBefore = readRealCategories().subToggle
  await realSetSubToggle(false)
  const toggleAfter = readRealCategories().subToggle
  const offList = readRealCategories()
  shot(GROUP, 'real-07a-kategori-saklar-mati')
  saveDump(GROUP, 'real-07a-kategori-saklar-mati', dumpXml())
  rec.note(
    `asli · saklar ${toggleBefore ? 'AKTIF' : 'MATI'} → ${toggleAfter ? 'AKTIF' : 'MATI'}; label tiga baris pertama: ${offList.rows.slice(0, 3).map((r) => r.name).join(' | ')}`,
  )

  const labelOff = offList.rows.find((r) => r.name.includes(PARENT))?.name ?? ''
  rec.check(
    'SK-07c',
    /\(\d+\)/.test(labelOff) ? '❌' : '✅',
    `asli: saat saklar mati label baris tidak menampilkan jumlah sub ("${labelOff}")`,
  )

  const foodRowOff = offList.rows.find((r) => r.name.includes(PARENT))
  tap(540, foodRowOff.y)
  await sleep(1500)
  const offTitle = realTitle()
  shot(GROUP, 'real-07b-kategori-saat-saklar-mati')
  saveDump(GROUP, 'real-07b-kategori-saat-saklar-mati', dumpXml())
  rec.note(`asli · saat saklar mati, menekan baris "${PARENT}" membuka layar "${offTitle}"`)
  rec.check(
    'SK-07a',
    /edit kategori/i.test(offTitle) ? '✅' : '⚠️',
    `asli: saat saklar mati, baris kategori membuka "${offTitle}" — bukan daftar sub-kategori`,
  )

  await realGoCategoryList()
  await realSetSubToggle(true) // kembalikan ke AKTIF
  rec.note(`asli · saklar dikembalikan ke ${readRealCategories().subToggle ? 'AKTIF' : 'MATI'}`)

  /* ---------------------------------------------- Tahap 3 · sisi fin-app */
  rec.note('— sisi fin-app —')
  const page = await connectFinPage({ route: '/lainnya/kategori-pengeluaran', waitFor: '[data-testid]' })

  const finSubToggle = () =>
    page.puppeteerPage.$eval('[data-testid="sub-toggle"]', (el) => el.getAttribute('aria-checked'))

  /** Tekan tombol terakhir pada dialog konfirmasi; kembalikan seluruh teks dialog. */
  const finConfirm = async () => {
    const text = await page.textOf('[data-testid="confirm-dialog"]')
    if (text === null) return null
    const last = '[data-testid="confirm-dialog"] button:last-of-type'
    await page.puppeteerPage.click(last)
    await sleep(800)
    return text
  }

  /** Nama sub-kategori yang tampil di pengelola sub-kategori. */
  const finSubNames = async ({ tries = 16 } = {}) => {
    for (let i = 0; i < tries; i++) {
      const ids = await page.testIds()
      const rows = ids.filter((x) => x.startsWith('sub-row-')).map((x) => x.replace('sub-row-', ''))
      if (rows.length) return rows
      await sleep(250)
    }
    return []
  }

  // Saklar sub-kategori harus menyala supaya baris kategori bisa ditekan.
  const finToggleBefore = await finSubToggle()
  if (finToggleBefore !== 'true') await page.tapTestId('sub-toggle', { settle: 800 })
  rec.note(`fin · saklar sub kategori sebelum uji: ${finToggleBefore} → ${await finSubToggle()}`)

  // ---- SK-01 daftar sub-kategori
  // Nama kategori di fin-app sudah memuat emoji (mis. "\u{1F35C} Food"), jadi
  // pencocokan dilakukan lewat awalan + akhiran aria-label.
  await page.tap(`[aria-label^="Kelola sub kategori"][aria-label$="${PARENT}"]`, { settle: 900 })
  const finSubs0 = await finSubNames()
  await page.screenshotTo(GROUP, 'fin-01-daftar-sub')
  rec.note(`fin · sub "${PARENT}": ${finSubs0.join(' · ')}`)
  rec.check('SK-01b', finSubs0.length > 0 ? '✅' : '❌', `fin: daftar sub-kategori — ${finSubs0.join(', ')}`)
  rec.check(
    'SK-01',
    JSON.stringify(names(sub0)) === JSON.stringify(finSubs0) ? '✅' : '⚠️',
    `SK-01 perbandingan — asli [${names(sub0).join(', ')}] vs fin [${finSubs0.join(', ')}]`,
  )

  // Bersihkan sisa nama uji di fin-app.
  for (const leftover of (await finSubNames()).filter((r) => r.includes('Zz'))) {
    rec.note(`fin · membersihkan sisa sub "${leftover}"`)
    await page.tap(`[aria-label="Pilih sub kategori ${leftover}"]`, { settle: 300 })
    await page.tap('[aria-label="Hapus sub terpilih"]', { settle: 500 })
    await finConfirm()
  }

  // ---- SK-02 buat sub
  let finAdded = false
  try {
    await page.tap('[aria-label="Tambah sub kategori"]', { settle: 700 })
    const addPromoteCount = await page.puppeteerPage.$$eval(
      '[aria-label="Jadikan kategori utama"]',
      (els) => els.length,
    )
    await page.screenshotTo(GROUP, 'fin-05c-dialog-tambah-sub')
    rec.check(
      'SK-05d',
      addPromoteCount > 0 ? '✅' : '❌',
      `fin: dialog TAMBAH sub ${addPromoteCount > 0 ? 'menyediakan' : 'tidak menyediakan'} tombol "Kategori utama" (seperti layar tambah aplikasi asli)`,
    )
    await page.puppeteerPage.click('#sub-name-input')
    await page.puppeteerPage.keyboard.type(TEST_NAME, { delay: 25 })
    await page.screenshotTo(GROUP, 'fin-02a-form-tambah-sub')
    await page.tap('[aria-label="Simpan sub kategori"]', { settle: 900 })
    finAdded = (await finSubNames()).includes(TEST_NAME)
  } catch (err) {
    rec.note(`fin · tambah sub gagal: ${err.message}`)
  }
  await page.screenshotTo(GROUP, 'fin-02-setelah-tambah-sub')
  rec.check('SK-02b', finAdded ? '✅' : '❌', `fin: sub "${TEST_NAME}" dibuat dan muncul di akhir daftar`)

  // ---- SK-03 ubah nama sub
  let finRenamed = false
  try {
    await page.tap(`[aria-label="Ubah sub kategori ${TEST_NAME}"]`, { settle: 700 })
    await page.puppeteerPage.$eval('#sub-name-input', (el) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      setter.call(el, '')
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.puppeteerPage.click('#sub-name-input')
    await page.puppeteerPage.keyboard.type(TEST_NAME_2, { delay: 25 })
    await page.screenshotTo(GROUP, 'fin-03a-form-ubah-nama')
    await page.tap('[aria-label="Simpan sub kategori"]', { settle: 900 })
    finRenamed = (await finSubNames()).includes(TEST_NAME_2)
  } catch (err) {
    rec.note(`fin · ubah nama sub gagal: ${err.message}`)
  }
  await page.screenshotTo(GROUP, 'fin-03-setelah-ubah-nama')
  rec.check(
    'SK-03b',
    finRenamed ? '✅' : '❌',
    `fin: sub diubah menjadi "${TEST_NAME_2}" (pensil pada baris → dialog, tanpa berpindah layar)`,
  )

  // ---- SK-05 & SK-06 observasi pada dialog edit
  let parentField = null
  let parentOptions2 = []
  try {
    await page.tap(`[aria-label="Ubah sub kategori ${TEST_NAME_2}"]`, { settle: 700 })
    parentField = await page.puppeteerPage.$eval('[aria-label="Kategori induk"]', (el) => ({
      tag: el.tagName.toLowerCase(),
      readOnly: el.readOnly ?? null,
      disabled: el.disabled ?? null,
      value: el.value ?? el.innerText,
    }))
    await page.screenshotTo(GROUP, 'fin-05-layar-edit-sub')
    rec.note(
      `fin · kolom "Kategori induk": <${parentField.tag}> readOnly=${parentField.readOnly} nilai="${parentField.value}"`,
    )

    // SK-06: kolom Kategori dapat ditekan → daftar kategori utama muncul
    await page.tap('[aria-label="Kategori induk"]', { settle: 700 })
    parentOptions2 = await page.puppeteerPage.$$eval(
      '[data-testid="sub-parent-picker"] button',
      (els) => els.map((el) => el.getAttribute('aria-label') ?? el.innerText.trim()),
    )
    await page.screenshotTo(GROUP, 'fin-06-pilih-kategori-induk')
    rec.note(`fin · panel pilihan kategori induk: ${parentOptions2.join(' · ') || '(kosong)'}`)
    rec.check(
      'SK-06b',
      parentOptions2.length > 1 ? '✅' : '❌',
      `fin: kategori induk dapat diganti — panel menampilkan ${parentOptions2.length} kategori utama`,
    )
    await page.tap('[aria-label="Tutup daftar kategori"]', { settle: 500 })

    await page.tap('[aria-label="Jadikan kategori utama"]', { settle: 700 })
    const dialogText = (await page.textOf('[data-testid="confirm-dialog"]')) ?? '(tidak ada dialog)'
    await page.screenshotTo(GROUP, 'fin-05b-tombol-kategori-utama')
    rec.note(`fin · dialog "jadikan kategori utama": ${dialogText.replace(/\s+/g, ' ').slice(0, 160)}`)
    rec.check(
      'SK-05b',
      /kategori utama/i.test(dialogText) ? '✅' : '⚠️',
      'fin: sub dapat dinaikkan jadi kategori utama, dengan dialog konfirmasi',
    )

    // batalkan supaya data tidak berubah
    const cancelText = await page.textOf('[data-testid="confirm-dialog"] button:first-of-type')
    await page.puppeteerPage.click('[data-testid="confirm-dialog"] button:first-of-type')
    await sleep(700)
    rec.note(`fin · konfirmasi dibatalkan lewat tombol "${(cancelText ?? '?').trim()}"`)

    // tutup dialog edit tanpa menyimpan
    await page.puppeteerPage.evaluate(() => {
      const btn = [...document.querySelectorAll('[role="dialog"] button')].find((b) => b.innerText.trim() === 'Batal')
      if (btn) btn.click()
    })
    await sleep(700)
  } catch (err) {
    rec.note(`fin · observasi dialog sub gagal: ${err.message}`)
  }

  // ---- SK-04 hapus sub
  let finDeleted = false
  let deleteDialog = null
  try {
    if ((await finSubNames()).includes(TEST_NAME_2)) {
      await page.tap(`[aria-label="Pilih sub kategori ${TEST_NAME_2}"]`, { settle: 400 })
      await page.screenshotTo(GROUP, 'fin-04a-baris-terpilih')
      await page.tap('[aria-label="Hapus sub terpilih"]', { settle: 700 })
      deleteDialog = await page.textOf('[data-testid="confirm-dialog"]')
      await page.screenshotTo(GROUP, 'fin-04b-konfirmasi-hapus')
      await finConfirm()
      finDeleted = !(await finSubNames()).includes(TEST_NAME_2)
    }
  } catch (err) {
    rec.note(`fin · hapus sub gagal: ${err.message}`)
  }
  await page.screenshotTo(GROUP, 'fin-04-setelah-hapus-sub')
  rec.note(`fin · dialog hapus: ${(deleteDialog ?? '(tidak ada)').replace(/\s+/g, ' ').slice(0, 160)}`)
  rec.check('SK-04b', finDeleted ? '✅' : '❌', 'fin: sub uji terhapus lewat pemilihan + "Hapus sub terpilih" + dialog konfirmasi')

  // ---- SK-07 fin: saat saklar mati baris kategori tetap berguna (perilaku aplikasi asli)
  await page.tap('[aria-label="Kembali ke daftar kategori"]', { settle: 700 })
  await page.tapTestId('sub-toggle', { settle: 900 }) // matikan
  const finOff = await page.puppeteerPage.evaluate(() => {
    const row = [...document.querySelectorAll('[data-testid^="category-row-"]')].find((r) =>
      r.dataset.testid.endsWith('Food'),
    )
    const buttons = [...(row?.querySelectorAll('button') ?? [])].map((b) => ({
      label: b.getAttribute('aria-label'),
      disabled: b.disabled,
    }))
    return {
      subLabels: document.querySelectorAll('[aria-label^="Kelola sub kategori"]').length,
      buttons,
      text: (row?.innerText ?? '').replace(/\s+/g, ' ').trim(),
    }
  })
  await page.screenshotTo(GROUP, 'fin-07a-kategori-saklar-mati')
  const finRowBtn = finOff.buttons.find((b) => b.label?.startsWith('Ubah kategori')) ?? finOff.buttons[0]
  rec.note(
    `fin · saat saklar mati — baris "${finOff.text}"; tombol baris: ${JSON.stringify(finRowBtn)}; elemen ber-aria-label "Kelola sub kategori…": ${finOff.subLabels}`,
  )

  // Menekan baris harus membuka pengubahan kategori, bukan buntu.
  let offRowOpensEdit = false
  try {
    await page.tap(`[aria-label^="Ubah kategori"][aria-label$="${PARENT}"]`, { settle: 700 })
    offRowOpensEdit = await page.puppeteerPage.evaluate(
      () => document.querySelector('#category-form-title')?.textContent?.trim() === 'Edit kategori',
    )
    await page.screenshotTo(GROUP, 'fin-07b-kategori-saat-saklar-mati')
    await page.puppeteerPage.evaluate(() => {
      const btn = [...document.querySelectorAll('[role="dialog"] button')].find((b) => b.innerText.trim() === 'Batal')
      if (btn) btn.click()
    })
    await sleep(600)
  } catch (err) {
    rec.note(`fin · menekan baris saat saklar mati gagal: ${err.message}`)
  }
  rec.check(
    'SK-07b',
    finRowBtn?.disabled === false && finRowBtn?.label?.startsWith('Ubah kategori') && offRowOpensEdit
      ? '✅'
      : '❌',
    `fin: saat saklar mati, baris tetap ber-aria-label "${finRowBtn?.label}" dan membuka dialog "Edit kategori"`,
  )
  rec.check(
    'SK-07',
    /\(\d+\)/.test(finOff.text) ? '❌' : '✅',
    `SK-07 perbandingan — asli: baris membuka "Edit kategori" dan label tanpa jumlah sub; fin: baris membuka dialog "Edit kategori" dan label tanpa jumlah sub ("${finOff.text}")`,
  )
  // Kembalikan ke nilai bawaan fin-app (`Mati`) supaya keadaan akhir pasti bersih.
  if ((await finSubToggle()) !== 'false') await page.tapTestId('sub-toggle', { settle: 900 })
  rec.note(`fin · saklar dikembalikan ke nilai bawaan fin-app: ${await finSubToggle()} (Mati)`)

  saveNotes(
    GROUP,
    'perbandingan',
    [
      '# Perbandingan layar sub-kategori (Tahap 3)',
      '',
      `Induk uji: ${PARENT} · nama uji: ${TEST_NAME} → ${TEST_NAME_2}`,
      '',
      '| Hal | Money Manager asli | fin-app |',
      '| --- | --- | --- |',
      '| Membuka daftar sub | tekan baris kategori (saat saklar hidup) | tombol pada baris kategori (saat saklar "Fungsi sub kategori" menyala) |',
      '| Judul daftar sub | `titleName` = nama kategori + emoji | `h1` = nama kategori |',
      '| Pensil di header daftar sub | `faEditSubcategory` → layar "Edit kategori" (kategori induk) | tidak ada; pensil kategori induk ada di daftar kategori |',
      '| Menambah sub | `addButton` → layar "Sub kategori" | tombol `Tambah sub kategori` → dialog "Sub kategori" |',
      '| Mengubah nama | tekan baris → layar "Edit sub kategori" | pensil pada baris → dialog |',
      '| Kategori induk | baris `Kategori` ditekan → grid 12 `kindButton` di tempat | kolom `Kategori` ditekan → panel pilihan kategori utama |',
      '| Naikkan jadi kategori utama | tombol kanan atas `Kategori utama` di layar tambah **dan** ubah | tombol `Kategori utama` di dialog tambah **dan** ubah |',
      '| Menghapus | ⊖ kiri → tombol sampah menggantikan pensil, tanpa konfirmasi | centang baris → `Hapus sub terpilih` → dialog konfirmasi |',
      '| Mengurutkan | seret pegangan `faDragHandle` | tombol ↑ ↓ per baris |',
      '| Baris saat saklar global "Fungsi sub kategori" mati | tombol buka sub hilang, menekan baris membuka layar "Edit kategori" | menekan baris membuka dialog "Edit kategori" |',
      '| Label jumlah sub saat saklar mati | disembunyikan, contoh "🍜 Food" | disembunyikan juga, contoh "🍜 Food Bawaan" |',
      '',
      '## Isi daftar bawaan',
      '',
      `- asli \`${PARENT}\`: ${names(sub0).join(', ')}`,
      `- fin \`${PARENT}\`: ${finSubs0.join(', ')}`,
      '',
      '## Pilihan kategori induk di aplikasi asli',
      '',
      parentOptions.length ? parentOptions.map((o) => `- ${o}`).join('\n') : '_(tidak terbaca)_',
      '',
      '## Pilihan kategori induk di fin-app',
      '',
      parentOptions2.length ? parentOptions2.map((o) => `- ${o}`).join('\n') : '_(tidak terbaca)_',
      '',
    ].join('\n'),
  )

  await page.close()
  rec.save()
}

await ensureDevServer()
await main()
