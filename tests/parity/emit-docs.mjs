/**
 * Hasilkan dokumen paritas dari katalog temuan.
 *
 * Sumber : tests/parity/findings-1.data.mjs + findings-2.data.mjs
 * Keluaran:
 *   money-manager-clone/parity/TEMUAN.md
 *   money-manager-clone/parity/temuan/T-XX-<slug>.md
 *   money-manager-clone/parity/prd/PRD-P-NN-<slug>.md   (bila temuan punya detail PRD)
 *
 * Jalankan: node tests/parity/emit-docs.mjs
 *
 * Dokumen keluaran TIDAK untuk disunting manual — sunting katalognya, lalu
 * jalankan ulang berkas ini. Dengan begitu catatan revisi selalu sinkron.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { FINDINGS_1 } from './findings-1.data.mjs'
import { FINDINGS_2 } from './findings-2.data.mjs'

const ROOT = 'money-manager-clone/parity'
const TANGGAL = '24 Oktober 2026'
const VERSI = '1.8'

const APP_ASLI = 'com.realbyteapps.moneymanagerfree 4.12.14 (AD) — 1080×1920 @320dpi'
const APP_FIN = 'fin-app (Next.js) — Chrome 540×880 CSS px @dpr 2'

/** Keadaan padanan di fin-app. */
const FIN_STATUS = {
  'T-01': 'Tidak sesuai',
  'T-02': 'Berbeda struktur',
  'T-04': 'Tidak sesuai',
  'T-05': 'Tidak sesuai',
  'T-06': 'Belum ada',
  'T-09': 'Cacat (404)',
  'T-10': 'Tidak sesuai',
  'T-38': 'Tidak sesuai',
  'T-39': 'Berbeda struktur',
  'T-40': 'Sebagian',
  'T-41': 'Tidak sesuai',
  'T-42': 'Tidak sesuai',
  'T-43': 'Berbeda struktur',
  'T-44': 'Belum ada',
  'T-45': 'Belum ada',
  'T-46': 'Tidak sesuai',
  'T-47': 'Sebagian',
  'T-48': 'Berbeda interaksi',
  'T-11': 'Belum ada',
  'T-12': 'Belum ada',
  'T-13': 'Belum ada',
  'T-14': 'Belum ada',
  'T-15': 'Belum ada',
  'T-16': 'Sebagian',
  'T-17': 'Belum ada',
  'T-18': 'Belum ada',
  'T-19': 'Belum ada',
  'T-20': 'Belum ada',
  'T-21': 'Belum ada',
  'T-22': 'Belum ada',
  'T-23': 'Sebagian',
  'T-24': 'Belum ada (platform)',
  'T-25': 'Sebagian',
  'T-26': 'Belum ada (platform)',
  'T-27': 'Belum ada',
  'T-28': 'Belum ada',
  'T-29': 'Berbeda',
  'T-30': 'Berbeda',
  'T-31': 'Berbeda',
  'T-32': 'Tidak sesuai',
}

/**
 * Status fin-app untuk sebuah temuan. Temuan yang sudah diperbaiki menuliskan
 * tanggal perbaikannya pada kolom `selesai` di katalog temuan.
 */
const statusFin = (f) =>
  f.selesai
    ? `Sesuai sejak ${f.selesai}`
    : f.keputusan
      ? `Diputuskan ${f.keputusan.tanggal}: ${f.keputusan.hasil}`
      : (FIN_STATUS[f.id] ?? '❓')

