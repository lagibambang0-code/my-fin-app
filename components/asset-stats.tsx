'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MonthNavigator, MONTHS, type MonthValue } from '@/components/month-navigator'
import { useTranslation } from '@/components/language-provider'
import { cn } from '@/lib/utils'
import { type Currency, getAssetSummary, getMainCurrency, initDB } from '@/lib/db'
import { formatCurrency } from '@/lib/format'

/** "Total statistik" — monthly balance accumulation chart (PRD-08 §3.2.15). */
export function AssetStats() {
  const router = useRouter()
  const { t } = useTranslation()
  const today = useMemo(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  }, [])
  const [period, setPeriod] = useState<MonthValue>(today)
  const [currency, setCurrency] = useState<Currency | null>(null)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    ;(async () => {
      await initDB()
      const [summary, main] = await Promise.all([getAssetSummary(), getMainCurrency()])
      setTotal(summary.total)
      setCurrency(main ?? null)
    })()
  }, [])

  // Six months ending at the selected month. Without transaction history yet
  // every point shows the current total balance.
  const points = useMemo(() => {
    const list: { label: string; value: number }[] = []
    for (let offset = -5; offset <= 0; offset++) {
      const index = period.year * 12 + period.month + offset
      const year = Math.floor(index / 12)
      const month = ((index % 12) + 12) % 12
      list.push({ label: `${MONTHS[month].short} ${String(year).slice(-2)}`, value: total })
    }
    return list
  }, [period, total])

  const max = Math.max(1, ...points.map((p) => p.value))

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 bg-background/80 px-4 pt-[calc(0.875rem+env(safe-area-inset-top))] pb-4 backdrop-blur-xl md:px-10 md:pt-6 md:pb-8">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Kembali"
            onClick={() => router.back()}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              {t.asset.title}
            </p>
            <h1 className="truncate text-lg font-bold tracking-tight">{t.asset.totalStatistics}</h1>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col px-4 md:px-10">
        <div className="flex items-center justify-center">
          <MonthNavigator value={period} today={today} onChange={setPeriod} />
        </div>

        <div className="mt-4 rounded-2xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">{t.asset.accumulatedBalance}</p>
          <p
            className="mt-1 text-xl font-bold tabular-nums"
            data-testid="stats-accumulated-balance"
          >
            {formatCurrency(total, currency)}
          </p>
        </div>

        <div className="mt-4 rounded-2xl border bg-card p-4">
          <h2 className="mb-4 text-sm font-semibold">Saldo per bulan</h2>
          <ul
            className="flex h-40 items-end justify-between gap-2"
            data-testid="stats-chart"
            aria-label="Grafik saldo per bulan"
          >
            {points.map((point) => (
              <li key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="flex h-28 w-full items-end justify-center">
                  <div
                    aria-hidden="true"
                    className={cn('w-full max-w-8 rounded-t-md bg-primary/80')}
                    style={{ height: `${Math.max(4, (point.value / max) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] whitespace-nowrap text-muted-foreground">
                  {point.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
