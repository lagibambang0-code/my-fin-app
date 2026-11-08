'use client'

import { useId, useMemo, useState } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { formatCurrency, formatPercent3, formatShortDate } from '@/lib/format'
import type { Currency, InvestmentRecord } from '@/lib/db'
import { cn } from '@/lib/utils'

export type ChartTimeRange = '7D' | '30H' | 'ALL'

export type InvestmentChartPoint = {
  key: string
  date: string
  time: string
  value: number
  capital: number
  pnl: number
  pnlPercent: number
  deltaPnl: number
  label: string
}

export function InvestmentChart({
  records,
  currency,
  height = 160,
  testId = 'investment-chart',
}: {
  records: InvestmentRecord[]
  currency: Currency | null
  height?: number
  testId?: string
}) {
  const gradientId = useId()
  const [rangeFilter, setRangeFilter] = useState<ChartTimeRange>('7D')
  const [activePoint, setActivePoint] = useState<InvestmentChartPoint | null>(null)

  // Urutkan kronologis terlama ke terbaru
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) =>
      a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date),
    )
  }, [records])

  // Periksa apakah sudah ada entri PnL (bukan entri deposit)
  const hasPnl = useMemo(() => {
    return sortedRecords.some((r) => r.type === 'pnl')
  }, [sortedRecords])

  // Filter records berdasarkan rentang waktu: 7D (default), 30H, atau ALL
  const filteredRecords = useMemo(() => {
    if (rangeFilter === 'ALL' || sortedRecords.length <= 1) return sortedRecords

    const now = new Date()
    const days = rangeFilter === '7D' ? 7 : 30
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    const cutoffIso = cutoff.toISOString().slice(0, 10)

    const matched = sortedRecords.filter((r) => r.date >= cutoffIso)
    return matched.length >= 2 ? matched : sortedRecords.slice(-Math.min(sortedRecords.length, 5))
  }, [sortedRecords, rangeFilter])

  // Jika belum ada entry PnL sama sekali, grafik belum aktif (sesuai arahan: tgl 1 deposit 10.000 belum ada grafik)
  if (!hasPnl || records.length < 2) {
    return (
      <div
        data-testid={testId}
        className="flex h-32 items-center justify-center rounded-2xl border bg-card p-4 text-center text-xs text-muted-foreground"
      >
        <span>Grafik pergerakan akan aktif setelah Anda mencatat entri PnL pertama.</span>
      </div>
    )
  }

  // Bentuk titik-titik grafik berbasis modal dan nilai portofolio
  const points: InvestmentChartPoint[] = []
  let runningCapital = 0
  let runningPnl = 0

  filteredRecords.forEach((rec, idx) => {
    const isDeposit = rec.type === 'deposit' || (idx === 0 && !rec.type)
    if (isDeposit) {
      runningCapital += rec.amount
    } else {
      runningPnl = rec.amount
    }
    const val = runningCapital + runningPnl
    const curPnl = runningPnl
    const pnlPct = runningCapital > 0 ? (curPnl / runningCapital) * 100 : 0
    const prevPnl = points.length > 0 ? points[points.length - 1].pnl : 0

    points.push({
      key: rec.uid,
      date: rec.date,
      time: rec.time,
      value: val,
      capital: runningCapital,
      pnl: curPnl,
      pnlPercent: pnlPct,
      deltaPnl: curPnl - prevPnl,
      label: formatShortDate(rec.date),
    })
  })
  const firstVal = points[0]?.value ?? 0
  const lastVal = points[points.length - 1]?.value ?? 0
  const lastPnl = points[points.length - 1]?.pnl ?? 0
  const isUp = lastPnl >= 0
  const chartColor = isUp ? '#10b981' : '#f43f5e' // emerald-500 : rose-500

  const allVals = points.map((p) => p.value)
  const min = Math.min(...allVals)
  const max = Math.max(...allVals)
  const range = max - min || 1

  // Dimensi SVG
  const svgWidth = 500
  const padX = 24
  const padY = 24
  const usableW = svgWidth - padX * 2
  const usableH = height - padY * 2

  const coords = points.map((p, index) => {
    const x = padX + (points.length > 1 ? (index / (points.length - 1)) * usableW : usableW / 2)
    const ratio = (p.value - min) / range
    const y = padY + (1 - ratio) * usableH
    return { ...p, x, y, ratio }
  })

  const linePath = coords.length > 0
    ? `M ${coords.map((c) => `${c.x},${c.y}`).join(' L ')}`
    : ''

  const areaPath = coords.length > 0
    ? `${linePath} L ${coords[coords.length - 1].x},${height - padY + 8} L ${coords[0].x},${height - padY + 8} Z`
    : ''

  const displayedPoint = activePoint ?? points[points.length - 1]
  return (
    <section
      data-testid={testId}
      aria-label="Grafik pergerakan investasi"
      className="rounded-2xl border bg-card p-4 shadow-xs transition-all"
    >
      {/* Header Info Perubahan & Tombol Filter Rentang Waktu */}
      <div className="flex flex-col gap-2 pb-3 border-b mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'flex size-7 items-center justify-center rounded-lg',
                isUp ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500',
              )}
            >
              {isUp ? (
                <TrendingUp className="size-4" aria-hidden="true" />
              ) : (
                <TrendingDown className="size-4" aria-hidden="true" />
              )}
            </span>
            <div>
              <p className="text-[11px] text-muted-foreground">
                {displayedPoint ? `${displayedPoint.date} · ${displayedPoint.time}` : 'Pergerakan nilai'}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold tabular-nums text-foreground">
                  {formatCurrency(displayedPoint?.value ?? lastVal, currency)}
                </span>
                <span
                  className={cn(
                    'text-xs font-semibold tabular-nums',
                    (displayedPoint?.pnl ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500',
                  )}
                >
                  {(displayedPoint?.pnl ?? 0) >= 0 ? '+' : ''}
                  {formatCurrency(displayedPoint?.pnl ?? 0, currency)} ({formatPercent3(displayedPoint?.pnlPercent ?? 0)})
                </span>
              </div>
            </div>
          </div>

          {/* Tombol Filter Rentang Waktu: 7D (default), 30H, ALL */}
          <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 text-xs font-semibold" data-testid="chart-range-filter">
            {(['7D', '30H', 'ALL'] as const).map((r) => (
              <button
                key={r}
                type="button"
                data-testid={`chart-range-${r}`}
                onClick={() => {
                  setRangeFilter(r)
                  setActivePoint(null)
                }}
                className={cn(
                  'px-2 py-0.5 rounded-md transition-all',
                  rangeFilter === r
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {displayedPoint && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Modal: <strong className="text-foreground tabular-nums">{formatCurrency(displayedPoint.capital, currency)}</strong>
            </span>
            <span className="text-muted-foreground">
              PnL:{' '}
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  displayedPoint.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500',
                )}
              >
                {displayedPoint.pnl >= 0 ? '+' : ''}
                {formatCurrency(displayedPoint.pnl, currency)} ({formatPercent3(displayedPoint.pnlPercent)})
              </span>
              {displayedPoint.deltaPnl !== 0 && (
                <span className={cn('ml-1 text-[10px]', displayedPoint.deltaPnl >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
                  ({displayedPoint.deltaPnl >= 0 ? '▲ +' : '▼ -'}
                  {formatCurrency(Math.abs(displayedPoint.deltaPnl), currency)})
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden" style={{ height }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${height}`}
          preserveAspectRatio="none"
          className="size-full overflow-visible"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={chartColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area Gradien */}
          {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}

          {/* Garis Tren Utama */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={chartColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Titik-Titik Data */}
          {coords.map((c) => {
            const isActive = activePoint?.key === c.key
            return (
              <circle
                key={c.key}
                cx={c.x}
                cy={c.y}
                r={isActive ? 5 : 3.5}
                fill={chartColor}
                stroke="var(--card)"
                strokeWidth={isActive ? 2 : 1.5}
                className={cn(
                  'transition-all duration-150',
                  isActive && 'ring-2 ring-primary ring-offset-1',
                )}
              />
            )
          })}
        </svg>

        {/* Lapisan Interaktif Hover / Sentuh */}
        <div className="absolute inset-0 flex items-stretch">
          {coords.map((point) => (
            <div
              key={point.key}
              data-testid={`investment-chart-point-${point.key}`}
              role="button"
              tabIndex={0}
              onMouseEnter={() => setActivePoint(point)}
              onClick={() => setActivePoint(point)}
              className="flex-1 cursor-pointer focus:outline-none"
              aria-label={`${point.date} ${point.time}: ${formatCurrency(point.value, currency)} (Modal: ${formatCurrency(point.capital, currency)})`}
            />
          ))}
        </div>
      </div>

      {/* Label Bawah (Awal & Akhir) */}
      <div className="mt-2 flex justify-between border-t pt-2 text-[10px] text-muted-foreground tabular-nums">
        <span>{points[0].date} ({formatCurrency(firstVal, currency)})</span>
        <span>{points[points.length - 1].date} ({formatCurrency(lastVal, currency)})</span>
      </div>
    </section>
  )
}
