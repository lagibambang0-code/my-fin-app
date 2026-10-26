import type { Category, Transaction } from '@/lib/db'
import { MONTHS, shiftMonth, type MonthValue } from '@/lib/month'
import {
  addDays,
  formatDotRange,
  formatShortDate,
  fromIso,
  monthBounds,
  startOfWeek,
  toIso,
} from '@/lib/format'
import { amountOf } from '@/lib/transaction-utils'

/**
 * Tab Statistik (PRD-13) — pure aggregation helpers.
 *
 * The screen supports four range modes (Mingguan / Bulanan / Tahunan /
 * Periode) and two report kinds (Pendapatan / Pengeluaran). Transactions that
 * carry a sub-category are counted on their **parent** category (PRD-13 §E-04).
 */

export type StatsMode = 'weekly' | 'monthly' | 'yearly' | 'period'

export const STATS_MODES: { id: StatsMode; label: string }[] = [
  { id: 'weekly', label: 'Mingguan' },
  { id: 'monthly', label: 'Bulanan' },
  { id: 'yearly', label: 'Tahunan' },
  { id: 'period', label: 'Periode' },
]

export const STATS_MODE_LABEL: Record<StatsMode, string> = {
  weekly: 'Mingguan',
  monthly: 'Bulanan',
  yearly: 'Tahunan',
  period: 'Periode',
}

/** Adverb used by the drill-down total row: "Total bulanan", "Total tahunan"… */
export const STATS_MODE_NOUN: Record<StatsMode, string> = {
  weekly: 'mingguan',
  monthly: 'bulanan',
  yearly: 'tahunan',
  period: 'periode',
}

export type StatsState = {
  mode: StatsMode
  /** Anchor month for `monthly` and the anchor year for `yearly`. */
  anchor: MonthValue
  /** Monday of the selected week (`weekly`). */
  weekStart: string
  /** Custom range bounds (`period`), stored as `YYYY-MM-DD`. */
  from: string
  to: string
}

export function initialStatsState(date: Date = new Date()): StatsState {
  const anchor = { year: date.getFullYear(), month: date.getMonth() }
  const bounds = monthBounds(anchor.year, anchor.month)
  return {
    mode: 'monthly',
    anchor,
    weekStart: toIso(startOfWeek(date)),
    from: toIso(bounds.start),
    to: toIso(date),
  }
}

export type StatsRange = { from: string; to: string; label: string }

/** Inclusive `YYYY-MM-DD` bounds + header label for the active mode (PRD-13 §3.2.2). */
export function statsRange(state: StatsState): StatsRange {
  if (state.mode === 'weekly') {
    const start = fromIso(state.weekStart)
    return { from: toIso(start), to: toIso(addDays(start, 6)), label: formatDotRange(start, addDays(start, 6)) }
  }

  if (state.mode === 'yearly') {
    return {
      from: toIso(new Date(state.anchor.year, 0, 1)),
      to: toIso(new Date(state.anchor.year, 11, 31)),
      label: String(state.anchor.year),
    }
  }

  if (state.mode === 'period') {
    const [from, to] = state.from <= state.to ? [state.from, state.to] : [state.to, state.from]
    return { from, to, label: `${formatShortDate(from)} ~ ${formatShortDate(to)}` }
  }

  const bounds = monthBounds(state.anchor.year, state.anchor.month)
  return {
    from: toIso(bounds.start),
    to: toIso(bounds.end),
    label: `${MONTHS[state.anchor.month].short} ${state.anchor.year}`,
  }
}

/** Inclusive day count between two `YYYY-MM-DD` bounds. */
export function daySpan(from: string, to: string): number {
  const start = fromIso(from)
  const end = fromIso(to)
  const ms =
    Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) -
    Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  return Math.round(ms / 86_400_000) + 1
}

/**
 * Step the range ◀ / ▶. A custom `period` range has no natural neighbour, so it
 * slides by its own length (contiguous: no gap, no overlap).
 */
