'use client'

import { useRef } from 'react'
import { ArrowLeftRight, Check, ReceiptText, Star, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/components/language-provider'
import { cn } from '@/lib/utils'
import type { Asset, Category, Currency, Transaction } from '@/lib/db'
import { formatCurrency, formatMonthDotYear, formatShortDate, fromIso, WEEKDAYS_SHORT } from '@/lib/format'
import { amountOf, groupByDate } from '@/lib/transaction-utils'

export type Lookups = {
  categories: Map<string, Category>
  assets: Map<string, Asset>
  currency: Currency | null
  tags?: Map<string, string[]>
  showTime?: boolean
}

export function categoryDetailsFor(tx: Transaction, lookups: Lookups): { main: string; sub?: string } {
  if (tx.DO_TYPE === 'transfer' || tx.DO_TYPE === '3' || tx.DO_TYPE === '4') {
    return { main: 'Transfer' }
  }
  if (tx.DO_TYPE === 'adjustment' || tx.DO_TYPE === '7' || tx.DO_TYPE === '8') {
    return { main: 'Selisih saldo' }
  }
  const category = tx.ctgUid ? lookups.categories.get(tx.ctgUid) : undefined
  if (!category) {
    return { main: tx.CATEGORY_NAME || 'Tanpa kategori' }
  }
  if (category.STATUS === 2 && category.pUid) {
    const parent = lookups.categories.get(category.pUid)
    return {
      main: parent?.NAME ?? category.NAME,
      sub: category.NAME,
    }
  }
  return { main: category.NAME }
}

export function categoryLabelFor(tx: Transaction, lookups: Lookups): string {
  const details = categoryDetailsFor(tx, lookups)
  return details.sub ? `${details.main} › ${details.sub}` : details.main
}

export function assetLabelFor(tx: Transaction, lookups: Lookups): string {
  const from = lookups.assets.get(tx.assetUid)?.NIC_NAME ?? tx.ASSET_NIC ?? 'Tanpa aset'
  if (tx.DO_TYPE === 'transfer' || tx.DO_TYPE === '3' || tx.DO_TYPE === '4') {
    const to = tx.toAssetUid ? (lookups.assets.get(tx.toAssetUid)?.NIC_NAME ?? tx.toAssetUid) : '—'
    if (tx.DO_TYPE === '4') {
      return `${to} → ${from}`
    }
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
  bulkMode,
  selected,
  onToggleSelect,
  onLongPress,
  scopeAssetUid,
}: {
  tx: Transaction
  lookups: Lookups
  onOpen: (tx: Transaction) => void
  leading?: React.ReactNode
  showDate?: boolean
  bulkMode?: boolean
  selected?: boolean
  onToggleSelect?: (tx: Transaction) => void
  onLongPress?: (tx: Transaction) => void
  scopeAssetUid?: string
}) {
  const amount = amountOf(tx)
  const isIncome = tx.DO_TYPE === 'income' || tx.DO_TYPE === '0' || tx.DO_TYPE === '2'
  const isTransfer = tx.DO_TYPE === 'transfer' || tx.DO_TYPE === '3' || tx.DO_TYPE === '4'
  const isAdj = tx.DO_TYPE === 'adjustment' || tx.DO_TYPE === '7' || tx.DO_TYPE === '8'
  const isExpense = tx.DO_TYPE === 'expense' || tx.DO_TYPE === '1'
  const pressTimer = useRef<number | null>(null)

  const catDetails = categoryDetailsFor(tx, lookups)
  const accountText = assetLabelFor(tx, lookups)
  const showTime = lookups.showTime ?? false
  const timeFormatted = showTime && tx.wtime ? tx.wtime.slice(0, 5) : ''
  const hasNote = Boolean(tx.ZCONTENT && !isAdj)
  const title = hasNote ? tx.ZCONTENT! : (isAdj ? (tx.ZCONTENT || 'Selisih saldo') : accountText)

  const tagList = lookups.tags?.get(tx.uid) ?? []
  const tagsText = tagList.length > 0 ? tagList.join(', ') : ''

  // Exact Money Manager parity from DayAdapter.java:750-764:
  // When time display is off (default setting '5', '0', '2', '4'):
  // - If hasNote: subtitle is accountText (e.g. "Kas" or "BCA → Kas")
  // - If no note: subtitle is empty (or showDate in search view)
  // When time display is on (setting '1' or '3'):
  // - If hasNote: subtitle is `${timeFormatted}   ${accountText}`
  // - If no note: subtitle is timeFormatted
  const baseAccountText = hasNote
    ? (timeFormatted ? `${timeFormatted}   ${accountText}` : accountText)
    : (timeFormatted || (showDate ? formatShortDate(tx.ZDATE) : ''))

  let subTitle = baseAccountText
  if (tagsText) {
    subTitle = subTitle ? `${subTitle}, ${tagsText}` : tagsText
  }
  const handlePointerDown = () => {
    if (!onLongPress) return
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null
      onLongPress(tx)
    }, 500)
  }
  const handlePointerUp = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  return (
    <div className="flex items-stretch border-t first:border-t-0">
      {leading}
      <button
        type="button"
        data-testid={`tx-row-${tx.uid}`}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={() => (bulkMode && onToggleSelect ? onToggleSelect(tx) : onOpen(tx))}
        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        {bulkMode && (
          <span
            className={cn(
              'flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
              selected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-muted-foreground/40 bg-background',
            )}
          >
            {selected && <Check className="size-3" aria-hidden="true" />}
          </span>
        )}

        {/* Kolom 1 (Kiri): Kategori & Subkategori — lebar tetap sesuai Money Manager APK */}
        <div className="w-20 sm:w-24 shrink-0 overflow-hidden text-left">
          <p
            className="truncate text-xs font-semibold text-foreground"
            data-testid={`tx-category-${tx.uid}`}
            title={catDetails.main}
          >
            {catDetails.main}
          </p>
          {catDetails.sub && (
            <p className="truncate text-[11px] text-muted-foreground" title={catDetails.sub}>
              {catDetails.sub}
            </p>
          )}
        </div>

        {/* Kolom 2 (Tengah): Catatan (ZCONTENT) / Akun & Waktu (wtime) */}
        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium text-foreground">
              {title}
            </p>
            {tx.MARK === 1 && (
              <Star
                aria-label="Ditandai"
                className="size-3 shrink-0 fill-amber-400 text-amber-400"
              />
            )}
          </div>
          <p
            className="truncate text-xs text-muted-foreground"
            data-testid={`tx-asset-${tx.uid}`}
          >
            {subTitle}
          </p>
          {hasNote && tx.ZDATA && (
            <span
              className="mt-0.5 block truncate text-[11px] text-muted-foreground/75"
              data-testid={`tx-note-${tx.uid}`}
            >
              {tx.ZDATA}
            </span>
          )}
        </div>

        {/* Kolom 3 (Kanan): Nominal Transaksi & Biaya */}
        <div className="shrink-0 text-right">
          {(() => {
            const displayAmount = formatCurrency(amount, lookups.currency)
            let amountColor = 'text-foreground font-medium'
            let showFee = false

            if (scopeAssetUid) {
              if (isTransfer) {
                if (tx.assetUid === scopeAssetUid) {
                  amountColor = 'text-destructive font-semibold'
                  showFee = Number(tx.FEE) > 0
                } else if (tx.toAssetUid === scopeAssetUid) {
                  amountColor = 'text-blue-600 dark:text-blue-400 font-semibold'
                  showFee = false
                }
              } else if (isIncome || (isAdj && amount >= 0)) {
                amountColor = 'text-blue-600 dark:text-blue-400 font-semibold'
              } else if (isExpense || (isAdj && amount < 0)) {
                amountColor = 'text-destructive font-semibold'
              }
            } else {
              if (isTransfer) {
                amountColor = 'text-foreground font-medium'
                showFee = Number(tx.FEE) > 0
              } else if (isIncome || (isAdj && amount >= 0)) {
                amountColor = 'text-blue-600 dark:text-blue-400 font-semibold'
              } else if (isExpense || (isAdj && amount < 0)) {
                amountColor = 'text-destructive font-semibold'
              }
            }

            return (
              <>
                <span
                  data-testid={`tx-amount-${tx.uid}`}
                  className={cn('text-sm tabular-nums', amountColor)}
                >
                  {displayAmount}
                </span>
                {showFee && (
                  <span className="block text-[11px] text-muted-foreground tabular-nums">
                    +Biaya: {formatCurrency(Number(tx.FEE), lookups.currency)}
                  </span>
                )}
              </>
            )
          })()}
        </div>
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
  const { t } = useTranslation()
  const displayHint = hint ?? t.transaction.emptyHint

  return (
    <div
      data-testid={testId}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center"
    >
      <span className="mb-3 flex size-14 items-center justify-center rounded-full bg-secondary/50 text-primary">
        <ReceiptText aria-hidden="true" className="size-6" />
      </span>
      <h2 className="text-sm font-semibold">{t.common.noData}</h2>
      {displayHint && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{displayHint}</p>}
    </div>
  )
}

