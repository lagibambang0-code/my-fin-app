'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { BarChart3, ChevronLeft, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TransactionForm } from '@/components/transaction-form'
import { softDeleteTransaction, sortTransactionsDesc } from '@/lib/db'
import { FullScreenSheet } from '@/components/ui/overlay'
import { MonthNavigator, type MonthValue } from '@/components/month-navigator'
import { useTranslation } from '@/components/language-provider'
import { cn } from '@/lib/utils'
import {
  db,
  type Asset,
  type Category,
  type Currency,
  type Transaction,
  getAllCategories,
  getCurrencyByUid,
  getSettingByKey,
  getTransactionTagMap,
  getTransactionsTouchingAsset,
} from '@/lib/db'
import { formatCurrency, formatDotRange, fromIso, todayIso } from '@/lib/format'
import { DailyTransactionList, TransactionsEmpty, type Lookups } from '@/components/transaction-list'
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
  if ((tx.DO_TYPE === 'income' || tx.DO_TYPE === '0' || tx.DO_TYPE === '2') && tx.assetUid === assetUid) return amount
  if ((tx.DO_TYPE === 'expense' || tx.DO_TYPE === '1') && tx.assetUid === assetUid) return -amount
  if (tx.DO_TYPE === 'transfer' || tx.DO_TYPE === '3') {
    let delta = 0
    const feeAmount = tx.txUidFee ? 0 : (Number(tx.FEE) || 0)
    if (tx.assetUid === assetUid) delta -= amount + feeAmount
    if (tx.toAssetUid === assetUid && !tx.txUidTrans) delta += Number(tx.IN_ZMONEY) || amount
    return delta
  }
  if (tx.DO_TYPE === '4' && tx.assetUid === assetUid) return amount
  if ((tx.DO_TYPE === 'adjustment' || tx.DO_TYPE === '7') && tx.assetUid === assetUid) return amount
  if (tx.DO_TYPE === '8' && tx.assetUid === assetUid) return -amount
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
  const [categoriesList, setCategoriesList] = useState<Category[]>([])
  const [assetsList, setAssetsList] = useState<Asset[]>([])
  const [tagsMap, setTagsMap] = useState<Map<string, string[]>>(new Map())
  const [showTime, setShowTime] = useState<boolean>(false)
  const [formOpen, setFormOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [initialDate, setInitialDate] = useState<string | null>(null)
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
    const reload = async () => {
      const [cur, touching, categories, assets, tagMap, timeSetting] = await Promise.all([
        getCurrencyByUid(asset.currencyUid),
        getTransactionsTouchingAsset(asset.uid),
        getAllCategories(),
        db.assets.toArray() as Promise<Asset[]>,
        getTransactionTagMap(),
        getSettingByKey('time_display_order'),
      ])
      if (!active) return
      setCurrency(cur ?? null)
      setRows(touching)
      setCategoriesList(categories)
      setAssetsList(assets)
      setTagsMap(tagMap)
      setShowTime(timeSetting?.ZDATA === '1' || timeSetting?.ZDATA === '3')
    }
    void reload()
    window.addEventListener('dompetku:transactions-changed', reload)
    return () => {
      active = false
      window.removeEventListener('dompetku:transactions-changed', reload)
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

  const lookups: Lookups = useMemo(() => ({
    categories: new Map(categoriesList.map((c) => [c.uid, c])),
    assets: new Map(assetsList.map((a) => [a.uid, a])),
    currency,
    tags: tagsMap,
    showTime,
  }), [categoriesList, assetsList, currency, tagsMap, showTime])

  if (!asset) return null

  const periodRows = rows
    .filter((tx) => {
      const date = fromIso(tx.ZDATE)
      return date >= range.start && date <= range.end
    })
    .sort(sortTransactionsDesc)

  let deposit = 0
  let withdrawal = 0
  for (const tx of periodRows) {
    const delta = assetDelta(tx, asset.uid)
    if (delta > 0) deposit += delta
    else withdrawal += Math.abs(delta)
  }

  const total = deposit - withdrawal
  const running = rows.reduce((sum, tx) => sum + assetDelta(tx, asset.uid), 0)

  // Saldo awal tahun: akumulasi seluruh mutasi sebelum tahun ini.
  let chartRunning = 0
  for (const tx of rows) {
    const date = fromIso(tx.ZDATE)
    if (date.getFullYear() < period.year) {
      chartRunning += assetDelta(tx, asset.uid)
    }
  }
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
        <h1 className="min-w-0 flex-1 truncate text-base font-bold tracking-tight sm:text-lg">
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
                  'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3 sm:py-2 sm:text-sm',
                  mode === m.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-secondary',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs sm:text-sm">
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
          <h2 className="mt-6 mb-2 text-xs font-semibold sm:text-sm">{t.transaction.title}</h2>
          {periodRows.length === 0 ? (
            <TransactionsEmpty hint={t.stats.noData} />
          ) : (
          <DailyTransactionList
            transactions={periodRows}
            lookups={lookups}
            onOpen={(tx) => {
              setEditingTx(tx)
              setInitialDate(null)
              setFormKey((k) => k + 1)
              setFormOpen(true)
            }}
            onAddDate={(dateIso) => {
              setEditingTx(null)
              setInitialDate(dateIso)
              setFormKey((k) => k + 1)
              setFormOpen(true)
            }}
            scopeAssetUid={asset.uid}
          />
        )}
            </>
          )}
        </div>
      </div>
      {/* FAB: Catat transaksi untuk aset ini */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-30 mx-auto w-full max-w-lg px-4">
        <div className="flex justify-end">
          <Button
            type="button"
            size="icon-lg"
            aria-label="Catat transaksi untuk aset ini"
            data-testid="asset-detail-fab"
            onClick={() => {
              setEditingTx(null)
              setInitialDate(null)
              setFormKey((k) => k + 1)
              setFormOpen(true)
            }}
            className="pointer-events-auto size-14 rounded-full shadow-lg transition-transform duration-200 ease-out-quart hover:scale-[1.03] active:scale-95 [&_svg:not([class*='size-'])]:size-6"
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>
      </div>

      {formOpen && (
        <TransactionForm
          key={formKey}
          open
          transaction={editingTx}
          initial={{
            assetUid: asset.uid,
            assetName: asset.NIC_NAME,
            date: initialDate ?? undefined,
            time: initialDate && initialDate < todayIso() ? '20:55' : undefined,
          }}
          onClose={() => {
            setFormOpen(false)
            setEditingTx(null)
            setInitialDate(null)
          }}
          onSaved={async () => {
            setFormOpen(false)
            setEditingTx(null)
            setInitialDate(null)
            const [touching, cats, asts] = await Promise.all([
              getTransactionsTouchingAsset(asset.uid),
              getAllCategories(),
              db.assets.toArray() as Promise<Asset[]>,
            ])
            setRows(touching)
            setCategoriesList(cats)
            setAssetsList(asts)
          }}
          onDeleted={async () => {
            if (editingTx?.id) await softDeleteTransaction(editingTx.id)
            setFormOpen(false)
            setEditingTx(null)
            setInitialDate(null)
            const [touching, cats, asts] = await Promise.all([
              getTransactionsTouchingAsset(asset.uid),
              getAllCategories(),
              db.assets.toArray() as Promise<Asset[]>,
            ])
            setRows(touching)
            setCategoriesList(cats)
            setAssetsList(asts)
          }}
          onOpenBookmarks={() => {}}
          onCopy={() => {}}
        />
      )}
    </FullScreenSheet>
  )
}

function Stat({ label, value, testId }: { label: string; value: string; testId?: string }) {
  const isLong = value.length > 11
  const isVeryLong = value.length > 14

  return (
    <div className="rounded-xl border bg-card p-2.5 sm:p-3 min-w-0">
      <dt className="truncate text-[10px] sm:text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'mt-0.5 truncate font-semibold tabular-nums tracking-tight',
          isVeryLong
            ? 'text-[10px] sm:text-xs md:text-sm'
            : isLong
            ? 'text-[11px] sm:text-[12px] md:text-base'
            : 'text-xs sm:text-sm md:text-base',
        )}
        data-testid={testId}
        title={value}
      >
        {value}
      </dd>
    </div>
  )
}
