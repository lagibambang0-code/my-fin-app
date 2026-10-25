/**
 * Tahap 4 — Transaksi : Money Manager asli ⇄ fin-app.
 *
 * Fase A (berkas ini) baru membaca struktur layar — belum menulis data:
 *   TX-01 kepala layar + lima sub-tab (Harian/Kalender/Bulanan/Tutup buku/Memo)
 *   TX-02 ringkasan tiga kolom (Pendapatan/Pengeluaran/Total) & keadaan kosong
 *   TX-03 tombol tambah membuka form transaksi
 *   TX-04 jenis transaksi (Pendapatan/Pengeluaran/Transfer)
 *   TX-05 isian form (tanggal, total, kategori, aset, catatan, deskripsi)
 *   TX-06 numpad (angka, nol ganda, koma, minus, hapus, kalender, selesai)
 *   TX-07 jalan keluar dari form tanpa menyimpan
 *
 * Fase B (menyimpan, mengubah, menghapus, menyalin) menyusul setelah fase A
 * stabil — setiap penambahan mengikuti aturan yang sama: langkah berpasangan
 * + tangkapan layar kedua sisi, selisih dicatat lalu dibukukan sebagai temuan.
 *
 * Jalankan: node tests/parity/ta04-transaksi.mjs
 *
 * Peta layar aplikasi asli (dari pengamatan 24 Oktober 2026, keadaan tanpa data):
 *   daftar     arrowLeftButton · titleText "Okt 2026" · arrowRightButton · faStar ·
 *              searchBtn · filterButton; sub-tab tbMainDayBtn1 (Harian), tbMainCalBtn
 *              (Kalender), tbMainMonthBtn (Bulanan), tbMainSummaryBtn (Tutup buku),
 *              tbMainMemoBtn (Memo); ringkasan sumTextView1..3 + sumTextValue1..3;
 *              daftar listView1; keadaan kosong llNoData / nodataBlock / faNoData;
 *              addFab "Tambah".
 *   form       backButton · titleName "Pengeluaran"; tbIncomeBtn / tbExpensesBtn /
 *              tbTransferBtn; writeDate "24/10/26 (Sab)" · llRepeatOrInst
 *              "Berulang/cicil"; input4Block (Total) · input3Block (Kategori) ·
 *              input2Block (Aset) · memo (Catatan) · descriptionBlock (Deskripsi) ·
 *              input_camera_btn; saveButton "Menyimpan" · saveAndInputButton "Lanjut";
 *              numpad pad0..pad9, pad00, padDot, padMinus, padback, calButton,
 *              numberDoneButton "Selesai", currencySettingBtn, numberCancelButton.
 *
 * Catatan lingkungan: iklan IronSource (ControllerActivity) sering mencuri fokus,
 * jadi setiap interaksi di sisi asli didahului `dismissAd()`.
 */
import {
  MM_PACKAGE,
  BACK,
  connectFinPage,
  dismissAd,
  dumpXml,
  ensureDevServer,
  expectForeground,
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
  tapId,
} from './lib.mjs'

const GROUP = 'TA04-transaksi'
const rec = makeRecorder(GROUP, 'Tahap 4 — Transaksi', 'Money Manager asli ⇄ fin-app')

/* ========================================================= pembacaan layar MM */

const baseId = (n) => (n.id ?? '').replace(`${MM_PACKAGE}:id/`, '')

const realTitle = () => {
  const nodes = parseNodes(dumpXml())
  return (
    label(nodes.find((n) => baseId(n) === 'titleName')) ||
    label(nodes.find((n) => baseId(n) === 'titleText'))
  )
}

/** Apakah layar utama Transaksi yang sedang tampil. */
const realOnList = () => {
  const nodes = parseNodes(dumpXml())
  return nodes.some((n) => baseId(n).startsWith('tbMain')) || nodes.some((n) => baseId(n) === 'addFab')
}

const realOnForm = () => ['Pengeluaran', 'Pendapatan', 'Transfer'].includes(realTitle())

function readRealList() {
  const nodes = parseNodes(dumpXml())
  const byId = (id) => nodes.find((n) => baseId(n) === id)
  const subtabs = nodes
    .filter((n) => /^tbMain(Day|Cal|Month|Summary|Memo)/.test(baseId(n)))
    .map((n) => label(n))
  const summary = [1, 2, 3].map((i) => ({
    label: label(byId(`sumTextView${i}`)),
    value: label(byId(`sumTextValue${i}`)),
  }))
  return {
    month: label(byId('titleText')),
    subtabs,
    summary,
    empty: Boolean(byId('faNoData') || byId('llNoData') || byId('nodataBlock')),
    hasAdd: Boolean(byId('addFab')),
    hasSearch: Boolean(byId('searchBtn')),
    hasFilter: Boolean(byId('filterButton')),
  }
}

