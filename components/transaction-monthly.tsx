'use client'

import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/lib/db'
import { MONTHS } from '@/components/month-navigator'
import { addDays, formatCurrency, formatDotDayMonth, fromIso, monthBounds } from '@/lib/format'
import { summarize, weeklyBreakdown } from '@/lib/transaction-utils'
import type { Lookups } from '@/components/transaction-list'

/** "Bulanan" sub-tab: month rows broken down into weeks, closed by a Total row. */
export function TransactionMonthly({
  year,
  transactions,
  lookups,
}: {
  year: number
  transactions: Transaction[]
  lookups: Lookups
}) {
   const groups = useMemo(() => {
     const list: {
       month: number
       rows: Transaction[]
       total: number
       weeks: { start: string; end: string; total: number }[]
     }[] = []

    const maxMonth = year === new Date().getFullYear() ? new Date().getMonth() : 11

    for (let month = 0; month <= maxMonth; month += 1) {
       const rows = transactions.filter((tx) => fromIso(tx.ZDATE).getMonth() === month)
       list.push({
         month,
         rows,
         total: summarize(rows).total,
         weeks: weeklyBreakdown(year, month, transactions),
       })
     }
     return list.reverse()
   }, [transactions, year])

  const [expanded, setExpanded] = useState<number | null>(() => {
    return year === new Date().getFullYear() ? new Date().getMonth() : (groups[0]?.month ?? 11)
  })
   const yearTotal = useMemo(() => summarize(transactions).total, [transactions])
  return (
    <div className="space-y-3" data-testid="monthly-view">
      {groups.map((group) => {
        const bounds = monthBounds(year, group.month)
        const isOpen = expanded === group.month
        return (
          <section key={group.month} className="overflow-hidden rounded-2xl border bg-card">
            <button
              type="button"
              data-testid={`month-row-${group.month}`}
              aria-expanded={isOpen}
              onClick={() => setExpanded(isOpen ? null : group.month)}
              className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-semibold">{MONTHS[group.month].short}</span>
                <span className="truncate text-xs text-muted-foreground tabular-nums">
                  {formatDotDayMonth(bounds.start)} ~ {formatDotDayMonth(bounds.end)}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span
                  className="text-sm font-semibold tabular-nums"
                  data-testid={`month-total-${group.month}`}
                >
                  {formatCurrency(group.total, lookups.currency)}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    'size-4 text-muted-foreground transition-transform duration-200',
                    isOpen && 'rotate-180',
                  )}
                />
              </span>
            </button>

            {isOpen && (
              <div className="border-t">
                {group.weeks.map((week) => (
                  <div
                    key={`${group.month}-${week.start}`}
                    data-testid={`week-row-${week.start}`}
                    className="flex items-center justify-between gap-3 border-b px-3 py-2.5 pl-5 last:border-b-0"
                  >
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatDotDayMonth(fromIso(week.start))} ~{' '}
                      {formatDotDayMonth(addDays(fromIso(week.start), 6))}
                    </span>
                    <span className="text-sm tabular-nums">
                      {formatCurrency(week.total, lookups.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}

      <div
        data-testid="monthly-total-row"
        className="flex items-center justify-between gap-3 rounded-2xl border bg-secondary/40 px-3 py-3"
      >
        <span className="text-sm font-semibold">Total</span>
        <span className="text-base font-bold tabular-nums">
          {formatCurrency(yearTotal, lookups.currency)}
        </span>
      </div>
    </div>
  )
}
