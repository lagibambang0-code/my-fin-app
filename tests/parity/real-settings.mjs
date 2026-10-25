/**
 * Utilitas setelan aplikasi Money Manager asli.
 *
 * Dipakai untuk dua hal dalam pengujian paritas:
 *  1. Merekam konfigurasi aplikasi asli sebagai baseline (supaya perbandingan sah).
 *  2. Menyamakan konfigurasi tertentu dengan fin-app, mis. mata uang → IDR.
 *
 * Layar setelan asli punya resource-id semantik yang bisa diandalkan:
 *   itemTitle      = label baris
 *   itemValueTitle = nilai baris
 *   sectionText    = judul seksi
 *   titleName      = judul layar
 *   tVConfigGridBtn = tombol grid di layar "Lainnya"
 *
 * Contoh pakai:
 *   node tests/parity/real-settings.mjs --list
 *   node tests/parity/real-settings.mjs --set="Pengaturan mata uang utama=IDR"
 *   node tests/parity/real-settings.mjs "--probe=Pengaturan mata uang utama>Perubahan"
 *   node tests/parity/real-settings.mjs --survey
 */
import {
  BACK,
  MM_PACKAGE,
  dumpXml,
  ensureDevServer,
  expectForeground,
  findNode,
  isIconGlyph,
  label,
  launch,
  makeRecorder,
  parseNodes,
  realGoHome,
  saveNotes,
  saveDump,
  shot,
  sleep,
  swipe,
  tap,
  tapId,
} from './lib.mjs'

const args = process.argv.slice(2)
const setArg = args.find((a) => a.startsWith('--set='))
const probeArg = args.find((a) => a.startsWith('--probe='))
const surveyArg = args.includes('--survey')
const wantList = args.includes('--list') || (!setArg && !probeArg && !surveyArg)

const GROUP = 'TA00-persiapan'

/* ------------------------------------------------------------------ navigasi */

/** Buka layar "Lainnya" (grid) aplikasi asli. */
async function openLainnya() {
  launch(MM_PACKAGE)
  await expectForeground(MM_PACKAGE)
  await sleep(2500)
  // Kembali ke kerangka utama dulu: layar dalam tidak punya tab bawah.
  await realGoHome()
  tapId('MenuText01', { settle: 1200 }) // pastikan keluar dari layar dalam
  tapId('MenuText04', { settle: 1800 })
}

/** Buka submenu "Kelola pengaturan" dari grid "Lainnya". */
async function openKelolaPengaturan() {
  await openLainnya()
  const tile = findNode(parseNodes(dumpXml()), { id: 'tVConfigGridBtn', text: 'Kelola pengaturan' })
  if (!tile) throw new Error('tombol "Kelola pengaturan" tidak ditemukan di grid Lainnya')
  tap(tile.cx, tile.cy)
  await sleep(1500)
}

/* --------------------------------------------------------------- pembacaan */

const sameRow = (a, b, tol = 24) => Math.abs(a.cy - b.cy) <= tol

/** Baris setelan yang terlihat sekarang: label + nilai (bila ada). */
function readRows() {
  const nodes = parseNodes(dumpXml())
  const titles = nodes.filter((n) => n.id.endsWith('itemTitle') && n.bounds)
  const values = nodes.filter((n) => n.id.endsWith('itemValueTitle') && n.bounds)
  const sections = nodes.filter((n) => n.id.endsWith('sectionText'))
  return {
    title: label(nodes.find((n) => n.id.endsWith('titleName')) ?? null),
    sections: sections.map(label),
    rows: titles.map((t) => {
      const v = values.find((v) => sameRow(t, v))
      return { label: label(t), value: v ? label(v) : '', y: Math.round(t.cy) }
    }),
  }
}

