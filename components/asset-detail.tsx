'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FullScreenSheet } from '@/components/ui/overlay'
import { MonthNavigator, type MonthValue } from '@/components/month-navigator'
import { cn } from '@/lib/utils'
import {
  type Asset,
  type Currency,
  type Transaction,
  getAllCategories,
  getCurrencyByUid,
  getTransactionsTouchingAsset,
} from '@/lib/db'
import { formatCurrency, formatDotRange, formatShortDate, fromIso } from '@/lib/format'
import { TransactionsEmpty } from '@/components/transaction-list'

type AssetDetailProps = {
  open: boolean
  asset: Asset | null
  onClose: () => void
}

type Mode = 'daily' | 'monthly' | 'yearly'

const MODES: { id: Mode; label: string }[] = [
  { id: 'daily', label: 'Harian' },
  { id: 'monthly', label: 'Bulanan' },
  { id: 'yearly', label: 'Setiap tahun' },
]

/** Signed effect of one transaction on one asset (mirrors getAssetBalanceDeltas). */
function assetDelta(tx: Transaction, assetUid: string): number {
  const amount = Number(tx.AMOUNT_ACCOUNT ?? tx.ZMONEY) || 0
  if (tx.DO_TYPE === 'income' && tx.assetUid === assetUid) return amount
  if (tx.DO_TYPE === 'expense' && tx.assetUid === assetUid) return -amount
  if (tx.DO_TYPE === 'transfer') {
    let delta = 0
    if (tx.assetUid === assetUid) delta -= amount + (Number(tx.FEE) || 0)
    if (tx.toAssetUid === assetUid) delta += Number(tx.IN_ZMONEY) || amount
    return delta
  }
  return 0
}

export function AssetDetail({ open, asset, onClose }: AssetDetailProps) {
  const today = useMemo(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  }, [])
  const [period, setPeriod] = useState<MonthValue>(today)
  const [mode, setMode] = useState<Mode>('daily')
  const [currency, setCurrency] = useState<Currency | null>(null)
  const [rows, setRows] = useState<Transaction[]>([])
  const [categoryNames, setCategoryNames] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    if (!open || !asset) return
    setMode('daily')
    setPeriod(today)
    let active = true
    ;(async () => {
      const [cur, touching, categories] = await Promise.all([
        getCurrencyByUid(asset.currencyUid),
        getTransactionsTouchingAsset(asset.uid),
        getAllCategories(),
      ])
      if (!active) return
      setCurrency(cur ?? null)
      setRows(touching)
      setCategoryNames(new Map(categories.map((category) => [category.uid, category.NAME])))
    })()
    return () => {
      active = false
    }
  }, [open, asset, today])

  const range = useMemo(() => {
    if (mode === 'yearly') {
      return { start: new Date(period.year, 0, 1), end: new Date(period.year, 11, 31) }
    }
    return {
      start: new Date(period.year, period.month, 1),
      end: new Date(period.year, period.month + 1, 0),
    }
  }, [mode, period])

  if (!asset) return null

  const periodRows = rows.filter((tx) => {
    const date = fromIso(tx.ZDATE)
    return date >= range.start && date <= range.end
  })

  let deposit = 0
  let withdrawal = 0
  for (const tx of periodRows) {
    const delta = assetDelta(tx, asset.uid)
    if (delta > 0) deposit += delta
    else withdrawal += Math.abs(delta)
  }

  const total = deposit - withdrawal
  const running =
    (asset.BALANCE || 0) + rows.reduce((sum, tx) => sum + assetDelta(tx, asset.uid), 0)

  return (
    <FullScreenSheet open={open} testId="asset-detail">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/80 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl">
        <Button variant="ghost" size="icon-sm" aria-label="Kembali" onClick={onClose}>
          <ChevronLeft className="size-5" />
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight">
          {asset.NIC_NAME}
        </h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-lg px-4 py-4">
          <div className="flex items-center justify-center">
            <MonthNavigator value={period} today={today} onChange={setPeriod} />
          </div>

          <div
            role="tablist"
            aria-label="Mode periode"
            className="mt-4 grid grid-cols-3 gap-1 rounded-xl border bg-secondary/40 p-1"
          >
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={mode === m.id}
                data-testid={`detail-mode-${m.id}`}
                onClick={() => setMode(m.id)}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  mode === m.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-secondary',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Waktu penggunaan</span>
            <span className="tabular-nums" data-testid="detail-period-range">
              {formatDotRange(range.start, range.end)}
            </span>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3">
            <Stat label="Deposit" value={formatCurrency(deposit, currency)} />
            <Stat label="Penarikan" value={formatCurrency(withdrawal, currency)} />
            <Stat label="Total" value={formatCurrency(total, currency)} />
            <Stat
              label="akumulasi saldo"
              value={formatCurrency(running, currency)}
              testId="detail-running-balance"
            />
          </dl>

          <h2 className="mt-6 mb-2 text-sm font-semibold">Transaksi</h2>
          {periodRows.length === 0 ? (
            <TransactionsEmpty hint="Belum ada transaksi aset ini pada periode terpilih." />
          ) : (
            <ul className="overflow-hidden rounded-xl border bg-card">
              {periodRows.map((tx) => {
                const delta = assetDelta(tx, asset.uid)
                const title =
                  tx.DO_TYPE === 'transfer'
                    ? 'Transfer'
                    : (tx.ctgUid ? categoryNames.get(tx.ctgUid) : null) ??
                      tx.CATEGORY_NAME ??
                      'Tanpa kategori'
                return (
                  <li
                    key={tx.uid}
                    data-testid={`detail-tx-${tx.uid}`}
                    className="flex items-center justify-between gap-3 border-t px-3 py-2.5 first:border-t-0"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{title}</span>
                      <span className="block text-xs text-muted-foreground tabular-nums">
                        {formatShortDate(tx.ZDATE)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'shrink-0 text-sm font-semibold tabular-nums',
                        delta > 0 && 'text-primary',
                        delta < 0 && 'text-destructive',
                      )}
                    >
                      {formatCurrency(delta, currency)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </FullScreenSheet>
  )
}

function Stat({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-semibold tabular-nums" data-testid={testId}>
        {value}
      </dd>
    </div>
  )
}
