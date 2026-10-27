'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ChevronRight,
  Plus,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/components/language-provider'
import {
  type Currency,
  type InvestmentAsset,
  type InvestmentRecord,
  getInvestments,
  getInvestmentRecords,
  getMainCurrency,
  initDB,
} from '@/lib/db'
import { formatCurrency, formatShortDate } from '@/lib/format'
import { InvestmentDetailScreen } from '@/components/investment-detail-screen'
import { InvestmentFormSheet } from '@/components/investment-form-sheet'
import { cn } from '@/lib/utils'

type AssetSummaryData = {
  asset: InvestmentAsset
  records: InvestmentRecord[]
  currentValue: number
  previousValue: number
  diff: number
  diffPercent: number
}

export function InvestmentsScreen() {
  const { t } = useTranslation()
  const [investments, setInvestments] = useState<InvestmentAsset[]>([])
  const [summaries, setSummaries] = useState<Map<string, AssetSummaryData>>(new Map())
  const [currency, setCurrency] = useState<Currency | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<InvestmentAsset | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      await initDB()
      const [list, mainCur] = await Promise.all([
        getInvestments(),
        getMainCurrency(),
      ])
      setInvestments(list)
      setCurrency(mainCur ?? null)

      // Muat ringkasan nilai per aset
      const sumMap = new Map<string, AssetSummaryData>()
      for (const item of list) {
        const records = await getInvestmentRecords(item.uid)
        const count = records.length
        const currentRecord = count > 0 ? records[count - 1] : null
        const prevRecord = count > 1 ? records[count - 2] : null

        const currentValue = currentRecord?.amount ?? 0
        const previousValue = prevRecord?.amount ?? currentValue
        const diff = currentRecord && prevRecord ? currentRecord.amount - prevRecord.amount : 0
        const diffPercent = previousValue > 0 ? (diff / previousValue) * 100 : 0

        sumMap.set(item.uid, {
          asset: item,
          records,
          currentValue,
          previousValue,
          diff,
          diffPercent,
        })
      }
      setSummaries(sumMap)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()

    const onCurrencyChanged = (e: Event) => {
      const cur = (e as CustomEvent<Currency>).detail
      if (cur) setCurrency(cur)
      void load()
    }
    window.addEventListener('dompetku:currency-changed', onCurrencyChanged)
    return () => window.removeEventListener('dompetku:currency-changed', onCurrencyChanged)
  }, [load])

  // Total Nilai Portofolio
  const totalPortfolioValue = Array.from(summaries.values()).reduce(
    (sum, s) => sum + s.currentValue,
    0,
  )

  const totalPortfolioDiff = Array.from(summaries.values()).reduce(
    (sum, s) => sum + s.diff,
    0,
  )

  return (
    <div className="flex flex-1 flex-col" data-testid="investments-screen">
      <header className="sticky top-0 z-30 bg-background/80 px-4 pt-[calc(0.875rem+env(safe-area-inset-top))] pb-4 backdrop-blur-xl md:px-10 md:pt-6 md:pb-8">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground md:text-sm uppercase">
              {t.investments.subtitle}
            </p>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl" data-testid="investments-header-title">
              {t.investments.title}
            </h1>
          </div>
          <Button
            size="sm"
            className="gap-1 text-xs font-semibold"
            data-testid="investments-add-button"
            onClick={() => setFormOpen(true)}
          >
            <Plus className="size-3.5" />
            <span>{t.investments.addAsset}</span>
          </Button>
        </div>
      </header>

      <section className="flex flex-1 flex-col px-4 pb-28 md:px-10">
        <div className="mx-auto w-full max-w-lg space-y-4">
          {/* Kartu Ringkasan Total Portofolio */}
          <div
            data-testid="portfolio-summary-card"
            className="rounded-3xl border bg-card p-5 text-center shadow-xs"
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t.investments.totalValue}
            </p>
            <p
              data-testid="portfolio-total-value"
              className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums text-foreground"
            >
              {formatCurrency(totalPortfolioValue, currency)}
            </p>

            <div className="mt-2.5 flex items-center justify-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums',
                  totalPortfolioDiff > 0
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : totalPortfolioDiff < 0
                    ? 'bg-rose-500/10 text-rose-500'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {totalPortfolioDiff > 0 ? (
                  <TrendingUp className="size-3.5" />
                ) : totalPortfolioDiff < 0 ? (
                  <TrendingDown className="size-3.5" />
                ) : null}
                <span>
                  {totalPortfolioDiff > 0 ? '+' : ''}
                  {formatCurrency(totalPortfolioDiff, currency)}
                </span>
              </span>
              <span className="text-xs text-muted-foreground">
                ({investments.length} {t.investments.allInvestments})
              </span>
            </div>
          </div>

          {/* Daftar Aset Investasi */}
          {loading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Memuat…</p>
          ) : investments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Wallet className="size-7" aria-hidden="true" />
              </div>
              <h2 className="text-base font-semibold">{t.investments.emptyTitle}</h2>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                {t.investments.emptyDesc}
              </p>
              <Button
                className="mt-4 gap-1.5 text-xs font-semibold"
                data-testid="investments-empty-add-button"
                onClick={() => setFormOpen(true)}
              >
                <Plus className="size-3.5" />
                <span>{t.investments.addAsset}</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-3" data-testid="investments-list">
              {investments.map((item) => {
                const summary = summaries.get(item.uid)
                const currentVal = summary?.currentValue ?? 0
                const diffVal = summary?.diff ?? 0
                const diffPct = summary?.diffPercent ?? 0
                const recordCount = summary?.records.length ?? 0
                const lastRecord = recordCount > 0 ? summary?.records[recordCount - 1] : null

                return (
                  <button
                    key={item.uid}
                    type="button"
                    data-testid={`investment-card-${item.uid}`}
                    onClick={() => setSelectedAsset(item)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border bg-card p-4 text-left shadow-xs transition-all hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-base font-bold text-foreground">
                          {item.name}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        {lastRecord ? (
                          <span>
                            {t.investments.lastUpdated}: {formatShortDate(lastRecord.date)}
                          </span>
                        ) : (
                          <span>Belum ada catatan nilai</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="block text-base font-extrabold tabular-nums text-foreground">
                        {formatCurrency(currentVal, currency)}
                      </span>

                      {recordCount > 1 ? (
                        <span
                          className={cn(
                            'inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums',
                            diffVal > 0
                              ? 'text-emerald-500'
                              : diffVal < 0
                              ? 'text-rose-500'
                              : 'text-muted-foreground',
                          )}
                        >
                          {diffVal > 0 ? '+' : ''}
                          {formatCurrency(diffVal, currency)} ({diffVal > 0 ? '+' : ''}
                          {diffPct.toFixed(2)}%)
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          {recordCount === 1 ? '1 entri' : '0 entri'}
                        </span>
                      )}
                    </div>

                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Form Tambah Investasi Baru */}
      <InvestmentFormSheet
        open={formOpen}
        investment={null}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />

      {/* Layar Detail Investasi */}
      <InvestmentDetailScreen
        open={Boolean(selectedAsset)}
        investment={selectedAsset}
        onClose={() => setSelectedAsset(null)}
        onUpdated={load}
      />
    </div>
  )
}
