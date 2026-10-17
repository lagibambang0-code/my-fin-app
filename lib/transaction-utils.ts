import type { Transaction } from '@/lib/db'
import { addDays, monthBounds, startOfWeek, toIso, todayIso } from '@/lib/format'

export type TrxType = 'income' | 'expense' | 'transfer'

export const TRX_TYPES: TrxType[] = ['income', 'expense', 'transfer']

export const TRX_TYPE_LABEL: Record<TrxType, string> = {
  income: 'Pendapatan',
  expense: 'Pengeluaran',
  transfer: 'Transfer',
}

/** The 14 repeat frequencies from the "Berulang/cicil → Ulang" list (PRD-05). */
export const RECUR_FREQUENCIES = [
  'Tidak ada',
  'Setiap hari',
  'Hari biasa',
  'Akhir pekan',
  'Setiap minggu',
  'Setiap 2 minggu',
  'Setiap 4 minggu',
  'Setiap bulan',
  'Akhir bulan',
  'Setiap 2 bulan',
  'Setiap 3 bulan',
  'Setiap 4 bulan',
  'Setiap 6 bulan',
  'Setiap 1 tahun',
] as const

/** The amount stored on a transaction. */
export function amountOf(t: Transaction): number {
  return Number(t.AMOUNT_ACCOUNT ?? t.ZMONEY) || 0
}

/** Signed contribution of a transaction to a period total. */
export function netOf(t: Transaction): number {
  const amount = amountOf(t)
  if (t.DO_TYPE === 'income') return amount
  if (t.DO_TYPE === 'expense') return -amount
  return 0 // transfers move money between assets
}

export type Summary = { income: number; expense: number; total: number }

/**
 * Pendapatan / Pengeluaran / Total for a set of transactions.
 * Total = Pendapatan − Pengeluaran. Transfers never count as either.
 */
export function summarize(rows: Transaction[]): Summary {
  let income = 0
  let expense = 0
  for (const t of rows) {
    const amount = amountOf(t)
    if (t.DO_TYPE === 'income') income += amount
    else if (t.DO_TYPE === 'expense') expense += amount
  }
  return { income, expense, total: income - expense }
}

export type DayGroup = {
  date: string
  income: number
  expense: number
  items: Transaction[]
}

/** Group transactions per date (newest first) with daily in/out totals. */
export function groupByDate(rows: Transaction[]): DayGroup[] {
  const map = new Map<string, DayGroup>()
  for (const t of rows) {
    let group = map.get(t.ZDATE)
    if (!group) {
      group = { date: t.ZDATE, income: 0, expense: 0, items: [] }
      map.set(t.ZDATE, group)
    }
    const amount = amountOf(t)
    if (t.DO_TYPE === 'income') group.income += amount
    else if (t.DO_TYPE === 'expense') group.expense += amount
    group.items.push(t)
  }
  return [...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1))
}

/** Total per date, used by the Kalender cells. */
export function totalsByDate(rows: Transaction[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const t of rows) {
    map.set(t.ZDATE, (map.get(t.ZDATE) ?? 0) + netOf(t))
  }
  return map
}

export type WeekRow = { start: string; end: string; total: number }

/**
 * Weekly rows covering a calendar month (true Monday–Sunday bounds, newest
 * week first), each with its own nett total.
 */
export function weeklyBreakdown(
  year: number,
  month: number,
  rows: Transaction[],
): WeekRow[] {
  const { start, end } = monthBounds(year, month)
  const weeks: WeekRow[] = []
  let cursor = startOfWeek(end)

  // Walk backwards from the last week of the month while the week still
  // overlaps it, so the partial week holding day 1 is included too.
  while (weeks.length < 8 && toIso(addDays(cursor, 6)) >= toIso(start)) {
    const from = toIso(cursor)
    const to = toIso(addDays(cursor, 6))
    const total = rows
      .filter((t) => t.ZDATE >= from && t.ZDATE <= to)
      .reduce((sum, t) => sum + netOf(t), 0)
    weeks.push({ start: from, end: to, total })
    cursor = addDays(cursor, -7)
  }

  return weeks
}

/**
 * "Perbandingan pengeluaran bulan lalu" = (this month ÷ last month) × 100,
 * capped at 100%. A zero previous month yields 100% (PRD-11 §C, verified).
 */
export function comparisonPercent(current: number, previous: number): number {
  if (previous <= 0) return 100
  return Math.min(100, Math.round((current / previous) * 100))
}

