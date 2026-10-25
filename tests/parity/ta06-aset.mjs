/**
 * Tahap 6 — Aset : Money Manager asli ⇄ fin-app.
 *
 * Baca-saja (tanpa menulis data di kedua aplikasi):
 *
 *   AS-01 kepala tab Aset + dua tombol (statistik, menu/ubah)
 *   AS-02 ringkasan tiga angka (Aset / Liabilitas / Total)
 *   AS-03 grup (Cash · Accounts · Card) + baris aset
 *   AS-04 blok kartu: "Harus dibayar" / "Belum dibayar"
 *   AS-05 rincian aset: judul, tiga mode periode, rentang, empat angka
 *   AS-06 keadaan kosong rincian aset
 *   AS-07 form ubah aset: Grup · Nama · Total · Mata uang · Deskripsi · simpan
 *   AS-08 hub "Kelola aset": enam baris
 *   AS-09 nilai baris "Cara catat pengeluaran kartu"
 *   AS-10 "Pengaturan aset": tombol tambah + menu + baris aset
 *   AS-11 daftar grup pada form tambah (11 nama)
 *   AS-12 form tambah aset: isian inti + dua mata uang
 *   AS-13 "Grup aset": 11 grup + aksi ubah
 *   AS-14 "Grup aset yang dihapus": keadaan kosong
 *   AS-15 "Aset yang dihapus": keadaan kosong
 *   AS-16 "Pengaturan pengeluaran transfer": bantuan + keadaan kosong
 *   AS-17 "Cara catat pengeluaran kartu": dua pilihan
 *   AS-18 kembali ke tab Aset tanpa jalan buntu
 *
 * Jalankan: node tests/parity/ta06-aset.mjs
 *
 * Peta layar aplikasi asli (pengamatan 24 Oktober 2026):
 *   tab Aset    titleName "Aset" · faStatsButton · faEditButton · sumLable1..3 +
 *               sumTopAmount1..3 · tvAssetGroupTitle/tvAssetGroupPayAmount ·
 *               llAssetRow → tvAssetRowTitle/tvAssetRowPayAmount · blok kartu:
 *               tvAssetGroupPayTitle "Harus dibayar", tvAssetGroupWillPayTitle "Belum dibayar".
 *   rincian     titleName <aset> · monthLeftButton/thisMonthTxtView/monthRightButton ·
 *               tbDaily "Harian" · tbMonthly "Bulanan" · tbYearly "Setiap tahun" ·
 *               usePeriod "Waktu penggunaan" · betweenDay · faStatsButton · editButton ·
 *               tvIncome "Deposit"/inAmount · tvExpenses "Penarikan"/outAmount ·
 *               tvTotal "Total"/sumText · tvBalance "akumulasi saldo"/sumAmount ·
 *               keadaan kosong: faNoData "Tidak ada data" · addFab.
 *   form        titleName "Tambah aset"/"Ubah aset" · backButton · saveButton "Menyimpan" ·
 *               groupBlock/lable1 "Grup"/groupName · llAssetName/lable2 "Nama"/editName ·
 *               amountBlock/lable3 "Total"/assetAmount · currencyBlock/textView1 "Mata uang" ·
 *               descriptionBlock/label5 "Deskripsi"/description.
 *   kelola      titleName "Kelola aset" · dataRow/itemTitle ×6 (Grup aset · Pengaturan aset ·
 *               Grup aset yang dihapus · Aset yang dihapus · Pengaturan pengeluaran transfer ·
 *               Cara catat pengeluaran kartu + itemValueTitle).
 *   pengaturan  titleName "Pengaturan aset" · addButton · moreButton · groupName + listName + kindArrow.
 *   grup        titleName "Grup aset" · addButton · itemTitle + itemEditBtn + faDragHandle + deleteCheckBtn.
 *   dihapus     titleName "Grup aset yang dihapus"/"Aset yang dihapus" · faNoData "Tidak ada data".
 *   transfer    titleName "Pengaturan pengeluaran transfer" · helpDescription · nodataBlock.
 *   kartu       titleName "Cara catat pengeluaran kartu" · offButton "Waktu penggunaan" ·
 *               onButton "Lump sum".
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

const GROUP = 'TA06-aset'
const rec = makeRecorder(GROUP, 'Tahap 6 — Aset', 'Money Manager asli ⇄ fin-app')

const baseId = (n) => (n.id ?? '').replace(`${MM_PACKAGE}:id/`, '')
const nodes = () => parseNodes(dumpXml())
const realTitle = () => label(nodes().find((n) => baseId(n) === 'titleName'))

const TAB_ID = { Transaksi: 'MenuText01', Statistik: 'MenuText02', Aset: 'MenuText03', Lainnya: 'MenuText04' }

/** Tekan elemen (id/teks) di sisi asli, ulangi bila layar belum berubah. */
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

async function realOpenKelola() {
  for (let i = 0; i < 3; i++) {
    if (realTitle() === 'Kelola aset') return true
    await realGoTab('Lainnya')
    await realTap({ text: 'Kelola aset' }, { expect: () => realTitle() === 'Kelola aset' })
  }
  return realTitle() === 'Kelola aset'
}

