/**
 * Helper bersama untuk pengujian paritas Money Manager asli <-> fin-app.
 *
 * Ada dua sisi yang dijembatani berkas ini:
 *  - "real" : aplikasi Android `com.realbyteapps.moneymanagerfree` di device,
 *             dikendalikan lewat adb (uiautomator dump + input tap/swipe/text).
 *  - "fin"  : aplikasi fin-app, dibuka di Chrome device dan dikendalikan lewat
 *             Chrome DevTools Protocol (port forward ke localabstract).
 *
 * Semua artefak bukti ditulis ke test-results/parity/ (di-.gitignore).
 */
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export const SERIAL = process.env.ANDROID_SERIAL ?? '127.0.0.1:5555'
export const BASE = process.env.FIN_BASE ?? 'http://localhost:3000'
export const CDP_PORT = Number(process.env.PARITY_CDP_PORT ?? 9223)
export const OUT = process.env.PARITY_OUT ?? 'test-results/parity'

export const MM_PACKAGE = 'com.realbyteapps.moneymanagerfree'
export const CHROME_PACKAGE = 'com.android.chrome'

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)

/* ------------------------------------------------------------------ adb */

export function adb(args, { binary = false, timeout = 45_000 } = {}) {
  return execFileSync('adb', ['-s', SERIAL, ...args], {
    encoding: binary ? 'buffer' : 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout,
    stdio: ['ignore', binary ? 'pipe' : 'pipe', 'pipe'],
  })
}

export const shell = (cmd) => adb(['shell', cmd])
export const tap = (x, y) =>
  shell(`input tap ${Math.round(x)} ${Math.round(y)}`)
export const swipe = (x1, y1, x2, y2, ms = 300) =>
  shell(`input swipe ${Math.round(x1)} ${Math.round(y1)} ${Math.round(x2)} ${Math.round(y2)} ${ms}`)
/** `input text` tidak bisa mengirim spasi mentah; spasi dikirim sebagai %s. */
export const inputText = (s) => shell(`input text '${String(s).replace(/ /g, '%s')}'`)
export const keyevent = (code) => shell(`input keyevent ${code}`)
export const BACK = () => keyevent(4)
export const ENTER = () => keyevent(66)

/** Aktivitas yang sedang di depan, mis. "com.android.chrome/...ChromeTabbedActivity". */
export function foreground() {
  const out = shell('dumpsys activity activities')
  const m = /topResumedActivity=ActivityRecord\{[^}]*?\s([\w.]+)\/([\w.$]+)/.exec(out)
  return m ? `${m[1]}/${m[2]}` : null
}

export async function expectForeground(pkg, { tries = 12, gap = 500 } = {}) {
  for (let i = 0; i < tries; i++) {
    const fg = foreground()
    if (fg && fg.startsWith(pkg)) return fg
    await sleep(gap)
  }
  throw new Error(`foreground bukan ${pkg}, melainkan ${foreground()}`)
}

export function launch(pkg) {
  // `monkey` kadang tidak kembali di device yang lambat, jadi waktunya dibatasi.
  // Bila gagal, pakai aktivitas peluncur yang dilaporkan sistem.
  try {
    adb(['shell', `monkey -p ${pkg} -c android.intent.category.LAUNCHER 1`], { timeout: 8000 })
  } catch {
    const activity = launcherActivity(pkg)
    if (activity.includes('/')) {
      adb(['shell', `am start -n ${activity}`], { timeout: 20000 })
    }
  }
  sleepSync(2000)
  dismissAd()
}

/** Penanda aktivitas iklan penuh layar yang mencuri fokus dari aplikasi uji. */
const AD_MARKERS = ['ironsource', 'ControllerActivity', 'AdActivity', 'ads.controller']

/** Jendela yang sedang menerima fokus, mis. "com.pkg/com.pkg.MainActivity". */
export function currentFocus() {
  try {
    const out = shell('dumpsys window')
    return (/mCurrentFocus=([^\n]*)/.exec(out)?.[1] ?? '').trim()
  } catch {
    return ''
  }
}

/**
 * Tutup iklan penuh layar (mis. IronSource) yang bisa muncul saat aplikasi
 * diluncurkan. Iklan mencuri fokus sehingga tap berikutnya tidak sampai ke
 * aplikasi, dan hal itu pernah membuat tahap gagal secara acak.
 */
export function dismissAd({ tries = 3 } = {}) {
  let dismissed = false
  for (let i = 0; i < tries; i++) {
    const focus = currentFocus()
    if (!AD_MARKERS.some((m) => focus.includes(m))) return dismissed
    BACK()
    sleepSync(1400)
    dismissed = true
  }
  return dismissed
}

const launcherCache = new Map()