export function shiftStatsState(state: StatsState, delta: number): StatsState {
  if (state.mode === 'weekly') {
    return { ...state, weekStart: toIso(addDays(fromIso(state.weekStart), delta * 7)) }
  }
  if (state.mode === 'period') {
    const [from, to] = state.from <= state.to ? [state.from, state.to] : [state.to, state.from]
    const shift = delta * daySpan(from, to)
    return {
      ...state,
      from: toIso(addDays(fromIso(from), shift)),
      to: toIso(addDays(fromIso(to), shift)),
    }
  }
  if (state.mode === 'yearly') {
    return { ...state, anchor: { ...state.anchor, year: state.anchor.year + delta } }
  }
  return { ...state, anchor: shiftMonth(state.anchor, delta) }
}

/** Months plotted by the drill-down trend chart (8, or 12 for a year report). */
export function trendMonths(state: StatsState): MonthValue[] {
  if (state.mode === 'yearly') {
    return Array.from({ length: 12 }, (_, month) => ({ year: state.anchor.year, month }))
  }
  const end = fromIso(statsRange(state).to)
  const endMonth: MonthValue = { year: end.getFullYear(), month: end.getMonth() }
  return Array.from({ length: 8 }, (_, index) => shiftMonth(endMonth, -(7 - index)))
}

/**
 * Reporting bucket of a transaction: sub-categories roll up to their parent
 * (PRD-13 §E-04 / TC-STA-06), deleted categories keep their uid.
 */
export function reportingCategoryUid(
  tx: Transaction,
  categories: Map<string, Category>,
): string {
  const category = tx.ctgUid ? categories.get(tx.ctgUid) : undefined
  if (category?.STATUS === 2 && category.pUid) return category.pUid
  return tx.ctgUid || 'tanpa-kategori'
}

function reportingCategoryName(
  uid: string,
  tx: Transaction,
  categories: Map<string, Category>,
): string {
  const category = categories.get(uid)
  if (category) return category.NAME
  const own = tx.ctgUid ? categories.get(tx.ctgUid) : undefined
  return own?.NAME ?? tx.CATEGORY_NAME ?? 'Tanpa kategori'
}

export type CategoryStat = {
  uid: string
  name: string
  amount: number
  /** Share of the report total, 0…100. */
  percent: number
  /** Stable colour used by both the bar chart and the list dot. */
  color: string
}

export function percentValue(amount: number, total: number): number {
  if (!total || total <= 0) return 0
  return (amount / total) * 100
}

export function formatPercent(percent: number, decimals = 0): string {
  return `${percent.toFixed(decimals)}%`
}

/**
 * Per-category totals for one report kind, largest first. Transfers are never
 * part of a Pendapatan/Pengeluaran report.
 */
export function categoryBreakdown(
  rows: Transaction[],
  type: 'income' | 'expense',
  categories: Map<string, Category>,
): CategoryStat[] {
  const buckets = new Map<string, { uid: string; name: string; amount: number }>()

  for (const tx of rows) {
    if (tx.DO_TYPE !== type) continue
    const uid = reportingCategoryUid(tx, categories)
    const bucket = buckets.get(uid) ?? {
      uid,
      name: reportingCategoryName(uid, tx, categories),
      amount: 0,
    }
    bucket.amount += amountOf(tx)
    buckets.set(uid, bucket)
  }

  const list = [...buckets.values()]
  const total = list.reduce((sum, item) => sum + item.amount, 0)

  return list
    .map((item) => ({
      ...item,
      percent: percentValue(item.amount, total),
      color: categoryColor(item.uid),
    }))
    .sort((a, b) => b.amount - a.amount)
}

export type SubStat = { uid: string; name: string; amount: number; percent: number }

/**
 * Sub-category split of one category's transactions. Transactions booked
 * straight on the parent only show up in the "Semua" total rendered by the UI.
 */
export function subCategoryBreakdown(
  rows: Transaction[],
  parentUid: string,
  categories: Map<string, Category>,
): SubStat[] {
  const total = rows.reduce((sum, tx) => sum + amountOf(tx), 0)
  const buckets = new Map<string, number>()

  for (const tx of rows) {
    if (tx.ctgUid === parentUid || !tx.ctgUid) continue
    buckets.set(tx.ctgUid, (buckets.get(tx.ctgUid) ?? 0) + amountOf(tx))
  }

  return [...buckets.entries()]
    .map(([uid, amount]) => ({
      uid,
      name: categories.get(uid)?.NAME ?? uid,
      amount,
      percent: percentValue(amount, total),
    }))
    .sort((a, b) => b.amount - a.amount)
}
export type TrendPoint = { key: string; label: string; amount: number }