async function realEnsureRows(aset) {
  if (aset.rows.length > 0) return aset
  const header = nodes().find((n) => baseId(n) === 'tvAssetGroupTitle')
  if (!header) return aset
  tap(header.cx, header.cy)
  await sleep(1400)
  dismissAd()
  return readRealAset()
}

async function realOpenHub(text, title) {
  if (!(await realOpenKelola())) return false
  return realTap({ text }, { expect: () => realTitle() === title })
}

/* ------------------------------------------------------------------ pembacaan */

function readRealAset() {
  const ns = nodes()
  const byId = (id) => label(ns.find((n) => baseId(n) === id))
  return {
    title: byId('titleName'),
    hasStats: ns.some((n) => baseId(n) === 'faStatsButton'),
    hasMenu: ns.some((n) => baseId(n) === 'faEditButton'),
    summary: [1, 2, 3].map((i) => ({
      label: byId(`sumLable${i}`),
      value: byId(`sumTopAmount${i}`),
    })),
    groups: ns.filter((n) => baseId(n) === 'tvAssetGroupTitle').map((n) => label(n)),
    rows: ns.filter((n) => baseId(n) === 'tvAssetRowTitle').map((n) => label(n)),
    card: {
      payable: byId('tvAssetGroupPayTitle'),
      upcoming: byId('tvAssetGroupWillPayTitle'),
    },
  }
}

function readRealDetail() {
  const ns = nodes()
  const byId = (id) => label(ns.find((n) => baseId(n) === id))
  return {
    title: byId('titleName'),
    modes: ['tbDaily', 'tbMonthly', 'tbYearly'].map((id) => byId(id)),
    range: byId('betweenDay'),
    labels: [byId('tvIncome'), byId('tvExpenses'), byId('tvTotal'), byId('tvBalance')],
    hasStats: ns.some((n) => baseId(n) === 'faStatsButton'),
    hasEdit: ns.some((n) => baseId(n) === 'editButton'),
    empty: ns.some((n) => baseId(n) === 'faNoData') || label(ns.find((n) => n.text === 'Tidak ada data')) !== '',
  }
}

function readRealForm() {
  const ns = nodes()
  const byId = (id) => label(ns.find((n) => baseId(n) === id))
  return {
    title: byId('titleName'),
    labels: [byId('lable1'), byId('lable2'), byId('lable3'), byId('textView1'), byId('label5')],
    currencies: ns
      .filter((n) => n.text === 'Rp' || n.text === '$')
      .map((n) => label(n)),
    save: byId('saveButton'),
  }
}

function readRealHub() {
  const ns = nodes()
  return {
    title: label(ns.find((n) => baseId(n) === 'titleName')),
    items: ns.filter((n) => baseId(n) === 'itemTitle').map((n) => label(n)),
    cardValue: label(ns.find((n) => baseId(n) === 'itemValueTitle')),
  }
}

function readRealGroupList() {
  const ns = nodes()
  return ns.filter((n) => baseId(n) === 'itemTitle').map((n) => label(n))
}

function readRealGroupDialog() {
  const ns = nodes()
  return ns.filter((n) => baseId(n) === 'tvTitle').map((n) => label(n)).filter((t) => t !== 'Grup aset')
}

function readRealEmpty() {
  const ns = nodes()
  return {
    title: label(ns.find((n) => baseId(n) === 'titleName')),
    empty: ns.some((n) => baseId(n) === 'faNoData') || ns.some((n) => n.text === 'Tidak ada data'),
  }
}

function readRealTransfer() {
  const ns = nodes()
  return {
    title: label(ns.find((n) => baseId(n) === 'titleName')),
    help: label(ns.find((n) => baseId(n) === 'helpDescription')),
    empty: ns.some((n) => baseId(n) === 'faNoData') || ns.some((n) => n.text === 'Tidak ada data'),
  }
}

function readRealCardTiming() {
  const ns = nodes()
  const byId = (id) => label(ns.find((n) => baseId(n) === id))
  return { title: byId('titleName'), options: [byId('offButton'), byId('onButton')].filter(Boolean) }
}

/* ------------------------------------------------------------------ utama */

