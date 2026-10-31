'use client'

import { useCallback, useEffect, useState } from 'react'
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

  if (!open || !investment) return null

  // Hitung metrik deposit, nilai sekarang, dan PnL
  const count = records.length
  const currentRecord = count > 0 ? records[count - 1] : null
  const prevRecord = count > 1 ? records[count - 2] : null

  const currentValue = currentRecord?.amount ?? 0
  const previousValue = prevRecord?.amount ?? currentValue

  // Nilai deposit: jika ada field deposit eksplisit gunakan sum(deposit),
  // jika tidak ada / bernilai 0 fallback ke firstRecord.amount (deposit awal)
  const explicitDepositSum = records.reduce((sum, r) => sum + (r.deposit ?? 0), 0)
  const totalDeposit = explicitDepositSum > 0
    ? explicitDepositSum
    : (records.length > 0 ? records[0].amount : 0)

  // PnL murni berdasarkan selisih dari Nilai Deposit ke Nilai Sekarang
  const pnlAmount = currentValue - totalDeposit
  const pnlPercent = totalDeposit > 0 ? (pnlAmount / totalDeposit) * 100 : 0

  // Kenaikan/penurunan terbaru dari entri sebelumnya
  const latestDiff = currentRecord && prevRecord ? currentRecord.amount - previousValue : 0
  const latestPercent = previousValue > 0 ? (latestDiff / previousValue) * 100 : 0

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
              <span className="text-xs text-muted-foreground tabular-nums">
                {records.length} entri
              </span>
            </div>

            {records.length === 0 ? (
              <div className="rounded-2xl border bg-card p-8 text-center">
                <Calendar className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                <p className="text-sm font-semibold">{t.investments.emptyTitle}</p>
                <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto">
                  Tekan tombol &quot;{t.investments.recordValue}&quot; untuk mulai mencatat histori nilai investasi Anda.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border bg-card divide-y">
                {/* Tampilkan urutan kronologis terbaru di atas */}
                {[...records].reverse().map((rec, rIdx, arr) => {
                  // Bandingkan dengan record sebelum entri ini di urutan kronologis
                  const originalIndex = records.findIndex((r) => r.uid === rec.uid)
                  const prevAmount = originalIndex > 0 ? records[originalIndex - 1].amount : null
                  const diffVal = prevAmount != null ? rec.amount - prevAmount : 0
                  const diffPct = prevAmount != null && prevAmount > 0 ? (diffVal / prevAmount) * 100 : 0

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
                        </div>
                        {rec.note && (
                          <p className="mt-0.5 text-xs text-muted-foreground truncate">
                            {rec.note}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="block font-bold text-sm tabular-nums text-foreground">
                          {formatCurrency(rec.amount, currency)}
                        </span>
                        <div className="flex items-center justify-end gap-1.5 text-[11px] tabular-nums">
                          {rec.deposit != null && rec.deposit > 0 && (
                            <span className="text-muted-foreground">
                              Dep: {formatCurrency(rec.deposit, currency)}
                            </span>
                          )}
                          {prevAmount != null && (
                            <span
                              className={cn(
                                'font-semibold',
                                diffVal > 0
                                  ? 'text-emerald-500'
                                  : diffVal < 0
                                  ? 'text-rose-500'
                                  : 'text-muted-foreground',
                              )}
                            >
                              {diffVal > 0 ? '+' : ''}
                              {formatPercent3(diffPct)}
                            </span>
                          )}
                        </div>
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
        previousAmount={currentValue > 0 ? currentValue : null}
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
