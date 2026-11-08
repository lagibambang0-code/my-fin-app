'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Pencil,
  Plus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FullScreenSheet } from '@/components/ui/overlay'
import { useTranslation } from '@/components/language-provider'
import {
  type Currency,
  type InvestmentAsset,
  type InvestmentRecord,
  getCurrencyByUid,
  getInvestmentRecords,
  getMainCurrency,
} from '@/lib/db'
import { formatCurrency, formatPercent3, formatShortDate } from '@/lib/format'
import { InvestmentChart } from '@/components/investment-chart'
import { InvestmentFormSheet } from '@/components/investment-form-sheet'
import { InvestmentRecordSheet } from '@/components/investment-record-sheet'
import { cn } from '@/lib/utils'

type InvestmentDetailScreenProps = {
  open: boolean
  investment: InvestmentAsset | null
  onClose: () => void
  onUpdated: () => void
}

export function InvestmentDetailScreen({
  open,
  investment,
  onClose,
  onUpdated,
}: InvestmentDetailScreenProps) {
  const { t } = useTranslation()
  const [records, setRecords] = useState<InvestmentRecord[]>([])
  const [currency, setCurrency] = useState<Currency | null>(null)
  const [recordSheetOpen, setRecordSheetOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<InvestmentRecord | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [historyFilter, setHistoryFilter] = useState<'all' | 'deposit' | 'pnl'>('all')

  const load = useCallback(async () => {
    if (!investment?.uid) return
    setLoading(true)
    try {
      const [recList, cur, main] = await Promise.all([
        getInvestmentRecords(investment.uid),
        investment.currencyUid ? getCurrencyByUid(investment.currencyUid) : Promise.resolve(undefined),
        getMainCurrency(),
      ])
      setRecords(recList)
      setCurrency(cur ?? main ?? null)
    } finally {
      setLoading(false)
    }
  }, [investment])

  useEffect(() => {
    if (open) {
      load()
    }
  }, [open, load])
  // Urutkan rekaman kronologis terlama ke terbaru
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) =>
      a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date),
    )
  }, [records])

  // Turunkan garis waktu portofolio: capital, pnl, dan amount berjalan secara deterministik
  const derivedTimeline = useMemo(() => {
    let runningCapital = 0
    let latestPnl = 0

    return sortedRecords.map((r: InvestmentRecord) => {
      const isDeposit = r.type === 'deposit'
      if (isDeposit) {
        runningCapital += r.amount
      } else {
        latestPnl = r.amount
      }
      const amount = runningCapital + latestPnl
      return {
        ...r,
        derivedCapital: runningCapital,
        derivedPnl: latestPnl,
        derivedAmount: amount,
      }
    })
  }, [sortedRecords])
  const count = derivedTimeline.length
  const currentRecord = count > 0 ? derivedTimeline[count - 1] : null
  const prevRecord = count > 1 ? derivedTimeline[count - 2] : null

  const currentValue = currentRecord?.derivedAmount ?? 0
  const previousValue = prevRecord?.derivedAmount ?? currentValue

  const totalDeposit = currentRecord?.derivedCapital ?? 0
  const pnlAmount = currentRecord?.derivedPnl ?? 0
  const pnlPercent = totalDeposit > 0 ? (pnlAmount / totalDeposit) * 100 : 0

  const latestDiff = currentRecord && prevRecord ? currentRecord.derivedAmount - previousValue : 0
  const latestPercent = previousValue > 0 ? (latestDiff / previousValue) * 100 : 0

  // Filter riwayat catatan nilai berdasarkan segmen All, Deposit, atau PnL
  const filteredHistory = derivedTimeline.filter((rec) => {
    if (historyFilter === 'deposit') return rec.type === 'deposit'
    if (historyFilter === 'pnl') return rec.type === 'pnl'
    return true
  })

  if (!open || !investment) return null

  return (
    <FullScreenSheet open={open} onClose={onClose} testId="investment-detail-screen">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/85 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon-sm" aria-label="Kembali" onClick={onClose}>
            <ChevronLeft className="size-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight" data-testid="investment-detail-title">
              {investment.name}
            </h1>
            <p className="truncate text-[11px] text-muted-foreground">
              {t.investments.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Ubah aset"
            data-testid="investment-edit-asset-button"
            onClick={() => setFormOpen(true)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            size="sm"
            className="gap-1 text-xs font-semibold"
            data-testid="investment-record-value-button"
            onClick={() => {
              setEditingRecord(null)
              setRecordSheetOpen(true)
            }}
          >
            <Plus className="size-3.5" />
            <span>{t.investments.recordValue}</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4 md:px-10">
        <div className="mx-auto w-full max-w-lg space-y-4">
          {/* Kartu Bagian Tengah: Menampilkan Nominal & Persentase Kenaikan/Penurunan */}
          {/* Kartu Bagian Atas: Menampilkan Nilai Deposit, Nilai Sekarang, dan PnL */}
          <div
            data-testid="investment-summary-card"
            className="rounded-2xl border bg-card p-5 text-center shadow-xs"
          >
            <div className="grid grid-cols-2 gap-3 pb-3 border-b text-left">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {t.investments.totalDeposit}
                </p>
                <p data-testid="investment-total-deposit" className="mt-0.5 text-base font-bold tabular-nums text-foreground">
                  {formatCurrency(totalDeposit, currency)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {t.investments.pnlLabel}
                </p>
                <p
                  data-testid="investment-pnl-value"
                  className={cn(
                    'mt-0.5 text-base font-bold tabular-nums',
                    pnlAmount > 0
                      ? 'text-emerald-500'
                      : pnlAmount < 0
                      ? 'text-rose-500'
                      : 'text-muted-foreground',
                  )}
                >
                  {pnlAmount > 0 ? '+' : ''}
                  {formatCurrency(pnlAmount, currency)}
                </p>
              </div>
            </div>

            <p className="mt-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t.investments.currentValuation}
            </p>
            <p
              data-testid="investment-current-value"
              className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums text-foreground"
            >
              {formatCurrency(currentValue, currency)}
            </p>

            {/* Metrik PnL Keseluruhan dan Perubahan Terbaru */}
            <div className="mt-3 flex items-center justify-center gap-2 border-t pt-3">
              <div
                data-testid="investment-pnl-badge"
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums',
                  pnlAmount > 0
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : pnlAmount < 0
                    ? 'bg-rose-500/10 text-rose-500'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {pnlAmount > 0 ? (
                  <TrendingUp className="size-3.5" />
                ) : pnlAmount < 0 ? (
                  <TrendingDown className="size-3.5" />
                ) : null}
                <span>
                  Total PnL: {pnlAmount > 0 ? '+' : ''}
                  {formatPercent3(pnlPercent)}
                </span>
              </div>

              {count > 1 && (
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  Terakhir: {latestDiff > 0 ? '+' : ''}
                  {formatPercent3(latestPercent)}
                </span>
              )}
            </div>
          </div>

          {/* Grafik Garis (Line Chart) Portofolio */}
          <div>
            <h2 className="mb-2 px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {t.investments.valueTrend}
            </h2>
            <InvestmentChart records={records} currency={currency} />
          </div>

          {/* Riwayat Catatan Nilai */}
          <div>
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {t.investments.historyTitle}
              </h2>
              {/* Segmented Filter: All, Deposit, PnL */}
              <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 text-xs font-semibold" data-testid="investment-history-filter">
                {(['all', 'deposit', 'pnl'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    data-testid={`investment-filter-${tab}`}
                    onClick={() => setHistoryFilter(tab)}
                    className={cn(
                      'px-2 py-0.5 rounded-md transition-all',
                      historyFilter === tab
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {tab === 'all' ? 'All' : tab === 'deposit' ? 'Deposit' : 'PnL'}
                  </button>
                ))}
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="rounded-2xl border bg-card p-8 text-center">
                <Calendar className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                <p className="text-sm font-semibold">{t.investments.emptyTitle}</p>
                <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto">
                  {historyFilter === 'deposit'
                    ? 'Belum ada entri deposit modal.'
                    : historyFilter === 'pnl'
                    ? 'Belum ada entri catatan PnL.'
                    : t.investments.noRecords}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border bg-card divide-y">
                {/* Tampilkan urutan kronologis terbaru di atas */}
                {[...filteredHistory].reverse().map((rec) => {
                  const originalIndex = derivedTimeline.findIndex((r: InvestmentRecord) => r.uid === rec.uid)
                  const isDeposit = rec.type === 'deposit'
                  const cumPnl = rec.derivedPnl
                  const pnlPct = rec.derivedCapital > 0 ? (cumPnl / rec.derivedCapital) * 100 : 0

                  let prevPnlVal = 0
                  for (let i = originalIndex - 1; i >= 0; i--) {
                    const prevR = derivedTimeline[i]
                    if (prevR.type === 'pnl') {
                      prevPnlVal = prevR.derivedPnl
                      break
                    }
                  }
                  const deltaPnl = cumPnl - prevPnlVal
                  return (
                    <button
                      key={rec.uid}
                      type="button"
                      data-testid={`investment-record-row-${rec.uid}`}
                      onClick={() => {
                        setEditingRecord(rec)
                        setRecordSheetOpen(true)
                      }}
                      className="flex w-full items-center justify-between p-3.5 text-left transition-colors hover:bg-secondary"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm tabular-nums">
                            {formatShortDate(rec.date)}
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {rec.time}
                          </span>
                          <span
                            className={cn(
                              'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                              isDeposit
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                : cumPnl >= 0
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
                            )}
                          >
                            {isDeposit ? 'Deposit' : 'PnL'}
                          </span>
                        </div>
                        {rec.note && (
                          <p className="mt-0.5 text-xs text-muted-foreground truncate">
                            {rec.note}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        {isDeposit ? (
                          <>
                            <span className="block font-bold text-sm tabular-nums text-foreground">
                              {formatCurrency(rec.amount, currency)}
                            </span>
                            <span className="text-[11px] text-muted-foreground tabular-nums">
                              Total Nilai: {formatCurrency(rec.derivedAmount, currency)}
                            </span>
                          </>
                        ) : (
                          <>
                            <span
                              className={cn(
                                'block font-bold text-sm tabular-nums',
                                cumPnl >= 0 ? 'text-emerald-500' : 'text-rose-500',
                              )}
                            >
                              {cumPnl >= 0 ? '+' : ''}
                              {formatCurrency(cumPnl, currency)}
                            </span>
                            <div className="flex items-center justify-end gap-1 text-[11px] font-semibold tabular-nums">
                              <span className={cumPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                                {cumPnl >= 0 ? '+' : ''}
                                {formatPercent3(pnlPct)}
                              </span>
                              <span
                                className={cn(
                                  'text-[10px]',
                                  deltaPnl >= 0 ? 'text-emerald-500' : 'text-rose-500',
                                )}
                              >
                                ({deltaPnl >= 0 ? '▲ +' : '▼ -'}
                                {formatCurrency(Math.abs(deltaPnl), currency)})
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Edit Investasi */}
      <InvestmentFormSheet
        open={formOpen}
        investment={investment}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          load()
          onUpdated()
        }}
        onDeleted={() => {
          onUpdated()
          onClose()
        }}
      />

      {/* Sheet Catat Nilai Baru / Edit Nilai */}
      <InvestmentRecordSheet
        open={recordSheetOpen}
        investmentUid={investment.uid}
        record={editingRecord}
        previousAmount={(() => {
          if (!editingRecord) {
            return count > 0 ? derivedTimeline[count - 1].derivedAmount : null
          }
          const editIndex = derivedTimeline.findIndex((r: InvestmentRecord) => r.uid === editingRecord.uid)
          return editIndex > 0 ? derivedTimeline[editIndex - 1].derivedAmount : null
        })()}
        runningCapital={(() => {
          if (!editingRecord) {
            return totalDeposit
          }
          const editIndex = derivedTimeline.findIndex((r: InvestmentRecord) => r.uid === editingRecord.uid)
          const targetIndex = editIndex > 0 ? editIndex - 1 : 0
          return derivedTimeline[targetIndex]?.derivedCapital ?? (records[0]?.amount ?? 0)
        })()}
        previousPnl={(() => {
          const targetIndex = editingRecord
            ? derivedTimeline.findIndex((r: InvestmentRecord) => r.uid === editingRecord.uid)
            : count
          for (let i = targetIndex - 1; i >= 0; i--) {
            const r = derivedTimeline[i]
            if (r.type === 'pnl') {
              return r.derivedPnl
            }
          }
          return 0
        })()}
        currency={currency}
        onClose={() => {
          setRecordSheetOpen(false)
          setEditingRecord(null)
        }}
        onSaved={() => {
          load()
          onUpdated()
        }}
        onDeleted={() => {
          load()
          onUpdated()
        }}
      />
    </FullScreenSheet>
  )
}