/** Tahap paritas tempat temuan pertama kali terlihat. */
const TAHAP = {
  'T-01': 'Tahap 0 — Persiapan',
  'T-02': 'Tahap 1 — Kerangka',
  'T-04': 'Tahap 1 — Kerangka',
  'T-05': 'Tahap 1 — Kerangka',
  'T-09': 'Tahap 1 — Kerangka',
  'T-10': 'Tahap 1 — Kerangka',
  'T-33': 'Tahap 3 — Sub-kategori',
  'T-34': 'Tahap 3 — Sub-kategori',
  'T-35': 'Tahap 3 — Sub-kategori',
  'T-38': 'Tahap 5 — Statistik',
  'T-39': 'Tahap 5 — Statistik',
  'T-40': 'Tahap 5 — Statistik',
  'T-41': 'Tahap 6 — Aset',
  'T-42': 'Tahap 6 — Aset',
  'T-43': 'Tahap 6b — Cadangan',
  'T-44': 'Tahap 6b — Cadangan',
  'T-45': 'Tahap 6b — Cadangan',
  'T-46': 'Tahap 7 — Anggaran & Berulang',
  'T-47': 'Tahap 7 — Anggaran & Berulang',
  'T-48': 'Tahap 7 — Anggaran & Berulang',
}
const tahapOf = (id) => {
  if (TAHAP[id]) return TAHAP[id]
  if (id === 'T-23') return 'Tahap 1b — Survei setelan (diverifikasi ulang di Tahap 2 — Kategori)'
  const n = Number(id.slice(2))
  if (n >= 11 && n <= 28) return 'Tahap 1b — Survei setelan'
  if (n >= 29) return 'Tahap 2 — Kategori'
  return 'Tahap 0/1 — Persiapan & Kerangka'
}

const GLOSARIUM = [
  ['Money Manager (MM)', 'Aplikasi asli yang menjadi acuan, `com.realbyteapps.moneymanagerfree`.'],
  ['fin-app (Dompetku)', 'Aplikasi clone di repositori ini (Next.js + Dexie/IndexedDB).'],
  ['Hub setelan', 'Submenu "Kelola pengaturan" pada aplikasi asli yang menampung 24 baris setelan.'],
  ['Report temuan', 'Dokumen `temuan/T-XX-*.md` — catatan satu selisih yang teramati saat pengujian.'],
  ['PRD paritas', 'Dokumen `prd/PRD-P-NN-*.md` — panduan implementasi untuk satu temuan.'],
]

/* ------------------------------------------------------------------ helpers */

const all = [...FINDINGS_1, ...FINDINGS_2].sort(
  (a, b) => Number(a.id.slice(2)) - Number(b.id.slice(2)),
)

const link = (from, to) => path.posix.relative(from, to)

function buktiLink(fromDir, b) {
  const target = path.posix.join('bukti', b.group, b.file)
  return `[${b.file}](${link(fromDir, path.posix.join(ROOT, target))})`
}

function buktiTable(fromDir, bukti) {
  return [
    '| Berkas | Keterangan |',
    '| --- | --- |',
    ...bukti.map((b) => `| ${buktiLink(fromDir, b)} | ${b.cap} |`),
  ]
}

function prdLinkFor(f, fromDir) {
  if (!f.prd || !f.prdId) return null
  const file = `prd/${f.prdId}-${f.slug}.md`
  return `[${f.prdId}](${link(fromDir, path.posix.join(ROOT, file))})`
}

function temuanFile(f) {
  return `temuan/${f.id}-${f.slug}.md`
}

/* -------------------------------------------------------- report per temuan */

