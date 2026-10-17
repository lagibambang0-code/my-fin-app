import { addDays, fromIso, toIso } from '@/lib/format'

/**
 * Repeat frequencies (PRD-05 §3.3.2).
 *
 * `REPEAT_TYPE` is the index into this list — the same index the transaction
 * form already stores in `Transaction.RECUR_FREQ`, so `0` means "Tidak ada"
 * and `13` means "Setiap 1 tahun".
 */
export const REPEAT_TYPE = {
  none: 0,
  daily: 1,
  weekdays: 2,
  weekends: 3,
  weekly: 4,
  biweekly: 5,
  fourWeekly: 6,
  monthly: 7,
  endOfMonth: 8,
  bimonthly: 9,
  quarterly: 10,
  fourMonthly: 11,
  semiannual: 12,
  yearly: 13,
} as const

/** `REPEAT_TYPE` values that actually repeat (everything except "Tidak ada"). */
export const ACTIVE_REPEAT_TYPES: number[] = Object.values(REPEAT_TYPE).filter((t) => t !== 0)

const DAY_MS = 24 * 60 * 60 * 1000

function daysInMonth(year: number, month: number): number {
  // month is 0-based: day 0 of the next month = last day of `month`.
  return new Date(year, month + 1, 0).getDate()
}

/** Same day-of-month, `months` later, clamped to the target month's length. */
function addMonths(date: Date, months: number): Date {
  const year = date.getFullYear()
  const month = date.getMonth() + months
  const day = date.getDate()
  const targetYear = year + Math.floor(month / 12)
  const targetMonth = ((month % 12) + 12) % 12
  const clamped = Math.min(day, daysInMonth(targetYear, targetMonth))
  return new Date(targetYear, targetMonth, clamped)
}

/** Last day of the month `months` after `date` (used by "Akhir bulan"). */
function endOfMonth(date: Date, months: number): Date {
  const year = date.getFullYear()
  const month = date.getMonth() + months
  const targetYear = year + Math.floor(month / 12)
  const targetMonth = ((month % 12) + 12) % 12
  return new Date(targetYear, targetMonth, daysInMonth(targetYear, targetMonth))
}

/**
 * Next occurrence after `iso` for a repeat type. Returns the same day when the
 * type does not repeat (defensive — callers should check `ACTIVE_REPEAT_TYPES`).
 *
 * Edge cases from PRD-05 §7.2:
 * - "Akhir bulan" always lands on the last day (28/29 for February).
 * - "Setiap bulan" clamps 31 Jan → 28/29 Feb.
 * - "Setiap 1 tahun" clamps 29 Feb → 28 Feb on non-leap years.
 */
export function nextRepeatDate(iso: string, repeatType: number): string {
  const date = fromIso(iso)

  switch (repeatType) {
    case REPEAT_TYPE.daily:
      return toIso(addDays(date, 1))

    case REPEAT_TYPE.weekdays: {
      let next = addDays(date, 1)
      while (next.getDay() === 0 || next.getDay() === 6) next = addDays(next, 1)
      return toIso(next)
    }

    case REPEAT_TYPE.weekends: {
      let next = addDays(date, 1)
      while (next.getDay() !== 0 && next.getDay() !== 6) next = addDays(next, 1)
      return toIso(next)
    }

    case REPEAT_TYPE.weekly:
      return toIso(addDays(date, 7))

    case REPEAT_TYPE.biweekly:
      return toIso(addDays(date, 14))

    case REPEAT_TYPE.fourWeekly:
      return toIso(addDays(date, 28))

    case REPEAT_TYPE.monthly:
      return toIso(addMonths(date, 1))

    case REPEAT_TYPE.endOfMonth:
      return toIso(endOfMonth(date, 1))

    case REPEAT_TYPE.bimonthly:
      return toIso(addMonths(date, 2))

    case REPEAT_TYPE.quarterly:
      return toIso(addMonths(date, 3))

    case REPEAT_TYPE.fourMonthly:
      return toIso(addMonths(date, 4))

    case REPEAT_TYPE.semiannual:
      return toIso(addMonths(date, 6))

    case REPEAT_TYPE.yearly:
      return toIso(addMonths(date, 12))

    default:
      return iso
  }
}

/**
 * Date a due occurrence is written on: either the due date itself
 * ("Tanggal yang bersangkutan") or the first day of its month
 * ("Hari pertama setiap bulan", PRD-05 §3.2.3 / BR-03).
 */
export function reflectDate(iso: string, firstOfMonth: boolean): string {
  if (!firstOfMonth) return iso
  const date = fromIso(iso)
  return toIso(new Date(date.getFullYear(), date.getMonth(), 1))
}

/**
 * Every occurrence from `startIso` (exclusive) up to and including `untilIso`.
 * `limit` guards against runaway loops for daily series left untouched for years.
 */
export function occurrencesUntil(
  startIso: string,
  repeatType: number,
  untilIso: string,
  limit = 400,
): string[] {
  if (!ACTIVE_REPEAT_TYPES.includes(repeatType)) return []
  const until = fromIso(untilIso).getTime()
  const out: string[] = []
  let cursor = startIso
  let guard = 0
  while (guard < limit) {
    const next = nextRepeatDate(cursor, repeatType)
    if (next === cursor) break
    cursor = next
    if (fromIso(cursor).getTime() > until) break
    out.push(cursor)
    guard += 1
  }
  return out
}

/** Whole days between two ISO dates (b − a). */
export function daysBetween(aIso: string, bIso: string): number {
  return Math.round((fromIso(bIso).getTime() - fromIso(aIso).getTime()) / DAY_MS)
}

/** First day of the month a date belongs to (used by the review-time dialog). */
export function firstOfMonthIso(iso: string): string {
  return reflectDate(iso, true)
}

/** `dd/MM` — the short date rendered in the review-time confirmation. */
export function formatDayMonthShort(iso: string): string {
  const d = fromIso(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}