export type FilterType = 'all' | 'income' | 'expense' | 'transferIn' | 'transferOut'
export type FilterPeriod = 'all' | 'weekly' | 'monthly' | 'yearly'

export const FILTER_TYPE_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'income', label: 'Pendapatan' },
  { value: 'transferIn', label: 'Transfer masuk' },
]

export const FILTER_EXPENSE_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'transferOut', label: 'Transfer keluar' },
]

export const FILTER_PERIOD_OPTIONS: { value: FilterPeriod; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'yearly', label: 'Tahunan' },
]

export type TransactionFilter = {
  type: FilterType
  assetUids: string[]
  period: FilterPeriod
  min: number | null
  max: number | null
  keyword?: string
}

export const EMPTY_FILTER: TransactionFilter = {
  type: 'all',
  assetUids: [],
  period: 'all',
  min: null,
  max: null,
}

export function isFilterActive(filter: TransactionFilter): boolean {
  return (
    filter.type !== 'all' ||
    filter.assetUids.length > 0 ||
    filter.period !== 'all' ||
    filter.min !== null ||
    filter.max !== null
  )
}

function periodBounds(period: FilterPeriod, today: Date): { from: string; to: string } | null {
  if (period === 'weekly') {
    const from = addDays(today, -6)
    return { from: toIso(from), to: toIso(today) }
  }
  if (period === 'monthly') {
    const bounds = monthBounds(today.getFullYear(), today.getMonth())
    return { from: toIso(bounds.start), to: toIso(bounds.end) }
  }
  if (period === 'yearly') {
    return {
      from: toIso(new Date(today.getFullYear(), 0, 1)),
      to: toIso(new Date(today.getFullYear(), 11, 31)),
    }
  }
  return null
}

/**
 * Apply a filter. Keyword search covers Catatan (`ZCONTENT`) and Deskripsi
 * (`ZDATA`) only — never category or asset names (verified in PRD-11 §C).
 */
export function applyFilter(
  rows: Transaction[],
  filter: TransactionFilter,
  today: Date = new Date(),
): Transaction[] {
  const keyword = filter.keyword?.trim().toLowerCase()
  const bounds = periodBounds(filter.period, today)
  const assetSet = new Set(filter.assetUids)

  return rows.filter((t) => {
    if (keyword) {
      const haystack = `${t.ZCONTENT ?? ''} ${t.ZDATA ?? ''}`.toLowerCase()
      if (!haystack.includes(keyword)) return false
    }

    if (assetSet.size > 0) {
      const touches =
        assetSet.has(t.assetUid) || (t.toAssetUid ? assetSet.has(t.toAssetUid) : false)
      if (!touches) return false
    }

    if (filter.type === 'income' && t.DO_TYPE !== 'income') return false
    if (filter.type === 'expense' && t.DO_TYPE !== 'expense') return false
    if (filter.type === 'transferIn' && t.DO_TYPE !== 'transfer') return false
    if (filter.type === 'transferOut' && t.DO_TYPE !== 'transfer') return false

    if (bounds && (t.ZDATE < bounds.from || t.ZDATE > bounds.to)) return false

    const amount = amountOf(t)
    if (filter.min !== null && amount < filter.min) return false
    if (filter.max !== null && amount > filter.max) return false

    return true
  })
}

export type FilterCounts = {
  income: number
  expense: number
  transferIn: number
  transferOut: number
  total: number
}

/** Match counts per filter type, used for the "%" labels on the filter screen. */
export function filterCounts(rows: Transaction[]): FilterCounts {
  const counts: FilterCounts = { income: 0, expense: 0, transferIn: 0, transferOut: 0, total: 0 }
  for (const t of rows) {
    counts.total += 1
    if (t.DO_TYPE === 'income') counts.income += 1
    else if (t.DO_TYPE === 'expense') counts.expense += 1
    else if (t.DO_TYPE === 'transfer') {
      counts.transferIn += 1
      counts.transferOut += 1
    }
  }
  return counts
}

export function percentOf(value: number, total: number): string {
  if (total <= 0) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

/** `Hari ini` / `Kemarin` / `11/10/26` label for the transaction form. */
export function relativeDateLabel(iso: string): string {
  const today = todayIso()
  if (iso === today) return 'Hari ini'
  const yesterday = toIso(addDays(new Date(), -1))
  if (iso === yesterday) return 'Kemarin'
  return ''
}