/** Baca seluruh daftar setelan, digulir sampai habis, digabung tanpa duplikat. */
async function collectRows({ maxSwipe = 12 } = {}) {
  const seen = new Map()
  let title = ''
  let lastSignature = ''
  for (let i = 0; i < maxSwipe; i++) {
    const snap = readRows()
    title = snap.title || title
    for (const r of snap.rows) {
      if (!seen.has(r.label)) seen.set(r.label, r.value)
      else if (!seen.get(r.label) && r.value) seen.set(r.label, r.value)
    }
    const signature = snap.rows.map((r) => r.label).join('|')
    if (i > 0 && signature === lastSignature) break
    lastSignature = signature
    swipe(540, 1450, 540, 700, 300)
    await sleep(800)
  }
  return { title, rows: [...seen].map(([l, v]) => ({ label: l, value: v })) }
}

/* --------------------------------------------------------------- perubahan */

/**
 * Cari opsi di daftar yang bisa digulir (mis. daftar mata uang).
 * `wantValue` boleh kode saja ("IDR") dan akan cocok dengan "IDR - Indonesia (Rp)".
 */
async function findOption(wantValue, { maxSwipe = 40 } = {}) {
  const wanted = wantValue.toLowerCase()
  const matches = (l) => {
    const s = l.toLowerCase()
    return s === wanted || s.startsWith(`${wanted} `) || s.startsWith(`${wanted} -`) || s.startsWith(`${wanted}(`)
  }
  const seen = new Set()
  for (let i = 0; i < maxSwipe; i++) {
    const nodes = parseNodes(dumpXml())
    const hit = nodes.find((n) => n.bounds && matches(label(n)))
    if (hit) return hit

    // Tanda "sudah di dasar": menggulir tidak memunculkan label baru sama sekali.
    // (Tidak bisa memakai label terakhir daftar karena tab bawah & iklan ikut
    // terbaca dan selalu ada di posisi yang sama.)
    let added = 0
    for (const n of nodes) {
      const l = label(n)
      if (l.length > 2 && !seen.has(l)) {
        seen.add(l)
        added++
      }
    }
    if (i > 0 && added === 0) return null

    swipe(540, 1450, 540, 700, 300)
    await sleep(700)
  }
  return null
}

/**
 * Ubah setelan mengikuti rantai baris.
 *
 * Sebagian setelan punya layar detail: baris setelan → layar detail →
 * baris perantara (mis. "Perubahan") → daftar pilihan → "Menyimpan".
 * `via` adalah daftar label baris perantara yang harus ditekan berurutan.
 */
async function setSetting(labelText, wantValue, { via = [] } = {}) {
  const before = readRows().rows.find((r) => r.label === labelText)
  if (!before) throw new Error(`baris setelan tidak ditemukan: ${labelText}`)

  tap(500, before.y) // tap di tengah baris, bukan di tepi nilai
  await sleep(1600)

  for (const step of via) {
    // Langkah perantara bisa berupa baris setelan atau tombol (mis. "Perubahan"
    // di kanan atas layar detail), jadi dicari sebagai node biasa.
    const node = findNode(parseNodes(dumpXml()), { text: step })
    if (!node) {
      const visible = [...new Set(parseNodes(dumpXml()).map(label).filter((l) => l && l.length < 44))]
      throw new Error(`langkah perantara "${step}" tidak ada. Terlihat: ${visible.join(' · ')}`)
    }
    tap(node.cx, node.cy)
    await sleep(1600)
  }

  const option = await findOption(wantValue)
  if (!option) {
    const visible = [...new Set(parseNodes(dumpXml()).map(label).filter((l) => l && l.length < 44))]
    saveDump(GROUP, `real-picker-${labelText.replace(/\s+/g, '-').toLowerCase()}`, dumpXml())
    throw new Error(`opsi "${wantValue}" tidak ada. Terlihat: ${visible.join(' · ')}`)
  }
  tap(option.cx, option.cy)
  await sleep(1500)

  // Setelah memilih opsi, aplikasi bisa menampilkan beberapa konfirmasi
  // berurutan. Mengubah mata uang contohnya: "Simpan data" dulu, lalu
  // pemberitahuan "Apakah Anda yakin ingin mengubah mata uang?" → "YA".
  // "TIDAK" sengaja tidak ada dalam daftar.
  for (let step = 0; step < 4; step++) {
    const nodes = parseNodes(dumpXml())
    const btn = ['Simpan data', 'Menyimpan', 'YA']
      .map((t) => findNode(nodes, { text: t, exact: true }))
      .find(Boolean)
    if (!btn) break
    tap(btn.cx, btn.cy)
    await sleep(2200)
  }

  // Kembali ke daftar setelan untuk membaca ulang nilainya. Setelah "Menyimpan"
  // aplikasi kadang mendarat di grid "Lainnya", jadi layar setelan dibuka ulang.
  await openKelolaPengaturan()
  const after = readRows().rows.find((r) => r.label === labelText)
  return {
    label: labelText,
    before: before.value,
    after: after ? after.value : '(tidak terbaca)',
    chosen: label(option),
  }
}