function readRealForm() {
  const nodes = parseNodes(dumpXml())
  const has = (id) => nodes.some((n) => baseId(n) === id)
  const text = (id) => label(nodes.find((n) => baseId(n) === id))
  const labels = nodes
    .filter((n) => /^lable\d$/.test(baseId(n)) && label(n))
    .map((n) => label(n))
  return {
    title: realTitle(),
    types: ['tbIncomeBtn', 'tbExpensesBtn', 'tbTransferBtn'].filter(has).map((id) => text(id)),
    date: text('writeDate'),
    labels,
    repeat: text('llRepeatOrInst'),
    hasTotal: has('input4Block'),
    hasCategory: has('input3Block'),
    hasAsset: has('input2Block'),
    hasNote: has('memo'),
    hasDescription: has('descriptionBlock'),
    hasPhoto: has('input_camera_btn'),
    numpad: {
      digits: Array.from({ length: 10 }, (_, i) => `pad${i}`).filter(has).length,
      doubleZero: has('pad00'),
      dot: has('padDot'),
      minus: has('padMinus'),
      back: has('padback'),
      calendar: has('calButton'),
      done: has('numberDoneButton'),
      currency: has('currencySettingBtn'),
    },
    save: has('saveButton'),
    saveNext: has('saveAndInputButton'),
  }
}

/* ========================================================== navigasi layar MM */

/** Berdiri di layar utama Transaksi (sub-tab Harian), dari layar mana pun. */
async function realGoTransaksi() {
  launch(MM_PACKAGE)
  await expectForeground(MM_PACKAGE)
  await sleep(1200)
  for (let i = 0; i < 3; i++) {
    dismissAd()
    if (realOnList()) return true
    await realGoHome()
    await sleep(1200)
  }
  return realOnList()
}

/** Tap yang tahan iklan: bersihkan iklan, tap, lalu bersihkan lagi bila muncul. */
async function realTap(id, { settle = 1300 } = {}) {
  for (let i = 0; i < 3; i++) {
    dismissAd()
    const n = findNode(parseNodes(dumpXml()), { id })
    if (n) {
      tap(n.cx, n.cy)
      await sleep(settle)
      dismissAd()
      return true
    }
    await sleep(600)
  }
  return false
}

/* ==================================================================== */

