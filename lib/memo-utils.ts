import type { Memo } from '@/lib/db'
import { formatShortDate } from '@/lib/format'

/** Memo accent palette (sticky-note colours from Money Manager's memo form). */
export const MEMO_COLORS = [
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#a855f7', // purple
  '#3b82f6', // blue
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#64748b', // slate
] as const

export const DEFAULT_MEMO_COLOR: string = MEMO_COLORS[0]

/** Guard against legacy rows: fall back to the first palette colour. */
export function memoColor(value: string | null | undefined): string {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : DEFAULT_MEMO_COLOR
}

/** `HH:MM` for the memo's epoch millis (`memoTime`). */
export function memoTimeLabel(epoch: number): string {
  const date = new Date(epoch)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/** Epoch millis for a `YYYY-MM-DD` date plus `HH:MM` time. */
export function memoEpoch(iso: string, hhmm: string): number {
  const [hour = '0', minute = '0'] = hhmm.split(':')
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(
    year || 1970,
    (month || 1) - 1,
    day || 1,
    Number(hour) || 0,
    Number(minute) || 0,
    0,
    0,
  ).getTime()
}

/** Row subtitle: `17/10/26 · 09:30`. */
export function memoSubtitle(memo: Memo): string {
  return `${formatShortDate(memo.memoDate)} · ${memoTimeLabel(memo.memoTime)}`
}

/** Memos whose `memoDate` falls inside the given (0-based) month. */
export function memosInMonth(list: Memo[], year: number, month: number): Memo[] {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
  return list.filter((memo) => memo.memoDate.startsWith(prefix))
}
