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
