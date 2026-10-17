import type { Currency } from '@/lib/db'

type CurrencyFormat = Pick<Currency, 'SYMBOL' | 'SYMBOL_POSITION' | 'DECIMAL_POINT'>

const DEFAULT_FORMAT: CurrencyFormat = {
  SYMBOL: 'Rp',
  SYMBOL_POSITION: 'front',
  DECIMAL_POINT: 0,
}

/**
 * Format a number using the active currency's symbol, position and decimals.
 * Uses Indonesian grouping (dot thousands, comma decimals) per PRD-06.
 */
export function formatCurrency(value: number, currency?: CurrencyFormat | null): string {
  const { SYMBOL, SYMBOL_POSITION, DECIMAL_POINT } = currency ?? DEFAULT_FORMAT
  const decimals = DECIMAL_POINT ?? 0
  const safe = Number.isFinite(value) ? value : 0
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(safe)
  return SYMBOL_POSITION === 'back' ? `${formatted} ${SYMBOL}` : `${SYMBOL} ${formatted}`
}

/** Format just the number (no symbol), honouring the currency decimals. */
export function formatAmount(value: number, currency?: CurrencyFormat | null): string {
  return formatCurrency(value, currency).replace(/^[^\d-]*\s*/, '').replace(/\s*[^\d.,\s-]*$/, '')
}

/**
 * Amount display for a number pad input that keeps a trailing decimal
 * separator while the user is still typing the decimals (`1.500,`).
 */
export function formatTypingAmount(raw: string, currency?: CurrencyFormat | null): string {
  if (!raw) return formatAmount(0, currency)
  const [intPart, decPart] = raw.split('.')
  const intFormatted = formatAmount(Number(intPart || '0'), currency)
  if (decPart === undefined) return intFormatted
  return `${intFormatted}${(currency?.DECIMAL_POINT ?? 0) > 0 ? ',' : '.'}${decPart}`
}

/**
 * Parse a user-typed amount into a number. Handles Indonesian grouping
 * (`1.500.000`), comma decimals and a leading minus sign.
 */
export function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[^\d.,-]/g, '').trim()
  if (!cleaned || cleaned === '-') return Number.NaN

  const hasComma = cleaned.includes(',')
  const hasDot = cleaned.includes('.')
  let normalized = cleaned

  if (hasComma && hasDot) {
    const decimalSep = cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.') ? ',' : '.'
    const thousandSep = decimalSep === ',' ? '.' : ','
    normalized = cleaned.split(thousandSep).join('').replace(decimalSep, '.')
  } else if (hasComma) {
    // id-ID treats comma as the decimal separator, but a group of 3 digits
    // after the last comma is almost always a thousands separator.
    const parts = cleaned.split(',')
    const last = parts[parts.length - 1]
    normalized = parts.length > 2 || last.length === 3 ? parts.join('') : cleaned.replace(',', '.')
  } else if (hasDot) {
    const parts = cleaned.split('.')
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      normalized = parts.join('')
    }
  }

  const value = Number(normalized)
  return Number.isFinite(value) ? value : Number.NaN
}

const pad = (n: number) => String(n).padStart(2, '0')

/** `dd/MM` short date used by the card billing-cycle labels. */
export function formatDayMonth(date: Date): string {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`
}

/** `YYYY-MM-DD` — the storage format for `INOUTCOME.ZDATE`. */
export function toIso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Parse `YYYY-MM-DD` into a local midnight Date. */
export function fromIso(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

/** Today's date as `YYYY-MM-DD` in the local timezone. */
export function todayIso(): string {
  return toIso(new Date())
}

export const WEEKDAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
export const WEEKDAYS_FULL = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
]

/** `11/10/26` — the compact date used on transaction rows. */
export function formatShortDate(iso: string): string {
  const d = fromIso(iso)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`
}

/** `10.2026` — month-year label used in the Harian day groups. */
export function formatMonthDotYear(iso: string): string {
  const d = fromIso(iso)
  return `${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}

/** `01.10 ~ 31.10` — the range label used by the Bulanan view. */
export function formatDotDayMonth(date: Date): string {
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`
}

/** First and last day of a calendar month. */
export function monthBounds(year: number, month: number): { start: Date; end: Date } {
  return { start: new Date(year, month, 1), end: new Date(year, month + 1, 0) }
}

/** Monday-based start of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay() // 0 = Sunday
  const delta = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + delta)
  return d
}

/** Add days to a date without mutating it. */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() + days)
  return d
}

/** `dd.MM.yy` range used by the asset detail period label. */
export function formatDotRange(start: Date, end: Date): string {
  const f = (d: Date) =>
    `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(-2)}`
  return `${f(start)} ~ ${f(end)}`
}
