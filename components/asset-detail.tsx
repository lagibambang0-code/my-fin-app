'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { BarChart3, ChevronLeft, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FullScreenSheet } from '@/components/ui/overlay'
import { MonthNavigator, type MonthValue } from '@/components/month-navigator'
import { useTranslation } from '@/components/language-provider'
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
import { MonthlyBarChart } from '@/components/statistik-chart'
import type { TrendPoint } from '@/lib/statistics-utils'

type AssetDetailProps = {
  open: boolean
  asset: Asset | null
  onClose: () => void
  /** Buka form "Informasi aset" dari kepala rincian (T-41). */
  onEdit: (asset: Asset) => void
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

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

export function AssetDetail({ open, asset, onClose, onEdit }: AssetDetailProps) {
  const { t } = useTranslation()
  const today = useMemo(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  }, [])
  const [period, setPeriod] = useState<MonthValue>(today)
  const [mode, setMode] = useState<Mode>('daily')
  const [view, setView] = useState<'list' | 'chart'>('list')
  const [currency, setCurrency] = useState<Currency | null>(null)
  const [rows, setRows] = useState<Transaction[]>([])
  const [categoryNames, setCategoryNames] = useState<Map<string, string>>(new Map())
  const swipeStart = useRef<{ x: number; y: number } | null>(null)

  const handleSwipeDown = (event: React.PointerEvent<HTMLElement>) => {
    swipeStart.current = { x: event.clientX, y: event.clientY }
  }

  const handleSwipeUp = (event: React.PointerEvent<HTMLElement>) => {
    if (!swipeStart.current) return
    const dx = event.clientX - swipeStart.current.x
    const dy = event.clientY - swipeStart.current.y
    swipeStart.current = null
    // Abaikan jika gerakan dominan vertikal (scrolling daftar)
    if (Math.abs(dx) < 35 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    // Geser kiri (dx < 0): periode berikutnya (+1)
    // Geser kanan (dx > 0): periode sebelumnya (-1)
    const delta = dx < 0 ? 1 : -1
    setPeriod((cur) => {
      if (mode === 'yearly') {
        return { ...cur, year: cur.year + delta }
      }
      const nextMonth = cur.month + delta
      const nextYear = cur.year + Math.floor(nextMonth / 12)
      const normalizedMonth = ((nextMonth % 12) + 12) % 12
      return { year: nextYear, month: normalizedMonth }
    })
  }
  useEffect(() => {
    if (!open || !asset) return
    setMode('daily')
    setView('list')
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

  // Saldo awal tahun = saldo sekarang − seluruh mutasi yang sudah tercatat.
  const allDelta = rows.reduce((sum, tx) => sum + assetDelta(tx, asset.uid), 0)
  let chartRunning = (asset.BALANCE || 0) - allDelta
  const chartPoints: TrendPoint[] = SHORT_MONTHS.map((label, month) => {
    for (const tx of rows) {
      const date = fromIso(tx.ZDATE)
      if (date.getFullYear() === period.year && date.getMonth() === month) {
        chartRunning += assetDelta(tx, asset.uid)
      }
    }
    return { key: `${period.year}-${month + 1}`, label, amount: chartRunning }
  })

  return (
    <FullScreenSheet open={open} testId="asset-detail">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/80 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl">
        <Button variant="ghost" size="icon-sm" aria-label="Kembali" onClick={onClose}>
          <ChevronLeft className="size-5" />
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight">
          {asset.NIC_NAME}
        </h1>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Statistik aset"
          aria-pressed={view === 'chart'}
          data-testid="asset-detail-stats"
          onClick={() => setView((current) => (current === 'chart' ? 'list' : 'chart'))}
        >
          <BarChart3 className="size-4.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Ubah aset"
          data-testid="asset-detail-edit-button"
          onClick={() => onEdit(asset)}
        >
          <Pencil className="size-4.5" />
        </Button>
      </header>

      <div
        className="min-h-0 flex-1 overflow-y-auto touch-pan-y"
        onPointerDown={handleSwipeDown}
        onPointerUp={handleSwipeUp}
        onPointerCancel={() => {
          swipeStart.current = null
        }}
      >
        <div className="mx-auto w-full max-w-lg px-4 py-4">
          <div className="flex items-center justify-center">
            <MonthNavigator value={period} today={today} onChange={setPeriod} />
          </div>

          <div
            role="tablist"
            aria-label="Mode periode"
            className="mt-4 grid grid-cols-3 gap-1 rounded-xl border bg-secondary/40 p-1"
          >
            {[
              { id: 'daily' as const, label: t.asset.daily },
              { id: 'monthly' as const, label: t.asset.monthly },
              { id: 'yearly' as const, label: t.asset.yearly },
            ].map((m) => (
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
            <span className="text-muted-foreground">{t.asset.usagePeriod}</span>
            <span className="tabular-nums" data-testid="detail-period-range">
              {formatDotRange(range.start, range.end)}
            </span>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3">
            <Stat label={t.asset.deposit} value={formatCurrency(deposit, currency)} />
            <Stat label={t.asset.withdrawal} value={formatCurrency(withdrawal, currency)} />
            <Stat label={t.asset.total} value={formatCurrency(total, currency)} />
            <Stat
              label={t.asset.accumulatedBalance}
              value={formatCurrency(running, currency)}
              testId="detail-running-balance"
            />
          </dl>

          {view === 'chart' ? (
            <div className="mt-6">
              <MonthlyBarChart points={chartPoints} currency={currency} testId="detail-chart" />
            </div>
          ) : (
            <>
          <h2 className="mt-6 mb-2 text-sm font-semibold">{t.transaction.title}</h2>
          {periodRows.length === 0 ? (
            <TransactionsEmpty hint={t.stats.noData} />
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
            </>
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