/** Aktivitas peluncur sebuah paket, mis. "com.pkg/.MainActivity". */
function launcherActivity(pkg) {
  if (launcherCache.has(pkg)) return launcherCache.get(pkg)
  let line = ''
  try {
    const out = adb(['shell', `cmd package resolve-activity --brief ${pkg}`], { timeout: 20000 })
    line = out.trim().split('\n').pop().trim()
  } catch {
    line = ''
  }
  launcherCache.set(pkg, line)
  return line
}

/**
 * Matikan paksa sebuah paket. Chrome terlihat pernah macet di IntentDispatcher
 * (aktivitas transparan) sehingga layar tetap menampilkan aplikasi sebelumnya
 * dan endpoint CDP tidak menjawab; force-stop adalah jalan keluarnya.
 */
export function forceStop(pkg) {
  shell(`am force-stop ${pkg}`)
}

export function openUrl(url, pkg = CHROME_PACKAGE) {
  shell(`am start -a android.intent.action.VIEW -d "${url}" ${pkg}`)
}

/**
 * Selesaikan layar first-run Chrome (Terms → "No thanks" sinkronisasi →
 * "No thanks" notifikasi).
 *
 * Penting: selama first-run belum selesai, intent VIEW ke sebuah URL membuat
 * Chrome menggantung di aktivitas transparan `IntentDispatcher` dan socket
 * `chrome_devtools_remote` tidak pernah dibuat.
 */
export async function completeChromeFirstRun({ maxSteps = 8 } = {}) {
  launch(CHROME_PACKAGE)
  await sleep(4000)
  for (let i = 0; i < maxSteps; i++) {
    const nodes = parseNodes(dumpXml())
    const accept = findNode(nodes, { text: 'Accept & continue' })
    const skip = findNode(nodes, { text: 'No thanks' })
    const target = accept ?? skip
    if (!target) break
    tap(target.cx, target.cy)
    await sleep(3000)
  }
}

/**
 * Restart Chrome dengan bersih lalu buka satu URL.
 *
 * Urutannya penting: first-run harus selesai dulu, baru intent VIEW dipakai.
 * Kalau tidak, Chrome macet di IntentDispatcher dan CDP tidak pernah aktif.
 */
export async function restartChrome(url = BASE) {
  forceStop(CHROME_PACKAGE)
  await sleep(1500)
  await completeChromeFirstRun()
  openUrl(url)
  await expectForeground(CHROME_PACKAGE, { tries: 40, gap: 500 })
  await sleep(3000)
  return waitForCdp()
}

/**
 * Pastikan endpoint CDP hidup. Forward dibuat ulang setiap percobaan karena
 * `force-stop` menghapus abstract socket lama dan forward bisa tertinggal.
 */
export async function waitForCdp({ tries = 30, gap = 2000 } = {}) {
  let lastErr
  for (let i = 0; i < tries; i++) {
    try {
      adb(['forward', '--remove', `tcp:${CDP_PORT}`])
    } catch { /* belum ada, tidak masalah */ }
    try {
      adb(['forward', `tcp:${CDP_PORT}`, 'localabstract:chrome_devtools_remote'])
      const v = await cdpVersion()
      if (v?.Browser) return v
    } catch (err) {
      lastErr = err
    }
    await sleep(gap)
  }
  throw new Error(`CDP tidak siap: ${lastErr?.message ?? 'tidak ada respons'}`)
}

export const screenSize = () => {
  const m = /(\d+)x(\d+)/.exec(shell('wm size'))
  return m ? { width: +m[1], height: +m[2] } : null
}

/* --------------------------------------------------- uiautomator (real) */

export const DUMP_REMOTE = '/sdcard/parity-window.xml'

/** Dump hierarki UI dan kembalikan XML mentah. Diulang bila dump belum siap. */
export function dumpXml({ remote = DUMP_REMOTE, tries = 6 } = {}) {
  let xml = ''
  // `uiautomator dump` sesekali dimatikan sistem (keluar kode 137) saat hierarki
  // layar membesar — mis. daftar kategori + iklan. Yang dimatikan bisa versi biasa
  // maupun --compressed, jadi keduanya dicoba bergantian.
  const variants = ['--compressed ', '', '--compressed ', '']
  for (let i = 0; i < tries; i++) {
    try {
      shell(`uiautomator dump ${variants[i % variants.length]}${remote}`)
      xml = adb(['shell', 'cat', remote])
      if (xml.includes('<hierarchy')) return xml
    } catch {
      /* dump sesekali gagal saat UI beranimasi; coba lagi */
    }
    sleepSync(600)
  }
  throw new Error('uiautomator dump gagal')
}

const unescapeXml = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#10;/g, '\n')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')