function renderTemuan(f) {
  const dir = path.posix.join(ROOT, 'temuan')
  const prd = prdLinkFor(f, dir)
  const out = []

  out.push(`# ${f.id} — ${f.title}`)
  out.push('')
  out.push(
    `> Report temuan paritas Money Manager ⇄ fin-app. ` +
      (prd ? `PRD: ${prd}. ` : '') +
      `Status di fin-app: **${statusFin(f)}**`,
  )
  out.push('>')
  out.push(
    `> Berkas ini dihasilkan otomatis dari \`tests/parity/findings-*.data.mjs\`. ` +
      `Jangan sunting langsung — sunting katalognya lalu jalankan \`node tests/parity/emit-docs.mjs\`.`,
  )
  out.push('')
  out.push('| | |')
  out.push('| --- | --- |')
  out.push(`| ID | ${f.id} |`)
  out.push(`| Kategori | ${f.kategori} |`)
  out.push(`| Prioritas | ${f.prioritas} |`)
  out.push(`| Pintu masuk (MM) | ${f.masuk} |`)
  out.push(`| Fitur induk | ${f.parent} |`)
  out.push(`| Aplikasi asli | ${APP_ASLI} |`)
  out.push(`| fin-app | ${APP_FIN} |`)
  out.push(`| Ditemukan pada | ${tahapOf(f.id)} (lihat [SKENARIO.md](../SKENARIO.md)) |`)
  out.push('')
  out.push('## 1. Ringkasan')
  out.push('')
  out.push(f.ringkas)
  out.push('')
  out.push('## 2. Perilaku aplikasi asli (Money Manager)')
  out.push('')
  out.push(...f.mm.map((t) => `- ${t}`))
  out.push('')
  out.push('## 3. Keadaan fin-app')
  out.push('')
  out.push(...f.fin.map((t) => `- ${t}`))
  out.push('')
  out.push('## 4. Dampak')
  out.push('')
  out.push(f.dampak)
  out.push('')
  out.push('## 5. Bukti')
  out.push('')
  out.push(...buktiTable(dir, f.bukti))
  out.push('')
  out.push('## 6. Tindak lanjut')
  out.push('')
  if (f.prd) {
    out.push(`- [x] PRD ditulis: ${prd}`)
  } else if (f.prdId) {
    out.push(`- [ ] PRD \`${f.prdId}\` belum ditulis (lihat urutan di [TEMUAN.md](../TEMUAN.md)).`)
  } else {
    out.push('- [ ] Tidak perlu PRD (cacat fin-app, bukan fitur Money Manager yang hilang).')
  }
  if (f.keputusan) {
    out.push(
      `- [x] Keputusan (${f.keputusan.tanggal}): **${f.keputusan.hasil}** — ${f.keputusan.alasan}`,
    )
  }
  if (f.selesai) {
    out.push(
      `- [x] Diverifikasi ulang setelah implementasi (${f.selesai})` +
        (f.selesaiCatatan ? `: ${f.selesaiCatatan}.` : '.'),
    )
  } else if (!f.keputusan) {
    out.push(`- [ ] Verifikasi ulang setelah implementasi: ulangi langkah pada [SKENARIO.md](../SKENARIO.md).`)
  }
  out.push('')
  return out.join('\n')
}

/* ----------------------------------------------------------- PRD per temuan */