export type LineChartPoint = {
  key: string
  label: string
  subLabel?: string
  amount: number
  fullDate: string
}

export type AverageMetrics = {
  dailyAverage: number
  activeDayAverage: number
  elapsedDays: number
  activeDays: number
}

/**
 * Menghitung metrik rata-rata harian (elapsed days) dan rata-rata asli (active days).
 */
export function calculateAverages(
  total: number,
  rows: Transaction[],
  type: 'income' | 'expense',
  state: StatsState,
  todayDate: Date = new Date(),
): AverageMetrics {
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 0
  let elapsedDays = 1

  if (state.mode === 'weekly') {
    const start = fromIso(state.weekStart)
    const end = addDays(start, 6)
    if (todayDate < start) {
      elapsedDays = 1
    } else if (todayDate > end) {
      elapsedDays = 7
    } else {
      elapsedDays = Math.max(1, daySpan(toIso(start), toIso(todayDate)))
    }
  } else if (state.mode === 'monthly') {
    const monthEnd = new Date(state.anchor.year, state.anchor.month + 1, 0)
    const totalDaysInMonth = monthEnd.getDate()
    const isCurrentMonth =
      todayDate.getFullYear() === state.anchor.year &&
      todayDate.getMonth() === state.anchor.month
    const isPastMonth =
      new Date(state.anchor.year, state.anchor.month + 1, 1) <= todayDate

    if (isCurrentMonth) {
      elapsedDays = Math.min(totalDaysInMonth, Math.max(1, todayDate.getDate()))
    } else if (isPastMonth) {
      elapsedDays = totalDaysInMonth
    } else {
      elapsedDays = 1
    }
  } else if (state.mode === 'yearly') {
    const isCurrentYear = todayDate.getFullYear() === state.anchor.year
    const isPastYear = state.anchor.year < todayDate.getFullYear()

    if (isCurrentYear) {
      const startOfYear = new Date(state.anchor.year, 0, 1)
      elapsedDays = Math.max(1, daySpan(toIso(startOfYear), toIso(todayDate)))
    } else if (isPastYear) {
      const isLeap = new Date(state.anchor.year, 1, 29).getDate() === 29
      elapsedDays = isLeap ? 366 : 365
    } else {
      elapsedDays = 1
    }
  } else if (state.mode === 'period') {
    const start = fromIso(state.from)
    const end = fromIso(state.to)
    const totalDays = daySpan(state.from, state.to)
    if (todayDate < start) {
      elapsedDays = 1
    } else if (todayDate > end) {
      elapsedDays = totalDays
    } else {
      elapsedDays = Math.max(1, daySpan(state.from, toIso(todayDate)))
    }
  }

  // Rata-rata harian = total / jumlah hari berjalan
  const dailyAverage = safeTotal / Math.max(1, elapsedDays)

  // Rata-rata asli = total / jumlah hari unik yang benar-benar ada transaksi
  const uniqueDates = new Set(
    rows
      .filter((tx) => tx.DO_TYPE === type && amountOf(tx) > 0)
      .map((tx) => tx.ZDATE),
  )
  const activeDays = uniqueDates.size
  const activeDayAverage = activeDays > 0 ? safeTotal / activeDays : 0

  return {
    dailyAverage,
    activeDayAverage,
    elapsedDays,
    activeDays,
  }
}

/**
 * Menghasilkan deret titik data untuk Grafik Garis (Line Chart).
 * Mengembalikan null jika mode 'period' (ditiadakan sesuai instruksi).
 * Untuk tanggal tanpa data, nilai amount bernilai default 0.
 */
