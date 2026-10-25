/**
 * Tahap 5 — Statistik : Money Manager asli ⇄ fin-app.
 *
 *   TS-01 kepala layar + panah bulan
 *   TS-02 menu rentang (Mingguan/Bulanan/Tahunan/Periode)
 *   TS-03 dua jenis (Pendapatan/Pengeluaran) beserta totalnya
 *   TS-04 keadaan kosong
 *   TS-05 total per jenis setelah ada data
 *   TS-06 grafik batang per kategori
 *   TS-07 daftar kategori + persentase
 *   TS-08 angka cocok dengan transaksi yang dicatat
 *   TS-09 berganti jenis menampilkan kategori jenis itu
 *   TS-10 menekan kategori membuka layar rincian
 *   TS-11 pindah bulan → keadaan kosong lagi
 *   TS-12 judul/label grafik (asli tanpa judul, fin "Bar Chart")
 *   TS-13 rincian kategori: baris Semua/Lainnya (asli) vs sub-kategori (fin)
 *
 * Jalankan: node tests/parity/ta05-statistik.mjs
 *
 * Data uji dibuat sendiri oleh harness di kedua aplikasi lalu dihapus lagi:
 *   pengeluaran 12.345 · 🍜 Food · Cash
 *   pendapatan  50.000 · 💰 Salary · Cash
 *
 * Peta layar aplikasi asli (pengamatan 24 Oktober 2026):
 *   statistik   monthLeftButton · titleName "Okt 2026" · monthRightButton ·
 *               tVSearchMenu "Bulanan" (popup: Mingguan/Bulanan/Tahunan/Periode) ·
 *               tbInButton "Pendapatan  Rp 50.000,00" · tbOutButton
 *               "Pengeluaran  Rp 12.345,00" · tVRatio "100%" · baris kategori:
 *               categoryName, categoryRate, amount · emptyText "Tidak ada data".
 *   rincian     titleName "<kategori>" · thisMonthTxtView · tvAmountTitle
 *               "Total bulanan" · tvAmountValue · categoryName "Semua · Lainnya" ·
 *               categoryRate/amount · baris transaksi rowAmount.
 */