/** Ubah XML dump menjadi daftar node dengan bounds + titik tengah. */
export function parseNodes(xml) {
  const nodes = []
  for (const m of xml.matchAll(/<node\b[^>]*?\/?>/g)) {
    const tag = m[0]
    const attr = (name) => {
      const r = new RegExp(`\\s${name}="([^"]*)"`).exec(tag)
      return r ? unescapeXml(r[1]) : ''
    }
    const bb = /\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]/.exec(attr('bounds'))
    const bounds = bb
      ? { x1: +bb[1], y1: +bb[2], x2: +bb[3], y2: +bb[4] }
      : null
    nodes.push({
      text: attr('text'),
      desc: attr('content-desc'),
      id: attr('resource-id'),
      cls: attr('class'),
      pkg: attr('package'),
      clickable: attr('clickable') === 'true',
      longClickable: attr('long-clickable') === 'true',
      scrollable: attr('scrollable') === 'true',
      checkable: attr('checkable') === 'true',
      checked: attr('checked') === 'true',
      selected: attr('selected') === 'true',
      enabled: attr('enabled') === 'true',
      bounds,
      cx: bounds ? (bounds.x1 + bounds.x2) / 2 : null,
      cy: bounds ? (bounds.y1 + bounds.y2) / 2 : null,
    })
  }
  return nodes
}

/**
 * Cari node. `id` boleh berupa potongan (mis. "addFab" untuk
 * "com.realbyteapps.moneymanagerfree:id/addFab").
 */
export function findNodes(nodes, { text, id, desc, cls, regex, exact = false, clickable } = {}) {
  return nodes.filter((n) => {
    if (id && !n.id.endsWith(id)) return false
    if (cls && !n.cls.endsWith(cls)) return false
    if (typeof clickable === 'boolean' && n.clickable !== clickable) return false
    if (desc !== undefined) {
      const ok = exact ? n.desc === desc : n.desc.includes(desc)
      if (!ok) return false
    }
    if (text !== undefined) {
      const ok = exact ? n.text === text : n.text.includes(text)
      if (!ok) return false
    }
    if (regex && !regex.test(n.text)) return false
    return true
  })
}

export const findNode = (nodes, q) => findNodes(nodes, q)[0] ?? null

/** Label yang ditampilkan sebuah node (text, jika kosong pakai content-desc). */
export const label = (n) => (n?.text || n?.desc || '').trim()

/** Node ikon font (private use area) — bukan teks yang berarti. */
export const isIconGlyph = (s) => !s || /^[\uE000-\uF8FF]+$/.test(s)

/** Node berlabel yang bukan ikon, unik, urut kemunculan. */
export function textNodes(nodes) {
  const out = []
  for (const n of nodes) {
    const l = label(n)
    if (l && !isIconGlyph(l) && !out.includes(l)) out.push(l)
  }
  return out
}

/**
 * Baris setelan aplikasi asli.
 *
 * Layar setelan memakai id semantik: `itemTitle` untuk label baris dan
 * `itemValueTitle` untuk nilainya. Memasangkannya berdasarkan kedekatan
 * vertikal jauh lebih akurat daripada menebak dari teks mentah — inilah
 * perbaikan yang menghilangkan salah hitung "34 item hanya di asli".
 */
export function settingRows(nodes) {
  const titles = nodes.filter((n) => n.id.endsWith('itemTitle') && n.bounds)
  const values = nodes.filter((n) => n.id.endsWith('itemValueTitle') && n.bounds)
  return titles.map((t) => {
    const v = values.find((v) => Math.abs(v.cy - t.cy) <= 24)
    return { label: label(t), value: v ? label(v) : '', y: Math.round(t.cy) }
  })
}

/**
 * Baca sebuah layar aplikasi asli lewat resource-id semantiknya.
 *
 * Selain id umum di atas, aplikasi asli memakai:
 *   tVConfigGridBtn  = tombol grid di layar "Lainnya"
 *   sectionText      = judul seksi
 *   MenuText01..04   = tab bawah
 *   native_ad_* / getFullVersionBtn / mys-* = iklan versi gratis
 */
export function readRealScreen(xml) {
  const nodes = parseNodes(xml)
  return {
    title: label(findNode(nodes, { id: 'titleName' }) ?? {}) || '',
    sections: nodes.filter((n) => n.id.endsWith('sectionText')).map(label).filter(Boolean),
    settings: settingRows(nodes),
    tiles: nodes.filter((n) => n.id.endsWith('tVConfigGridBtn')).map(label).filter(Boolean),
    nav: nodes
      .filter((n) => /MenuText0\d$/.test(n.id) && n.bounds)
      .sort((a, b) => a.bounds.x1 - b.bounds.x1)
      .map(label),
    ads: [
      ...new Set(
        nodes
          .filter((n) => /native_ad_|getFullVersion|^mys-|adBanner/.test(n.id))
          .map(label)
          .filter(Boolean),
      ),
    ],
    text: textNodes(nodes),
  }
}