/** "Harian" sub-tab: date groups with daily in/out totals. */
export function DailyTransactionList({
  transactions,
  lookups,
  onOpen,
  onAddDate,
  filterActive,
  onClearFilter,
  bulkMode,
  selectedUids,
  onToggleSelect,
  onLongPress,
  scopeAssetUid,
}: {
  transactions: Transaction[]
  lookups: Lookups
  onOpen: (tx: Transaction) => void
  onAddDate?: (dateIso: string) => void
  filterActive?: boolean
  onClearFilter?: () => void
  bulkMode?: boolean
  selectedUids?: Set<string>
  onToggleSelect?: (tx: Transaction) => void
  onLongPress?: (tx: Transaction) => void
  scopeAssetUid?: string
}) {
  if (transactions.length === 0) {
    return (
      <div className="space-y-3">
        {filterActive && onClearFilter && <FilterChip onClear={onClearFilter} />}
        <TransactionsEmpty />
      </div>
    )
  }

  const groups = groupByDate(transactions, scopeAssetUid)

  return (
    <div className="space-y-3">
      {filterActive && onClearFilter && <FilterChip onClear={onClearFilter} />}
      {groups.map((group) => {
        const date = fromIso(group.date)
        return (
          <section key={group.date} data-testid={`day-group-${group.date}`}>
            <div className="flex items-baseline justify-between gap-2 px-1 pb-1.5">
              <h2
                className={cn(
                  'flex items-center gap-1.5',
                  onAddDate && !bulkMode && 'cursor-pointer select-none transition-opacity hover:opacity-75',
                )}
                onClick={() => {
                  if (onAddDate && !bulkMode) onAddDate(group.date)
                }}
                role={onAddDate && !bulkMode ? 'button' : undefined}
                tabIndex={onAddDate && !bulkMode ? 0 : undefined}
                aria-label={`Tambah transaksi pada ${group.date}`}
              >
                <span className="text-lg font-bold tabular-nums text-foreground leading-none">
                  {String(date.getDate()).padStart(2, '0')}
                </span>
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[11px] font-semibold leading-tight',
                    date.getDay() === 0 && 'bg-red-500/15 text-red-600 dark:text-red-400',
                    date.getDay() === 6 && 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
                    date.getDay() !== 0 && date.getDay() !== 6 && 'bg-secondary text-muted-foreground',
                  )}
                >
                  {WEEKDAYS_SHORT[date.getDay()]}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatMonthDotYear(group.date)}
                </span>
              </h2>
              <p
                className="flex items-center gap-2.5 text-xs tabular-nums"
                data-testid={`day-total-${group.date}`}
              >
                {group.income > 0 && (
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {formatCurrency(group.income, lookups.currency)}
                  </span>
                )}
                {group.expense > 0 && (
                  <span className="font-semibold text-destructive">
                    {formatCurrency(group.expense, lookups.currency)}
                  </span>
                )}
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border bg-card">
              {group.items.map((tx) => (
                <TransactionRow
                  key={tx.uid}
                  tx={tx}
                  lookups={lookups}
                  onOpen={onOpen}
                  bulkMode={bulkMode}
                  selected={selectedUids?.has(tx.uid)}
                  onToggleSelect={onToggleSelect}
                  onLongPress={onLongPress}
                  scopeAssetUid={scopeAssetUid}
                />
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
