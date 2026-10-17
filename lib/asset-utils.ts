import { ASSET_GROUP_TYPE } from '@/lib/db'

/** A card group shows the extra billing fields ("Bayar", tanggal, siklus). */
export function isCardGroup(group?: { TYPE: number } | null): boolean {
  if (!group) return false
  return (
    group.TYPE === ASSET_GROUP_TYPE.creditCard || group.TYPE === ASSET_GROUP_TYPE.debitCard
  )
}

export type CardCycle = {
  start: Date
  end: Date
  pay: Date
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function clampDay(year: number, monthIndex: number, day: number): number {
  return Math.min(Math.max(day, 1), daysInMonth(year, monthIndex))
}

function dateAt(year: number, monthIndex: number, day: number): Date {
  return new Date(year, monthIndex, clampDay(year, monthIndex, day))
}

function monthOf(absMonth: number): { year: number; month: number } {
  return { year: Math.floor(absMonth / 12), month: ((absMonth % 12) + 12) % 12 }
}

/**
 * Billing cycle for a given closed month. The range runs from the settlement
 * day of the month to the day before the next settlement day; the payment
 * date falls on `paymentDay` of the following month.
 */
function cycleAt(absMonth: number, settleDay: number, paymentDay: number): CardCycle {
  const { year, month } = monthOf(absMonth)
  const next = monthOf(absMonth + 1)

  const start = dateAt(year, month, settleDay)
  const nextStart = dateAt(next.year, next.month, settleDay)
  const end = new Date(nextStart)
  end.setDate(end.getDate() - 1)
  const pay = dateAt(next.year, next.month, paymentDay)

  return { start, end, pay }
}

export type CardCycles = {
  /** Most recently closed cycle — "Harus dibayar". */
  payable: CardCycle
  /** Open cycle — "Belum dibayar". */
  upcoming: CardCycle
}

/**
 * Compute the "Harus dibayar" (last closed) and "Belum dibayar" (open) cycles.
 * With settle = 1 and today in October this yields `01/09 ~ 30/09 (Bayar: 01/10)`
 * and `01/10 ~ 31/10 (Bayar: 01/11)`, matching PRD-08 §3.2.5.
 */
export function computeCardCycles(
  settleDay: number | null,
  paymentDay: number | null,
  today: Date = new Date(),
): CardCycles {
  const settle = settleDay && settleDay > 0 ? settleDay : 1
  const payment = paymentDay && paymentDay > 0 ? paymentDay : 1

  const absToday = today.getFullYear() * 12 + today.getMonth()
  const openMonth = today.getDate() >= clampDay(today.getFullYear(), today.getMonth(), settle)
    ? absToday
    : absToday - 1

  return {
    payable: cycleAt(openMonth - 1, settle, payment),
    upcoming: cycleAt(openMonth, settle, payment),
  }
}