/* ------------------------------------------------------------------ survei */

/**
 * Survei seluruh baris setelan: buka satu per satu, potret layarnya
 * (screenshot + dump), catat pilihan yang ditawarkan, lalu tutup lagi.
 *
 * Ini yang membuat PRD bisa berbasis bukti: tanpa survei, yang diketahui
 * hanyalah *nama* setelannya, bukan perilaku, opsi, atau nilai defaultnya.
 */
const SURVEY_GROUP = 'TA01b-setelan-asli'

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[()/]/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** Gulir daftar setelan sampai baris `labelText` terlihat. */
async function findRowWithScroll(labelText, { maxSwipe = 10 } = {}) {
  for (let i = 0; i < maxSwipe; i++) {
    const row = readRows().rows.find((r) => r.label === labelText)
    if (row) return row
    swipe(540, 1450, 540, 700, 300)
    await sleep(800)
  }
  return null
}

/** Kembali ke daftar setelan (layar dalam tidak punya daftar itemTitle). */
async function backToSettingsList({ max = 5 } = {}) {
  for (let i = 0; i < max; i++) {
    if (readRows().rows.length) return true
    BACK()
    await sleep(1300)
  }
  return false
}

async function surveySettings() {
  await openKelolaPengaturan()
  const baseline = (await collectRows()).rows
  const results = []
  for (const { label: labelText, value } of baseline) {
    await openKelolaPengaturan()
    const row = await findRowWithScroll(labelText)
    if (!row) {
      results.push({ label: labelText, value, found: false })
      continue
    }
    tap(500, row.y)
    await sleep(1700)

    const xml = dumpXml()
    const nodes = parseNodes(xml)
    const title = label(findNode(nodes, { id: 'titleName' }) ?? {}) || ''
    const texts = [...new Set(nodes.map(label).filter((l) => l && !isIconGlyph(l)))]
    const dialogButtons = ['Batalkan', 'Batal', 'TIDAK', 'YA'].filter((t) =>
      findNode(nodes, { text: t, exact: true }),
    )
    const isDialog = dialogButtons.length > 0
    const slug = slugify(labelText)
    saveDump(SURVEY_GROUP, `real-${slug}`, xml)
    shot(SURVEY_GROUP, `real-${slug}`)

    results.push({ label: labelText, value, found: true, title, isDialog, dialogButtons, texts, slug })

    if (isDialog) {
      const cancel =
        findNode(nodes, { text: 'Batalkan', exact: true }) ?? findNode(nodes, { text: 'Batal', exact: true })
      if (cancel) {
        tap(cancel.cx, cancel.cy)
        await sleep(1000)
      }
    }
    await backToSettingsList()
  }
  return { baseline, results }
}

/* -------------------------------------------------------------------- main */

await ensureDevServer()
const rec = makeRecorder(GROUP, 'Konfigurasi aplikasi Money Manager asli', 'Direkam dari device')