/** Tulis layar aplikasi asli sebagai bukti teks yang mudah dibaca. */
export function formatRealScreen(screen) {
  const lines = [`Judul: ${screen.title}`]
  if (screen.sections.length) lines.push(`Seksi: ${screen.sections.join(' · ')}`)
  if (screen.tiles.length) lines.push(`Grid: ${screen.tiles.join(' · ')}`)
  for (const r of screen.settings) lines.push(`  ${r.label}${r.value ? ` = ${r.value}` : ''}`)
  if (screen.nav.length) lines.push(`Tab bawah: ${screen.nav.join(' · ')}`)
  if (screen.ads.length) lines.push(`Iklan (diabaikan): ${screen.ads.join(' · ')}`)
  return lines.join('\n')
}

/**
 * Baca sebuah layar fin-app langsung dari DOM-nya.
 *
 * Ini pasangan `readRealScreen` untuk sisi fin. Di aplikasi asli struktur
 * dibaca dari resource-id semantik (itemTitle/itemValueTitle/tVConfigGridBtn);
 * padanannya di fin-app adalah peran ARIA dan data-testid yang sudah ada:
 *   [role="tablist"] [role="tab"]     = bilah sub-tab Transaksi
 *   nav[aria-label="Navigasi utama"]  = tab bawah
 *   h3                                = judul seksi
 *   a[data-testid^="settings-item-"]  = item menu "Lainnya"
 *
 * Yang diambil hanya *label*, bukan nilai — inilah yang membuat perbandingan
 * dengan sisi asli menjadi setara (sebelumnya nilai seperti "Aktif" atau
 * "USD ($)" ikut terhitung sebagai item menu).
 */
export async function readFinScreen(page) {
  return page.evaluate(`(() => {
    const txt = (el) => (el ? (el.textContent || '').trim() : '')
    const all = (sel) => [...document.querySelectorAll(sel)]
    const tablist = document.querySelector('[role="tablist"]')
    const nav = document.querySelector('nav[aria-label="Navigasi utama"]')
    return {
      title: txt(document.querySelector('h1')),
      sections: all('h3').map(txt),
      items: all('a[data-testid^="settings-item-"]').map((a) => ({
        label: txt(a),
        href: a.getAttribute('href'),
        testId: a.dataset.testid,
      })),
      subtabs: tablist ? all('[role="tablist"] [role="tab"]').map(txt) : [],
      nav: nav ? all('nav[aria-label="Navigasi utama"] a').map(txt) : [],
      testIds: all('[data-testid]').map((e) => e.dataset.testid),
    }
  })()`)
}

/* --------------------------------------------------- aksi sisi "real" */

/** Sekali dump, lalu jalankan beberapa aksi terhadap node yang sama. */
export function withScreen(fn) {
  const nodes = parseNodes(dumpXml())
  return fn({
    nodes,
    tap: (query, { settle = 1200 } = {}) => {
      const n = findNode(nodes, query)
      if (!n) throw new Error(`node tidak ditemukan: ${JSON.stringify(query)}`)
      tap(n.cx, n.cy)
      sleepSync(settle)
      return n
    },
    describe: () => nodes.filter((n) => label(n)).map((n) => `${label(n)} ${JSON.stringify(n.bounds)}`),
  })
}

export function tapId(id, { settle = 1200 } = {}) {
  const n = findNode(parseNodes(dumpXml()), { id })
  if (!n) throw new Error(`id tidak ditemukan: ${id}`)
  tap(n.cx, n.cy)
  sleepSync(settle)
  return n
}

/** Cocokkan node berdasarkan teks lalu tap. */
export function tapByText(text, { settle = 1200, ...q } = {}) {
  const n = findNode(parseNodes(dumpXml()), { text, ...q })
  if (!n) throw new Error(`teks tidak ditemukan: ${text}`)
  tap(n.cx, n.cy)
  sleepSync(settle)
  return n
}

/**
 * Kembalikan aplikasi asli ke kerangka utama (tab Transaksi / Harian).
 *
 * Layar dalam (mis. setelan mata uang) tidak punya tab bawah, dan bisa
 * menumpuk beberapa tingkat, jadi BACK ditekan berulang sampai `MenuText01`
 * muncul. Selalu dipakai di awal tiap tahap supaya pengujian tidak bergantung
 * pada layar yang kebetulan ditinggalkan tahap sebelumnya.
 */
export async function realGoHome({ maxBack = 8 } = {}) {
  for (let i = 0; i < maxBack; i++) {
    dismissAd()
    if (findNode(parseNodes(dumpXml()), { id: 'MenuText01' })) {
      tapId('MenuText01', { settle: 1200 })
      dismissAd()
      tapId('tbMainDayBtn1', { settle: 1200 })
      return true
    }
    BACK()
    await sleep(1200)
  }
  return false
}

