/**
 * Month primitives shared by the month navigator and the statistics ranges.
 * Kept in `lib` (not in the component) so pure aggregation code can use them.
 */

export const MONTHS_EN = [
  { full: 'January', short: 'Jan' },
  { full: 'February', short: 'Feb' },
  { full: 'March', short: 'Mar' },
  { full: 'April', short: 'Apr' },
  { full: 'May', short: 'May' },
  { full: 'June', short: 'Jun' },
  { full: 'July', short: 'Jul' },
  { full: 'August', short: 'Aug' },
  { full: 'September', short: 'Sep' },
  { full: 'October', short: 'Oct' },
  { full: 'November', short: 'Nov' },
  { full: 'December', short: 'Dec' },
]

export const MONTHS_ID = [
  { full: 'Januari', short: 'Jan' },
  { full: 'Februari', short: 'Feb' },
  { full: 'Maret', short: 'Mar' },
  { full: 'April', short: 'Apr' },
  { full: 'Mei', short: 'Mei' },
  { full: 'Juni', short: 'Jun' },
  { full: 'Juli', short: 'Jul' },
  { full: 'Agustus', short: 'Agu' },
  { full: 'September', short: 'Sep' },
  { full: 'Oktober', short: 'Okt' },
  { full: 'November', short: 'Nov' },
  { full: 'Desember', short: 'Des' },
]

export function getLocalizedMonths(locale: 'en' | 'id') {
  return locale === 'en' ? MONTHS_EN : MONTHS_ID
}

/** Default exported array for backward compatibility. */
export const MONTHS = MONTHS_EN

export type MonthValue = { year: number; month: number }

export function shiftMonth({ year, month }: MonthValue, delta: number): MonthValue {
  const index = year * 12 + month + delta
  return { year: Math.floor(index / 12), month: ((index % 12) + 12) % 12 }
}