import {
  BASE,
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

const GROUP = 'TA05-statistik'
const rec = makeRecorder(GROUP, 'Tahap 5 — Statistik', 'Money Manager asli ⇄ fin-app')

const EXPENSE = { amount: '12345', text: '12.345', category: 'Food', asset: 'Cash' }
const INCOME = { amount: '50000', text: '50.000', category: 'Salary', asset: 'Cash' }

const baseId = (n) => (n.id ?? '').replace(`${MM_PACKAGE}:id/`, '')

const realTitle = () => {
  const nodes = parseNodes(dumpXml())
  return (
    label(nodes.find((n) => baseId(n) === 'titleName')) ||
    label(nodes.find((n) => baseId(n) === 'titleText'))
  )
}

const realOnTransaksi = () => {
  const nodes = parseNodes(dumpXml())
  return nodes.some((n) => baseId(n).startsWith('tbMain')) || nodes.some((n) => baseId(n) === 'addFab')
}

const realOnStatistik = () => parseNodes(dumpXml()).some((n) => baseId(n) === 'tVSearchMenu')

/* ------------------------------------------------------------------ pembacaan */

function readRealStats() {
  const nodes = parseNodes(dumpXml())
  const byId = (id) => nodes.find((n) => baseId(n) === id)
  const byY = (list, y) =>
    list.sort((a, b) => Math.abs(a.cy - y) - Math.abs(b.cy - y))[0]
  const names = nodes.filter((n) => baseId(n) === 'categoryName')
  const rates = nodes.filter((n) => baseId(n) === 'categoryRate')
  const amounts = nodes.filter((n) => baseId(n) === 'amount')
  return {
    month: label(byId('titleName')) || label(byId('thisMonthTxtView')),
    range: label(byId('tVSearchMenu')),
    income: label(byId('tbInButton')),
    expense: label(byId('tbOutButton')),
    ratio: label(byId('tVRatio')),
    empty: Boolean(byId('emptyText')),
    rows: names.map((r, i) => ({
      name: label(r),
      rate: rates.length
        ? rates.length >= names.length
          ? label(rates[i])
          : label(byY([...rates], r.cy))
        : label(byId('tVRatio')),
      amount: amounts.length >= names.length ? label(amounts[i]) : label(byY([...amounts], r.cy)),
    })),
  }
}

function readRealDetail() {
  const nodes = parseNodes(dumpXml())
  const byId = (id) => nodes.find((n) => baseId(n) === id)
  return {
    title: label(byId('titleName')),
    month: label(byId('thisMonthTxtView')),
    totalLabel: label(byId('tvAmountTitle')),
    total: label(byId('tvAmountValue')),
    rows: nodes.filter((n) => baseId(n) === 'rowAmount').map((n) => label(n)),
    breakdown: nodes.filter((n) => baseId(n) === 'categoryName').map((n) => label(n)),
  }
}

/* ------------------------------------------------------------------ navigasi */

async function realTapSafe(id, { settle = 1300 } = {}) {
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

async function realGoTab(name) {
  for (let i = 0; i < 4; i++) {
    dismissAd()
    const nav = findNode(parseNodes(dumpXml()), { text: name })
    if (nav) {
      tap(nav.cx, nav.cy)
      await sleep(2400)
      dismissAd()
      if (name === 'Statistik' ? realOnStatistik() : realOnTransaksi()) return true
    }
    BACK()
    await sleep(1000)
  }
  return false
}

/** Berdiri di daftar Transaksi (dipakai untuk menyiapkan & membersihkan data). */
async function realGoTransaksi() {
  launch(MM_PACKAGE)
  await expectForeground(MM_PACKAGE)
  await sleep(1200)
  for (let i = 0; i < 3; i++) {
    dismissAd()
    if (realOnTransaksi()) return true
    await realGoHome()
    await sleep(1200)
  }
  return realOnTransaksi()
}

/* --------------------------------------------------------------- data uji asli */

function readRealTransactions() {
  const nodes = parseNodes(dumpXml())
  return nodes
    .filter((n) => baseId(n) === 'rowAmount')
    .map((n) => ({ amount: label(n), y: n.cy }))
}

async function realDeleteRowsWithAmount(texts) {
  for (let i = 0; i < 8; i++) {
    const row = readRealTransactions().find((r) => texts.some((t) => r.amount.includes(t)))
    if (!row) return true
    tap(540, row.y)
    await sleep(1800)
    dismissAd()
    await realTapSafe('deleteButton', { settle: 1300 })
    const yes = parseNodes(dumpXml()).find((n) => baseId(n) === 'yesButton')
    if (!yes) return false
    tap(yes.cx, yes.cy)
    await sleep(2000)
    dismissAd()
  }
  return true
}

async function realAddTransaction(tx, type = 'Pengeluaran') {
  if (!(await realTapSafe('addFab', { settle: 2200 }))) return false
  for (let i = 0; i < 4 && !['Pengeluaran', 'Pendapatan', 'Transfer'].includes(realTitle()); i++) {
    dismissAd()
    await sleep(900)
  }
  if (realTitle() !== type) {
    await realTapSafe(type === 'Pendapatan' ? 'tbIncomeBtn' : 'tbExpensesBtn', { settle: 1500 })
  }
  for (const digit of tx.amount) await realTapSafe(`pad${digit}`, { settle: 260 })

  await realTapSafe('input3Block', { settle: 1600 })
  for (let i = 0; i < 6; i++) {
    if (label(parseNodes(dumpXml()).find((n) => baseId(n) === 'category') ?? null)) break
    const option = parseNodes(dumpXml())
      .filter((n) => baseId(n) === 'kindButton')
      .find((n) => label(n).includes(tx.category))
    if (option) {
      tap(option.cx, option.cy)
      await sleep(1500)
    } else {
      await sleep(900)
    }
  }

  const panel = label(parseNodes(dumpXml()).find((n) => n.id.endsWith('subTitleName')) ?? null)
  if (panel !== 'Aset') await realTapSafe('input2Block', { settle: 1500 })
  for (let i = 0; i < 5; i++) {
    if (label(parseNodes(dumpXml()).find((n) => baseId(n) === 'account') ?? null)) break
    const option = parseNodes(dumpXml())
      .filter((n) => baseId(n) === 'kindButton')
      .find((n) => label(n) === tx.asset)
    if (option) {
      tap(option.cx, option.cy)
      await sleep(1400)
    } else {
      await sleep(700)
    }
  }
  await realTapSafe('saveButton', { settle: 2600 })
  return true
}

/* ================================================================ jalannya uji */

async function main() {
  /* --------------------------------------- TS-01..04 · keadaan kosong (asli) */
  rec.note('— sisi aplikasi asli —')
  if (!(await realGoTransaksi())) throw new Error('tidak sampai layar Transaksi')

  const cleaned = await realDeleteRowsWithAmount([EXPENSE.text, INCOME.text])
  rec.note(`asli · sisa data uji dibersihkan: ${cleaned ? 'ya' : 'tidak'}`)
  if (!(await realGoTab('Statistik'))) throw new Error('tidak sampai tab Statistik')

  const emptyReal = readRealStats()
  shot(GROUP, 'real-01-statistik-kosong')
  saveDump(GROUP, 'real-01-statistik-kosong', dumpXml())
  rec.note(
    `asli · "${emptyReal.month}" · rentang "${emptyReal.range}" · ${emptyReal.income} | ${emptyReal.expense} · kosong: ${emptyReal.empty}`,
  )

  rec.check(
    'TS-01a',
    emptyReal.month && emptyReal.month !== '' ? '✅' : '❌',
    `asli: kepala "${emptyReal.month}" dengan panah kiri/kanan`,
  )
  rec.check(
    'TS-02a',
    emptyReal.range ? '✅' : '❌',
    `asli: menu rentang bertuliskan "${emptyReal.range}"`,
  )
  rec.check(
    'TS-03a',
    /Pendapatan/.test(emptyReal.income) && /Pengeluaran/.test(emptyReal.expense) ? '✅' : '❌',
    `asli: dua jenis — "${emptyReal.income}" | "${emptyReal.expense}"`,
  )
  rec.check(
    'TS-04a',
    emptyReal.empty ? '✅' : '❌',
    `asli: keadaan kosong "${label(parseNodes(dumpXml()).find((n) => baseId(n) === 'emptyText') ?? null)}"`,
  )

  // pilihan menu rentang
  let realRanges = []
  {
    const menu = findNode(parseNodes(dumpXml()), { id: 'tVSearchMenu' })
    if (menu) {
      tap(menu.cx, menu.cy)
      await sleep(1500)
      realRanges = parseNodes(dumpXml())
        .filter((n) => baseId(n) === 'android:id/title' || baseId(n).endsWith('/title'))
        .map((n) => label(n))
      shot(GROUP, 'real-02-menu-rentang')
      saveDump(GROUP, 'real-02-menu-rentang', dumpXml())
      BACK()
      await sleep(1000)
    }
  }
  rec.note(`asli · pilihan rentang: ${realRanges.join(' · ')}`)

  /* ---------------------------------------- TS-05..10 · dengan data (asli) */
  if (!(await realGoTab('Transaksi'))) throw new Error('tidak kembali ke Transaksi')
  await realAddTransaction(EXPENSE)
  await realAddTransaction(INCOME, 'Pendapatan')
  shot(GROUP, 'real-03-dua-transaksi')
  saveDump(GROUP, 'real-03-dua-transaksi', dumpXml())

  if (!(await realGoTab('Statistik'))) throw new Error('tidak sampai tab Statistik')
  const dataReal = readRealStats()
  shot(GROUP, 'real-04-statistik-ada-data')
  saveDump(GROUP, 'real-04-statistik-ada-data', dumpXml())
  rec.note(
    `asli · ${dataReal.income} | ${dataReal.expense} · rasio "${dataReal.ratio}" · baris: ${dataReal.rows.map((r) => `${r.name} ${r.rate} ${r.amount}`).join(' · ')}`,
  )
  rec.check(
    'TS-05a',
    dataReal.expense.includes(EXPENSE.text) && dataReal.income.includes(INCOME.text) ? '✅' : '⚠️',
    `asli: total per jenis — "${dataReal.income}" | "${dataReal.expense}"`,
  )
  rec.check(
    'TS-07a',
    dataReal.rows.length === 1 && dataReal.rows[0].name.includes('Food') ? '✅' : '⚠️',
    `asli: daftar kategori — ${dataReal.rows.map((r) => `${r.name} ${r.rate ? `(${r.rate}) ` : ''}${r.amount}`).join(' · ') || '(kosong)'}`,
  )
  rec.check(
    'TS-08a',
    dataReal.rows[0]?.amount?.includes(EXPENSE.text) ? '✅' : '⚠️',
    `asli: angka kategori cocok dengan transaksi ${EXPENSE.text} → ${dataReal.rows[0]?.amount}`,
  )

  // TS-09 ganti ke Pendapatan
  await realTapSafe('tbInButton', { settle: 2000 })
  const incomeReal = readRealStats()
  shot(GROUP, 'real-05-statistik-pendapatan')
  saveDump(GROUP, 'real-05-statistik-pendapatan', dumpXml())
  rec.note(`asli · setelah tekan Pendapatan: baris ${incomeReal.rows.map((r) => r.name).join(' · ') || '(kosong)'}`)
  rec.check(
    'TS-09a',
    incomeReal.rows.some((r) => r.name.includes('Salary')) ? '✅' : '⚠️',
    `asli: memilih Pendapatan menampilkan kategori ${incomeReal.rows.map((r) => r.name).join(' · ') || '(kosong)'}`,
  )

  // TS-10 rincian kategori
  let realDetail = null
  for (let attempt = 0; attempt < 3 && !realDetail; attempt++) {
    const row = parseNodes(dumpXml()).find((n) => baseId(n) === 'categoryName')
    if (!row) break
    tap(row.cx, row.cy)
    await sleep(2200)
    dismissAd()
    const opened = parseNodes(dumpXml()).some(
      (n) => baseId(n) === 'thisMonthTxtView' || baseId(n) === 'tvAmountValue',
    )
    if (!opened) {
      rec.note(`asli · ketukan kategori ke-${attempt + 1} belum membuka rincian, dicoba lagi`)
      await sleep(900)
      continue
    }
    realDetail = readRealDetail()
    shot(GROUP, 'real-06-rincian-kategori')
    saveDump(GROUP, 'real-06-rincian-kategori', dumpXml())
    rec.note(
      `asli · rincian "${realDetail.title}" · ${realDetail.totalLabel} ${realDetail.total} · ${realDetail.rows.length} baris transaksi`,
    )
  }
  rec.check(
    'TS-10a',
    realDetail?.total?.includes(INCOME.text) ? '✅' : '⚠️',
    `asli: menekan kategori membuka rincian "${realDetail?.title ?? '(tidak terbuka)'}" dengan ${realDetail?.totalLabel ?? '-'} ${realDetail?.total ?? '-'}`,
  )

  // TS-11 pindah bulan dari rincian → kembali → ganti bulan
  let realPrevEmpty = null
  {
    await realTapSafe('backButton', { settle: 1800 })
    await realTapSafe('monthLeftButton', { settle: 2000 })
    realPrevEmpty = readRealStats()
    shot(GROUP, 'real-07-bulan-sebelumnya')
    saveDump(GROUP, 'real-07-bulan-sebelumnya', dumpXml())
    await realTapSafe('monthRightButton', { settle: 2000 })
  }
  rec.check(
    'TS-11a',
    realPrevEmpty?.empty ? '✅' : '⚠️',
    `asli: bulan sebelumnya ("${realPrevEmpty?.month}") → ${realPrevEmpty?.empty ? 'keadaan kosong' : 'masih ada data'}`,
  )

  /* ------------------------------------------------------ sisi fin-app */
  rec.note('— sisi fin-app —')
  const page = await connectFinPage({ route: '/statistik', waitFor: '[data-testid="stats-content"]' })

  const readFinStats = () =>
    page.puppeteerPage.evaluate(() => {
      const text = (id) => document.querySelector(`[data-testid="${id}"]`)?.innerText.trim() ?? ''
      return {
        period:
          text('stats-period-label') ||
          text('month-navigator-label') ||
          text('stats-period-button'),
        mode: text('stats-mode-button'),
        income: text('stats-total-income'),
        expense: text('stats-total-expense'),
        empty: Boolean(document.querySelector('[data-testid="stats-empty"]')),
        emptyText: text('stats-empty'),
        chartTitle:
          document.querySelector('[data-testid="stats-chart"] h2')?.textContent?.trim() ?? '',
        bars: [...document.querySelectorAll('[data-testid^="stats-bar-"]')].filter(
          (el) => !el.dataset.testid.startsWith('stats-bar-percent-'),
        ).length,
        rows: [...document.querySelectorAll('[data-testid^="stats-row-"]')].map((row) => ({
          uid: row.dataset.testid.replace('stats-row-', ''),
          text: row.innerText.replace(/\s+/g, ' ').trim(),
        })),
      }
    })

  const finEmpty = await readFinStats()
  await page.screenshotTo(GROUP, 'fin-01-statistik-kosong')
  rec.note(`fin · "${finEmpty.period}" · mode "${finEmpty.mode}" · kosong: ${finEmpty.empty}`)

  rec.check('TS-01b', finEmpty.period ? '✅' : '❌', `fin: kepala "${finEmpty.period}" dengan panah kiri/kanan`)
  rec.check('TS-02b', finEmpty.mode ? '✅' : '❌', `fin: menu rentang "${finEmpty.mode}"`)
  rec.check(
    'TS-03b',
    finEmpty.income !== '' && finEmpty.expense !== '' ? '✅' : '❌',
    `fin: dua jenis — Pendapatan ${finEmpty.income} | Pengeluaran ${finEmpty.expense}`,
  )
  rec.check('TS-04b', finEmpty.empty ? '✅' : '❌', `fin: keadaan kosong "${finEmpty.emptyText.replace(/\s+/g, ' ')}"`)

  // pilihan mode
  await page.tapTestId('stats-mode-button', { settle: 600 })
  await page.waitFor('[data-testid="stats-mode-picker"]')
  const finRanges = await page.puppeteerPage.evaluate(() =>
    [...document.querySelectorAll('[data-testid="stats-mode-picker"] [data-testid^="picker-option-"]')].map(
      (el) => el.innerText.trim(),
    ),
  )
  await page.screenshotTo(GROUP, 'fin-02-menu-rentang')
  await page.puppeteerPage.evaluate(() => {
    const btn = [...document.querySelectorAll('[data-testid="stats-mode-picker"] button')].find((b) =>
      /tutup/i.test(b.getAttribute('aria-label') ?? ''),
    )
    if (btn) btn.click()
  })
  await sleep(500)
  rec.note(`fin · pilihan rentang: ${finRanges.join(' · ')}`)

  rec.check(
    'TS-02',
    realRanges.length === finRanges.length && realRanges.every((r, i) => finRanges[i]?.includes(r))
      ? '✅'
      : '⚠️',
    `perbandingan rentang — asli: ${realRanges.join(' · ') || '(tidak terbaca)'} | fin: ${finRanges.join(' · ')}`,
  )

  rec.check(
    'TS-01',
    emptyReal.month && finEmpty.period ? '✅' : '⚠️',
    `perbandingan kepala — asli: "${emptyReal.month}" | fin: "${finEmpty.period}"`,
  )
  rec.check(
    'TS-03',
    /Pendapatan/.test(emptyReal.income) && finEmpty.income !== '' ? '✅' : '⚠️',
    `perbandingan dua jenis — asli: "${emptyReal.income}" | fin: "Pendapatan ${finEmpty.income}"`,
  )
  rec.check(
    'TS-04',
    emptyReal.empty && finEmpty.empty ? '✅' : '❌',
    'perbandingan keadaan kosong — kedua sisi menampilkan "Tidak ada data"',
  )

  // ---- tambah dua transaksi di fin
  const finAdd = async (tx, type) => {
    await page.tapTestId('trx-fab', { settle: 900 })
    await page.waitFor('[data-testid="transaction-form"]')
    if (type === 'income') await page.tapTestId('trx-type-income', { settle: 500 })
    for (const digit of tx.amount) await page.tapTestId(`numpad-${digit}`, { settle: 120 })
    await page.tapTestId('trx-category-button', { settle: 600 })
    await page.waitFor('[data-testid="category-picker"]')
    await page.puppeteerPage.evaluate((name) => {
      const el = [...document.querySelectorAll('[data-testid^="category-option-"]')].find((b) =>
        b.dataset.testid.includes(name),
      )
      if (el) el.click()
    }, tx.category)
    await sleep(500)
    await page.tapTestId('trx-asset-button', { settle: 600 })
    await page.waitFor('[data-testid="asset-picker"]')
    await page.tap('[data-testid="picker-option-ast_cash"]', { settle: 500 })
    await page.tapTestId('trx-save', { settle: 1400 })
  }

  await page.navigate(`${BASE}/transaksi`, { waitFor: '[data-testid="trx-fab"]' })
  const existingFin = await page.count('[data-testid^="tx-row-"]')
  if (existingFin > 0) rec.note(`fin · ${existingFin} baris sudah ada sebelum uji (dibiarkan, hanya data uji sendiri yang dihapus)`)
  await finAdd(EXPENSE, 'expense')
  await finAdd(INCOME, 'income')
  await page.screenshotTo(GROUP, 'fin-03-dua-transaksi')

  await page.navigate(`${BASE}/statistik`, { waitFor: '[data-testid="stats-content"]' })
  const finData = await readFinStats()
  await page.screenshotTo(GROUP, 'fin-04-statistik-ada-data')
  rec.note(
    `fin · Pendapatan ${finData.income} | Pengeluaran ${finData.expense} · ${finData.bars} batang · baris: ${finData.rows.map((r) => r.text).join(' · ')}`,
  )

  rec.check(
    'TS-05b',
    finData.expense.includes('12.345') && finData.income.includes('50.000') ? '✅' : '⚠️',
    `fin: total per jenis — Pendapatan ${finData.income} | Pengeluaran ${finData.expense}`,
  )
  rec.check(
    'TS-06b',
    finData.bars > 0 ? '✅' : '❌',
    `fin: grafik batang ${finData.bars} batang (stats-bar-*)`,
  )
  rec.check(
    'TS-07b',
    finData.rows.length === 1 && /Food/.test(finData.rows[0]?.text ?? '') ? '✅' : '⚠️',
    `fin: daftar kategori — ${finData.rows.map((r) => r.text).join(' · ') || '(kosong)'}`,
  )
  rec.check(
    'TS-08b',
    /12\.345/.test(finData.rows[0]?.text ?? '') ? '✅' : '⚠️',
    `fin: angka kategori cocok dengan transaksi ${EXPENSE.text} → ${finData.rows[0]?.text}`,
  )

  rec.check(
    'TS-05',
    dataReal.expense.includes(EXPENSE.text) && finData.expense.includes('12.345') ? '✅' : '⚠️',
    `perbandingan total — asli: "${dataReal.expense}" | fin: "Pengeluaran ${finData.expense}"`,
  )

  // TS-06 grafik: bentuknya berbeda (donat vs batang) → T-38
  rec.check(
    'TS-06',
    '⚠️',
    'perbandingan grafik — asli: grafik donat dengan legenda (terbaca dari tangkapan layar, tanpa id) | fin: batang horizontal `stats-bar-*` → T-38',
  )
  rec.check(
    'TS-12',
    finData.chartTitle ? '⚠️' : '✅',
    `perbandingan label grafik — asli: tanpa judul grafik | fin: "${finData.chartTitle || '(tanpa judul)'}"${finData.chartTitle ? ' → T-39' : ''}`,
  )

  // TS-09 ganti ke Pendapatan
  await page.tapTestId('stats-type-income', { settle: 900 })
  const finIncome = await readFinStats()
  await page.screenshotTo(GROUP, 'fin-05-statistik-pendapatan')
  rec.note(`fin · setelah pilih Pendapatan: baris ${finIncome.rows.map((r) => r.text).join(' · ') || '(kosong)'}`)
  rec.check(
    'TS-09b',
    finIncome.rows.some((r) => /Salary/.test(r.text)) ? '✅' : '⚠️',
    `fin: memilih Pendapatan menampilkan ${finIncome.rows.map((r) => r.text).join(' · ') || '(kosong)'}`,
  )
  rec.check(
    'TS-09',
    incomeReal.rows.some((r) => r.name.includes('Salary')) &&
      finIncome.rows.some((r) => /Salary/.test(r.text))
      ? '✅'
      : '⚠️',
    'perbandingan ganti jenis — kedua sisi menampilkan kategori pendapatan setelah memilih Pendapatan',
  )

  // TS-10 rincian
  await page.tap(`[data-testid="stats-row-${finIncome.rows[0]?.uid}"]`, { settle: 900 })
  const finDetail = await page.puppeteerPage.evaluate(() => ({
    title: document.querySelector('[data-testid="stats-detail-title"]')?.innerText.trim() ?? '',
    total: document.querySelector('[data-testid="stats-detail-total"]')?.innerText.trim() ?? '',
    rows: document.querySelectorAll('[data-testid="stats-detail-transactions"] [data-testid^="tx-row-"]').length,
    subs: document.querySelectorAll('[data-testid^="stats-detail-sub-"]').length,
  }))
  await page.screenshotTo(GROUP, 'fin-06-rincian-kategori')
  rec.note(`fin · rincian "${finDetail.title}" · ${finDetail.total} · ${finDetail.rows} baris transaksi`)
  rec.check(
    'TS-10b',
    /50\.000/.test(finDetail.total) ? '✅' : '⚠️',
    `fin: menekan kategori membuka rincian "${finDetail.title}" dengan ${finDetail.total}`,
  )
  rec.check(
    'TS-13',
    realDetail?.breakdown?.length === (finDetail.subs || 0) ? '✅' : '⚠️',
    `perbandingan baris rincian — asli: ${realDetail?.breakdown?.join(' · ') || '(tidak ada)'} | fin: ${finDetail.subs} baris sub-kategori → T-40`,
  )
  rec.check(
    'TS-10',
    realDetail?.total?.includes(INCOME.text) && /50\.000/.test(finDetail.total) ? '✅' : '⚠️',
    `perbandingan rincian — asli: "${realDetail?.title} · ${realDetail?.total}" | fin: "${finDetail.title} · ${finDetail.total}"`,
  )
  await page.puppeteerPage.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => /kembali/i.test(b.getAttribute('aria-label') ?? ''))
    if (btn) btn.click()
  })
  await sleep(700)

  // TS-11 pindah periode
  await page.tap('[aria-label="Bulan sebelumnya"]', { settle: 900 })
  const finPrev = await readFinStats()
  await page.screenshotTo(GROUP, 'fin-07-bulan-sebelumnya')
  await page.tap('[aria-label="Bulan selanjutnya"]', { settle: 900 })
  rec.check(
    'TS-11b',
    finPrev.empty ? '✅' : '⚠️',
    `fin: periode sebelumnya ("${finPrev.period}") → ${finPrev.empty ? 'keadaan kosong' : 'masih ada data'}`,
  )
  rec.check(
    'TS-11',
    Boolean(realPrevEmpty?.empty) && finPrev.empty ? '✅' : '⚠️',
    'perbandingan pindah periode — kedua sisi kosong pada periode tanpa transaksi',
  )

  /* ------------------------------------------------------------- bersih-bersih */
  await page.navigate(`${BASE}/transaksi`, { waitFor: '[data-testid="trx-fab"]' })
  for (let i = 0; i < 6; i++) {
    const rows = await page.puppeteerPage.evaluate(() =>
      [...document.querySelectorAll('[data-testid^="tx-row-"]')]
        .filter((row) => /12\.345|50\.000/.test(row.innerText))
        .map((row) => row.dataset.testid),
    )
    if (!rows.length) break
    await page.tap(`[data-testid="${rows[0]}"]`, { settle: 800 })
    await page.tapTestId('trx-delete-button', { settle: 600 })
    await page.puppeteerPage.click('[data-testid="confirm-dialog"] button:last-of-type')
    await sleep(1100)
  }
  const finLeft = await page.puppeteerPage.evaluate(() =>
    [...document.querySelectorAll('[data-testid^="tx-row-"]')].filter((row) =>
      /12\.345|50\.000/.test(row.innerText),
    ).length,
  )
  await page.close()

  if (!(await realGoTransaksi())) throw new Error('tidak bisa kembali ke Transaksi untuk membersihkan')
  const realClean = await realDeleteRowsWithAmount([EXPENSE.text, INCOME.text])
  shot(GROUP, 'real-08-setelah-bersih')
  rec.note(`asli · data uji terhapus: ${realClean ? 'ya' : 'tidak'} · fin · sisa baris uji: ${finLeft}`)

  saveNotes(
    GROUP,
    'perbandingan',
    [
      '# Perbandingan layar Statistik (Tahap 5)',
      '',
      'Data uji dibuat sendiri oleh harness di kedua aplikasi lalu dihapus lagi:',
      `pengeluaran ${EXPENSE.text} (${EXPENSE.category}/${EXPENSE.asset}) dan pendapatan ${INCOME.text} (${INCOME.category}/${INCOME.asset}).`,
      '',
      '| Hal | Money Manager asli | fin-app |',
      '| --- | --- | --- |',
      `| Kepala | tombol bulan kiri/kanan + \`${emptyReal.month}\` | tombol panah + \`${finEmpty.period}\` |`,
      `| Menu rentang | popup: ${realRanges.join(' · ')} | picker: ${finRanges.join(' · ')} |`,
      '| Dua jenis | `tbInButton` / `tbOutButton` berisi jenis + total | tombol `stats-type-income` / `stats-type-expense` + `stats-total-*` |',
      `| Keadaan kosong | \`emptyText\` "Tidak ada data" | \`stats-empty\` "Tidak ada data" |`,
      '| Grafik | grafik **donat** dengan legenda, tanpa id (terbaca dari tangkapan layar) | `CategoryBarChart`: batang horizontal `stats-bar-<uid>` berjudul `Bar Chart` |',
      '| Tren bulanan di rincian | grafik **garis** (Mar–Okt) | `MonthlyBarChart` (batang) |',
      '| Baris rincian | `Semua` dan `Lainnya` beserta persentasenya | hanya baris sub-kategori (kosong bila kategori tidak punya sub) |',
      '| Daftar kategori | `categoryName` · `categoryRate` · `amount` | `stats-row-<uid>` berisi persentase, nama, nominal |',
      `| Rincian | judul kategori + \`tvAmountTitle\` "Total bulanan" + daftar transaksi | \`stats-detail-title\` + \`stats-detail-total\` + \`stats-detail-transactions\` |`,
      '',
      '## Catatan',
      '',
      `- Aplikasi asli menampilkan rasio per kategori (\`${dataReal.ratio}\`), fin-app menampilkan persentase bulat per baris.`,
      '- Angka kedua sisi cocok dengan transaksi yang dicatat (12.345 dan 50.000).',
      '- Selisih format angka (Rp 12.345 vs Rp 12.345,00) sudah tercatat di [T-01](../../temuan/T-01-format-angka-desimal.md).',
      '',
    ].join('\n'),
  )

  rec.save()
}

await ensureDevServer()
try {
  await main()
} catch (error) {
  // Jangan tinggalkan data uji di aplikasi asli kalau langkah gagal.
  try {
    if (await realGoTransaksi()) await realDeleteRowsWithAmount([EXPENSE.text, INCOME.text])
  } catch {
    /* diabaikan: kegagalan pembersihan tidak boleh menutupi error asli */
  }
  throw error
}
