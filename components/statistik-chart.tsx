'use client'

import { useId, useState } from 'react'
import { BarChart3, PieChart } from 'lucide-react'
import { useTranslation } from '@/components/language-provider'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import type { Currency } from '@/lib/db'
import {
  formatCompactAmount,
  formatPercent,
  type CategoryStat,
  type TrendPoint,
} from '@/lib/statistics-utils'

const DONUT_RADIUS = 64
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS // ~402.12

/**
 * Proporsi kategori pada tab Statistik (PRD-P-34 / T-38):
 * Menampilkan donat per kategori secara default sesuai Money Manager asli,
 * dengan opsi beralih ke grafik batang horizontal.
 */
export function CategoryBarChart({
  stats,
  testId = 'stats-chart',
}: {
  stats: CategoryStat[]
  testId?: string
}) {
  const { t } = useTranslation()
  const [chartType, setChartType] = useState<'donut' | 'bar'>('donut')
  const totalPercent = stats.reduce((sum, s) => sum + s.percent, 0) || 100
  // Hitung stroke offset untuk setiap irisan donat
  let accumulatedLength = 0
  const slices = stats.map((stat) => {
    const ratio = stat.percent / totalPercent
    const sliceLength = ratio * DONUT_CIRCUMFERENCE
    const offset = -accumulatedLength
    accumulatedLength += sliceLength
    return {
      uid: stat.uid,
      name: stat.name,
      color: stat.color,
      percent: stat.percent,
      strokeDasharray: `${Math.max(sliceLength, 0.5)} ${DONUT_CIRCUMFERENCE}`,
      strokeDashoffset: offset,
    }
  })

  return (
    <section
      data-testid={testId}
      aria-label="Grafik kategori"
      className="rounded-2xl border bg-card p-4 transition-all"
    >
      <div className="flex items-center justify-between pb-3 border-b">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {chartType === 'donut' ? t.stats.charts.donut : t.stats.charts.bar}
        </span>
        <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5">
          <button
            type="button"
            aria-label={t.stats.charts.donutView}
            onClick={() => setChartType('donut')}
            className={cn(
              'flex size-7 items-center justify-center rounded-md transition-colors',
              chartType === 'donut'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <PieChart className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label={t.stats.charts.barView}
            onClick={() => setChartType('bar')}
            className={cn(
              'flex size-7 items-center justify-center rounded-md transition-colors',
              chartType === 'bar'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <BarChart3 className="size-3.5" />
          </button>
        </div>
      </div>

      {chartType === 'donut' ? (
        <div className="pt-4">
          {/* Donat SVG */}
          <div className="relative mx-auto size-52 flex items-center justify-center">
            <svg
              viewBox="0 0 160 160"
              className="size-full -rotate-90 transform"
              aria-hidden="true"
            >
              {/* Lingkaran latar belakang track */}
              <circle
                cx="80"
                cy="80"
                r={DONUT_RADIUS}
                fill="none"
                stroke="currentColor"
                className="text-muted/20"
                strokeWidth="24"
              />
              {/* Irisan kategori */}
              {slices.map((slice) => (
                <circle
                  key={slice.uid}
                  cx="80"
                  cy="80"
                  r={DONUT_RADIUS}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth="24"
                  strokeDasharray={slice.strokeDasharray}
                  strokeDashoffset={slice.strokeDashoffset}
                  className="transition-[stroke-dasharray,stroke-dashoffset] duration-500 ease-out"
                />
              ))}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold text-foreground">Proporsi</span>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {stats.length} Kategori
              </span>
            </div>
          </div>

          {/* Legenda Kategori */}
          <div className="mt-4 flex flex-col gap-2 pt-3 border-t">
            {stats.map((stat) => (
              <div
                key={stat.uid}
                data-testid={`stats-bar-${stat.uid}`}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ background: stat.color }}
                    aria-hidden="true"
                  />
                  <span className="truncate font-medium">{stat.name}</span>
                </div>
                <span
                  data-testid={`stats-bar-percent-${stat.uid}`}
                  className="shrink-0 tabular-nums font-semibold text-muted-foreground"
                >
                  {formatPercent(stat.percent, 1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Tampilan batang horizontal */
        <div className="flex flex-col gap-3 pt-3">
          {stats.map((stat) => (
            <div key={stat.uid} data-testid={`stats-bar-${stat.uid}`}>
              <p className="flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate font-medium">{stat.name}</span>
                <span
                  data-testid={`stats-bar-percent-${stat.uid}`}
                  className="shrink-0 tabular-nums text-muted-foreground"
                >
                  {formatPercent(stat.percent, 1)}
                </span>
              </p>
              <div className="mt-1.5 h-4 overflow-hidden rounded-full bg-secondary">
                <div
                  className="flex h-full items-center justify-end rounded-full pr-1.5 transition-[width] duration-300 ease-out"
                  style={{
                    width: `${Math.min(100, Math.max(stat.percent, 3))}%`,
                    background: stat.color,
                  }}
                >
                  {stat.percent >= 18 && (
                    <span className="text-[10px] font-semibold text-white/95 tabular-nums">
                      {formatPercent(stat.percent)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

/**
 * Grafik tren bulanan pada layar rincian kategori (PRD-P-34 / T-38):
 * Menampilkan grafik garis dengan area terisi secara default sesuai Money Manager asli,
 * dengan opsi beralih ke grafik batang.
 */
export function MonthlyBarChart({
  points,
  currency,
  testId = 'stats-detail-chart',
}: {
  points: TrendPoint[]
  currency: Currency | null
  testId?: string
}) {
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')
  const gradientId = useId()
  const max = points.reduce((peak, point) => Math.max(peak, point.amount), 0)

  // Koordinat grafik garis SVG
  const svgWidth = 400
  const svgHeight = 120
  const padX = 24
  const padY = 16
  const usableW = svgWidth - padX * 2
  const usableH = svgHeight - padY * 2

  const coords = points.map((p, index) => {
    const x = padX + (points.length > 1 ? (index / (points.length - 1)) * usableW : usableW / 2)
    const ratio = max > 0 ? p.amount / max : 0
    const y = padY + (1 - ratio) * usableH
    return { ...p, x, y, ratio }
  })

  const linePath = coords.length > 0
    ? `M ${coords.map((c) => `${c.x},${c.y}`).join(' L ')}`
    : ''

  const areaPath = coords.length > 0
    ? `${linePath} L ${coords[coords.length - 1].x},${svgHeight - padY} L ${coords[0].x},${svgHeight - padY} Z`
    : ''

  return (
    <section
      data-testid={testId}
      aria-label="Grafik tren"
      className="rounded-2xl border bg-card p-4 transition-all"
    >
      <div className="flex items-center justify-between pb-3 border-b mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {chartType === 'line' ? 'Tren Garis Bulanan' : 'Tren Batang'}
        </span>
        <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5">
          <button
            type="button"
            aria-label="Tampilan garis"
            onClick={() => setChartType('line')}
            className={cn(
              'flex size-7 items-center justify-center rounded-md transition-colors',
              chartType === 'line'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span className="text-xs font-bold">~</span>
          </button>
          <button
            type="button"
            aria-label="Tampilan batang"
            onClick={() => setChartType('bar')}
            className={cn(
              'flex size-7 items-center justify-center rounded-md transition-colors',
              chartType === 'bar'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <BarChart3 className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {/* Label sumbu Y */}
        <div
          aria-hidden="true"
          className="flex h-32 shrink-0 flex-col justify-between text-right text-[10px] tabular-nums text-muted-foreground pr-1"
        >
          <span data-testid="stats-detail-axis-max">{formatCompactAmount(max)}</span>
          <span>{formatCompactAmount(max / 2)}</span>
          <span>0</span>
        </div>

        {chartType === 'line' ? (
          /* Grafik Garis SVG */
          <div className="flex h-32 min-w-0 flex-1 flex-col">
            <div className="relative min-h-0 flex-1">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                preserveAspectRatio="none"
                className="size-full overflow-visible"
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Garis batas dasar */}
                <line
                  x1={padX}
                  y1={svgHeight - padY}
                  x2={svgWidth - padX}
                  y2={svgHeight - padY}
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-border"
                />

                {/* Area di bawah garis */}
                {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}

                {/* Garis tren */}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Titik data */}
                {coords.map((c) => (
                  <circle
                    key={c.key}
                    cx={c.x}
                    cy={c.y}
                    r={c.amount > 0 ? '4' : '2'}
                    className={cn(
                      c.amount > 0
                        ? 'fill-primary stroke-background'
                        : 'fill-muted-foreground/40 stroke-background',
                    )}
                    strokeWidth="2"
                  />
                ))}
              </svg>

              {/* Titik interaksi yang mempertahankan data-testid test harness */}
              <div className="absolute inset-0 flex items-stretch">
                {coords.map((point) => (
                  <div
                    key={point.key}
                    data-testid={`stats-detail-bar-${point.key}`}
                    role="img"
                    aria-label={`${point.label}: ${formatCurrency(point.amount, currency)}`}
                    title={`${point.label}: ${formatCurrency(point.amount, currency)}`}
                    className="flex-1 cursor-pointer"
                  />
                ))}
              </div>
            </div>

            {/* Label sumbu X (Bulan) */}
            <div className="flex justify-between pt-1 text-[10px] text-muted-foreground">
              {coords.map((p) => (
                <span key={p.key} className="truncate text-center flex-1">
                  {p.label}
                </span>
              ))}
            </div>
          </div>
        ) : (
          /* Tampilan batang klasik */
          <div className="flex h-32 min-w-0 flex-1 items-stretch gap-1">
            {points.map((point) => {
              const ratio = max > 0 ? point.amount / max : 0
              return (
                <div key={point.key} className="flex min-w-0 flex-1 flex-col">
                  <div className="flex min-h-0 flex-1 items-end">
                    <div
                      data-testid={`stats-detail-bar-${point.key}`}
                      role="img"
                      aria-label={`${point.label}: ${formatCurrency(point.amount, currency)}`}
                      title={`${point.label}: ${formatCurrency(point.amount, currency)}`}
                      className={cn(
                        'w-full rounded-t-md transition-[height] duration-300 ease-out',
                        point.amount > 0 ? 'bg-primary/85' : 'bg-secondary',
                      )}
                      style={{ height: `${point.amount > 0 ? Math.max(5, ratio * 100) : 3}%` }}
                    />
                  </div>
                  <span className="mt-1 truncate text-center text-[10px] text-muted-foreground">
                    {point.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
