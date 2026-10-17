'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Overlay } from '@/components/ui/overlay'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/lib/db'
import { formatAmount, formatCurrency, fromIso, toIso, WEEKDAYS_FULL } from '@/lib/format'
import { summarize, totalsByDate } from '@/lib/transaction-utils'
import { TransactionRow, TransactionsEmpty, type Lookups } from '@/components/transaction-list'

const WEEK_HEADERS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

/** "Kalender" sub-tab: monthly grid with a per-day total in every cell. */
export function TransactionCalendar({
  year,
  month,
  transactions,
  lookups,
  onOpen,
}: {
  year: number
  month: number
  transactions: Transaction[]
  lookups: Lookups
  onOpen: (tx: Transaction) => void
}) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const totals = useMemo(() => totalsByDate(transactions), [transactions])
  const summary = useMemo(() => summarize(transactions), [transactions])

  const cells = useMemo(() => {
    const first = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    // Monday-first offset: Sunday (0) becomes index 6.
    const offset = (first.getDay() + 6) % 7
    const list: (string | null)[] = Array.from({ length: offset }, () => null)
    for (let day = 1; day <= daysInMonth; day += 1) {
      list.push(toIso(new Date(year, month, day)))
    }
    return list
  }, [year, month])

  const selectedRows = useMemo(
    () => (selectedDay ? transactions.filter((tx) => tx.ZDATE === selectedDay) : []),
    [selectedDay, transactions],
  )
  const selectedTotal = useMemo(() => summarize(selectedRows), [selectedRows])

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-baseline justify-between gap-2 border-b bg-secondary/30 px-3 py-2">
          <span className="text-xs text-muted-foreground">Total periode</span>
          <span className="text-sm font-semibold tabular-nums" data-testid="calendar-total">
            {formatCurrency(summary.total, lookups.currency)}
          </span>
        </div>

        <div className="grid grid-cols-7 border-b bg-secondary/20">
          {WEEK_HEADERS.map((label) => (
            <span
              key={label}
              className="py-2 text-center text-[11px] font-medium text-muted-foreground"
            >
              {label}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((iso, index) => {
            if (!iso) {
              return <span key={`blank-${index}`} aria-hidden="true" className="min-h-14 border-b border-r last:border-r-0" />
            }
            const total = totals.get(iso) ?? 0
            const day = fromIso(iso).getDate()
            const hasData = totals.has(iso)
            return (
              <button
                key={iso}
                type="button"
                data-testid={`calendar-cell-${iso}`}
                aria-label={`${WEEKDAYS_FULL[fromIso(iso).getDay()]} ${day}, total ${formatCurrency(total, lookups.currency)}`}
                onClick={() => setSelectedDay(iso)}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 border-b border-r px-0.5 py-1 transition-colors last:border-r-0',
                  'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                )}
              >
                <span className="text-xs font-semibold tabular-nums">{day}</span>
                {hasData ? (
                  <span
                    className={cn(
                      'max-w-full truncate text-[10px] leading-tight tabular-nums',
                      total >= 0 ? 'text-primary' : 'text-destructive',
                    )}
                  >
                    {formatAmount(total)}
                  </span>
                ) : (
                  <span className="text-[10px] leading-tight text-transparent">–</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <Overlay
        open={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        align="bottom"
        testId="calendar-day-dialog"
        label="Ringkasan hari"
      >
        <div className="mx-auto flex max-h-[75vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border bg-card shadow-xl">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold" data-testid="calendar-day-title">
                {selectedDay
                  ? `${WEEKDAYS_FULL[fromIso(selectedDay).getDay()]}, ${fromIso(selectedDay).getDate()}/${fromIso(selectedDay).getMonth() + 1}/${fromIso(selectedDay).getFullYear()}`
                  : ''}
              </h2>
              <p className="text-xs text-muted-foreground">
                Pendapatan {formatCurrency(selectedTotal.income, lookups.currency)} · Pengeluaran{' '}
                {formatCurrency(selectedTotal.expense, lookups.currency)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              aria-label="Tutup"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {selectedRows.length === 0 ? (
              <TransactionsEmpty hint="Tidak ada transaksi pada tanggal ini." />
            ) : (
              <div className="overflow-hidden rounded-xl border bg-card">
                {selectedRows.map((tx) => (
                  <TransactionRow
                    key={tx.uid}
                    tx={tx}
                    lookups={lookups}
                    onOpen={(row) => {
                      setSelectedDay(null)
                      onOpen(row)
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Overlay>
    </div>
  )
}
