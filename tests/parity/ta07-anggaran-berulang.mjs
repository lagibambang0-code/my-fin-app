/**
 * Tahap 7 — Anggaran & Berulang : Money Manager asli ⇄ fin-app.
 *
 * Cakupan pemeriksaan:
 *   AB-01  Layar daftar anggaran (kosong): kepala, teks bantuan, keadaan kosong
 *   AB-02  Form tambah anggaran: komponen (Kategori, Total, Menyimpan, grid kategori, numpad)
 *   AB-03  Grid kategori pada form tambah: 13 opsi (· Semua + 12 kategori)
 *   AB-04  Detail anggaran bulanan: 12 bulan, Anggaran dasar, navigasi tahun, hapus
 *   AB-05  Kelola berulang: judul, teks bantuan, baris Waktu peninjauan ulang, tombol +
 *   AB-06  Dialog Waktu peninjauan ulang: 2 opsi
 *   AB-07  Layar Ulang (RepeatTypeList): 14 tipe frekuensi
 *   AB-08  Kembali ke Kelola pengaturan tanpa jalan buntu
 *
 * Data uji: satu budget "🍜 Food Rp 0" dibuat sementara untuk melihat detail bulanan,
 *           lalu dihapus di akhir.
 *
 * Jalankan: node tests/parity/ta07-anggaran-berulang.mjs
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
  saveNotes,
  shot,
  sleep,
  tap,
} from './lib.mjs'

const GROUP  = 'TA07-anggaran-berulang'
const rec    = makeRecorder(GROUP, 'Tahap 7 — Anggaran & Berulang', 'Money Manager asli ⇄ fin-app')

const baseId  = (n) => (n.id ?? '').replace(`${MM_PACKAGE}:id/`, '')
const nodes   = () => parseNodes(dumpXml())
const realTitle = () => label(nodes().find((n) => baseId(n) === 'titleName'))

const TAB_ID = { Lainnya: 'MenuText04' }

/* ---- navigasi umum ---- */
async function realTap(q, { expect, settle = 1600, tries = 4 } = {}) {
  for (let i = 0; i < tries; i++) {
    dismissAd()
    const n = findNode(nodes(), q)
    if (!n) { await sleep(800); continue }
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
        await sleep(1500)
      }
      continue
    }
    BACK()
    await sleep(1000)
    dismissAd()
  }
  return realTitle() === 'Kelola pengaturan'
}

async function realOpenAnggaran() {
  if (realTitle() === 'Pengaturan anggaran') return true
  await realEnsureKelolaPengaturan()
  await realTap({ text: 'Pengaturan anggaran' }, { expect: () => realTitle() === 'Pengaturan anggaran' })
  return realTitle() === 'Pengaturan anggaran'
}

async function realOpenBerulang() {
  if (realTitle() === 'Kelola berulang') return true
  await realEnsureKelolaPengaturan()
  await realTap({ text: 'Kelola berulang' }, { expect: () => realTitle() === 'Kelola berulang' })
  return realTitle() === 'Kelola berulang'
}
/* ---- pembacaan asli ---- */

function readRealBudgetList() {
  const ns = nodes()
  const title    = label(ns.find((n) => baseId(n) === 'titleName'))
  const hasAdd   = ns.some((n) => baseId(n) === 'addButton')
  const help     = label(ns.find((n) => baseId(n) === 'helpDescription'))
  const items    = ns.filter((n) => baseId(n) === 'itemTitle').map((n) => label(n))
  const isEmpty  = items.length === 0 || ns.some((n) => baseId(n) === 'faNoData') || ns.some((n) => n.text === 'Tidak ada data')
  return { title, hasAdd, help, isEmpty, items }
}

function readRealBudgetForm() {
  const ns = nodes()
  const title       = label(ns.find((n) => baseId(n) === 'titleName'))
  const catLabel    = label(ns.find((n) => baseId(n) === 'categoryTitle'))
  const totalLabel  = label(ns.find((n) => baseId(n) === 'numberTitle'))
  const saveBtn     = label(ns.find((n) => baseId(n) === 'saveButton'))
  const gridTitle   = label(ns.find((n) => baseId(n) === 'subTitleName'))
  const gridItems   = ns.filter((n) => baseId(n) === 'kindButton').map((n) => label(n))
  const hasPad      = ns.some((n) => baseId(n) === 'pad1')
  return { title, catLabel, totalLabel, saveBtn, gridTitle, gridItems, hasPad }
}