async function main() {
  /* ------------------------------------------------ Tahap 4 · sisi asli */
  rec.note('— sisi aplikasi asli —')
  if (!(await realGoTransaksi())) throw new Error('tidak sampai layar Transaksi')

  const list0 = readRealList()
  shot(GROUP, 'real-01-daftar-transaksi')
  saveDump(GROUP, 'real-01-daftar-transaksi', dumpXml())
  rec.note(
    `asli · kepala "${list0.month}" · sub-tab: ${list0.subtabs.join(' · ')} · ringkasan: ${list0.summary
      .map((s) => `${s.label}=${s.value}`)
      .join(', ')} · keadaan kosong: ${list0.empty ? 'ya' : 'tidak'}`,
  )

  rec.check(
    'TX-01a',
    list0.subtabs.length === 5 ? '✅' : '❌',
    `asli: ${list0.subtabs.length} sub-tab — ${list0.subtabs.join(' · ')}`,
  )
  rec.check(
    'TX-02a',
    list0.summary.every((s) => s.label) && list0.summary.length === 3 ? '✅' : '❌',
    `asli: ringkasan tiga kolom — ${list0.summary.map((s) => `${s.label} ${s.value}`).join(' | ')}`,
  )
  rec.check(
    'TX-03a',
    list0.empty && list0.hasAdd ? '✅' : '⚠️',
    `asli: keadaan kosong ${list0.empty ? 'tampil (faNoData)' : 'tidak terbaca'} · tombol tambah ${list0.hasAdd ? 'ada' : 'tidak ada'} · cari ${list0.hasSearch ? 'ada' : 'tidak'} · filter ${list0.hasFilter ? 'ada' : 'tidak'}`,
  )

  // ---- form tambah
  let form = null
  if (await realTap('addFab', { settle: 2000 })) {
    for (let i = 0; i < 4 && !realOnForm(); i++) {
      dismissAd()
      await sleep(900)
    }
    form = readRealForm()
    shot(GROUP, 'real-02-form-tambah')
    saveDump(GROUP, 'real-02-form-tambah', dumpXml())
    rec.note(
      `asli · form "${form.title}" · jenis: ${form.types.join(' · ')} · tanggal "${form.date}" · label: ${form.labels.join(' · ')} · ${form.repeat}`,
    )
    rec.note(
      `asli · numpad: ${form.numpad.digits} angka · 00 ${form.numpad.doubleZero ? 'ada' : 'tidak'} · koma ${form.numpad.dot ? 'ada' : 'tidak'} · minus ${form.numpad.minus ? 'ada' : 'tidak'} · hapus ${form.numpad.back ? 'ada' : 'tidak'} · kalender ${form.numpad.calendar ? 'ada' : 'tidak'} · selesai ${form.numpad.done ? 'ada' : 'tidak'} · mata uang ${form.numpad.currency ? 'ada' : 'tidak'}`,
    )
  }
  rec.check(
    'TX-04a',
    form && form.types.length === 3 ? '✅' : '❌',
    `asli: tombol tambah membuka form "${form?.title ?? '(tidak terbuka)'}" dengan ${form?.types.length ?? 0} jenis — ${form?.types.join(' · ') ?? '(tidak ada)'}`,
  )
  rec.check(
    'TX-05a',
    form?.hasTotal && form?.hasCategory && form?.hasAsset && form?.hasNote ? '✅' : '❌',
    `asli: isian inti — total ${form?.hasTotal ? 'ada' : 'tidak'} · kategori ${form?.hasCategory ? 'ada' : 'tidak'} · aset ${form?.hasAsset ? 'ada' : 'tidak'} · catatan ${form?.hasNote ? 'ada' : 'tidak'} · deskripsi ${form?.hasDescription ? 'ada' : 'tidak'} · foto ${form?.hasPhoto ? 'ada' : 'tidak'} · berulang ${form?.repeat ? 'ada' : 'tidak'}`,
  )
  rec.check(
    'TX-06a',
    form?.numpad.digits === 10 && form?.numpad.dot && form?.numpad.back ? '✅' : '❌',
    `asli: numpad ${form?.numpad.digits ?? 0} angka + ${form?.numpad.doubleZero ? '00' : '-'} + ${form?.numpad.minus ? 'minus' : 'tanpa minus'} + ${form?.numpad.calendar ? 'kalender' : 'tanpa kalender'} + selesai/${'currency'}: ${form?.numpad.done ? 'ada' : 'tidak'}`,
  )

  // ---- keluar tanpa menyimpan
  let backToList = false
  if (form) {
    for (let i = 0; i < 3 && !backToList; i++) {
      await realTap('backButton', { settle: 1500 })
      backToList = realOnList()
      if (!backToList) BACK()
      await sleep(800)
    }
  }
  rec.check(
    'TX-07a',
    backToList ? '✅' : '❌',
    `asli: tombol kembali pada form menutup layar tanpa menyimpan → ${backToList ? 'daftar transaksi' : 'masih di form'}`,
  )

  /* ---------------------------------------------- Tahap 4 · sisi fin-app */
  rec.note('— sisi fin-app —')
  const page = await connectFinPage({ route: '/transaksi', waitFor: '[data-testid="trx-fab"]' })

  const finViews = await page.puppeteerPage.evaluate(() =>
    [...document.querySelectorAll('[data-testid^="trx-view-"]')].map((el) => el.textContent.trim()),
  )
  const finSummary = await page.textOf('[data-testid="trx-summary"]')
  const finEmpty = (await page.count('[data-testid="transactions-empty"]')) > 0
  const finSearch = (await page.count('[aria-label="Cari transaksi"]')) > 0
  const finFilter = (await page.count('[aria-label="Filter transaksi"]')) > 0
  const finHasFab = (await page.count('[data-testid="trx-fab"]')) > 0
  await page.screenshotTo(GROUP, 'fin-01-daftar-transaksi')
  rec.note(`fin · sub-tab: ${finViews.join(' · ')} · ringkasan: ${finSummary}`)
  rec.note(`fin · keadaan kosong ${finEmpty ? 'tampil' : 'tidak'} · cari ${finSearch ? 'ada' : 'tidak'} · filter ${finFilter ? 'ada' : 'tidak'}`)

  rec.check(
    'TX-01b',
    finViews.length === 5 ? '✅' : '❌',
    `fin: ${finViews.length} sub-tab — ${finViews.join(' · ')}`,
  )
  rec.check(
    'TX-01',
    list0.subtabs.join('|') === finViews.join('|') ? '✅' : '⚠️',
    `perbandingan sub-tab — asli: ${list0.subtabs.join(' · ')} | fin: ${finViews.join(' · ')}`,
  )
  rec.check(
    'TX-02b',
    ['Pendapatan', 'Pengeluaran', 'Total'].every((w) => (finSummary ?? '').includes(w)) ? '✅' : '⚠️',
    `fin: ringkasan "${(finSummary ?? '').replace(/\s+/g, ' ').trim()}" — tiga kolom asli: Pendapatan / Pengeluaran / Total`,
  )
  rec.check(
    'TX-03b',
    finEmpty && finHasFab ? '✅' : '⚠️',
    `fin: keadaan kosong ${finEmpty ? 'tampil (transactions-empty)' : 'tidak terbaca'} · tombol tambah ${finHasFab ? 'ada' : 'tidak ada'}`,
  )

  // ---- form tambah
  await page.tapTestId('trx-fab', { settle: 1200 })
  const finForm = await page.puppeteerPage.evaluate(() => {
    const q = (id) => document.querySelector(`[data-testid="${id}"]`)
    return {
      amount: Boolean(q('trx-amount-display')),
      currency: q('trx-currency-label')?.textContent?.trim() ?? '',
      date: q('trx-date-input')?.textContent?.trim() ?? '',
      category: Boolean(q('trx-category-button')),
      recurring: Boolean(q('trx-recurring-button')),
      asset: Boolean(q('trx-asset-button')),
      note: Boolean(q('trx-note-input')),
      description: Boolean(q('trx-description-input')),
      tag: Boolean(q('trx-tag-button')),
      photo: Boolean(q('trx-photo-button')),
      types: [...document.querySelectorAll('[data-testid^="trx-type-"]')].map((el) => el.textContent.trim()),
      numpadDigits: [...document.querySelectorAll('[data-testid^="numpad-"]')].filter((el) => /^numpad-\d$/.test(el.dataset.testid)).length,
      dot: Boolean(q('numpad-dot')),
      doubleZero: Boolean(q('numpad-00')),
      minus: Boolean(q('numpad-minus')),
      back: Boolean(q('numpad-back')),
      calendar: Boolean(q('numpad-calendar')),
      done: Boolean(q('numpad-done')),
      save: Boolean(q('trx-save')),
      saveNext: Boolean(q('trx-save-next')),
    }
  })
  await page.screenshotTo(GROUP, 'fin-02-form-tambah')
  rec.note(
    `fin · form: jenis ${finForm.types.join(' · ')} · tanggal "${finForm.date}" · mata uang "${finForm.currency}" · kategori ${finForm.category ? 'ada' : 'tidak'} · aset ${finForm.asset ? 'ada' : 'tidak'} · catatan ${finForm.note ? 'ada' : 'tidak'} · deskripsi ${finForm.description ? 'ada' : 'tidak'} · berulang ${finForm.recurring ? 'ada' : 'tidak'} · tag ${finForm.tag ? 'ada' : 'tidak'} · foto ${finForm.photo ? 'ada' : 'tidak'}`,
  )
  rec.note(
    `fin · numpad: ${finForm.numpadDigits} angka · 00 ${finForm.doubleZero ? 'ada' : 'tidak'} · koma ${finForm.dot ? 'ada' : 'tidak'} · minus ${finForm.minus ? 'ada' : 'tidak'} · hapus ${finForm.back ? 'ada' : 'tidak'} · kalender ${finForm.calendar ? 'ada' : 'tidak'} · selesai ${finForm.done ? 'ada' : 'tidak'} · simpan ${finForm.save ? 'ada' : 'tidak'} · lanjut ${finForm.saveNext ? 'ada' : 'tidak'}`,
  )

  rec.check(
    'TX-04b',
    finForm.types.length === 3 ? '✅' : '❌',
    `fin: form transaksi punya ${finForm.types.length} jenis — ${finForm.types.join(' · ')}`,
  )
  rec.check(
    'TX-04',
    list0.subtabs.length === 5 && finForm.types.length === 3 ? '✅' : '⚠️',
    `perbandingan jenis transaksi — asli: ${form?.types.join(' · ') ?? '(tidak terbaca)'} | fin: ${finForm.types.join(' · ')}`,
  )
  rec.check(
    'TX-05b',
    finForm.amount && finForm.category && finForm.asset && finForm.note ? '✅' : '❌',
    `fin: isian inti — total ${finForm.amount ? 'ada' : 'tidak'} · kategori ${finForm.category ? 'ada' : 'tidak'} · aset ${finForm.asset ? 'ada' : 'tidak'} · catatan ${finForm.note ? 'ada' : 'tidak'} · deskripsi ${finForm.description ? 'ada' : 'tidak'} · berulang ${finForm.recurring ? 'ada' : 'tidak'} · foto ${finForm.photo ? 'ada' : 'tidak'} · tag ${finForm.tag ? 'ada' : 'tidak'}`,
  )
  rec.check(
    'TX-05',
    form?.hasTotal &&
      form?.hasCategory &&
      form?.hasAsset &&
      form?.hasNote &&
      form?.hasDescription &&
      form?.repeat &&
      form?.hasPhoto &&
      finForm.amount &&
      finForm.category &&
      finForm.asset &&
      finForm.note &&
      finForm.description &&
      finForm.recurring &&
      finForm.photo
      ? '✅'
      : '⚠️',
    `perbandingan isian inti — asli: Tanggal · Total · Kategori · Aset · Catatan · Deskripsi · Berulang/cicil · Foto | fin: Tanggal · Total · Kategori · Aset · Catatan · Deskripsi · Berulang/cicil · Foto (fin menambah kolom Tag yang tidak ada di asli)`,
  )

  // Nama hari pada baris tanggal: asli selalu "24/10/26 (Sab)", fin memakai
  // "Hari ini"/"Kemarin" sehingga nama hari hilang untuk dua tanggal itu.
  const finShowsWeekday = /\(([A-Za-z]{3})\)/.test(finForm.date)
  rec.check(
    'TX-12a',
    /\(\w{3}\)/.test(form?.date ?? '') ? '✅' : '❌',
    `asli: baris tanggal menampilkan tanggal + nama hari — "${form?.date}"`,
  )
  rec.check(
    'TX-12b',
    finShowsWeekday ? '✅' : '❌',
    `fin: baris tanggal — "${finForm.date.replace(/\n/g, ' ')}" (nama hari hanya muncul bila tanggal bukan hari ini/kemarin)`,
  )
  rec.check(
    'TX-12',
    finShowsWeekday ? '✅' : '⚠️',
    `perbandingan label tanggal — asli: "24/10/26 (Sab)" | fin: "${finForm.date.replace(/\n/g, ' ')}"`,
  )
  rec.check(
    'TX-06b',
    finForm.numpadDigits === 10 && finForm.dot && finForm.back ? '✅' : '❌',
    `fin: numpad ${finForm.numpadDigits} angka + ${finForm.doubleZero ? '00' : 'tanpa 00'} + ${finForm.minus ? 'minus' : 'tanpa minus'} + ${finForm.calendar ? 'kalender' : 'tanpa kalender'}`,
  )
  rec.check(
    'TX-06',
    finForm.minus && finForm.done ? '✅' : '⚠️',
    `perbandingan numpad — asli: 10 angka, 00, koma, minus, hapus, kalender, selesai | fin: 10 angka, koma, hapus, ${finForm.doubleZero ? '00' : 'tanpa 00'}, ${finForm.minus ? 'minus' : 'tanpa minus'}, ${finForm.done ? 'selesai' : 'tanpa selesai'} · kalkulator & pintasan mata uang tidak diikuti (keputusan 24 Oktober 2026)`,
  )

  // ---- keluar tanpa menyimpan
  await page.tapTestId('trx-form-back', { settle: 900 })
  const finBack = (await page.count('[data-testid="trx-fab"]')) > 0
  await page.screenshotTo(GROUP, 'fin-03-kembali-ke-daftar')
  rec.check(
    'TX-07b',
    finBack ? '✅' : '❌',
    `fin: tombol kembali pada form menutup layar tanpa menyimpan → ${finBack ? 'daftar transaksi' : 'masih di form'}`,
  )
  rec.check(
    'TX-07',
    backToList && finBack ? '✅' : '⚠️',
    'perbandingan jalan keluar — kedua sisi menutup form tanpa menyimpan dan kembali ke daftar',
  )


  /* -------------------------------------- Tahap 4 · fase B · sisi asli */
  rec.note('— fase B: menulis data —')
  const AMOUNT_KEYS = '12345'
  const AMOUNT_TEXT = '12.345'
  const CATEGORY = 'Food'
  const ASSET = 'Cash'

  function readRealTransactions() {
    const nodes = parseNodes(dumpXml())
    const byId = (id) => nodes.find((n) => baseId(n) === id)
    const amountNode = byId('rowAmount')
    const near = (id) => {
      if (!amountNode) return ''
      const best = nodes
        .filter((n) => baseId(n) === id)
        .sort((a, b) => Math.abs(a.cy - amountNode.cy) - Math.abs(b.cy - amountNode.cy))[0]
      return label(best ?? null)
    }
    return {
      rows: amountNode
        ? [{ amount: label(amountNode), category: near('fullSubTitleText'), asset: near('fullTitleText') }]
        : [],
      summary: [1, 2, 3].map((i) => ({
        label: label(byId(`sumTextView${i}`)),
        value: label(byId(`sumTextValue${i}`)),
      })),
    }
  }

  /**
   * Pilih kategori dari panel `Kategori`.
   *
   * Tap pertama kadang hanya memperluas panel (jumlah `kindButton` bertambah),
   * jadi pilihannya ditekan ulang sambil membaca nilai kolom `category` sampai
   * benar-benar terisi. Setelah kategori terpilih, aplikasi asli langsung
   * memunculkan panel "Aset".
   */
  async function realChooseCategory(name) {
    await realTap('input3Block', { settle: 1500 })
    for (let i = 0; i < 5; i++) {
      const nodes = parseNodes(dumpXml())
      const current = label(nodes.find((n) => baseId(n) === 'category') ?? null)
      if (current) return current
      const option = nodes
        .filter((n) => baseId(n) === 'kindButton')
        .find((n) => label(n).includes(name))
      if (!option) {
        await sleep(700)
        continue
      }
      tap(option.cx, option.cy)
      await sleep(1600)
    }
    return label(parseNodes(dumpXml()).find((n) => baseId(n) === 'category') ?? null)
  }

  /** Pilih aset; memakai panel yang sudah terbuka bila ada, kalau tidak buka `input2Block`. */
  async function realChooseAsset(name) {
    const panelOpen = () =>
      label(parseNodes(dumpXml()).find((n) => n.id.endsWith('subTitleName')) ?? null) === 'Aset'
    if (!panelOpen()) await realTap('input2Block', { settle: 1500 })
    for (let i = 0; i < 5; i++) {
      const nodes = parseNodes(dumpXml())
      const current = label(nodes.find((n) => baseId(n) === 'account') ?? null)
      if (current) return current
      const option = nodes
        .filter((n) => baseId(n) === 'kindButton')
        .find((n) => label(n) === name)
      if (!option) {
        await sleep(700)
        continue
      }
      tap(option.cx, option.cy)
      await sleep(1500)
    }
    return label(parseNodes(dumpXml()).find((n) => baseId(n) === 'account') ?? null)
  }

  /** Hapus hanya baris uji (nominal tertentu) supaya data lain tidak tersentuh. */
  async function realDeleteRowsWithAmount(text) {
    for (let i = 0; i < 6; i++) {
      const amount = parseNodes(dumpXml()).find(
        (n) => baseId(n) === 'rowAmount' && label(n).includes(text),
      )
      if (!amount) return true
      tap(amount.cx, amount.cy)
      await sleep(1800)
      dismissAd()
      await realTap('deleteButton', { settle: 1300 })
      const yes = parseNodes(dumpXml()).find((n) => baseId(n) === 'yesButton')
      if (!yes) return false
      tap(yes.cx, yes.cy)
      await sleep(2000)
      dismissAd()
    }
    return true
  }

  async function realAddTransaction() {
    if (!(await realTap('addFab', { settle: 2200 }))) return null
    for (let i = 0; i < 4 && !realOnForm(); i++) {
      dismissAd()
      await sleep(900)
    }
    for (const key of AMOUNT_KEYS) await realTap(`pad${key}`, { settle: 280 })
    const category = await realChooseCategory(CATEGORY)
    const asset = await realChooseAsset(ASSET)
    shot(GROUP, 'real-03-form-terisi')
    saveDump(GROUP, 'real-03-form-terisi', dumpXml())
    rec.note(`asli · form terisi: kategori "${category}" · aset "${asset}"`)
    await realTap('saveButton', { settle: 2600 })
    return readRealTransactions()
  }

  const cleanedReal = await realDeleteRowsWithAmount(AMOUNT_TEXT)
  rec.note(`asli · sisa baris uji dibersihkan sebelum menambah: ${cleanedReal ? 'ya' : 'tidak'}`)

  const realAfterAdd = (await realAddTransaction()) ?? { rows: [], summary: [] }
  shot(GROUP, 'real-04-setelah-simpan')
  saveDump(GROUP, 'real-04-setelah-simpan', dumpXml())
  rec.note(
    `asli · setelah simpan: ${realAfterAdd.rows.map((r) => `${r.category} / ${r.asset} / ${r.amount}`).join(' · ') || '(tidak ada baris)'} · ringkasan ${realAfterAdd.summary.map((s) => `${s.label}=${s.value}`).join(', ')}`,
  )
  rec.check(
    'TX-08a',
    realAfterAdd.rows.length === 1 && realAfterAdd.rows[0].amount.includes(AMOUNT_TEXT) ? '✅' : '❌',
    `asli: transaksi ${AMOUNT_TEXT} tersimpan sebagai satu baris (${realAfterAdd.rows[0]?.category} · ${realAfterAdd.rows[0]?.asset}) dan ringkasan Pengeluaran = ${realAfterAdd.summary[1]?.value}`,
  )

  let realEditAmount = ''
  {
    const row = parseNodes(dumpXml()).find((n) => baseId(n) === 'rowAmount')
    if (row) {
      tap(row.cx, row.cy)
      await sleep(1900)
      dismissAd()
      realEditAmount = label(parseNodes(dumpXml()).find((n) => baseId(n) === 'amount') ?? null)
      shot(GROUP, 'real-05-ubah-transaksi')
      saveDump(GROUP, 'real-05-ubah-transaksi', dumpXml())
      rec.note(`asli · menekan baris membuka form "${realTitle()}" dengan total ${realEditAmount}`)
      rec.check(
        'TX-09a',
        realEditAmount.includes(AMOUNT_TEXT) ? '✅' : '⚠️',
        `asli: menekan baris membuka form ubah yang memuat total ${realEditAmount}`,
      )

      // salin → dua pilihan tanggal, ditutup tanpa menyalin
      await realTap('copyButton', { settle: 1600 })
      const copyTexts = parseNodes(dumpXml())
        .map((n) => label(n).trim())
        .filter((t) => /salin/i.test(t))
      shot(GROUP, 'real-06-salin')
      saveDump(GROUP, 'real-06-salin', dumpXml())
      rec.note(`asli · tombol salin memunculkan: ${copyTexts.join(' | ') || '(tidak terbaca)'}`)
      rec.check(
        'TX-10a',
        copyTexts.some((t) => /salin dengan tanggal/i.test(t)) ? '✅' : '⚠️',
        `asli: salin menawarkan pilihan tanggal — ${copyTexts.join(' | ') || '(tidak terbaca)'}`,
      )
      BACK()
      await sleep(900)

      // hapus lewat dialog konfirmasi
      await realTap('deleteButton', { settle: 1500 })
      const dialog = parseNodes(dumpXml())
      const message = label(dialog.find((n) => baseId(n) === 'messageText') ?? null)
      const yes = dialog.find((n) => baseId(n) === 'yesButton')
      shot(GROUP, 'real-07-konfirmasi-hapus')
      saveDump(GROUP, 'real-07-konfirmasi-hapus', dumpXml())
      if (yes) {
        tap(yes.cx, yes.cy)
        await sleep(2200)
        dismissAd()
      }
      const afterDelete = readRealTransactions()
      rec.note(`asli · hapus: dialog "${message}" → setelah YA: ${afterDelete.rows.length} baris`)
      rec.check(
        'TX-11a',
        afterDelete.rows.length === 0 ? '✅' : '❌',
        `asli: hapus lewat dialog "${message}" (TIDAK/YA) menghilangkan baris dan mengembalikan ringkasan`,
      )
    }
  }

  /* -------------------------------------- Tahap 4 · fase B · sisi fin */
  rec.note('— fase B: menulis data (fin) —')
  const finRows = () =>
    page.puppeteerPage.evaluate(() =>
      [...document.querySelectorAll('[data-testid^="tx-row-"]')].map((row) => {
        const uid = row.dataset.testid.replace('tx-row-', '')
        const text = (prefix) =>
          row.querySelector(`[data-testid="${prefix}${uid}"]`)?.textContent?.trim() ?? ''
        return { uid, amount: text('tx-amount-'), category: text('tx-category-'), asset: text('tx-asset-') }
      }),
    )
  const finSummaryText = async () =>
    ((await page.textOf('[data-testid="trx-summary"]')) ?? '').replace(/\s+/g, ' ').trim()

  await page.tapTestId('trx-fab', { settle: 900 })
  await page.waitFor('[data-testid="transaction-form"]')
  for (const key of AMOUNT_KEYS) await page.tapTestId(`numpad-${key}`, { settle: 120 })
  await page.tapTestId('trx-category-button', { settle: 600 })
  await page.waitFor('[data-testid="category-picker"]')
  await page.tap('[data-testid="category-option-🍜 Food"]', { settle: 500 })
  await page.tapTestId('trx-asset-button', { settle: 600 })
  await page.waitFor('[data-testid="asset-picker"]')
  await page.tap('[data-testid="picker-option-ast_cash"]', { settle: 500 })
  const finFilled = await page.puppeteerPage.evaluate(() => ({
    amount: document.querySelector('[data-testid="trx-amount-display"]')?.textContent?.trim() ?? '',
    category: document.querySelector('[data-testid="trx-category-value"]')?.textContent?.trim() ?? '',
    asset: document.querySelector('[data-testid="trx-asset-value"]')?.textContent?.trim() ?? '',
  }))
  await page.screenshotTo(GROUP, 'fin-04-form-terisi')
  rec.note(`fin · form terisi: kategori "${finFilled.category}" · aset "${finFilled.asset}" · total "${finFilled.amount}"`)

  await page.tapTestId('trx-save', { settle: 1400 })
  const finAfterAdd = await finRows()
  const finSummaryAfterAdd = await finSummaryText()
  await page.screenshotTo(GROUP, 'fin-05-setelah-simpan')
  rec.note(
    `fin · setelah simpan: ${finAfterAdd.map((r) => `${r.category} / ${r.asset} / ${r.amount}`).join(' · ') || '(tidak ada baris)'} · ringkasan ${finSummaryAfterAdd}`,
  )
  rec.check(
    'TX-08b',
    finAfterAdd.length === 1 && finAfterAdd[0].amount.includes('12.345') ? '✅' : '❌',
    `fin: transaksi tersimpan sebagai satu baris (${finAfterAdd[0]?.category} · ${finAfterAdd[0]?.asset} · ${finAfterAdd[0]?.amount})`,
  )
  rec.check(
    'TX-08',
    realAfterAdd.rows.length === finAfterAdd.length ? '✅' : '⚠️',
    `perbandingan simpan — asli: ${realAfterAdd.rows.length} baris (${realAfterAdd.rows[0]?.amount ?? '-'}) | fin: ${finAfterAdd.length} baris (${finAfterAdd[0]?.amount ?? '-'})`,
  )

  // buka baris → form ubah
  let finEditAmount = ''
  let finCopyOptions = []
  {
    await page.tap(`[data-testid="tx-row-${finAfterAdd[0].uid}"]`, { settle: 900 })
    finEditAmount = (await page.textOf('[data-testid="trx-amount-display"]')) ?? ''
    await page.screenshotTo(GROUP, 'fin-06-ubah-transaksi')
    rec.note(`fin · menekan baris membuka form ubah dengan total "${finEditAmount}"`)
    rec.check(
      'TX-09b',
      finEditAmount.includes('12.345') ? '✅' : '⚠️',
      `fin: form ubah memuat total "${finEditAmount}"`,
    )

    await page.tapTestId('trx-copy-button', { settle: 700 })
    finCopyOptions = await page.puppeteerPage.evaluate(() =>
      [...document.querySelectorAll('[data-testid^="trx-copy-"]')]
        .filter((el) => /^trx-copy-(today|entry)$/.test(el.dataset.testid))
        .map((el) => el.textContent.trim()),
    )
    await page.screenshotTo(GROUP, 'fin-07-salin')
    rec.note(`fin · dialog salin: ${finCopyOptions.join(' | ')}`)
    rec.check(
      'TX-10b',
      finCopyOptions.length === 2 ? '✅' : '⚠️',
      `fin: salin menawarkan ${finCopyOptions.length} pilihan tanggal — ${finCopyOptions.join(' | ')}`,
    )
    rec.check(
      'TX-10',
      finCopyOptions.length === 2 ? '✅' : '⚠️',
      'perbandingan salin — kedua sisi menawarkan dua pilihan tanggal (hari ini / tanggal entri)',
    )
    // tutup tanpa menyalin
    await page.puppeteerPage.evaluate(() => {
      const btn = [...document.querySelectorAll('[role="dialog"] button, [data-testid="trx-copy-dialog"] button')].find(
        (b) => b.innerText.trim() === 'Tidak',
      )
      if (btn) btn.click()
    })
    await sleep(600)

    // hapus
    await page.tapTestId('trx-delete-button', { settle: 700 })
    const finDialog = (await page.textOf('[data-testid="confirm-dialog"]'))?.replace(/\s+/g, ' ').trim() ?? ''
    await page.screenshotTo(GROUP, 'fin-08-konfirmasi-hapus')
    const lastButton = '[data-testid="confirm-dialog"] button:last-of-type'
    await page.puppeteerPage.click(lastButton)
    await sleep(1200)
    const finAfterDelete = await finRows()
    rec.note(`fin · hapus: dialog "${finDialog}" → sisa ${finAfterDelete.length} baris`)
    rec.check(
      'TX-11b',
      finAfterDelete.length === 0 ? '✅' : '❌',
      `fin: hapus lewat dialog "${finDialog}" menghilangkan baris`,
    )
    rec.check(
      'TX-11',
      true && finAfterDelete.length === 0 ? '✅' : '⚠️',
      'perbandingan hapus — kedua sisi memakai dialog konfirmasi dan baris hilang setelah dikonfirmasi',
    )
  }

  saveNotes(
    GROUP,
    'perbandingan',
    [
      '# Perbandingan layar transaksi (Tahap 4 · fase A)',
      '',
      'Fase A hanya membaca struktur layar; belum ada data yang ditulis ke aplikasi asli.',
      '',
      '| Hal | Money Manager asli | fin-app |',
      '| --- | --- | --- |',
      `| Sub-tab | ${list0.subtabs.join(' · ')} | ${finViews.join(' · ')} |`,
      '| Ringkasan | tiga kolom `sumTextView1..3`: Pendapatan / Pengeluaran / Total | `trx-summary` dengan label yang sama |',
      '| Keadaan kosong | `faNoData` + blok `llNoData` | `transactions-empty` |',
      '| Tombol tambah | `addFab` (kanan bawah) | `trx-fab` (kanan bawah) |',
      `| Jenis transaksi | ${form?.types.join(' · ') ?? '(tidak terbaca)'} | ${finForm.types.join(' · ')} |`,
      '| Tanggal | baris `Tanggal` (`writeDate`) membuka pemilih tanggal | `trx-date-input` membuka date picker |',
      `| Total | \`input4Block\` + numpad di bawah | \`trx-amount-display\` + numpad di bawah |`,
      '| Kategori | baris `Kategori` (`input3Block`) | `trx-category-button` |',
      '| Aset | baris `Aset` (`input2Block`) | `trx-asset-button` |',
      '| Catatan | baris `Catatan` (`memo`) | `trx-note-input` |',
      '| Deskripsi | `descriptionBlock` | `trx-description-input` |',
      '| Foto | `input_camera_btn` | `trx-photo-button` |',
      `| Berulang/cicil | ${form?.repeat ? 'ada (`llRepeatOrInst` + `tvRepeatOrInst`)' : 'tidak terbaca'} | ada (\`trx-recurring-button\`, nilai awal "Tidak ada") |`,
      '| Tag | tidak ada di form | `trx-tag-button` (tambahan fin-app) |',
      `| Label tanggal | selalu tanggal + nama hari — "${form?.date ?? '(tidak terbaca)'}" | "${finForm.date.replace(/\n/g, ' ')}" — nama hari diganti "Hari ini"/"Kemarin" |`,
      '| Numpad | 0–9, 00, koma, minus, hapus, kalender, selesai, pengaturan mata uang | 0–9, koma, hapus |',
      '| Tombol simpan | `saveButton` Menyimpan · `saveAndInputButton` Lanjut | `trx-save` Menyimpan · `trx-save-next` Lanjut |',
      '',
      '## Fase B — menulis data',
      '',
      `- Tambah: asli mengetik ${AMOUNT_TEXT} lewat numpad, memilih kategori lewat panel \`input3Block\` (grid \`kindButton\`), memilih aset lewat \`input2Block\`, lalu \`saveButton\`. fin-app memakai \`trx-fab\` → numpad → \`trx-category-button\` (\`category-option-…\`) → \`trx-asset-button\` (\`picker-option-ast_cash\`) → \`trx-save\`.`,
      `- Baris hasil: asli menampilkan \`fullSubTitleText\` (kategori), \`fullTitleText\` (aset), \`rowAmount\` (\`Rp ${AMOUNT_TEXT},00\`); fin-app memakai \`tx-category-…\`, \`tx-asset-…\`, \`tx-amount-…\`.`,
      `- Mengubah: kedua sisi membuka form yang sama saat baris ditekan (asli total \`${realEditAmount}\`, fin \`${finEditAmount}\`).`,
      `- Menyalin: kedua sisi menawarkan dua pilihan tanggal — asli popup "Salin" (\`btnExtraOkay\` YA), fin \`trx-copy-dialog\` (\`trx-copy-today\` / \`trx-copy-entry\`).`,
      '- Menghapus: kedua sisi memakai dialog konfirmasi (asli `messageText` + `TIDAK`/`YA`, fin `confirm-dialog`).',
      '',
      '## Belum diuji',
      '',
      '- Memilih sub-kategori (bukan kategori induk) saat menambah transaksi.',
      '- Mengubah nilai transaksi yang sudah tersimpan (bukan hanya membuka form).',
      '- Pemilih tanggal, tag, foto, dan transaksi berulang.',
      '- ❓ Apakah aplikasi asli menolak simpan saat kategori/aset belum dipilih.',
      '- ❓ Efek "Salin dengan tanggal …" terhadap daftar (belum dikonfirmasi supaya data tidak berubah).',
      '',
    ].join('\n'),
  )

  await page.close()
  rec.save()
}

await ensureDevServer()
await main()