if (wantList) {
  await openKelolaPengaturan()
  const collected = await collectRows()
  rec.note(`Judul layar: ${collected.title}`)
  const lines = collected.rows.map((r) => (r.value ? `${r.label} = ${r.value}` : r.label))
  saveNotes(GROUP, 'real-settings', lines.join('\n'))
  for (const l of lines) rec.note(l)
}

if (probeArg) {
  const chain = probeArg
    .slice('--probe='.length)
    .split('>')
    .map((s) => s.trim())
    .filter(Boolean)
  await openKelolaPengaturan()
  for (const step of chain) {
    const nodes = parseNodes(dumpXml())
    const node = findNode(nodes, { text: step })
    if (!node) {
      const visible = [...new Set(nodes.map(label).filter((l) => l && l.length < 44))]
      throw new Error(`"${step}" tidak ditemukan. Terlihat: ${visible.join(' · ')}`)
    }
    tap(node.cx, node.cy)
    await sleep(1600)
  }
  const xml = dumpXml()
  const slug = chain[chain.length - 1].replace(/\s+/g, '-').toLowerCase()
  saveDump(GROUP, `real-probe-${slug}`, xml)
  const visible = [...new Set(parseNodes(xml).map(label).filter((l) => l && l.length < 60))]
  rec.note(`Probe [${chain.join(' > ')}] — ${visible.length} label:`)
  for (const l of visible) rec.note(`  ${l}`)
}

if (setArg) {
  const spec = setArg.slice('--set='.length)
  const eq = spec.lastIndexOf('=')
  const chain = spec.slice(0, eq).split('>').map((s) => s.trim()).filter(Boolean)
  const labelText = chain[0]
  const via = chain.slice(1)
  const wantValue = spec.slice(eq + 1)
  await openKelolaPengaturan()
  const result = await setSetting(labelText, wantValue, { via })
  rec.note(`Diubah: ${result.label} — "${result.before}" → "${result.after}" (dipilih: ${result.chosen})`)
  rec.check(
    'CFG-01',
    result.after.toLowerCase().includes(wantValue.toLowerCase()) ? '✅' : '❌',
    `${result.label}: ${result.before} → ${result.after}`,
  )
}

if (surveyArg) {
  const { baseline, results } = await surveySettings()
  const lines = ['# Survei setelan Money Manager asli', '', 'Dibuka satu per satu dari "Kelola pengaturan".', '']
  for (const r of results) {
    if (!r.found) {
      lines.push(`## ${r.label}`, '', '_baris tidak ditemukan (tidak terlihat setelah digulir)_', '')
      continue
    }
    lines.push(
      `## ${r.label}`,
      '',
      `- Nilai saat disurvei: \`${r.value || '(kosong)'}\``,
      `- Jenis layar: **${r.isDialog ? 'dialog' : 'halaman'}**`,
      `- Judul layar: \`${r.title || '(tidak ada)'}\``,
      r.dialogButtons.length ? `- Tombol dialog: ${r.dialogButtons.map((b) => `\`${b}\``).join(', ')}` : '',
      '',
      'Isi layar:',
      '',
      '```',
      ...r.texts,
      '```',
      '',
    )
  }
  saveNotes(SURVEY_GROUP, 'survei', lines.filter((l) => l !== '').join('\n'))
  rec.note(`Survei ${results.length} baris setelan → ${SURVEY_GROUP}/survei.md`)

  // Pastikan survei tidak mengubah apa pun.
  await openKelolaPengaturan()
  const after = (await collectRows()).rows
  const beforeMap = new Map(baseline.map((r) => [r.label, r.value]))
  const changed = after.filter((r) => beforeMap.has(r.label) && beforeMap.get(r.label) !== r.value)
  rec.check(
    'CFG-02',
    changed.length === 0 ? '✅' : '❌',
    changed.length
      ? `setelan berubah saat survei: ${changed.map((c) => `${c.label} ${beforeMap.get(c.label)} → ${c.value}`).join(' · ')}`
      : 'semua setelan tetap sama setelah survei',
  )
}

rec.save()