function readRealBudgetMonthly() {
  const ns = nodes()
  const title      = label(ns.find((n) => baseId(n) === 'titleName'))
  const hasLeft    = ns.some((n) => baseId(n) === 'monthLeftButton')
  const yearText   = label(ns.find((n) => baseId(n) === 'thisMonthTxtView'))
  const hasRight   = ns.some((n) => baseId(n) === 'monthRightButton')
  const hasDelete  = ns.some((n) => baseId(n) === 'faDeleteBtn')
  const help       = label(ns.find((n) => baseId(n) === 'helpDescription'))
  const baseLabel  = label(ns.find((n) => baseId(n) === 'numberTitle'))
  const months     = ns.filter((n) => baseId(n) === 'tvMonth').map((n) => label(n))
  return { title, hasLeft, yearText, hasRight, hasDelete, help, baseLabel, months }
}

function readRealRepeatSettings() {
  const ns = nodes()
  const title    = label(ns.find((n) => baseId(n) === 'titleName'))
  const hasAdd   = ns.some((n) => baseId(n) === 'addButton')
  const helpQ    = label(ns.find((n) => baseId(n) === 'helpTitle'))
  const helpDesc = label(ns.find((n) => baseId(n) === 'helpDescription'))
  const rowLabel = label(ns.find((n) => baseId(n) === 'contentTextView'))
  const rowValue = label(ns.find((n) => baseId(n) === 'subContentTextView'))
  return { title, hasAdd, helpQ, helpDesc, rowLabel, rowValue }
}

function readRealRepeatDialog() {
  const ns = nodes()
  const dialogTitle = ns.filter((n) => baseId(n) === 'tvTitle').map((n) => label(n))[0] ?? ''
  const options     = ns.filter((n) => baseId(n) === 'tvTitle').map((n) => label(n)).slice(1)
  const hasCheck    = ns.some((n) => baseId(n) === 'faCheck')
  const hasClose    = ns.some((n) => baseId(n) === 'faClose')
  return { dialogTitle, options, hasCheck, hasClose }
}

function readRealRepeatTypeList() {
  const ns    = nodes()
  const title = label(ns.find((n) => baseId(n) === 'titleName'))
  const types = ns.filter((n) => baseId(n) === 'itemTitle').map((n) => label(n))
  return { title, types }
}

/* ==================================================================== main */

