'use client'

import { useMemo, useState } from 'react'
import {
  Calendar,
  Check,
  ChevronLeft,
  Layers,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FullScreenSheet } from '@/components/ui/overlay'
import { formatCurrency, formatPercent3, formatShortDate } from '@/lib/format'
import { InvestmentChart } from '@/components/investment-chart'
import type { Currency, InvestmentAsset, InvestmentRecord } from '@/lib/db'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/components/language-provider'

export type MergedRecordItem = InvestmentRecord & {
  assetName: string
}

export function InvestmentMergedScreen({
  open,
  investments,
  recordsByAsset,
  currency,
  onClose,
}: {
  open: boolean
  investments: InvestmentAsset[]
  recordsByAsset: Map<string, InvestmentRecord[]>
  currency: Currency | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  // Pilihan aset yang ingin digabungkan (default: semua aset terpilih)
  const [selectedUids, setSelectedUids] = useState<Set<string>>(
    () => new Set(investments.map((i) => i.uid)),
  )

  const toggleAsset = (uid: string) => {
    setSelectedUids((prev) => {
      const next = new Set(prev)
      if (next.has(uid)) {
        if (next.size > 1) next.delete(uid) // Minimal 1 aset terpilih
      } else {
        next.add(uid)
      }
      return next
    })
  }

  // Aset yang aktif
  const activeInvestments = useMemo(
    () => investments.filter((i) => selectedUids.has(i.uid)),
    [investments, selectedUids],
  )

  // Gabungkan seluruh riwayat nilai dari aset terpilih dan urutkan kronologis
  const mergedHistory: MergedRecordItem[] = useMemo(() => {
    const all: MergedRecordItem[] = []
    for (const asset of activeInvestments) {
      const recs = recordsByAsset.get(asset.uid) ?? []
      for (const r of recs) {
        all.push({ ...r, assetName: asset.name })
      }
    }
    return all.sort((a, b) => {
      const c = a.date.localeCompare(b.date)
      if (c !== 0) return c
      return a.time.localeCompare(b.time)
    })
  }, [activeInvestments, recordsByAsset])

  // Hitung Nilai Deposit & Nilai Sekarang Kumulatif Gabungan
  const { totalDeposit, totalCurrentValue } = useMemo(() => {
    let dep = 0
    let curr = 0

    for (const asset of activeInvestments) {
      const recs = recordsByAsset.get(asset.uid) ?? []
      if (recs.length === 0) continue

      const explicitDeposit = recs.reduce((sum, r) => sum + (r.deposit ?? 0), 0)
      const assetDeposit = explicitDeposit > 0 ? explicitDeposit : recs[0].amount
      const assetCurrentVal = recs[recs.length - 1].amount

      dep += assetDeposit
      curr += assetCurrentVal
    }

    return { totalDeposit: dep, totalCurrentValue: curr }
  }, [activeInvestments, recordsByAsset])

  // PnL Gabungan
  const pnlAmount = totalCurrentValue - totalDeposit
  const pnlPercent = totalDeposit > 0 ? (pnlAmount / totalDeposit) * 100 : 0

  if (!open) return null

  return (
    <FullScreenSheet open={open} onClose={onClose} testId="investment-merged-screen">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card/95 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:pt-3 backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon-sm" aria-label="Kembali" onClick={onClose}>
            <ChevronLeft className="size-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight" data-testid="merged-screen-title">
              Gabung Aset (Multi-Asset)
            </h1>
            <p className="truncate text-[11px] text-muted-foreground">
              {activeInvestments.length} dari {investments.length} aset terpilih · Read-only
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4 md:px-10">
        <div className="mx-auto w-full max-w-lg space-y-4">
          {/* Pilihan Checklist Aset yang Ingin Digabung */}
          <div className="rounded-2xl border bg-card p-4 shadow-xs">
            <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pilih Aset untuk Digabungkan
            </p>
            <div className="flex flex-wrap gap-2">
              {investments.map((asset) => {
                const isSelected = selectedUids.has(asset.uid)
                return (
                  <button
                    key={asset.uid}
                    type="button"
                    onClick={() => toggleAsset(asset.uid)}
                    data-testid={`merge-toggle-${asset.uid}`}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-muted text-muted-foreground hover:bg-secondary',
                    )}
                  >
                    {isSelected && <Check className="size-3.5 stroke-[3]" />}
                    <span>{asset.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Kartu Ringkasan Gabungan */}
          <div className="rounded-2xl border bg-card p-5 text-center shadow-xs">
            <div className="grid grid-cols-2 gap-3 pb-3 border-b text-left">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {t.investments.totalDeposit}
                </p>
                <p className="mt-0.5 text-base font-bold tabular-nums text-foreground">
                  {formatCurrency(totalDeposit, currency)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {t.investments.pnlLabel}
                </p>
                <p
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
              Total Nilai Sekarang
            </p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums text-foreground">
              {formatCurrency(totalCurrentValue, currency)}
            </p>

            <div className="mt-3 flex items-center justify-center border-t pt-3">
              <span
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
                  Total Return: {pnlAmount > 0 ? '+' : ''}
                  {formatPercent3(pnlPercent)}
                </span>
              </span>
            </div>
          </div>

          {/* Grafik Gabungan */}
          {mergedHistory.length >= 2 && (
            <div>
              <h2 className="mb-2 px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Grafik Pergerakan Gabungan
              </h2>
              <InvestmentChart records={mergedHistory} currency={currency} testId="merged-investment-chart" />
            </div>
          )}

          {/* Riwayat Gabungan dengan Asal Aset (Source Asset) */}
          <div>
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Riwayat Gabungan
              </h2>
              <span className="text-xs text-muted-foreground tabular-nums">
                {mergedHistory.length} entri (Read-only)
              </span>
            </div>

            {mergedHistory.length === 0 ? (
              <div className="rounded-2xl border bg-card p-8 text-center">
                <Calendar className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                <p className="text-sm font-semibold">Belum Ada Riwayat Nilai</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border bg-card divide-y">
                {[...mergedHistory].reverse().map((rec) => (
                  <div
                    key={`${rec.investmentUid}-${rec.uid}`}
                    className="flex w-full items-center justify-between p-3.5 text-left"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm tabular-nums">
                          {formatShortDate(rec.date)}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {rec.time}
                        </span>
                        {/* Label Asal Aset (Source Asset) */}
                        <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                          {rec.assetName}
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
                      {rec.deposit != null && rec.deposit > 0 && (
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          Dep: {formatCurrency(rec.deposit, currency)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </FullScreenSheet>
  )
}