function renderPRD(f) {
  const p = f.prd
  const dir = path.posix.join(ROOT, 'prd')
  const out = []
  const nomor = f.prdId.replace('PRD-P-', '')

  out.push(`# PRD P-${nomor}: ${f.title} — Money Manager Clone`)
  out.push('')
  out.push(`**Versi Dokumen:** ${VERSI}`)
  out.push(`**Tanggal:** ${TANGGAL}`)
  out.push(
    `**Status:** ${
      f.selesai
        ? `Diterapkan ${f.selesai}`
        : f.keputusan
          ? `Diputuskan — ${f.keputusan.hasil}`
          : 'Draft Analisis'
    }`,
  )
  out.push(`**Kategori:** ${f.kategori}`)
  out.push(`**Tingkat Prioritas:** ${f.prioritas}`)
  out.push(`**Parent Feature:** ${f.parent}`)
  out.push(`**Seri:** PRD Paritas (terpisah dari PRD-01…PRD-13)`)
  out.push(`**Report temuan:** [${f.id}](../temuan/${f.id}-${f.slug}.md)`)
  out.push('')
  out.push(
    '> **Catatan seri:** dokumen ini tidak menggantikan PRD-01…PRD-13. Ia ditulis dari ' +
      'pengujian paritas langsung terhadap aplikasi asli, dan sengaja dipisah agar revisinya ' +
      'bisa dilacak tanpa mengubah PRD lama.',
  )
  out.push('')
  out.push('## Riwayat Revisi')
  out.push('')
  out.push('| Versi | Tanggal | Perubahan | Status |')
  out.push('| --- | --- | --- | --- |')
  out.push(`| ${VERSI} | ${TANGGAL} | Dibuat dari hasil ${tahapOf(f.id)} (tangkapan layar kedua sisi) | Draft |`)
  out.push('')
  out.push('---')
  out.push('')
  out.push('## 1. OVERVIEW')
  out.push('')
  out.push('### 1.1 Deskripsi Fitur')
  out.push(p.deskripsi)
  out.push('')
  out.push('### 1.2 Tujuan')
  out.push(...p.tujuan.map((t) => `- ${t}`))
  out.push('')
  out.push('### 1.3 Target Pengguna')
  out.push('- Pengguna fin-app yang membandingkan aplikasinya dengan Money Manager.')
  out.push('- Pengguna yang membutuhkan perilaku ini agar catatannya sesuai kebiasaan.')
  out.push('')
  out.push('### 1.4 Alur Navigasi')
  out.push('```')
  out.push(p.alur)
  out.push('```')
  out.push('')
  out.push('---')
  out.push('')
  out.push('## 2. USER STORIES')
  out.push('')
  for (const prio of ['Tinggi', 'Medium', 'Rendah']) {
    const items = p.userStory.filter((u) => u.prio === prio)
    if (!items.length) continue
    out.push(`### 2.${['Tinggi', 'Medium', 'Rendah'].indexOf(prio) + 1} Prioritas ${prio}`)
    out.push('')
    for (const u of items) {
      out.push(`**Sebagai** ${u.role},`)
      out.push(`**Saya ingin** ${u.want},`)
      out.push(`**Agar** ${u.so}.`)
      out.push('')
    }
  }
  out.push('---')
  out.push('')
  out.push('## 3. FITUR & FUNGSIONALITAS')
  out.push('')
  out.push('### 3.1 Struktur Halaman')
  out.push(
    'Halaman ini terdiri dari: ' +
      p.subFitur.map((s) => `**${s.nama}**`).join(', ') +
      '. Rincian tata letak pada bagian 5.1.',
  )
  out.push('')
  out.push('### 3.2 Detail Sub-fitur')
  out.push('')
  p.subFitur.forEach((s, i) => {
    out.push(`#### **3.2.${i + 1} ${s.nama}**`)
    out.push(`- **Tipe:** ${s.tipe}`)
    out.push(`- **Fungsi:** ${s.fungsi}`)
    out.push(`- **Field/Opsi:** ${s.opsi}`)
    out.push(`- **Nilai default:** ${s.default}`)
    out.push(`- **Perilaku:** ${s.perilaku}`)
    out.push('')
  })
  out.push('---')
  out.push('')
  out.push('## 4. REQUIREMENTS')
  out.push('')
  out.push('### 4.1 Functional Requirements')
  for (const r of p.fr) {
    out.push(`#### **${r.id}**`)
    out.push(`- ${r.teks}`)
    out.push('')
  }
  out.push('### 4.2 Non-Functional Requirements')
  for (const r of p.nfr) {
    out.push(`#### **${r.id}**`)
    out.push(`- ${r.teks}`)
    out.push('')
  }
  out.push('---')
  out.push('')
  out.push('## 5. UI/UX SPECIFICATIONS')
  out.push('')
  out.push('### 5.1 Layout dan Struktur')
  out.push('```')
  out.push(p.struktur)
  out.push('```')
  out.push('')
  out.push('### 5.2 Interaksi dan Behavior')
  out.push('#### **5.2.1 Navigasi**')
  out.push(p.interaksi.navigasi)
  out.push('')
  out.push('#### **5.2.2 Penyimpanan**')
  out.push(p.interaksi.simpan)
  out.push('')
  out.push('#### **5.2.3 Validasi**')
  out.push(p.interaksi.validasi)
  out.push('')
  out.push('---')
  out.push('')
  out.push('## 6. DATA MODEL')
  out.push('')
  out.push('### 6.1 Entitas & Atribut Teramati (dari aplikasi asli)')
  out.push(...p.teramati.map((t) => `- ${t}`))
  out.push('')
  out.push('### 6.2 Usulan Skema (untuk implementasi clone)')
  out.push('> Bagian ini **rancangan** untuk clone, bukan klaim struktur internal app.')
  out.push('')
  out.push('```')
  out.push(p.skema)
  out.push('```')
  out.push('')
  out.push('### 6.3 Data Default')
  out.push(p.default)
  out.push('')
  out.push('### 6.4 Data Flow')
  out.push('```')
  out.push(p.alurData)
  out.push('```')
  out.push('')
  out.push('---')
  out.push('')
  out.push('## 7. ERROR HANDLING & EDGE CASES')
  out.push('')
  out.push('### 7.1 Skenario Error')
  out.push(...p.error.map((e) => `- **${e.id}** → ${e.teks}`))
  out.push('')
  out.push('### 7.2 Edge Cases')
  out.push(...p.edge.map((e) => `- **${e.id}** → ${e.teks}`))
  out.push('')
  out.push('---')
  out.push('')
  out.push('## 8. INTEGRATION POINTS')
  out.push('')
  out.push('### 8.1 Internal')
  out.push(...p.internal.map((x) => `- ${x.teks}`))
  out.push('')
  out.push('### 8.2 Eksternal')
  out.push(...p.eksternal.map((x) => `- ${x.teks}`))
  out.push('')
  out.push('---')
  out.push('')
  out.push('## 9. TESTING SCENARIOS')
  out.push(p.testing)
  out.push('')
  out.push('---')
  out.push('')
  out.push('## 11. SUCCESS METRICS')
  out.push(...p.metrics.map((m) => `- ${m.teks}`))
  out.push('')
  out.push('---')
  out.push('')
  out.push('## APPENDIX')
  out.push('')
  out.push('### A. Daftar Istilah')
  out.push(...GLOSARIUM.map(([k, v]) => `- **${k}** — ${v}`))
  out.push('')
  out.push('### B. Langkah Penggunaan (untuk perbandingan hasil clone)')
  out.push(`**${f.title}**`)
  out.push(`1. Buka aplikasi asli → ${f.masuk}.`)
  out.push(`2. Catat tampilan dan nilai yang terlihat (bukti: [report ${f.id}](../temuan/${f.id}-${f.slug}.md#5-bukti)).`)
  out.push('3. Buka fin-app pada jalur yang sama.')
  out.push(
    `4. Bandingkan terhadap requirement: ${p.fr
      .slice(0, 3)
      .map((r) => r.id)
      .join(', ')}.`,
  )
  out.push('')
  out.push('### C. Catatan Verifikasi')
  out.push(`**Terverifikasi langsung:**`)
  out.push(...p.verifikasi.ok.map((t) => `- ${t}`))
  out.push('')
  out.push(`**Belum terverifikasi (jangan dianggap fakta):**`)
  out.push(...p.verifikasi.belum.map((t) => `- ${t}`))
  out.push('')
  out.push('---')
  out.push('')
  out.push(`**Next / Previous Document:** seri PRD Paritas — lihat indeks di [TEMUAN.md](../TEMUAN.md).`)
  out.push('')
  return out.join('\n')
}

