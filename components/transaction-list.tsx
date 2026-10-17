'use client'

import { ArrowLeftRight, ReceiptText, Star, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Asset, Category, Currency, Transaction } from '@/lib/db'
import { formatCurrency, formatMonthDotYear, formatShortDate, fromIso, WEEKDAYS_SHORT } from '@/lib/format'
import { amountOf, groupByDate } from '@/lib/transaction-utils'

export type Lookups = {
  categories: Map<string, Category>
  assets: Map<string, Asset>
  currency: Currency | null
}

export function categoryLabelFor(tx: Transaction, lookups: Lookups): string {
  const category = tx.ctgUid ? lookups.categories.get(tx.ctgUid) : undefined
  if (!category) return tx.CATEGORY_NAME ?? 'Tanpa kategori'
  if (category.STATUS === 2 && category.pUid) {
    const parent = lookups.categories.get(category.pUid)
    if (parent) return `${parent.NAME} › ${category.NAME}`
  }
  return category.NAME
}

export function assetLabelFor(tx: Transaction, lookups: Lookups): string {
  const from = lookups.assets.get(tx.assetUid)?.NIC_NAME ?? tx.ASSET_NIC ?? 'Tanpa aset'
  if (tx.DO_TYPE === 'transfer') {
    const to = tx.toAssetUid ? (lookups.assets.get(tx.toAssetUid)?.NIC_NAME ?? 'Aset tujuan') : '—'
    return `${from} → ${to}`
  }
  return from
}

/** One transaction line: category · asset · amount. */
export function TransactionRow({
  tx,
  lookups,
  onOpen,
  leading,
  showDate,
}: {
  tx: Transaction
  lookups: Lookups
  onOpen: (tx: Transaction) => void
  leading?: React.ReactNode
  showDate?: boolean
}) {
  const amount = amountOf(tx)
  const isIncome = tx.DO_TYPE === 'income'
  const isTransfer = tx.DO_TYPE === 'transfer'

  return (
    <div className="flex items-stretch border-t first:border-t-0">
      {leading}
      <button
        type="button"
        data-testid={`tx-row-${tx.uid}`}
        onClick={() => onOpen(tx)}
        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            {isTransfer && (
              <ArrowLeftRight
                aria-hidden="true"
                className="size-3.5 shrink-0 text-muted-foreground"
              />
            )}
            <span className="truncate text-sm font-medium" data-testid={`tx-category-${tx.uid}`}>
              {isTransfer ? 'Transfer' : categoryLabelFor(tx, lookups)}
            </span>
            {tx.MARK === 1 && (
              <Star
                aria-label="Ditandai"
                className="size-3 shrink-0 fill-primary text-primary"
              />
            )}
          </span>
          <span className="mt-0.5 flex items-center gap-2">
            <span
              className="truncate text-xs text-muted-foreground"
              data-testid={`tx-asset-${tx.uid}`}
            >
              {assetLabelFor(tx, lookups)}
            </span>
            {showDate && (
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {formatShortDate(tx.ZDATE)}
              </span>
            )}
          </span>
        </span>
        <span
          data-testid={`tx-amount-${tx.uid}`}
          className={cn(
            'shrink-0 text-sm font-semibold tabular-nums',
            isIncome && 'text-primary',
            isTransfer && 'text-muted-foreground',
          )}
        >
          {formatCurrency(amount, lookups.currency)}
        </span>
      </button>
    </div>
  )
}

/** Empty state used by every transaction sub-tab (EC-01). */
export function TransactionsEmpty({
  hint,
  testId = 'transactions-empty',
}: {
  hint?: string
  testId?: string
}) {
  return (
    <div
      data-testid={testId}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center"
    >
      <span className="mb-3 flex size-14 items-center justify-center rounded-full bg-secondary/50 text-primary">
        <ReceiptText aria-hidden="true" className="size-6" />
      </span>
      <h2 className="text-sm font-semibold">Tidak ada data</h2>
      {hint && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** "Harian" sub-tab: date groups with daily in/out totals. */
export function DailyTransactionList({
  transactions,
  lookups,
  onOpen,
  filterActive,
  onClearFilter,
}: {
  transactions: Transaction[]
  lookups: Lookups
  onOpen: (tx: Transaction) => void
  filterActive?: boolean
  onClearFilter?: () => void
}) {
  if (transactions.length === 0) {
    return (
      <div className="space-y-3">
        {filterActive && onClearFilter && <FilterChip onClear={onClearFilter} />}
        <TransactionsEmpty
          hint="Tekan tombol + untuk mencatat transaksi baru pada periode ini."
        />
      </div>
    )
  }

  const groups = groupByDate(transactions)

  return (
    <div className="space-y-3">
      {filterActive && onClearFilter && <FilterChip onClear={onClearFilter} />}
      {groups.map((group) => {
        const date = fromIso(group.date)
        return (
          <section key={group.date} data-testid={`day-group-${group.date}`}>
            <div className="flex items-baseline justify-between gap-2 px-1 pb-1.5">
              <h2 className="flex items-baseline gap-1.5">
                <span className="text-base font-bold tabular-nums">{date.getDate()}</span>
                <span className="text-xs font-medium text-muted-foreground">
                  {WEEKDAYS_SHORT[date.getDay()]}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatMonthDotYear(group.date)}
                </span>
              </h2>
              <p
                className="flex items-center gap-2 text-xs tabular-nums"
                data-testid={`day-total-${group.date}`}
              >
                <span className="text-muted-foreground">
                  {formatCurrency(group.income, lookups.currency)}
                </span>
                <span className="font-medium">
                  {formatCurrency(group.expense, lookups.currency)}
                </span>
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border bg-card">
              {group.items.map((tx) => (
                <TransactionRow key={tx.uid} tx={tx} lookups={lookups} onOpen={onOpen} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

export function FilterChip({ onClear }: { onClear: () => void }) {
  return (
    <div
      data-testid="filter-chip"
      className="flex items-center justify-between gap-2 rounded-xl border border-primary/30 bg-accent/40 px-3 py-2 text-xs"
    >
      <span className="font-medium text-accent-foreground">Filter aktif</span>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        data-testid="filter-clear"
        onClick={onClear}
      >
        <X className="size-3" />
        Hapus filter
      </Button>
    </div>
  )
}