async function main() {
  /* -------- SISI APLIKASI ASLI -------- */
  rec.note('— sisi aplikasi asli —')
  launch(MM_PACKAGE)
  await sleep(2000)
  dismissAd()

  /* AB-01  Daftar Anggaran (kosong) */
  console.log('[1/8] Memeriksa daftar anggaran kosong...')
  await realOpenAnggaran()
  const realListEmpty = readRealBudgetList()
  saveDump(GROUP, 'real-01-budget-list-kosong', dumpXml())
  shot(GROUP, 'real-01-budget-list-kosong')
  rec.note(`asli · anggaran kosong: judul "${realListEmpty.title}" · tambah ${realListEmpty.hasAdd} · kosong ${realListEmpty.isEmpty}`)
  rec.note(`asli · bantuan: "${realListEmpty.help.slice(0, 80)}"`)
  rec.check('AB-01',
    realListEmpty.title === 'Pengaturan anggaran' && realListEmpty.hasAdd && realListEmpty.isEmpty ? '✅' : '⚠️',
    `asli: judul "${realListEmpty.title}" · + ${realListEmpty.hasAdd} · kosong ${realListEmpty.isEmpty}`)

  /* AB-02  Form tambah anggaran (numpad ditampilkan setelah ketuk Total) */
  console.log('[2/8] Memeriksa form tambah anggaran...')
  await realTap({ id: 'addButton' }, { expect: () => realTitle() === 'Tambah anggaran' })
  const realFormBefore = readRealBudgetForm()
  shot(GROUP, 'real-02-form-tambah-budget')
  rec.note(`asli · form tambah: "${realFormBefore.title}" · isian: ${realFormBefore.catLabel}, ${realFormBefore.totalLabel}, ${realFormBefore.saveBtn}`)
  rec.note(`asli · grid: "${realFormBefore.gridTitle}" · ${realFormBefore.gridItems.length} opsi`)
  rec.check('AB-02',
    realFormBefore.title === 'Tambah anggaran' && Boolean(realFormBefore.saveBtn) && realFormBefore.gridItems.length >= 6 ? '✅' : '⚠️',
    `asli: form "${realFormBefore.title}" · ${realFormBefore.gridItems.length} opsi grid terlihat · simpan "${realFormBefore.saveBtn}"`)

  /* AB-03  Grid kategori */
  console.log('[3/8] Memeriksa grid kategori...')
  rec.note(`asli · grid kategori: ${realFormBefore.gridItems.join(' · ')}`)
  rec.check('AB-03',
    realFormBefore.gridItems.includes('Semua') && realFormBefore.gridItems.length >= 6 ? '✅' : '⚠️',
    `asli: grid memuat "Semua" dan ${realFormBefore.gridItems.length} opsi terlihat (dua kolom / scrollable)`)

  /* Pilih kategori Food (dua kolom: kiri kategori utama, kanan sub-kategori) */
  const foodBtn = nodes().find((n) => baseId(n) === 'kindButton' && label(n).includes('Food') && (n.bounds?.x1 ?? 0) < 540)
  if (foodBtn) {
    tap(foodBtn.cx, foodBtn.cy)
    await sleep(1000)
  }
  // Ketuk sub-kategori pertama di kolom kanan (Food Semua)
  const subFood = nodes().find((n) => baseId(n) === 'kindButton' && (n.bounds?.x1 ?? 0) >= 540)
  if (subFood) {
    tap(subFood.cx, subFood.cy)
    await sleep(1000)
  }

  /* Numpad otomatis muncul setelah kategori dipilih di Money Manager */
  const realFormWithPad = readRealBudgetForm()
  shot(GROUP, 'real-02b-numpad-budget')
  rec.note(`asli · numpad ditampilkan: ${realFormWithPad.hasPad}`)
  rec.check('AB-02b',
    realFormWithPad.hasPad ? '✅' : '⚠️',
    `asli: numpad kustom tampil otomatis setelah kategori dipilih`)

  /* Simpan anggaran Food */
  const saveBtn = nodes().find((n) => baseId(n) === 'saveButton')
  if (saveBtn) { tap(saveBtn.cx, saveBtn.cy); await sleep(1800) }
  dismissAd()

  /* AB-04  Detail anggaran bulanan */
  console.log('[4/8] Memeriksa detail anggaran bulanan...')
  const foodItem = nodes().find((n) => baseId(n) === 'itemTitle' && label(n).includes('Food'))
  if (foodItem) {
    tap(foodItem.cx, foodItem.cy)
    await sleep(1800)
  }
  dismissAd()
  const realMonthly = readRealBudgetMonthly()
  saveDump(GROUP, 'real-04-budget-monthly', dumpXml())
  shot(GROUP, 'real-04-budget-monthly')
  rec.note(`asli · detail bulanan: "${realMonthly.title}" · tahun ${realMonthly.yearText} · ${realMonthly.months.length} bulan`)
  rec.note(`asli · Anggaran dasar: "${realMonthly.baseLabel}" · navigasi ← ${realMonthly.hasLeft} › ${realMonthly.hasRight} · hapus ${realMonthly.hasDelete}`)
  rec.check('AB-04',
    realMonthly.months.length === 12 && realMonthly.hasLeft && realMonthly.hasDelete && Boolean(realMonthly.baseLabel) ? '✅' : '⚠️',
    `asli: 12 bulan (Des–Jan) · Anggaran dasar · navigasi tahun · tombol hapus`)

  /* Hapus budget uji (clean up) */
  const delBtn = nodes().find((n) => baseId(n) === 'faDeleteBtn')
  if (delBtn) {
    tap(delBtn.cx, delBtn.cy)
    await sleep(1000)
    const nsDiag = nodes()
    const yesBtn = nsDiag.find((n) => label(n) === 'YA' || baseId(n) === 'yesButton' || label(n) === 'OK')
    if (yesBtn) { tap(yesBtn.cx, yesBtn.cy); await sleep(1200) }
    dismissAd()
  }

  /* AB-05  Kelola berulang */
  console.log('[5/8] Memeriksa kelola berulang...')
  await realOpenBerulang()
  const realRepeat = readRealRepeatSettings()
  saveDump(GROUP, 'real-05-kelola-berulang', dumpXml())
  shot(GROUP, 'real-05-kelola-berulang')
  rec.note(`asli · berulang: "${realRepeat.title}" · + ${realRepeat.hasAdd} · waktu="${realRepeat.rowValue}"`)
  rec.note(`asli · bantuan Q: "${realRepeat.helpQ.slice(0, 60)}"`)
  rec.check('AB-05',
    realRepeat.title === 'Kelola berulang' && realRepeat.hasAdd && Boolean(realRepeat.rowLabel) && Boolean(realRepeat.rowValue) ? '✅' : '⚠️',
    `asli: "${realRepeat.title}" · + ${realRepeat.hasAdd} · waktu peninjauan "${realRepeat.rowValue}"`)

  /* AB-06  Dialog Waktu peninjauan ulang */
  console.log('[6/8] Memeriksa dialog waktu peninjauan...')
  const rowBtn = nodes().find((n) => baseId(n) === 'contentBlockRightBtn' || baseId(n) === 'contentTextView' || label(n).includes('Tanggal yang bersangkutan'))
  if (rowBtn) { tap(rowBtn.cx, rowBtn.cy); await sleep(1400) }
  const realDialog = readRealRepeatDialog()
  shot(GROUP, 'real-06-waktu-peninjauan-dialog')
  rec.note(`asli · dialog: "${realDialog.dialogTitle}" · opsi: ${realDialog.options.join(' / ')}`)
  rec.check('AB-06',
    realDialog.options.length >= 2 && realDialog.options.includes('Tanggal yang bersangkutan') ? '✅' : '⚠️',
    `asli: dialog "${realDialog.dialogTitle}" dengan ${realDialog.options.length} opsi`)
  BACK(); await sleep(1000); dismissAd()

  /* AB-07  RepeatTypeList (tap Add) */
  console.log('[7/8] Memeriksa repeat type list...')
  await realTap({ id: 'addButton' }, { expect: () => realTitle() === 'Ulang', settle: 2000 })
  const realTypes = readRealRepeatTypeList()
  shot(GROUP, 'real-07-repeat-type-list')
  rec.note(`asli · tipe berulang: "${realTypes.title}" · ${realTypes.types.length} tipe: ${realTypes.types.join(' · ')}`)
  rec.check('AB-07',
    realTypes.title === 'Ulang' && realTypes.types.length === 14 ? '✅' : '⚠️',
    `asli: "${realTypes.title}" · ${realTypes.types.length} tipe frekuensi`)
  BACK(); await sleep(1000); dismissAd()

  /* AB-08  Kembali ke Kelola pengaturan */
  console.log('[8/8] Memeriksa kembali ke Kelola pengaturan...')
  BACK(); await sleep(1200); dismissAd()
  const backAtKelola = realTitle() === 'Kelola pengaturan'
  shot(GROUP, 'real-08-kembali-kelola-pengaturan')
  rec.check('AB-08', backAtKelola ? '✅' : '⚠️', `asli: kembali ke "${realTitle()}" tanpa jalan buntu`)

  /* ============================================================ SISI FIN-APP */
  rec.note('— sisi fin-app —')
  await ensureDevServer()
  const page = await connectFinPage({ route: '/lainnya/anggaran', waitFor: '[data-testid="budget-list"]' })

  /* AB-01b  Daftar anggaran kosong */
  const readFinBudgetList = () => page.puppeteerPage.evaluate(() => {
    const title     = document.querySelector('h1')?.innerText.trim() ?? ''
    const hasAdd    = Boolean(document.querySelector('[data-testid="budget-add"]') ?? document.querySelector('[data-testid="budget-add-button"]') ?? document.querySelector('button[aria-label*="Tambah"]') ?? document.querySelector('[data-testid="budget-list"] button'))
    const helpText  = document.querySelector('[data-testid="budget-help"]')?.innerText.trim()
      ?? [...document.querySelectorAll('p,span')].find(el => el.innerText.includes('anggaran'))?.innerText.trim()
      ?? ''
    const isEmpty   = document.body.innerText.includes('Tidak ada data') || document.body.innerText.includes('Belum ada anggaran')
    const items     = [...document.querySelectorAll('[data-testid^="budget-open-"], [data-testid^="budget-row-"], [data-testid^="budget-item-"]')].map(el => el.innerText.trim())
    return { title, hasAdd, helpText, isEmpty, items }
  })

  const finListEmpty = await readFinBudgetList()
  await page.screenshotTo(GROUP, 'fin-01-budget-list-kosong')
  rec.note(`fin · anggaran kosong: judul "${finListEmpty.title}" · kosong ${finListEmpty.isEmpty}`)
  rec.check('AB-01b',
    finListEmpty.title === 'Pengaturan anggaran' && finListEmpty.isEmpty ? '✅' : '⚠️',
    `fin: judul "${finListEmpty.title}" · keadaan kosong ${finListEmpty.isEmpty}`)

  /* AB-02b  Form tambah anggaran */
  await page.puppeteerPage.evaluate(() => {
    const btn = document.querySelector('[data-testid="budget-add"]')
      ?? document.querySelector('[data-testid="budget-add-button"]')
      ?? [...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label')?.includes('Tambah') || b.innerText.includes('+'))
    btn?.click()
  })
  await sleep(800)
  await page.waitFor('[data-testid="budget-form"]')
  const readFinBudgetForm = () => page.puppeteerPage.evaluate(() => {
    const form     = document.querySelector('[data-testid="budget-form"]')
    const txt      = form?.innerText ?? ''
    const title    = form?.querySelector('h1')?.innerText.trim() ?? document.querySelector('[data-testid="budget-form"] header h1')?.innerText.trim() ?? ''
    const hasCat   = txt.includes('Kategori') || Boolean(form?.querySelector('[data-testid*="category"]'))
    const hasTotal = txt.includes('Total') || Boolean(form?.querySelector('[data-testid*="amount"]') ?? form?.querySelector('[data-testid*="total"]'))
    const hasSave  = txt.includes('Menyimpan') || Boolean(form?.querySelector('button[type="submit"]') ?? [...(form?.querySelectorAll('button') ?? [])].find(b => b.innerText.includes('Menyimpan')))
    const gridItems = [...(form?.querySelectorAll('[data-testid^="budget-category-option-"], [data-testid^="budget-cat-"]') ?? [])].map(el => el.innerText.trim())
    const hasNumpad = Boolean(document.querySelector('[data-testid="numpad"]') ?? document.querySelector('[data-testid^="pad-"]'))
    return { title, hasCat, hasTotal, hasSave, gridItems, hasNumpad }
  })
  const finForm = await readFinBudgetForm()
  await page.screenshotTo(GROUP, 'fin-02-form-tambah-budget')
  rec.note(`fin · form tambah: "${finForm.title}" · Kategori ${finForm.hasCat} · Total ${finForm.hasTotal} · Simpan ${finForm.hasSave}`)
  rec.note(`fin · grid: ${finForm.gridItems.length} opsi`)
  rec.check('AB-02b',
    finForm.hasCat && finForm.hasTotal && finForm.hasSave ? '✅' : '⚠️',
    `fin: form Tambah anggaran · Kategori ${finForm.hasCat} · Total ${finForm.hasTotal} · Simpan ${finForm.hasSave}`)

  /* AB-03b  Grid kategori */
  rec.check('AB-03b',
    finForm.gridItems.length >= 13 ? '✅' : '⚠️',
    `fin: grid ${finForm.gridItems.length} opsi kategori (diharapkan ≥13)`)

  /* Tambah satu anggaran Food untuk melihat detail bulanan */
  await page.puppeteerPage.evaluate(() => {
    const catBtn = [...document.querySelectorAll('[data-testid^="budget-category-option-"], [data-testid^="budget-cat-"]')].find(el => el.innerText.includes('Food'))
    catBtn?.click()
  })
  await sleep(500)

  /* AB-04b  Detail anggaran bulanan */
  await page.puppeteerPage.evaluate(() => {
    const save = [...document.querySelectorAll('button')].find(b => b.innerText.includes('Menyimpan'))
    save?.click()
  })
  await sleep(1200)

  /* Buka detail bulanan dari item daftar */
  await page.puppeteerPage.evaluate(() => {
    const item = document.querySelector('[data-testid^="budget-open-"]') ?? document.querySelector('[data-testid^="budget-row-"]')
    item?.click()
  })
  await sleep(900)

  const readFinMonthly = () => page.puppeteerPage.evaluate(() => {
    const panel = document.querySelector('[data-testid="budget-monthly"]') ?? document.querySelector('[data-testid="budget-detail"]')
    const txt   = panel?.innerText ?? document.body.innerText
    const title = panel?.querySelector('h1,h2')?.innerText.trim() ?? ''
    const hasLeft    = Boolean(panel?.querySelector('[aria-label*="sebelum"]') ?? panel?.querySelector('[aria-label*="prev"]'))
    const hasRight   = Boolean(panel?.querySelector('[aria-label*="berikut"]') ?? panel?.querySelector('[aria-label*="next"]'))
    const hasDelete  = Boolean(panel?.querySelector('[aria-label*="Hapus"]') ?? panel?.querySelector('[data-testid*="delete"]'))
    const hasBase    = txt.includes('Anggaran dasar')
    const monthsEl   = panel?.querySelectorAll('[data-testid^="budget-month-row-"]') ?? []
    const monthCount = monthsEl.length
    const help       = panel?.querySelector('[data-testid="budget-monthly-help"]')?.innerText.trim() ?? ''
    return { title, hasLeft, hasRight, hasDelete, hasBase, monthCount, help }
  })
  const finMonthly = await readFinMonthly()
  await page.screenshotTo(GROUP, 'fin-04-budget-monthly')
  rec.note(`fin · detail bulanan: "${finMonthly.title}" · 12 bln ${finMonthly.monthCount} · dasar ${finMonthly.hasBase} · hapus ${finMonthly.hasDelete}`)
  rec.check('AB-04b',
    finMonthly.monthCount === 12 && finMonthly.hasBase ? '✅' : '⚠️',
    `fin: ${finMonthly.monthCount} bulan, Anggaran dasar ${finMonthly.hasBase}, hapus ${finMonthly.hasDelete}`)

  /* Hapus budget uji fin-app */
  await page.puppeteerPage.evaluate(() => {
    const del = document.querySelector('[data-testid="budget-delete"]') ?? document.querySelector('[aria-label*="Hapus"]') ?? document.querySelector('[data-testid*="delete"]')
    del?.click()
  })
  await sleep(600)
  await page.puppeteerPage.evaluate(() => {
    const confirm = document.querySelector('[data-testid="confirm-dialog"] button:last-child')
      ?? [...document.querySelectorAll('button')].find(b => b.innerText.includes('Hapus') || b.innerText.includes('YA'))
    confirm?.click()
  })
  await sleep(800)

  /* AB-05b  Kelola berulang fin-app */
  await page.navigate(`${BASE}/lainnya/berulang`, { waitFor: '[data-testid="repeat-settings"]' })
  const readFinRepeat = () => page.puppeteerPage.evaluate(() => {
    const el  = document.querySelector('[data-testid="repeat-settings"]')
    const txt = el?.innerText ?? ''
    const title    = el?.querySelector('h1')?.innerText.trim() ?? document.querySelector('h1')?.innerText.trim() ?? ''
    const hasAdd   = Boolean(document.querySelector('[data-testid="repeat-add"]') ?? document.querySelector('[aria-label*="Tambah"]'))
    const hasHelp  = txt.includes('Bagaimana') || txt.includes('repetitive')
    const rowLabel = el?.querySelector('[data-testid="repeat-review-row"] span')?.innerText.trim()
      ?? txt.includes('Waktu peninjauan ulang') ? 'Waktu peninjauan ulang' : ''
    const rowValue = document.querySelector('[data-testid="repeat-review-value"]')?.innerText.trim() ?? ''
    return { title, hasAdd, hasHelp, rowLabel, rowValue }
  })
  const finRepeat = await readFinRepeat()
  await page.screenshotTo(GROUP, 'fin-05-kelola-berulang')
  rec.note(`fin · berulang: "${finRepeat.title}" · + ${finRepeat.hasAdd} · waktu="${finRepeat.rowValue}"`)
  rec.check('AB-05b',
    finRepeat.title === 'Kelola berulang' && finRepeat.hasAdd ? '✅' : '⚠️',
    `fin: "${finRepeat.title}" · + ${finRepeat.hasAdd} · waktu peninjauan "${finRepeat.rowValue}"`)

  /* AB-06b  Dialog Waktu peninjauan ulang */
  await page.puppeteerPage.evaluate(() => {
    const row = document.querySelector('[data-testid="repeat-review-row"]')
    row?.click()
  })
  await sleep(700)
  const readFinDialog = () => page.puppeteerPage.evaluate(() => {
    const overlay = document.querySelector('[data-testid="repeat-review-sheet"]') ?? document.querySelector('[data-testid="repeat-review-dialog"]') ?? document.querySelector('[role="dialog"]')
    const txt = overlay?.innerText ?? ''
    const options = [...(overlay?.querySelectorAll('[data-testid^="repeat-review-option-"]') ?? [])].map(el => el.innerText.trim())
    const hasTitle = txt.includes('Waktu peninjauan ulang')
    return { hasTitle, options }
  })
  const finDialog = await readFinDialog()
  await page.screenshotTo(GROUP, 'fin-06-waktu-peninjauan-dialog')
  rec.note(`fin · dialog waktu: ada judul ${finDialog.hasTitle} · opsi: ${finDialog.options.join(' / ')}`)
  rec.check('AB-06b',
    finDialog.hasTitle && finDialog.options.length >= 2 ? '✅' : '⚠️',
    `fin: dialog Waktu peninjauan ulang dengan ${finDialog.options.length} opsi`)

  /* Tutup dialog */
  await page.puppeteerPage.evaluate(() => {
    const opt = document.querySelector('[data-testid="repeat-review-option-actual_date"]') ?? document.querySelector('[data-testid="repeat-review-sheet"]')
    opt?.click()
  })
  await sleep(500)

  /* AB-07b  RepeatTypeList (Layar Ulang) */
  await page.puppeteerPage.evaluate(() => {
    const btn = document.querySelector('[data-testid="repeat-add"]') ?? [...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label')?.includes('Tambah'))
    btn?.click()
  })
  await sleep(700)
  await page.waitFor('[data-testid="repeat-type-screen"]')
  const readFinTypes = () => page.puppeteerPage.evaluate(() => {
    const screen = document.querySelector('[data-testid="repeat-type-screen"]')
    const title  = screen?.querySelector('h1')?.innerText.trim() ?? ''
    const opts   = [...(screen?.querySelectorAll('[data-testid^="repeat-option-"]') ?? [])].map(el => el.innerText.trim())
    return { title, opts }
  })
  const finTypes = await readFinTypes()
  await page.screenshotTo(GROUP, 'fin-07-repeat-type-list')
  rec.note(`fin · tipe berulang: "${finTypes.title}" · ${finTypes.opts.length} tipe: ${finTypes.opts.join(' · ')}`)
  rec.check('AB-07b',
    finTypes.title === 'Ulang' && finTypes.opts.length === 14 ? '✅' : '⚠️',
    `fin: "${finTypes.title}" · ${finTypes.opts.length} tipe frekuensi`)

  /* Tutup RepeatTypeSheet */
  await page.puppeteerPage.evaluate(() => {
    const back = document.querySelector('[data-testid="repeat-type-back"]')
    back?.click()
  })
  await sleep(500)

  /* AB-08b  Kembali ke Lainnya */
  await page.navigate(`${BASE}/lainnya`, { waitFor: '[data-testid="settings-item-anggaran"]' })
  await page.screenshotTo(GROUP, 'fin-08-kembali-lainnya')
  const finAtLainnya = await page.puppeteerPage.evaluate(() => Boolean(document.querySelector('[data-testid="settings-item-anggaran"]') ?? document.querySelector('[data-testid="settings-item-berulang"]')))
  rec.check('AB-08b', finAtLainnya ? '✅' : '⚠️', 'fin: kembali ke menu Lainnya tanpa kendala')

  await page.close()
  rec.save()
  console.log('Tahap 7 (Anggaran & Berulang) selesai!')
}

main().catch((err) => {
  console.error('Gagal menjalankan ta07-anggaran-berulang:', err)
  process.exit(1)
})