export function existsText(text, q = {}) {
  return !!findNode(parseNodes(dumpXml()), { text, ...q })
}

export function assertText(text, q = {}) {
  const n = findNode(parseNodes(dumpXml()), { text, ...q })
  if (!n) throw new Error(`diharapkan ada teks "${text}"`)
  return n
}

/* ------------------------------------------------------------ tangkapan */

export function shot(group, name) {
  const dir = path.join(OUT, group)
  mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `${name}.png`)
  writeFileSync(file, adb(['exec-out', 'screencap', '-p'], { binary: true }))
  return file
}

/** Simpan XML dump sebagai bukti tekstual (untuk diff label antar aplikasi). */
export function saveDump(group, name, xml) {
  const dir = path.join(OUT, group)
  mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `${name}.xml`)
  writeFileSync(file, xml)
  return file
}

export function saveNotes(group, name, text) {
  const dir = path.join(OUT, group)
  mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `${name}.md`)
  writeFileSync(file, text)
  return file
}

/* --------------------------------------------------- dev server & CDP */

export async function isDevUp() {
  try {
    await fetch(BASE, { redirect: 'manual' })
    return true
  } catch {
    return false
  }
}

/** Hidupkan dev server bila belum jalan. Dikembalikan child prosesnya (atau null). */
export async function ensureDevServer({ timeoutMs = 90_000 } = {}) {
  if (await isDevUp()) return null
  const child = spawn('pnpm', ['dev'], { stdio: 'ignore', detached: true })
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (await isDevUp()) return child
    await sleep(500)
  }
  throw new Error('dev server tidak siap')
}

export function ensureCdPForward() {
  try {
    adb(['forward', `tcp:${CDP_PORT}`, 'localabstract:chrome_devtools_remote'])
  } catch (err) {
    const msg = String(err.stderr ?? err.message)
    if (!msg.includes('Address already in use')) throw err
    // Sudah ada forward lain di port ini — pastikan memang milik device kita.
    const list = adb(['forward', '--list'])
    if (!list.includes(`tcp:${CDP_PORT}`)) throw err
  }
}

export async function cdpVersion() {
  const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`, { signal: AbortSignal.timeout(6000) })
  return r.json()
}

/** Buka fin-app di Chrome device dan pastikan halamannya termuat. */
export async function openFinApp(route = '/transaksi') {
  ensureCdPForward()
  openUrl(`${BASE}${route}`)
  await sleep(6000)
}

async function pageTargets() {
  const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`, { signal: AbortSignal.timeout(6000) })
  return (await r.json()).filter((t) => t.type === 'page')
}

/**
 * Klien CDP minimal di atas WebSocket bawaan Node.
 *
 * `puppeteer.connect` tidak dipakai karena endpoint browser Chrome Android
 * tidak mengembalikan daftar target lewat `browser.pages()`; endpoint per-halaman
 * di http://127.0.0.1:9223/devtools/page/<id> justru lengkap.
 */
class Cdp {
  #ws
  #id = 0
  #pending = new Map()

  static async connect(url) {
    const ws = new WebSocket(url)
    await new Promise((res, rej) => {
      ws.addEventListener('open', res, { once: true })
      ws.addEventListener('error', () => rej(new Error(`gagal membuka ${url}`)), { once: true })
    })
    const cdp = new Cdp()
    cdp.#ws = ws
    ws.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data)
      const p = cdp.#pending.get(msg.id)
      if (!p) return
      cdp.#pending.delete(msg.id)
      msg.error ? p.rej(new Error(msg.error.message)) : p.res(msg.result)
    })
    return cdp
  }

  send(method, params = {}, { timeout = 15_000 } = {}) {
    return new Promise((res, rej) => {
      const id = ++this.#id
      const timer = setTimeout(() => {
        this.#pending.delete(id)
        rej(new Error(`CDP timeout (${timeout} ms) pada ${method}`))
      }, timeout)
      this.#pending.set(id, {
        res: (v) => { clearTimeout(timer); res(v) },
        rej: (e) => { clearTimeout(timer); rej(e) },
      })
      this.#ws.send(JSON.stringify({ id, method, params }))
    })
  }

  close() {
    try { this.#ws.close() } catch { /* diabaikan */ }
  }
}

async function evaluateOn(cdp, expression, { byValue = true } = {}) {
  const r = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: byValue,
    awaitPromise: true,
    userGesture: true,
  })
  if (r.exceptionDetails) {
    throw new Error(`evaluate gagal: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`)
  }
  return byValue ? r.result.value : r.result.objectId
}

const SEL = {
  testId: (id) => `[data-testid="${id}"]`,
  href: (h) => `a[href="${h}"]`,
}

/**
 * Sambung ke halaman fin-app di Chrome device lewat CDP.
 *
 * Catatan lapangan: dipakai hanya bila `FIN_DRIVER=device`. Chrome 109 di
 * device uji crash berulang (SIGTRAP/SIGABRT di proses utama), sehingga jalur
 * ini tidak dipakai sebagai default.
 */
