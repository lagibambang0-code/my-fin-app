'use client'

import { useId, useState } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { formatCurrency, formatShortDate } from '@/lib/format'
import type { Currency, InvestmentRecord } from '@/lib/db'
import { cn } from '@/lib/utils'

export type InvestmentChartPoint = {
  key: string
  date: string
  time: string
  amount: number
  diff: number
  diffPercent: number
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
  const [activePoint, setActivePoint] = useState<InvestmentChartPoint | null>(null)

  if (records.length < 2) {
    return (
      <div
        data-testid={testId}
        className="flex h-32 items-center justify-center rounded-2xl border bg-card p-4 text-center text-xs text-muted-foreground"
      >
        <span>Catat minimal 2 riwayat nilai untuk melihat grafik pergerakan portofolio.</span>
      </div>
    )
  }

  // Hitung poin dan selisih
  const points: InvestmentChartPoint[] = records.map((rec, index) => {
    const prevAmount = index > 0 ? records[index - 1].amount : rec.amount
    const diff = rec.amount - prevAmount
    const diffPercent = prevAmount > 0 ? (diff / prevAmount) * 100 : 0
    return {
      key: rec.uid,
      date: rec.date,
      time: rec.time,
      amount: rec.amount,
      diff,
      diffPercent,
      label: formatShortDate(rec.date),
    }
  })

  const firstAmount = records[0].amount
  const lastAmount = records[records.length - 1].amount
  const isUp = lastAmount >= firstAmount
  const chartColor = isUp ? '#10b981' : '#f43f5e' // emerald-500 : rose-500

  const amounts = records.map((r) => r.amount)
  const min = Math.min(...amounts)
  const max = Math.max(...amounts)
  const range = max - min || 1

  // Dimensi SVG
  const svgWidth = 500
  const padX = 24
  const padY = 24
  const usableW = svgWidth - padX * 2
  const usableH = height - padY * 2

  const coords = points.map((p, index) => {
    const x = padX + (points.length > 1 ? (index / (points.length - 1)) * usableW : usableW / 2)
    const ratio = (p.amount - min) / range
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
      {/* Header Info Perubahan */}
      <div className="flex items-center justify-between pb-3 border-b mb-3">
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
            <p className="text-sm font-bold tabular-nums text-foreground">
              {formatCurrency(displayedPoint?.amount ?? lastAmount, currency)}
            </p>
          </div>
        </div>

        {displayedPoint && (
          <div className="text-right">
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                displayedPoint.diff > 0
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : displayedPoint.diff < 0
                  ? 'bg-rose-500/10 text-rose-500'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {displayedPoint.diff > 0 ? '+' : ''}
              {formatCurrency(displayedPoint.diff, currency)} ({displayedPoint.diff > 0 ? '+' : ''}
              {displayedPoint.diffPercent.toFixed(2)}%)
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
              aria-label={`${point.date} ${point.time}: ${formatCurrency(point.amount, currency)}`}
            />
          ))}
        </div>
      </div>

      {/* Label Bawah (Awal & Akhir) */}
      <div className="mt-2 flex justify-between border-t pt-2 text-[10px] text-muted-foreground tabular-nums">
        <span>{points[0].date} ({formatCurrency(firstAmount, currency)})</span>
        <span>{points[points.length - 1].date} ({formatCurrency(lastAmount, currency)})</span>
      </div>
    </section>
  )
}