/* ------------------------------------------------------------- indeks TEMUAN */

function renderTemuanIndex() {
  const out = []
  out.push('# TEMUAN — Selisih Money Manager ↔ fin-app')
  out.push('')
  out.push(
    'Indeks seluruh selisih yang teramati selama pengujian paritas. Setiap baris menunjuk ke ' +
      'report temuan dan (bila sudah ditulis) PRD-nya.',
  )
  out.push('')
  out.push(`**Diperbarui:** ${TANGGAL} · **Versi indeks:** ${VERSI}`)
  out.push('')
  out.push('> Berkas ini dihasilkan otomatis. Sumbernya katalog di `tests/parity/findings-*.data.mjs`.')
  out.push('> Jalankan ulang dengan: `node tests/parity/emit-docs.mjs`')
  out.push('')
  out.push('## Cara membaca')
  out.push('')
  out.push('| Kolom | Arti |')
  out.push('| --- | --- |')
  out.push('| **Temuan** | Report per selisih: `temuan/T-XX-*.md` |')
  out.push('| **PRD** | Panduan implementasi: `prd/PRD-P-NN-*.md` (seri terpisah dari PRD-01…PRD-13) |')
  out.push('| **fin-app** | Keadaan padanan di fin-app saat ini |')
  out.push('| **PRD** | `Draft` = panduan sudah ditulis; `belum` = menunggu batch berikutnya |')
  out.push('')
  out.push('Status fin-app yang dipakai: `Belum ada`, `Sebagian`, `Tidak sesuai`, `Berbeda struktur`, `Cacat (404)`, `Belum ada (platform)`, `Diputuskan <tanggal>: <hasil>` untuk temuan yang arahnya sudah diputuskan tanpa perubahan penuh, dan `Sesuai sejak <tanggal>` untuk temuan yang sudah diperbaiki.')
  out.push('')
  out.push('> **Catatan penomoran.** Temuan T-03 pada versi awal laporan ternyata bukan satu temuan, ')
  out.push('> melainkan 18 setelan yang belum punya padanan. Temuan itu dipecah menjadi T-11…T-28 agar ')
  out.push('> tiap setelan bisa dikerjakan satu per satu. Nomor temuan lama (T-01, T-02, T-04, T-05, ')
  out.push('> T-06, T-09, T-10) sengaja dipertahankan supaya catatan lama tetap bisa dirujuk.')
  out.push('>')
  out.push('> **Koreksi pada versi 1.1.** T-23 versi 1.0 menyatakan saklar "Fungsi sub kategori" tidak ada di ')
  out.push('> fin-app. Setelah Tahap 2 (Kategori) dijalankan, ternyata saklar itu ada — yang berbeda hanya nilai ')
  out.push('> bawaannya (asli `Aktif`, fin `Mati`). T-23 sudah diperbaiki. Selisih lain yang muncul saat Tahap 2 ')
  out.push('> dicatat sebagai T-29…T-32.')
  out.push('>')
  out.push('> **Tambahan pada versi 1.2.** Setelah Tahap 3 (Sub-kategori): +3 temuan (T-33…T-35). Cakupan ')
  out.push('> T-29…T-31 diperluas ke daftar sub-kategori, karena pola sarana tindakan yang sama ternyata muncul ')
  out.push('> di sana (⊖/seret vs centang/↑↓). Sejak versi ini tabel "Setelan Money Manager tanpa padanan" ')
  out.push('> hanya memuat baris hub, tidak lagi ikut menarik temuan kategori yang pintu masuknya lebih dalam.')
  out.push('>')
  out.push('> **Perbaikan pada versi 1.3.** T-33, T-34, dan T-35 sudah dikerjakan di fin-app lalu diuji ulang: baris ')
  out.push('> kategori tetap berguna saat saklar sub-kategori dimatikan, kategori induk sub-kategori dapat diganti, dan ')
  out.push('> pintasan "Kategori utama" juga tersedia di mode tambah. Buktinya ada di ')
  out.push('> [bukti/TA03-subkategori/](bukti/TA03-subkategori/) dan pada uji UI `pnpm test:ui` (TC-SUB-E03…E05). ')
  out.push('> Sisa selisih pada Tahap 3 tinggal T-32 (label jumlah sub saat saklar mati).')
  out.push('>')
  out.push('> **Perbaikan pada versi 1.4.** T-32 dikerjakan: saat saklar "Fungsi sub kategori" mati, baris ')
  out.push('> kategori tidak lagi menampilkan angka jumlah sub maupun daftar nama sub. PRD-nya ditulis lebih ')
  out.push('> dulu ([PRD-P-28](prd/PRD-P-28-angka-sub-kategori-saat-mati.md)), lalu diuji ulang lewat ')
  out.push('> `pnpm test:ui` (TC-SUB-E05) dan uji paritas Tahap 3 (SK-07). Dengan begitu seluruh pemeriksaan ')
  out.push('> Tahap 3 kini ✅ (19 dari 19).')
  out.push('>')
  out.push('> **Keputusan pada versi 1.5.** Setelah Tahap 4 (Transaksi): T-36 diputuskan **dikerjakan sebagian** — ')
  out.push('> hanya tombol minus dan `Selesai` yang diikuti, kalkulator dan pintasan mata uang dilewati; T-37 ')
  out.push('> diputuskan **dipertahankan** — label "Hari ini"/"Kemarin" tetap dipakai karena dinilai lebih berguna ')
  out.push('> daripada nama hari. Keduanya dicatat sebagai keputusan, bukan cacat yang menunggu perbaikan.')
  out.push('')
  out.push('## Ringkasan')
  out.push('')
  out.push('| ID | Temuan | Kategori | Prioritas | fin-app | Report | PRD |')
  out.push('| --- | --- | --- | --- | --- | --- | --- |')
  for (const f of all) {
    const rep = `[${f.id}](${temuanFile(f)})`
    const prd = f.prd
      ? `[${f.prdId}](prd/${f.prdId}-${f.slug}.md)`
      : f.prdId
        ? `\`${f.prdId}\` belum`
        : '—'
    out.push(
      `| ${f.id} | ${f.title} | ${f.kategori} | ${f.prioritas} | ${statusFin(f)} | ${rep} | ${prd} |`,
    )
  }
  out.push('')
  const siap = all.filter((f) => f.prd).length
  out.push(`**Total ${all.length} temuan.** ${siap} sudah punya PRD.`)
  const sudah = all.filter((f) => f.selesai).length
  if (sudah) out.push(
    `${sudah} sudah diperbaiki di fin-app dan diverifikasi ulang ` +
      `(${all.filter((f) => f.selesai).map((f) => f.id).join(', ')}).`,
  )
  out.push('')
  out.push('## Setelan Money Manager tanpa padanan di fin-app')
  out.push('')
  out.push(
    'Hub "Kelola pengaturan" pada aplikasi asli berisi 24 baris. Sembilan belas di antaranya ' +
      'adalah setelan, dan 18 di antaranya belum sepenuhnya ada padanannya di fin-app:',
  )
  out.push('')
  out.push('| # | Setelan (aplikasi asli) | Nilai teramati | Temuan |')
  out.push('| --- | --- | --- | --- |')
  const values = {
    'T-06': 'Senin',
    'T-11': 'IDR (Rp)',
    'T-12': '$',
    'T-13': '1',
    'T-14': 'Harian',
    'T-15': 'Mati',
    'T-16': 'Ubah tanggal',
    'T-17': 'Bag.A',
    'T-18': 'Tidak ada, urutkan menurun',
    'T-19': 'Mati',
    'T-20': 'Aktif',
    'T-21': 'Dari jumlah',
    'T-22': 'Mati',
    'T-23': 'Aktif',
    'T-24': 'Mati',
    'T-25': 'Mode sistem',
    'T-26': '(widget)',
    'T-27': '(16 bahasa)',
    'T-28': 'Aktif',
  }
  // Daftar ini sengaja eksplisit: hanya baris setelan hub itu sendiri. Temuan lain
  // yang pintu masuknya juga berawal dari hub (kategori, sub-kategori) tidak ikut.
  const HUB_ROWS = ['T-06', ...Array.from({ length: 18 }, (_, i) => `T-${11 + i}`)]
  const hub = HUB_ROWS.map((id) => all.find((f) => f.id === id)).filter(Boolean)
  hub.forEach((f, i) => {
    out.push(
      `| ${i + 1} | ${f.masuk.split('→').pop().trim()} | ${values[f.id] ?? '—'} | [${f.id}](${temuanFile(f)}) |`,
    )
  })
  out.push('')
  out.push(
    'Tiga di antaranya **sebagian** sudah ada di fin-app sehingga selisihnya lebih sempit: ' +
      '[T-16](temuan/T-16-setelan-geser.md) (halaman geser ada, penamaan opsi berbeda), ' +
      '[T-23](temuan/T-23-setelan-fungsi-sub-kategori.md) (saklar sub kategori ada, nilai bawaan ' +
      'berbeda: asli `Aktif`, fin `Mati`), dan ' +
      '[T-25](temuan/T-25-setelan-gaya.md) (mode Terang/Gelap ada, `Mode sistem` tidak).',
  )
  out.push('')
  out.push('## Riwayat revisi')
  out.push('')
  out.push('| Versi | Tanggal | Perubahan |')
  out.push('| --- | --- | --- |')
  out.push(`| ${VERSI} | ${TANGGAL} | Setelah Tahap 6 (Aset): +2 temuan (T-41, T-42); PRD-P-36 ditulis; log tahap mulai memakai tabel \`Sisi asli | Sisi fin-app | Status\`. |`)
  out.push(`| 1.5 | ${TANGGAL} | Setelah Tahap 4 (Transaksi): +2 temuan (T-36, T-37); 21 PRD paritas (P-07…P-27) dilengkapi; seluruh temuan kini ber-PRD. |`)
  out.push(`| 1.4 | ${TANGGAL} | T-32 diperbaiki (label jumlah sub & daftar nama sub hanya saat saklar menyala); PRD-P-28 ditulis; seluruh pemeriksaan Tahap 3 kini ✅. |`)
  out.push(`| 1.3 | 18 Oktober 2026 | T-33…T-35 diperbaiki di fin-app dan diverifikasi ulang lewat uji paritas + uji UI; statusnya menjadi \`Sesuai sejak 18 Oktober 2026\`. |`)
  out.push(`| 1.2 | 18 Oktober 2026 | Setelah Tahap 3 (Sub-kategori): +3 temuan (T-33…T-35); cakupan T-29…T-31 diperluas ke daftar sub-kategori; tabel baris hub dibersihkan. |`)
  out.push(`| 1.1 | 18 Oktober 2026 | Setelah Tahap 2 (Kategori): +4 temuan (T-29…T-32); T-23 dikoreksi — saklar "Fungsi sub kategori" ternyata **ada** di fin-app, selisihnya nilai bawaan. |`)
  out.push(`| 1.0 | 18 Oktober 2026 | Rilis pertama: 25 temuan, 6 PRD (T-01, T-02, T-04, T-05, T-06, T-10). |`)
  out.push('')
  out.push('## Urutan pengerjaan PRD berikutnya')
  out.push('')
  const pending = all.filter((f) => f.prdId && !f.prd)
  if (pending.length) {
    pending.forEach((f, i) => {
      out.push(
        `${i + 1}. [${f.id}](${temuanFile(f)}) → \`${f.prdId}\` — ${f.title} (${statusFin(f)})`,
      )
    })
  } else {
    out.push('_(semua temuan sudah punya PRD)_')
  }
  out.push('')
  return out.join('\n')
}

/* -------------------------------------------------------------------- main */

mkdirSync(path.posix.join(ROOT, 'temuan'), { recursive: true })
mkdirSync(path.posix.join(ROOT, 'prd'), { recursive: true })

let reports = 0
let prds = 0
for (const f of all) {
  writeFileSync(path.posix.join(ROOT, temuanFile(f)), renderTemuan(f))
  reports++
  if (f.prd) {
    writeFileSync(path.posix.join(ROOT, `prd/${f.prdId}-${f.slug}.md`), renderPRD(f))
    prds++
  }
}
writeFileSync(path.posix.join(ROOT, 'TEMUAN.md'), renderTemuanIndex())

console.log(`  ${reports} report temuan → ${ROOT}/temuan/`)
console.log(`  ${prds} PRD            → ${ROOT}/prd/`)
console.log(`  indeks           → ${ROOT}/TEMUAN.md`)
console.log(`  (temuan tanpa PRD: ${all.filter((f) => f.prdId && !f.prd).length})`)