export function getLineChartPoints(
  rows: Transaction[],
  type: 'income' | 'expense',
  state: StatsState,
  categoryUid?: string | null,
  categories?: Map<string, Category>,
): LineChartPoint[] | null {
  if (state.mode === 'period') {
    return null
  }

  // Filter transaksi yang sesuai jenis dan kategori (jika categoryUid diberikan)
  const matchingRows = rows.filter((tx) => {
    if (tx.DO_TYPE !== type) return false
    if (categoryUid && categories) {
      return reportingCategoryUid(tx, categories) === categoryUid
    }
    return true
  })
  if (state.mode === 'weekly') {
    const start = fromIso(state.weekStart)
    const points: LineChartPoint[] = []
    const weekLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

    for (let i = 0; i < 7; i++) {
      const curr = addDays(start, i)
      const iso = toIso(curr)
      // Senin = 1, Minggu = 0 -> mapping index ke weekLabels
      const dayIdx = (curr.getDay() + 6) % 7
      const dayTotal = matchingRows
        .filter((tx) => tx.ZDATE === iso)
        .reduce((sum, tx) => sum + amountOf(tx), 0)

      points.push({
        key: iso,
        label: weekLabels[dayIdx],
        subLabel: String(curr.getDate()),
        amount: dayTotal, // default 0 jika tidak ada transaksi
        fullDate: formatShortDate(iso),
      })
    }
    return points
  }

  if (state.mode === 'monthly') {
    const points: LineChartPoint[] = []
    const daysInMonth = new Date(state.anchor.year, state.anchor.month + 1, 0).getDate()

    for (let day = 1; day <= daysInMonth; day++) {
      const curr = new Date(state.anchor.year, state.anchor.month, day)
      const iso = toIso(curr)
      const dayTotal = matchingRows
        .filter((tx) => tx.ZDATE === iso)
        .reduce((sum, tx) => sum + amountOf(tx), 0)

      points.push({
        key: iso,
        label: String(day),
        amount: dayTotal, // default 0
        fullDate: formatShortDate(iso),
      })
    }
    return points
  }

  if (state.mode === 'yearly') {
    const points: LineChartPoint[] = []
    for (let m = 0; m < 12; m++) {
      const bounds = monthBounds(state.anchor.year, m)
      const from = toIso(bounds.start)
      const to = toIso(bounds.end)
      const monthTotal = matchingRows
        .filter((tx) => tx.ZDATE >= from && tx.ZDATE <= to)
        .reduce((sum, tx) => sum + amountOf(tx), 0)

      points.push({
        key: `${state.anchor.year}-${String(m + 1).padStart(2, '0')}`,
        label: MONTHS[m].short,
        amount: monthTotal, // default 0
        fullDate: `${MONTHS[m].full} ${state.anchor.year}`,
      })
    }
    return points
  }

  return null
}
/** Monthly totals for the drill-down bar chart (e.g. Mar…Okt). */
export function categoryTrend(rows: Transaction[], months: MonthValue[]): TrendPoint[] {
  return months.map(({ year, month }) => {
    const bounds = monthBounds(year, month)
    const from = toIso(bounds.start)
    const to = toIso(bounds.end)
    const amount = rows
      .filter((tx) => tx.ZDATE >= from && tx.ZDATE <= to)
      .reduce((sum, tx) => sum + amountOf(tx), 0)
    return {
      key: `${year}-${String(month + 1).padStart(2, '0')}`,
      label: MONTHS[month].short,
      amount,
    }
  })
}

/**
 * Stable, readable colour per category (NFR-03: colours stay consistent across
 * periods and reports). Derived from the uid so it never depends on rank.
 */
const CATEGORY_COLORS = [
  'oklch(0.55 0.13 168)',
  'oklch(0.58 0.15 235)',
  'oklch(0.60 0.16 300)',
  'oklch(0.62 0.17 20)',
  'oklch(0.68 0.15 75)',
  'oklch(0.60 0.14 145)',
  'oklch(0.62 0.14 200)',
  'oklch(0.60 0.16 340)',
  'oklch(0.58 0.13 265)',
  'oklch(0.65 0.13 110)',
]

export function categoryColor(uid: string): string {
  let hash = 0
  for (let index = 0; index < uid.length; index += 1) {
    hash = (hash * 31 + uid.charCodeAt(index)) >>> 0
  }
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length]
}

const compactFormatter = new Intl.NumberFormat('id-ID', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** Short value label for the trend chart axis ("500 rb"). */
export function formatCompactAmount(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '0'
  return compactFormatter.format(value)
}
