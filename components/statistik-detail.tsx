'use client'

import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FullScreenSheet } from '@/components/ui/overlay'
import { MonthlyBarChart } from '@/components/statistik-chart'
import { useTranslation } from '@/components/language-provider'
import { TransactionRow, TransactionsEmpty, type Lookups } from '@/components/transaction-list'
import { formatCurrency } from '@/lib/format'
import type { Transaction } from '@/lib/db'
import {
  formatPercent,
  type CategoryStat,
  type SubStat,
  type TrendPoint,
} from '@/lib/statistics-utils'

type StatistikDetailProps = {
  open: boolean
  stat: CategoryStat | null
  /** Transactions of this category inside the active range. */
  rows: Transaction[]
  /** Sub-category split of `rows` (the "Semua" row is rendered here). */
  subStats: SubStat[]
  /** Monthly totals for the trend chart. */
  trend: TrendPoint[]
  rangeLabel: string
  /** "bulanan" / "tahunan" / … for the total row label. */
  modeNoun: string
  lookups: Lookups
  onClose: () => void
  onOpenTransaction: (tx: Transaction) => void
}

/**
 * `StatsDetail` drill-down (PRD-13 §3.2.6): total for the period, split per
 * sub-category, a monthly bar chart and the matching transactions.
 */
export function StatistikDetail({
  open,
  stat,
  rows,
  subStats,
  trend,
  rangeLabel,
  modeNoun,
  lookups,
  onClose,
  onOpenTransaction,
}: StatistikDetailProps) {
  const { t, language } = useTranslation()
  if (!open || !stat) return null
  const subTotal = subStats.reduce((sum, sub) => sum + sub.amount, 0)
  const restAmount = stat.amount - subTotal
  const restPercent = stat.amount > 0 ? (restAmount / stat.amount) * 100 : 0

  return (
    <FullScreenSheet open={open} testId="stats-detail">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/85 px-3 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl">
        <Button variant="ghost" size="icon-sm" aria-label="Kembali" onClick={onClose}>
          <ChevronLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold tracking-tight" data-testid="stats-detail-title">
            {stat.name}
          </h1>
          <p className="truncate text-xs text-muted-foreground">{rangeLabel}</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-3 px-4 py-4">
          <div className="rounded-2xl border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {language === 'en'
                ? (modeNoun === 'bulanan'
                    ? t.stats.detail.monthlyTotal
                    : modeNoun === 'tahunan'
                    ? t.stats.detail.yearlyTotal
                    : modeNoun === 'mingguan'
                    ? t.stats.detail.weeklyTotal
                    : t.stats.detail.periodTotal)
                : `Total ${modeNoun}`}
            </p>
            <p
              data-testid="stats-detail-total"
              className="mt-0.5 text-lg font-bold tabular-nums"
            >
              {formatCurrency(stat.amount, lookups.currency)}
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border bg-card">
            <SubRow
              testId="stats-detail-sub-all"
              name={t.stats.detail.all}
              percent={100}
              amount={stat.amount}
              currency={lookups.currency}
              emphasis
            />
            {subStats.map((sub) => (
              <SubRow
                key={sub.uid}
                testId={`stats-detail-sub-${sub.uid}`}
                name={sub.name}
                percent={sub.percent}
                amount={sub.amount}
                currency={lookups.currency}
              />
            ))}
            <SubRow
              testId="stats-detail-sub-rest"
              name={t.stats.detail.other}
              percent={restPercent}
              amount={restAmount}
              currency={lookups.currency}
            />
          </div>

          {stat.amount > 0 && <MonthlyBarChart points={trend} currency={lookups.currency} />}

          <section data-testid="stats-detail-transactions">
            <h2 className="px-1 pb-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {t.transaction.title}
            </h2>
            {rows.length === 0 ? (
              <TransactionsEmpty testId="stats-detail-empty" />
            ) : (
              <div className="overflow-hidden rounded-2xl border bg-card">
                {rows.map((tx) => (
                  <TransactionRow
                    key={tx.uid}
                    tx={tx}
                    lookups={lookups}
                    onOpen={onOpenTransaction}
                    showDate
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </FullScreenSheet>
  )
}

function SubRow({
  testId,
  name,
  percent,
  amount,
  currency,
  emphasis,
}: {
  testId: string
  name: string
  percent: number
  amount: number
  currency: Lookups['currency']
  emphasis?: boolean
}) {
  return (
    <div
      data-testid={testId}
      className="flex items-center gap-3 border-t px-4 py-2.5 first:border-t-0"
    >
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {formatPercent(percent)}
      </span>
      <span
        className={emphasis ? 'shrink-0 text-sm font-bold tabular-nums' : 'shrink-0 text-sm font-semibold tabular-nums'}
      >
        {formatCurrency(amount, currency)}
      </span>
    </div>
  )
}
