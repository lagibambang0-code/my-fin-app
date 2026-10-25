/**
 * Publikasikan bukti paritas ke dalam repo.
 *
 * Sumber  : test-results/parity/<grup>/   (di-.gitignore: PNG 1080×1920, XML mentah)
 * Tujuan  : money-manager-clone/parity/bukti/<grup>/  (ikut ter-commit)
 *
 * Yang disalin:
 *  - screenshot (PNG) — diperkecil ke sisi terpanjang 720 px supaya markdown
 *    link yang ditulis di dokumen benar-benar bisa dibuka saat direview,
 *    tanpa membengkakkan repo
 *  - catatan teks (*.md) — apa adanya
 *
 * Yang TIDAK disalin: dump XML uiautomator. Isinya besar dan tidak enak dibaca
 * manusia; XML selalu bisa dibuat ulang dengan menjalankan ulang tahapnya.
 *
 * Jalankan: node tests/parity/publish-evidence.mjs [grup ...]
 */
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { OUT } from './lib.mjs'

const DEST_ROOT = 'money-manager-clone/parity/bukti'
const MAX_EDGE = Number(process.env.PARITY_EVIDENCE_EDGE ?? 720)

const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-'))
const groups = wanted.length
  ? wanted
  : readdirSync(OUT, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)

const human = (n) => (n / 1024).toFixed(0) + 'K'

let copied = 0
let bytes = 0
const manifest = []

for (const group of groups) {
  const src = path.join(OUT, group)
  if (!existsSync(src)) {
    console.warn(`  lewati ${group}: tidak ada di ${OUT}`)
    continue
  }
  const dest = path.join(DEST_ROOT, group)
  mkdirSync(dest, { recursive: true })

  for (const name of readdirSync(src).sort()) {
    const from = path.join(src, name)
    const to = path.join(dest, name)

    if (name.endsWith('.png')) {
      // `sips` bawaan macOS: -Z = batasi sisi terpanjang, mempertahankan rasio.
      execFileSync('sips', ['-Z', String(MAX_EDGE), from, '--out', to], { stdio: 'ignore' })
    } else if (name.endsWith('.md')) {
      cpSync(from, to)
    } else {
      continue // XML mentah sengaja tidak dipublikasikan
    }

    const size = statSync(to).size
    copied++
    bytes += size
    manifest.push({ group, name, size })
    console.log(`  ${group}/${name} → ${human(size)}`)
  }
}

const total = path.join(DEST_ROOT, 'UKURAN.md')
writeFileSync(
  total,
  [
    '# Ukuran bukti yang dipublikasikan',
    '',
    `Diperkecil ke sisi terpanjang ${MAX_EDGE} px (sips -Z). Tanggal: ${new Date().toISOString().slice(0, 10)}`,
    '',
    '| Grup | Berkas | Ukuran |',
    '| --- | --- | --- |',
    ...manifest.map((m) => `| ${m.group} | ${m.name} | ${human(m.size)} |`),
    '',
    `**Total: ${copied} berkas, ${(bytes / 1024 / 1024).toFixed(2)} MB**`,
    '',
  ].join('\n'),
)

console.log(`\n${copied} berkas (${(bytes / 1024 / 1024).toFixed(2)} MB) → ${DEST_ROOT}`)
