import type { SmsMacro } from '@/lib/db'
import { todayIso } from '@/lib/format'

/**
 * SMS parsing shared by the "Masukkan SMS" screen. Money Manager reads SMS
 * straight from the device; a browser cannot, so the clone parses a pasted SMS
 * with the same rules (amount, sender, date, type) and prefills the transaction
 * form. The sender → asset mapping comes from `MESSAGEMACRO2`.
 */

export type SmsParse = {
  /** Sender keyword found in the text, e.g. `BCA`; `'Tidak diketahui'` when unknown. */
  sender: string
  kind: 'income' | 'expense'
  amount: number
  /** `YYYY-MM-DD` */
  date: string
  macroUid: string | null
  assetUid: string | null
  assetName: string | null
}

/** Keywords that mark money coming in (checked before the expense keywords). */
const INCOME_KEYWORDS = [
  'KREDIT',
  'MENERIMA',
  'DITERIMA',
  'PENERIMAAN',
  'TRANSFER DARI',
  'UANG MASUK',
  'TOP UP BERHASIL',
  'REFUND',
]

/** Keywords that mark money going out. */
const EXPENSE_KEYWORDS = [
  'DEBIT',
  'DEBET',
  'PEMBELIAN',
  'PEMBAYARAN',
  'PEMBAYARAN BERHASIL',
  'TARIK TUNAI',
  'TRANSFER KE',
  'PENGELUARAN',
  'TRANSAKSI',
  'PENARIKAN',
]

/** Ordered senders used for the fallback sender detection. */
export const SMS_SENDERS = [
  'SHOPEEPAY',
  'SEABANK',
  'MANDIRI',
  'PERMATA',
  'LINKAJA',
  'GOPAY',
  'DANA',
  'OVO',
  'BRI',
  'BNI',
  'BCA',
  'CIMB',
  'JAGO',
]

const MONTH_NAMES: Record<string, number> = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MEI: 5,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AGU: 8,
  AUG: 8,
  SEP: 9,
  OKT: 10,
  OCT: 10,
  NOV: 11,
  DES: 12,
  DEC: 12,
}

const pad = (value: number) => String(value).padStart(2, '0')

/**
 * Amount after "Rp"/"IDR". Indonesian grouping uses dots for thousands and a
 * comma for decimals, so only the digits before the comma are kept.
 */
export function parseSmsAmount(text: string): number | null {
  const match = text.match(/(?:rp|idr)\.?\s*([\d.,]{1,20})/i)
  if (!match) return null
  const raw = match[1].split(',')[0].replace(/[^\d]/g, '')
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}

/** `YYYY-MM-DD` found in the text (`17/10/2026`, `17-10-26`, `17 Okt 2026`). */
export function parseSmsDate(text: string, fallback = todayIso()): string {
  const numeric = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/)
  if (numeric) {
    const day = Number(numeric[1])
    const month = Number(numeric[2])
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const rawYear = numeric[3]
      const year = rawYear
        ? rawYear.length === 2
          ? 2000 + Number(rawYear)
          : Number(rawYear)
        : Number(fallback.slice(0, 4))
      return `${year}-${pad(month)}-${pad(day)}`
    }
  }
  const named = text.match(/\b(\d{1,2})\s+([A-Za-z]{3,4})\s+(\d{2,4})\b/)
  if (named) {
    const month = MONTH_NAMES[named[2].toUpperCase().slice(0, 3)]
    const day = Number(named[1])
    if (month && day >= 1 && day <= 31) {
      const rawYear = named[3]
      const year = rawYear.length === 2 ? 2000 + Number(rawYear) : Number(rawYear)
      return `${year}-${pad(month)}-${pad(day)}`
    }
  }
  return fallback
}

export function parseSmsSender(text: string, macros: SmsMacro[]): string {
  const upper = text.toUpperCase()
  const macro = macros.find((row) => row.SMS_TEL && upper.includes(row.SMS_TEL.toUpperCase()))
  if (macro) return macro.SMS_TEL
  return SMS_SENDERS.find((name) => upper.includes(name)) ?? 'Tidak diketahui'
}

export function parseSmsKind(text: string): 'income' | 'expense' {
  const upper = text.toUpperCase()
  if (INCOME_KEYWORDS.some((keyword) => upper.includes(keyword))) return 'income'
  if (EXPENSE_KEYWORDS.some((keyword) => upper.includes(keyword))) return 'expense'
  // Unknown wording: assume money going out (same default as the input form).
  return 'expense'
}

/** Parse a pasted SMS into transaction values. Returns null when no amount. */
export function parseSms(text: string, macros: SmsMacro[]): SmsParse | null {
  const amount = parseSmsAmount(text)
  if (amount === null) return null
  const sender = parseSmsSender(text, macros)
  const macro = macros.find((row) => row.SMS_TEL.toUpperCase() === sender.toUpperCase()) ?? null
  return {
    sender,
    kind: parseSmsKind(text),
    amount,
    date: parseSmsDate(text),
    macroUid: macro?.uid ?? null,
    assetUid: macro?.conAssetUid ?? null,
    assetName: macro?.MACROASSETNAME || null,
  }
}

export function smsKindLabel(kind: 'income' | 'expense'): string {
  return kind === 'income' ? 'Pendapatan' : 'Pengeluaran'
}
