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

export type CardCycleAmounts = {
  payableAmount: number
  upcomingAmount: number
}

/**
 * Calculates card amounts according to Money Manager's AssetRepository.i:
 * Takes non-deleted transactions for this card asset, computes the sum of expenses
 * (DO_TYPE '1', '3', '8') in each cycle.
 */
export function computeCardCycleAmounts(
  cycles: CardCycles,
  transactions: { assetUid: string; DO_TYPE: string; ZDATE: string; AMOUNT_ACCOUNT?: number | null; ZMONEY?: string | null; txUidFee?: string | null; FEE?: number | null }[],
  cardUid: string,
): CardCycleAmounts {
  const pad = (n: number) => String(n).padStart(2, '0')
  const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  const payableStart = toYmd(cycles.payable.start)
  const payableEnd = toYmd(cycles.payable.end)
  const upcomingStart = toYmd(cycles.upcoming.start)
  const upcomingEnd = toYmd(cycles.upcoming.end)

  let payableAmount = 0
  let upcomingAmount = 0
  let olderCharges = 0
  let olderPayments = 0

  for (const t of transactions) {
    if (t.assetUid !== cardUid) continue
    const isOut = t.DO_TYPE === '1' || t.DO_TYPE === 'expense' || t.DO_TYPE === '3' || t.DO_TYPE === 'transfer' || t.DO_TYPE === '8'
    const isIn = t.DO_TYPE === '0' || t.DO_TYPE === 'income' || t.DO_TYPE === '4' || t.DO_TYPE === '7'
    const feeAmount = (t.DO_TYPE === '3' || t.DO_TYPE === 'transfer') && !t.txUidFee ? (Number(t.FEE) || 0) : 0
    const amount = (Number(t.AMOUNT_ACCOUNT ?? t.ZMONEY) || 0) + feeAmount

    if (t.ZDATE < payableStart) {
      if (isOut) olderCharges += amount
      else if (isIn) olderPayments += amount
    } else if (t.ZDATE >= payableStart && t.ZDATE <= payableEnd) {
      if (isOut) payableAmount += amount
      else if (isIn) payableAmount -= amount
    } else if (t.ZDATE >= upcomingStart && t.ZDATE <= upcomingEnd) {
      if (isOut) upcomingAmount += amount
      else if (isIn) upcomingAmount -= amount
    }
  }

  const olderUnpaid = Math.max(0, olderCharges - olderPayments)
  const olderExcess = Math.max(0, olderPayments - olderCharges)
  payableAmount = Math.max(0, payableAmount + olderUnpaid - olderExcess)

  return {
    payableAmount: Math.max(0, payableAmount),
    upcomingAmount: Math.max(0, upcomingAmount),
  }
}