export async function connectFinCdp({ route = '/transaksi', waitFor = '[data-testid]', tries = 30 } = {}) {
  ensureCdPForward()
  const host = new URL(BASE).host
  const wanted = `${BASE}${route}`
  let target = null
  for (let i = 0; i < tries; i++) {
    const pages = await pageTargets()
    target = pages.find((t) => t.url.includes(host))
    if (target) break
    await sleep(1000)
  }
  if (!target) throw new Error('halaman fin-app tidak ditemukan lewat CDP')
  if (!target.url.includes(route)) {
    // Halaman fin-app ada tetapi bukan rute yang diminta: pindah lewat CDP.
    await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(wanted)}`, { method: 'PUT' }).catch(() => {})
  }

  const cdp = await Cdp.connect(target.webSocketDebuggerUrl)
  await cdp.send('Runtime.enable')
  await cdp.send('Page.enable')

  const page = {
    cdp,
    target,
    evaluate: (expr, opts) => evaluateOn(cdp, expr, opts),
    close: () => cdp.close(),

    async waitFor(selector, { timeout = 20_000 } = {}) {
      const start = Date.now()
      while (Date.now() - start < timeout) {
        if (await evaluateOn(cdp, `!!document.querySelector(${JSON.stringify(selector)})`)) return true
        await sleep(250)
      }
      throw new Error(`timeout menunggu selector ${selector}`)
    },

    async waitForText(text, { timeout = 20_000, exact = false } = {}) {
      const start = Date.now()
      while (Date.now() - start < timeout) {
        const found = await evaluateOn(
          cdp,
          `(${JSON.stringify(text)}).length >= 0 && document.body.innerText${exact ? `.trim() === ${JSON.stringify(text)}` : `.includes(${JSON.stringify(text)})`}`,
        )
        if (found) return true
        await sleep(250)
      }
      throw new Error(`timeout menunggu teks ${JSON.stringify(text)}`)
    },

    metrics: () =>
      evaluateOn(
        cdp,
        '({innerWidth, innerHeight, dpr: devicePixelRatio, screenW: screen.width, screenH: screen.height})',
      ),

    bodyText: () => evaluateOn(cdp, 'document.body.innerText'),

    testIds: () =>
      evaluateOn(cdp, `[...document.querySelectorAll('[data-testid]')].map(e => e.dataset.testid)`),

    count: (selector) => evaluateOn(cdp, `document.querySelectorAll(${JSON.stringify(selector)}).length`),

    textOf: (selector) =>
      evaluateOn(cdp, `document.querySelector(${JSON.stringify(selector)})?.innerText ?? null`),

    /** Nilai yang sedang aktif pada form fin-app, dipakai untuk verifikasi. */
    valueOf: (selector) =>
      evaluateOn(cdp, `document.querySelector(${JSON.stringify(selector)})?.value ?? null`),

    /**
     * Tap elemen dengan event sentuh asli-ke-DOM (TouchEvent), jadi app melihat
     * pointerdown/pointerup seperti jari sungguhan. Untuk membuka keyboard sistem
     * tetap perlu tap layar lewat adb (lihat tapDeviceFor).
     */
    async tap(selector, { settle = 350 } = {}) {
      const ok = await evaluateOn(
        cdp,
        `(() => {
          const el = document.querySelector(${JSON.stringify(selector)})
          if (!el) return false
          el.scrollIntoView({ block: 'center', inline: 'center' })
          const r = el.getBoundingClientRect()
          if (r.width === 0 || r.height === 0) return false
          const x = r.left + r.width / 2, y = r.top + r.height / 2
          const mk = (type, list) => new TouchEvent(type, {
            bubbles: true, cancelable: true, composed: true,
            touches: list, targetTouches: list, changedTouches: list,
          })
          const touch = () => new Touch({ identifier: 1, target: el, clientX: x, clientY: y })
          const t = touch()
          el.dispatchEvent(mk('touchstart', [t]))
          el.dispatchEvent(mk('touchend', []))
          for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
            el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y }))
          }
          return true
        })()`,
      )
      if (!ok) throw new Error(`elemen tidak bisa di-tap: ${selector}`)
      await sleep(settle)
      return ok
    },

    tapTestId: (id, opts) => page.tap(SEL.testId(id), opts),
    tapHref: (href, opts) => page.tap(SEL.href(href), opts),

    /** Titik tengah elemen dalam koordinat CSS px (relatif viewport). */
    rectOf: (selector) =>
      evaluateOn(
        cdp,
        `(() => {
          const el = document.querySelector(${JSON.stringify(selector)})
          if (!el) return null
          el.scrollIntoView({ block: 'center', inline: 'center' })
          const r = el.getBoundingClientRect()
          return { x: r.left, y: r.top, w: r.width, h: r.height }
        })()`,
      ),

    async navigate(url, { waitFor = '[data-testid]', timeout = 30_000 } = {}) {
      await cdp.send('Page.navigate', { url })
      await page.waitFor(waitFor, { timeout })
    },

    async reload({ waitFor = '[data-testid]', timeout = 30_000 } = {}) {
      await cdp.send('Page.reload', { ignoreCache: false })
      await page.waitFor(waitFor, { timeout })
    },

    async screenshot({ format = 'png', timeout = 60_000 } = {}) {
      const r = await cdp.send('Page.captureScreenshot', { format, captureBeyondViewport: false }, { timeout })
      return Buffer.from(r.data, 'base64')
    },

    async screenshotTo(group, name) {
      const dir = path.join(OUT, group)
      mkdirSync(dir, { recursive: true })
      const file = path.join(dir, `${name}.png`)
      writeFileSync(file, await page.screenshot())
      return file
    },

    /** Bersihkan IndexedDB + localStorage lalu muat ulang fin-app dari nol. */
    async reset(routeTo = '/') {
      await evaluateOn(
        cdp,
        `(async () => {
          try {
            localStorage.clear(); sessionStorage.clear()
            const dbs = (await (indexedDB.databases?.() ?? [])) ?? []
            await Promise.all(dbs.map(d => d.name && new Promise(res => {
              const rq = indexedDB.deleteDatabase(d.name)
              rq.onsuccess = rq.onerror = rq.onblocked = () => res()
            })))
          } catch {}
          return true
        })()`,
      )
      await page.navigate(`${BASE}${routeTo}`)
    },
  }

  await page.waitFor(waitFor)
  return page
}

/**
 * Viewport fin-app yang dipakai driver desktop.
 *
 * 540×880 CSS px = ukuran yang persis diberikan Chrome device pada device uji
 * (1080×1920 px @320dpi, dikurangi status bar + address bar). Jadi layout yang
 * dirender identik dengan yang akan terlihat di HP.
 */
export const FIN_VIEWPORT = {
  width: Number(process.env.FIN_W ?? 540),
  height: Number(process.env.FIN_H ?? 880),
  deviceScaleFactor: Number(process.env.FIN_DPR ?? 2),
}

/**
 * Jalankan fin-app di Chrome desktop pada viewport yang sama dengan device.
 *
 * Dipakai sebagai default karena Chrome di device uji tidak stabil. API-nya
 * sengaja dibuat sama dengan `connectFinCdp` supaya skrip tahap tidak peduli
 * driver mana yang aktif.
 */
export async function connectFinDesktop({ route = '/transaksi', waitFor = '[data-testid]' } = {}) {
  const puppeteer = (await import('puppeteer')).default
  const browser = await puppeteer.launch({
    headless: process.env.FIN_HEADFUL !== '1',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })
  const page = await browser.newPage()
  await page.setViewport({ ...FIN_VIEWPORT, isMobile: true, hasTouch: true })
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector(waitFor, { timeout: 30_000 })
  // Indikator dev Next.js bukan bagian dari aplikasi; jangan sampai ikut dinilai.
  await page.addStyleTag({
    content: 'nextjs-portal,[data-nextjs-dev-tools-button],[data-nextjs-toast]{display:none!important}',
  })

  return {
    driver: 'desktop',
    puppeteerPage: page,
    version: () => browser.version(),

    evaluate: (expr) => page.evaluate(expr),

    close: () => browser.close(),

    async waitFor(selector, { timeout = 20_000 } = {}) {
      await page.waitForSelector(selector, { timeout })
      return true
    },

    async waitForText(text, { timeout = 20_000, exact = false } = {}) {
      await page.waitForFunction(
        (t, isExact) => (isExact ? document.body.innerText.trim() === t : document.body.innerText.includes(t)),
        { timeout },
        text,
        exact,
      )
      return true
    },

    metrics: () =>
      page.evaluate(() => ({
        innerWidth,
        innerHeight,
        dpr: devicePixelRatio,
        screenW: screen.width,
        screenH: screen.height,
      })),

    bodyText: () => page.evaluate(() => document.body.innerText),

    testIds: () => page.evaluate(() => [...document.querySelectorAll('[data-testid]')].map((e) => e.dataset.testid)),

    count: (selector) => page.$$eval(selector, (els) => els.length).catch(() => 0),

    textOf: (selector) => page.$eval(selector, (el) => el.innerText).catch(() => null),

    valueOf: (selector) => page.$eval(selector, (el) => el.value).catch(() => null),

    async tap(selector, { settle = 350 } = {}) {
      await page.waitForSelector(selector, { timeout: 10_000 })
      await page.$eval(selector, (el) => el.scrollIntoView({ block: 'center', inline: 'center' }))
      await page.click(selector)
      await sleep(settle)
      return true
    },

    rectOf: (selector) =>
      page.$eval(
        selector,
        (el) => {
          el.scrollIntoView({ block: 'center', inline: 'center' })
          const r = el.getBoundingClientRect()
          return { x: r.left, y: r.top, w: r.width, h: r.height }
        },
      ).catch(() => null),

    async navigate(url, { waitFor: w = '[data-testid]', timeout = 30_000 } = {}) {
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector(w, { timeout })
    },

    async reload({ waitFor: w = '[data-testid]', timeout = 30_000 } = {}) {
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForSelector(w, { timeout })
    },

    screenshot: () => page.screenshot({ type: 'png' }),

    async screenshotTo(group, name) {
      const dir = path.join(OUT, group)
      mkdirSync(dir, { recursive: true })
      const file = path.join(dir, `${name}.png`)
      writeFileSync(file, await page.screenshot({ type: 'png' }))
      return file
    },

    async reset(routeTo = '/') {
      await page.evaluate(async () => {
        try {
          localStorage.clear()
          sessionStorage.clear()
          const dbs = (await indexedDB.databases?.()) ?? []
          await Promise.all(
            dbs.map(
              (d) =>
                d.name &&
                new Promise((res) => {
                  const rq = indexedDB.deleteDatabase(d.name)
                  rq.onsuccess = rq.onerror = rq.onblocked = () => res()
                }),
            ),
          )
        } catch {
          /* diabaikan */
        }
        return true
      })
      await page.goto(`${BASE}${routeTo}`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('[data-testid]', { timeout: 30_000 })
    },
  }
}

/**
 * Ambil page fin-app dengan driver yang dipilih.
 * Default `desktop`; set `FIN_DRIVER=device` untuk memakai Chrome di device.
 */
export async function connectFinPage(opts = {}) {
  const driver = process.env.FIN_DRIVER ?? 'desktop'
  const page = driver === 'device' ? await connectFinCdp(opts) : await connectFinDesktop(opts)
  const taped = page.tap.bind(page)
  page.tapTestId = (id, o) => taped(SEL.testId(id), o)
  page.tapHref = (href, o) => taped(SEL.href(href), o)
  return page
}

/**
 * Peta koordinat CSS (viewport) -> piksel layar device.
 * Chrome Android menaruh konten web di bawah status bar + address bar,
 * jadi offset atas = (screen.height - innerHeight) dalam CSS px.
 */
export async function cssToDevice(page, { x, y }) {
  const m = await page.metrics()
  const offsetTopCss = m.screenH - m.innerHeight
  return { x: Math.round(x * m.dpr), y: Math.round((offsetTopCss + y) * m.dpr) }
}

/**
 * Tap lewat `adb input tap` pada posisi elemen di halaman.
 * Dipakai saat butuh gesture sungguhan (mis. memunculkan keyboard sistem).
 */
export async function tapDeviceFor(page, selector, { settle = 900 } = {}) {
  const rect = await page.rectOf(selector)
  if (!rect) throw new Error(`elemen tidak ada: ${selector}`)
  const pt = await cssToDevice(page, { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 })
  tap(pt.x, pt.y)
  await sleep(settle)
  return pt
}

export function requirePath(p) {
  if (!existsSync(p)) throw new Error(`berkas tidak ada: ${p}`)
  return p
}

/* --------------------------------------------------------------- laporan */

/** Pengumpul catatan + verdict per tahap; ditulis sebagai NOTES.md. */
export function makeRecorder(group, title, subtitle = '') {
  const notes = []
  const checks = []
  return {
    note(text) {
      notes.push(text)
      console.log(text)
    },
    check(id, verdict, detail = '') {
      checks.push({ id, verdict, detail })
      console.log(`  [${verdict}] ${id}${detail ? ` — ${detail}` : ''}`)
    },
    get checks() {
      return checks
    },
    save() {
      const dir = path.join(OUT, group)
      mkdirSync(dir, { recursive: true })
      const file = path.join(dir, 'NOTES.md')
      const lines = [
        `# ${title}`,
        '',
        subtitle && `_${subtitle}_`,
        '',
        `Dijalankan: ${new Date().toISOString()}`,
        '',
        '## Catatan jalannya pengujian',
        '',
        notes.length ? notes.map((n) => `- ${n}`).join('\n') : '_tidak ada catatan_',
        '',
        '## Verdict',
        '',
        '| ID | Verdict | Catatan |',
        '| --- | --- | --- |',
        ...checks.map((c) => `| ${c.id} | ${c.verdict} | ${c.detail.replace(/\|/g, '\\|')} |`),
        '',
      ]
      writeFileSync(file, lines.filter((l) => l !== undefined).join('\n'))
      return file
    },
  }
}