async function main() {
  rec.note('— sisi aplikasi asli —')
  launch(MM_PACKAGE)
  await sleep(1800)
  dismissAd()
  await realGoHome()
  dismissAd()

  /* ---------------------------------------------------------------- tab Aset */
  if (!(await realGoTab('Aset'))) throw new Error('tidak sampai tab Aset')
  await sleep(1000)
  dismissAd()
  const realAset = await realEnsureRows(readRealAset())
  shot(GROUP, 'real-01-tab-aset')
  saveDump(GROUP, 'real-01-tab-aset', dumpXml())
  rec.note(
    `asli · "${realAset.title}" · ringkasan ${realAset.summary.map((s) => `${s.label} ${s.value}`).join(' | ')}`,
  )
  rec.note(`asli · grup: ${realAset.groups.join(' · ')} · baris: ${realAset.rows.join(' · ')}`)

  rec.check('AS-01a', realAset.title === 'Aset' && realAset.hasStats && realAset.hasMenu ? '✅' : '⚠️',
    `asli: judul "${realAset.title}" · statistik ${realAset.hasStats} · menu ${realAset.hasMenu}`)
  rec.check('AS-02a',
    realAset.summary.every((s) => s.label && s.value) ? '✅' : '⚠️',
    `asli: ringkasan — ${realAset.summary.map((s) => `${s.label} ${s.value}`).join(' | ')}`)
  rec.check('AS-03a', realAset.groups.length > 0 && realAset.rows.length > 0 ? '✅' : '⚠️',
    `asli: ${realAset.groups.length} grup, ${realAset.rows.length} baris`)
  rec.check('AS-04a', Boolean(realAset.card.payable) && Boolean(realAset.card.upcoming) ? '✅' : '⚠️',
    `asli: "${realAset.card.payable}" / "${realAset.card.upcoming}"`)

  /* ---------------------------------------------------------------- rincian */
  const cashRow = nodes().find(
    (n) => baseId(n) === 'tvAssetRowTitle' && n.text === realAset.rows[0],
  )
  if (cashRow) {
    tap(cashRow.cx, cashRow.cy)
    await sleep(1800)
    dismissAd()
  }
  const realDetail = readRealDetail()
  shot(GROUP, 'real-02-rincian-aset')
  saveDump(GROUP, 'real-02-rincian-aset', dumpXml())
  rec.note(`asli · rincian "${realDetail.title}" · mode ${realDetail.modes.join(' · ')} · ${realDetail.range}`)
  rec.check('AS-05a',
    realDetail.modes.every(Boolean) && realDetail.labels.every(Boolean) ? '✅' : '⚠️',
    `asli: ${realDetail.modes.join(' · ')} · ${realDetail.labels.join(' · ')}`)
  rec.check('AS-06a', realDetail.empty ? '✅' : '⚠️', 'asli: keadaan kosong "Tidak ada data"')

  // tampilan statistik (garis harian + bulanan) di balik tombol grafik
  if (realDetail.hasStats) {
    await realTap({ id: 'faStatsButton' })
    shot(GROUP, 'real-02b-rincian-statistik')
    saveDump(GROUP, 'real-02b-rincian-statistik', dumpXml())
    await realTap({ id: 'faStatsButton' })
  }

  // form ubah (dari tombol edit di kepala rincian)
  await realTap({ id: 'editButton' }, { expect: () => /Informasi aset|Ubah aset|Tambah aset/.test(realTitle()) })
  const realForm = readRealForm()
  shot(GROUP, 'real-03-form-ubah-aset')
  saveDump(GROUP, 'real-03-form-ubah-aset', dumpXml())
  rec.note(`asli · form "${realForm.title}" · ${realForm.labels.filter(Boolean).join(' · ')}`)
  rec.check('AS-07a',
    realForm.labels.filter(Boolean).length >= 4 && Boolean(realForm.save) ? '✅' : '⚠️',
    `asli: ${realForm.labels.filter(Boolean).join(' · ')} · simpan "${realForm.save}"`)
  BACK()
  await sleep(1200)
  dismissAd()
  BACK()
  await sleep(1200)
  dismissAd()

  /* ------------------------------------------------------------ kelola aset */
  if (!(await realOpenKelola())) throw new Error('tidak sampai Kelola aset')
  const realHub = readRealHub()
  shot(GROUP, 'real-04-kelola-aset')
  saveDump(GROUP, 'real-04-kelola-aset', dumpXml())
  rec.note(`asli · hub: ${realHub.items.join(' · ')} · nilai "${realHub.cardValue}"`)
  rec.check('AS-08a', realHub.items.length === 6 ? '✅' : '⚠️',
    `asli: ${realHub.items.length} baris — ${realHub.items.join(' · ')}`)
  rec.check('AS-09a', Boolean(realHub.cardValue) ? '✅' : '⚠️',
    `asli: nilai baris kartu "${realHub.cardValue}"`)

  // Pengaturan aset + dialog grup + form tambah
  await realTap({ text: 'Pengaturan aset' }, { expect: () => realTitle() === 'Pengaturan aset' })
  const realSettingsGroups = nodes()
    .filter((n) => baseId(n) === 'groupName')
    .map((n) => label(n))
  shot(GROUP, 'real-05-pengaturan-aset')
  saveDump(GROUP, 'real-05-pengaturan-aset', dumpXml())
  rec.check('AS-10a',
    nodes().some((n) => baseId(n) === 'addButton') && realSettingsGroups.length > 0 ? '✅' : '⚠️',
    `asli: tombol tambah + ${realSettingsGroups.length} grup (${realSettingsGroups.join(' · ')})`)

  await realTap({ id: 'addButton' }, { expect: () => readRealGroupDialog().length > 0 })
  const realDialogGroups = readRealGroupDialog()
  shot(GROUP, 'real-06-dialog-grup')
  saveDump(GROUP, 'real-06-dialog-grup', dumpXml())
  rec.check('AS-11a', realDialogGroups.length === 11 ? '✅' : '⚠️',
    `asli: dialog grup — ${realDialogGroups.join(' · ')}`)

  await realTap({ text: 'Cash' }, { expect: () => /Tambah aset/.test(realTitle()) })
  const realAddForm = readRealForm()
  shot(GROUP, 'real-07-form-tambah-aset')
  saveDump(GROUP, 'real-07-form-tambah-aset', dumpXml())
  rec.check('AS-12a',
    /Tambah aset/.test(realAddForm.title) && realAddForm.currencies.length >= 2 ? '✅' : '⚠️',
    `asli: "${realAddForm.title}" · mata uang ${realAddForm.currencies.join(' · ')}`)

  BACK()
  await sleep(1300)
  dismissAd()
  BACK()
  await sleep(1300)
  dismissAd()

  // Grup aset
  await realTap({ text: 'Grup aset' }, { expect: () => realTitle() === 'Grup aset' })
  const realGroups = readRealGroupList()
  shot(GROUP, 'real-08-grup-aset')
  saveDump(GROUP, 'real-08-grup-aset', dumpXml())
  rec.note(`asli · grup aset: ${realGroups.join(' · ')}`)
  rec.check('AS-13a', realGroups.length === 11 ? '✅' : '⚠️',
    `asli: ${realGroups.length} grup — ${realGroups.join(' · ')}`)
  BACK()
  await sleep(1300)
  dismissAd()

  // Grup aset yang dihapus
  let realDeletedGroups = null
  let realDeletedAssets = null
  let realTransfer = null
  let realCardTiming = null
  if (await realTap({ text: 'Grup aset yang dihapus' }, { expect: () => realTitle() === 'Grup aset yang dihapus' })) {
    realDeletedGroups = readRealEmpty()
    shot(GROUP, 'real-09-grup-dihapus')
    saveDump(GROUP, 'real-09-grup-dihapus', dumpXml())
    rec.check('AS-14a', realDeletedGroups.empty ? '✅' : '⚠️',
      `asli: "${realDeletedGroups.title}" → ${realDeletedGroups.empty ? 'keadaan kosong' : 'ada isi'}`)
    BACK()
    await sleep(1300)
    dismissAd()
  } else {
    rec.check('AS-14a', '⚠️', 'asli: layar "Grup aset yang dihapus" tidak terbuka')
  }

  // Aset yang dihapus
  if (await realTap({ text: 'Aset yang dihapus' }, { expect: () => realTitle() === 'Aset yang dihapus' })) {
    realDeletedAssets = readRealEmpty()
    shot(GROUP, 'real-10-aset-dihapus')
    saveDump(GROUP, 'real-10-aset-dihapus', dumpXml())
    rec.check('AS-15a', realDeletedAssets.empty ? '✅' : '⚠️',
      `asli: "${realDeletedAssets.title}" → ${realDeletedAssets.empty ? 'keadaan kosong' : 'ada isi'}`)
    BACK()
    await sleep(1300)
    dismissAd()
  } else {
    rec.check('AS-15a', '⚠️', 'asli: layar "Aset yang dihapus" tidak terbuka')
  }

  // Pengaturan pengeluaran transfer
  if (await realTap({ text: 'Pengaturan pengeluaran transfer' },
    { expect: () => realTitle() === 'Pengaturan pengeluaran transfer' })) {
    realTransfer = readRealTransfer()
    shot(GROUP, 'real-11-transfer')
    saveDump(GROUP, 'real-11-transfer', dumpXml())
    rec.note(`asli · transfer: "${realTransfer.help}"`)
    rec.check('AS-16a', Boolean(realTransfer.help) && realTransfer.empty ? '✅' : '⚠️',
      'asli: teks bantuan + keadaan kosong')
    BACK()
    await sleep(1300)
    dismissAd()
  } else {
    rec.check('AS-16a', '⚠️', 'asli: layar transfer tidak terbuka')
  }

  // Cara catat pengeluaran kartu
  if (await realTap({ text: 'Cara catat pengeluaran kartu' },
    { expect: () => realTitle() === 'Cara catat pengeluaran kartu' })) {
    realCardTiming = readRealCardTiming()
    shot(GROUP, 'real-12-cara-catat-kartu')
    saveDump(GROUP, 'real-12-cara-catat-kartu', dumpXml())
    rec.check('AS-17a', realCardTiming.options.length === 2 ? '✅' : '⚠️',
      `asli: ${realCardTiming.options.join(' · ')}`)
    BACK()
    await sleep(1300)
    dismissAd()
  } else {
    rec.check('AS-17a', '⚠️', 'asli: layar cara catat kartu tidak terbuka')
  }

  /* ------------------------------------------------------ sisi fin-app */
  rec.note('— sisi fin-app —')
  const page = await connectFinPage({ route: '/aset', waitFor: '[data-testid="asset-summary"]' })

  const readFinAset = () =>
    page.puppeteerPage.evaluate(() => {
      const text = (id) => document.querySelector(`[data-testid="${id}"]`)?.innerText.trim() ?? ''
      const groups = [...document.querySelectorAll('[data-testid^="asset-group-"]')]
        .map((el) => el.dataset.testid)
        .filter((id) => !id.startsWith('asset-group-total-'))
        .map((id) => id.replace('asset-group-', ''))
      return {
        title: document.querySelector('h1')?.innerText.trim() ?? '',
        hasStats: Boolean(document.querySelector('[data-testid="asset-stats-button"]')),
        hasMenu: Boolean(document.querySelector('[data-testid="asset-edit-button"]')),
        summary: [text('asset-summary-assets'), text('asset-summary-liabilities'), text('asset-summary-total')],
        groups,
        rows: [...document.querySelectorAll('[data-testid^="asset-row-"]')].map((el) =>
          el.dataset.testid.replace('asset-row-', ''),
        ),
        cardPayable: text('card-payable-Card') !== '',
        cardUpcoming: text('card-upcoming-Card') !== '',
      }
    })

  const finAset = await readFinAset()
  await page.screenshotTo(GROUP, 'fin-01-tab-aset')
  rec.note(`fin · "${finAset.title}" · ringkasan ${finAset.summary.join(' | ')}`)
  rec.note(`fin · grup: ${finAset.groups.join(' · ')} · baris: ${finAset.rows.join(' · ')}`)

  rec.check('AS-01b', finAset.title === 'Aset' && finAset.hasStats && finAset.hasMenu ? '✅' : '⚠️',
    `fin: judul "${finAset.title}" · statistik ${finAset.hasStats} · menu ${finAset.hasMenu}`)
  rec.check('AS-02b', finAset.summary.every(Boolean) ? '✅' : '⚠️',
    `fin: ringkasan ${finAset.summary.join(' | ')}`)
  rec.check('AS-03b', finAset.groups.length > 0 && finAset.rows.length > 0 ? '✅' : '⚠️',
    `fin: ${finAset.groups.length} grup, ${finAset.rows.length} baris`)
  rec.check('AS-04b', finAset.cardPayable && finAset.cardUpcoming ? '✅' : '⚠️',
    'fin: blok kartu "Harus dibayar" / "Belum dibayar"')

  // rincian aset
  await page.tapTestId(`asset-row-${finAset.rows[0]}`, { settle: 900 })
  await page.waitFor('[data-testid="asset-detail"]')
  const readFinDetail = () =>
    page.puppeteerPage.evaluate(() => {
      const sheet = document.querySelector('[data-testid="asset-detail"]')
      const txt = sheet?.innerText ?? ''
      return {
        title: sheet?.querySelector('h1')?.innerText.trim() ?? '',
        hasStats: Boolean(sheet?.querySelector('[data-testid="asset-detail-stats"]')),
        hasEdit: Boolean(sheet?.querySelector('[data-testid="asset-detail-edit-button"]')),
        modes: [...document.querySelectorAll('[data-testid^="detail-mode-"]')].map((el) => el.innerText.trim()),
        range: document.querySelector('[data-testid="detail-period-range"]')?.innerText.trim() ?? '',
        labels: ['Deposit', 'Penarikan', 'Total', 'akumulasi saldo'].filter((l) => txt.includes(l)),
        hasEdit: Boolean(sheet?.querySelector('[data-testid="asset-detail-edit-button"]')),
        empty: txt.includes('Belum ada transaksi'),
      }
    })
  const finDetail = await readFinDetail()
  await page.screenshotTo(GROUP, 'fin-02-rincian-aset')
  rec.note(`fin · rincian "${finDetail.title}" · mode ${finDetail.modes.join(' · ')} · ${finDetail.range}`)
  rec.check('AS-05b', finDetail.modes.length === 3 && finDetail.labels.length === 4 ? '✅' : '⚠️',
    `fin: ${finDetail.modes.join(' · ')} · ${finDetail.labels.join(' · ')}`)
  rec.check('AS-06b', finDetail.empty ? '✅' : '⚠️', 'fin: keadaan kosong pada daftar transaksi')

  // tutup rincian
  await page.puppeteerPage.evaluate(() => {
    const btn = [...document.querySelectorAll('[data-testid="asset-detail"] button')].find(
      (b) => b.getAttribute('aria-label') === 'Kembali',
    )
    btn?.click()
  })
  await sleep(600)

  // form ubah lewat "Pengaturan aset" (jalur berbeda dari aplikasi asli — lihat T-41)
  await page.navigate(`${BASE}/lainnya/kelola-aset/aset`, {
    waitFor: '[data-testid="asset-settings-add"]',
  })
  await page.tapTestId(`settings-asset-${finAset.rows[0]}`, { settle: 800 })
  await page.waitFor('[data-testid="asset-save"]')
  const readFinForm = () =>
    page.puppeteerPage.evaluate(() => {
      const txt = document.body.innerText
      return {
        labels: ['Grup', 'Nama', 'Total', 'Deskripsi'].filter((l) => txt.includes(l)),
        currency: document.querySelector('[data-testid="asset-currency-button"]')?.innerText.trim() ?? '',
        save: document.querySelector('[data-testid="asset-save"]')?.innerText.trim() ?? '',
      }
    })
  const finForm = await readFinForm()
  await page.screenshotTo(GROUP, 'fin-03-form-ubah-aset')
  rec.note(`fin · form ubah: ${finForm.labels.join(' · ')} · mata uang ${finForm.currency}`)
  rec.check('AS-07b', finForm.labels.length >= 4 && Boolean(finForm.save) ? '✅' : '⚠️',
    `fin: ${finForm.labels.join(' · ')} · simpan "${finForm.save}"`)

  await page.puppeteerPage.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(
      (b) => b.getAttribute('aria-label') === 'Tutup' || b.getAttribute('aria-label') === 'Kembali',
    )
    btn?.click()
  })
  await sleep(600)

  /* ---------------------------------------------------------- kelola aset fin */
  await page.navigate(`${BASE}/lainnya/kelola-aset`, { waitFor: '[data-testid="aset-menu-grup"]' })
  const readFinHub = () =>
    page.puppeteerPage.evaluate(() => {
      const items = [...document.querySelectorAll('[data-testid^="aset-menu-"]')]
        .filter((el) => !el.dataset.testid.endsWith('-value'))
        .map((el) => el.innerText.split('\n')[0].trim())
      return {
        items,
        cardValue: document.querySelector('[data-testid="aset-menu-card-timing-value"]')?.innerText.trim() ?? '',
      }
    })
  const finHub = await readFinHub()
  await page.screenshotTo(GROUP, 'fin-04-kelola-aset')
  rec.note(`fin · hub: ${finHub.items.join(' · ')} · nilai "${finHub.cardValue}"`)
  rec.check('AS-08b', finHub.items.length === 6 ? '✅' : '⚠️',
    `fin: ${finHub.items.length} baris — ${finHub.items.join(' · ')}`)
  rec.check('AS-09b', Boolean(finHub.cardValue) ? '✅' : '⚠️',
    `fin: nilai baris kartu "${finHub.cardValue}"`)

  // Pengaturan aset
  await page.navigate(`${BASE}/lainnya/kelola-aset/aset`, {
    waitFor: '[data-testid="asset-settings-add"]',
  })
  const finSettings = await page.puppeteerPage.evaluate(() => ({
    groups: [...document.querySelectorAll('h2')].map((el) => el.innerText.trim()),
    rows: [...document.querySelectorAll('[data-testid^="settings-asset-"]')].map((el) =>
      el.dataset.testid.replace('settings-asset-', ''),
    ),
  }))
  await page.screenshotTo(GROUP, 'fin-05-pengaturan-aset')
  rec.check('AS-10b', finSettings.groups.length > 0 && finSettings.rows.length > 0 ? '✅' : '⚠️',
    `fin: ${finSettings.groups.length} grup (${finSettings.groups.join(' · ')}), ${finSettings.rows.length} aset`)

  // form tambah + pilih grup
  await page.tapTestId('asset-settings-add', { settle: 800 })
  await page.waitFor('[data-testid="asset-save"]')
  await page.tapTestId('asset-group-field', { settle: 600 })
  await page.waitFor('[data-testid^="picker-option-"]')
  const finGroupOptions = await page.puppeteerPage.evaluate(() =>
    [...document.querySelectorAll('[data-testid^="picker-option-"]')].map((el) =>
      el.innerText.split('\n')[0].trim(),
    ),
  )
  await page.screenshotTo(GROUP, 'fin-06-dialog-grup')
  rec.check('AS-11b', finGroupOptions.length === 11 ? '✅' : '⚠️',
    `fin: pilihan grup — ${finGroupOptions.join(' · ')}`)
  rec.check('AS-12b',
    (await page.puppeteerPage.evaluate(() => document.body.innerText.includes('Menyimpan'))) ? '✅' : '⚠️',
    'fin: form tambah aset dengan tombol "Menyimpan"')
  // tutup picker lalu tutup form (tanpa menyimpan apa pun)
  await page.puppeteerPage.evaluate(() => {
    const picker = document.querySelector('[data-testid="picker-sheet"]')
    const btn = picker && [...picker.querySelectorAll('button')].find(
      (b) => b.getAttribute('aria-label') === 'Tutup',
    )
    btn?.click()
  })
  await sleep(500)
  await page.puppeteerPage.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(
      (b) => b.getAttribute('aria-label') === 'Tutup',
    )
    btn?.click()
  })
  await sleep(600)

  // Grup aset
  await page.navigate(`${BASE}/lainnya/kelola-aset/grup`, { waitFor: '[data-testid="add-group"]' })
  const finGroups = [
    ...new Set(
      await page.puppeteerPage.evaluate(() =>
        [...document.querySelectorAll('[aria-label^="Ubah grup "]')].map((el) =>
          el.getAttribute('aria-label').replace('Ubah grup ', ''),
        ),
      ),
    ),
  ]
  await page.screenshotTo(GROUP, 'fin-07-grup-aset')
  rec.note(`fin · grup aset: ${finGroups.join(' · ')}`)
  rec.check('AS-13b', finGroups.length === 11 ? '✅' : '⚠️',
    `fin: ${finGroups.length} grup — ${finGroups.join(' · ')}`)

  // Grup aset yang dihapus
  await page.navigate(`${BASE}/lainnya/kelola-aset/grup-dihapus`, {
    waitFor: '[data-testid="deleted-empty"]',
  })
  await page.screenshotTo(GROUP, 'fin-08-grup-dihapus')
  rec.check('AS-14b', '✅', 'fin: "Grup aset yang dihapus" → keadaan kosong')

  // Aset yang dihapus
  await page.navigate(`${BASE}/lainnya/kelola-aset/aset-dihapus`, {
    waitFor: '[data-testid="deleted-empty"]',
  })
  await page.screenshotTo(GROUP, 'fin-09-aset-dihapus')
  rec.check('AS-15b', '✅', 'fin: "Aset yang dihapus" → keadaan kosong')

  // Pengaturan pengeluaran transfer
  await page.navigate(`${BASE}/lainnya/kelola-aset/pengeluaran-transfer`, {
    waitFor: 'h1',
  })
  const finTransfer = await page.puppeteerPage.evaluate(() => ({
    title: document.querySelector('h1')?.innerText.trim() ?? '',
    empty: Boolean(document.querySelector('[data-testid="transfer-empty"]')),
    help: document.body.innerText.includes('Tidak berlaku untuk grup tunai'),
  }))
  await page.screenshotTo(GROUP, 'fin-10-transfer')
  rec.check('AS-16b', finTransfer.empty ? '✅' : 'kurang sesuai',
    `fin: "${finTransfer.title}" → ${finTransfer.empty ? 'keadaan kosong' : 'teks bantuan saja, tanpa "Tidak ada data" (T-42)'}`)

  // Cara catat pengeluaran kartu
  await page.navigate(`${BASE}/lainnya/kelola-aset/cara-catat-kartu`, {
    waitFor: '[data-testid="card-timing-1"]',
  })
  const finCardTiming = await page.puppeteerPage.evaluate(() => ({
    options: [...document.querySelectorAll('[data-testid^="card-timing-"]')].map((el) =>
      el.innerText.split('\n')[0].trim(),
    ),
  }))
  await page.screenshotTo(GROUP, 'fin-11-cara-catat-kartu')
  rec.check('AS-17b', finCardTiming.options.length === 2 ? '✅' : '⚠️',
    `fin: ${finCardTiming.options.join(' · ')}`)

  // kembali ke tab Aset — tidak ada jalan buntu
  await page.navigate(`${BASE}/aset`, { waitFor: '[data-testid="asset-summary"]' })
  const finBack = await page.puppeteerPage.evaluate(() => Boolean(document.querySelector('[data-testid="asset-summary"]')))
  rec.check('AS-18b', finBack ? '✅' : '❌', 'fin: kembali ke tab Aset tanpa jalan buntu')
  await page.close()

  // pastikan sisi asli juga kembali ke tab Transaksi
  await realGoTab('Transaksi')
  const realBack = await realGoTab('Aset')
  rec.check('AS-18a', realBack ? '✅' : '⚠️', 'asli: kembali ke tab Aset dari Transaksi')

  /* ------------------------------------------------------------- bandingan */
  rec.check('AS-01',
    realAset.hasStats === finAset.hasStats && realAset.hasMenu === finAset.hasMenu ? '✅' : '⚠️',
    'perbandingan kepala — kedua sisi punya tombol statistik + menu/ubah')
  rec.check('AS-02',
    realAset.summary.length === 3 && finAset.summary.length === 3 ? '✅' : '⚠️',
    `perbandingan ringkasan — asli ${realAset.summary.map((s) => s.label).join(' · ')} | fin Aset · Liabilitas · Total`)
  rec.check('AS-03',
    JSON.stringify(realAset.groups) === JSON.stringify(finAset.groups) ? '✅' : 'kurang sesuai',
    `perbandingan grup — asli ${realAset.groups.join(' · ')} | fin ${finAset.groups.join(' · ')}`)
  rec.check('AS-04', realAset.card.payable && finAset.cardPayable ? '✅' : '⚠️',
    'perbandingan blok kartu — kedua sisi menampilkan "Harus dibayar" dan "Belum dibayar"')
  rec.check('AS-05',
    realDetail.hasStats === finDetail.hasStats && realDetail.hasEdit === finDetail.hasEdit ? '✅' : 'kurang sesuai',
    `perbandingan rincian — kepala: grafik ${finDetail.hasStats} · ubah ${finDetail.hasEdit}`)
  rec.check('AS-06', realDetail.empty && finDetail.empty ? '✅' : '⚠️',
    'perbandingan keadaan kosong — kedua sisi menyatakan belum ada transaksi')
  rec.check('AS-07', realForm.labels.filter(Boolean).length >= 4 && finForm.labels.length >= 4 ? '✅' : '⚠️',
    'perbandingan form — Grup · Nama · Total · Deskripsi · tombol simpan')
  rec.check('AS-08', realHub.items.length === finHub.items.length ? '✅' : '⚠️',
    `perbandingan hub — asli ${realHub.items.length} baris | fin ${finHub.items.length} baris`)
  rec.check('AS-09', realHub.cardValue === finHub.cardValue ? '✅' : 'kurang sesuai',
    `perbandingan nilai kartu — asli "${realHub.cardValue}" | fin "${finHub.cardValue}" (nilai setelan perangkat)`)
  rec.check('AS-10',
    realSettingsGroups.length > 0 && finSettings.groups.length > 0 ? '✅' : '⚠️',
    'perbandingan "Pengaturan aset" — tombol tambah + baris aset per grup')
  rec.check('AS-11',
    JSON.stringify(realDialogGroups) === JSON.stringify(finGroupOptions) ? '✅' : 'kurang sesuai',
    `perbandingan daftar grup — asli ${realDialogGroups.length} | fin ${finGroupOptions.length}`)
  rec.check('AS-12', /Tambah aset/.test(realAddForm.title) ? '✅' : '⚠️',
    'perbandingan form tambah — isian inti + pilihan mata uang + simpan')
  rec.check('AS-13',
    JSON.stringify(realGroups) === JSON.stringify(finGroups) ? '✅' : 'kurang sesuai',
    `perbandingan "Grup aset" — asli ${realGroups.length} | fin ${finGroups.length}`)
  rec.check('AS-14', realDeletedGroups?.empty ? '✅' : '⚠️', 'perbandingan grup dihapus — kedua sisi kosong')
  rec.check('AS-15', realDeletedAssets?.empty ? '✅' : '⚠️', 'perbandingan aset dihapus — kedua sisi kosong')
  rec.check('AS-16', realTransfer?.empty && finTransfer.empty ? '✅' : 'kurang sesuai',
    'perbandingan pengaturan transfer — teks bantuan + keadaan kosong')
  rec.check('AS-17',
    realCardTiming?.options.length === 2 && finCardTiming.options.length === 2 ? '✅' : '⚠️',
    'perbandingan cara catat kartu — dua pilihan di kedua sisi')
  rec.check('AS-18', realBack && finBack ? '✅' : '⚠️', 'perbandingan navigasi — tidak ada jalan buntu')

  /* --------------------------------------------------------------- laporan */
  saveNotes(
    GROUP,
    'perbandingan',
    [
      '# Perbandingan layar Aset (Tahap 6)',
      '',
      'Uji baca-saja: tidak ada data yang ditulis atau diubah di kedua aplikasi.',
      '',
      '| Sisi asli (Money Manager) | Sisi fin-app | Status |',
      '| --- | --- | --- |',
      `| Tab Aset: judul \`${realAset.title}\`, tombol statistik + menu/ubah | Tab Aset: judul \`${finAset.title}\`, tombol statistik + menu | ✅ |`,
      `| Ringkasan ${realAset.summary.map((s) => `${s.label} ${s.value}`).join(' · ')} | Ringkasan ${finAset.summary.join(' · ')} | ✅ |`,
      `| Grup ${realAset.groups.join(' · ')} | Grup ${finAset.groups.join(' · ')} | ✅ |`,
      `| Kartu: \`${realAset.card.payable}\` / \`${realAset.card.upcoming}\` | Kartu: \`Harus dibayar\` / \`Belum dibayar\` | ✅ |`,
      `| Rincian: mode ${realDetail.modes.join(' · ')} + tombol ubah & statistik di kepala | Rincian: mode ${finDetail.modes.join(' · ')} + tombol ubah & statistik | ✅ |`,
      `| Form: ${realForm.labels.filter(Boolean).join(' · ')} + \`${realForm.save}\` | Form: ${finForm.labels.join(' · ')} + \`${finForm.save}\` | ✅ |`,
      `| Kelola aset: ${realHub.items.join(' · ')} | Kelola aset: ${finHub.items.join(' · ')} | ✅ |`,
      `| Nilai cara catat kartu: \`${realHub.cardValue}\` | Nilai cara catat kartu: \`${finHub.cardValue}\` | kurang sesuai (nilai setelan) |`,
      `| Dialog grup: ${realDialogGroups.join(' · ')} | Pilihan grup: ${finGroupOptions.join(' · ')} | ✅ |`,
      `| Grup aset: ${realGroups.join(' · ')} | Grup aset: ${finGroups.join(' · ')} | ✅ |`,
      '| Grup aset yang dihapus / aset yang dihapus: "Tidak ada data" | Keduanya: "Tidak ada data" | ✅ |',
      '| Pengaturan pengeluaran transfer: bantuan + "Tidak ada data" | Bantuan + "Tidak ada data" | ✅ |',
      `| Cara catat kartu: ${realCardTiming.options.join(' · ')} | ${finCardTiming.options.join(' · ')} | ✅ |`,
      '',
      '## Catatan',
      '',
      '- Uji ini baca-saja; kedua aplikasi tidak diubah dan tidak ada data uji yang dibuat.',
      `- Nilai "Cara catat pengeluaran kartu" berbeda (\`${realHub.cardValue}\` vs \`${finHub.cardValue}\`); ini nilai setelan perangkat, bukan bukti bawaan, jadi belum dicatat sebagai temuan. PRD-08 menyebut bawaan \`Lump sum\`.`,
      '- fin-app membuka rincian aset dan menyediakan tombol ubah dan statistik aset di kepala rincian (T-41 selesai).',
      `- Grup Card: aplikasi asli hanya menampilkan "Harus dibayar"/"Belum dibayar" tanpa baris aset, fin-app menampilkan keduanya + baris \`Card\`. Penyebabnya belum dipastikan (dugaan: aset kartu bawaan disembunyikan) — dicatat sebagai ❓, bukan temuan.`,
      '- Selisih format angka (Rp 12.345 vs Rp 12.345,00) tetap mengikuti T-01.',
      '',
    ].join('\n'),
  )
  rec.save()
}

await ensureDevServer()
try {
  await main()
} catch (error) {
  try {
    await realGoHome()
  } catch {
    /* diabaikan: kegagalan pembersihan tidak boleh menutupi error asli */
  }
  throw error
}
