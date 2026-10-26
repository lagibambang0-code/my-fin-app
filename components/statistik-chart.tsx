'use client'

import { useId, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { useTranslation } from '@/components/language-provider'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import type { Currency } from '@/lib/db'
import {
  formatCompactAmount,
  formatPercent,
  type CategoryStat,
  type LineChartPoint,
  type TrendPoint,
} from '@/lib/statistics-utils'

const DONUT_RADIUS = 64
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS // ~402.12

/**
 * Proporsi kategori pada tab Statistik:
 * Menampilkan grafik donat per kategori dengan legenda persentase.
 * Grafik batang pertama telah dihapus sesuai instruksi penyederhanaan UI.
 */
export function CategoryBarChart({
  stats,
  testId = 'stats-chart',
}: {
  stats: CategoryStat[]
  testId?: string
}) {
  const { t } = useTranslation()
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
          {t.stats.charts.donut}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {stats.length} Kategori
        </span>
      </div>

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
    </section>
  )
}

/**
 * Grafik garis tren pada layar rincian kategori (PRD-P-34 / T-38):
 * Menampilkan grafik garis dengan area terisi.
 * Grafik batang kedua telah dihapus sesuai instruksi perbaikan.
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
      aria-label="Grafik garis tren kategori"
      className="rounded-2xl border bg-card p-4 transition-all"
    >
      <div className="flex items-center justify-between pb-3 border-b mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tren Garis Bulanan
        </span>
        <span className="text-xs text-muted-foreground">
          {points.length} Bulan
        </span>
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

        {/* Grafik Garis SVG */}
        <div className="flex h-32 min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              preserveAspectRatio="none"
              className="size-full overflow-visible"
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
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
                  stroke="var(--primary)"
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
                  fill={c.amount > 0 ? 'var(--primary)' : 'var(--muted-foreground)'}
                  stroke="var(--card)"
                  strokeWidth="1.5"
                  opacity={c.amount > 0 ? 1 : 0.4}
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
      </div>
    </section>
  )
}

/**
 * Komponen Grafik Garis Utama (Line Chart) untuk Tab Statistik:
 * Menampilkan nominal transaksi harian / bulanan dengan sumbu dan tooltip interaktif.
 * Tanggal tanpa transaksi bernilai default 0 agar garis grafik tidak terputus.
 * Untuk filter Periode / Kustom, grafik garis ditiadakan sesuai instruksi.
 */
export function StatistikLineChart({
  points,
  currency,
  mode,
  color,
  title,
  testId = 'stats-line-chart',
}: {
  points: LineChartPoint[] | null
  currency: Currency | null
  mode: 'weekly' | 'monthly' | 'yearly' | 'period'
  color?: string
  title?: string
  testId?: string
}) {
  const { t } = useTranslation()
  const gradientId = useId()
  const [activePoint, setActivePoint] = useState<LineChartPoint | null>(null)

  // Jika mode period atau tidak ada points, grafik garis ditiadakan
  if (!points || points.length === 0 || mode === 'period') {
    return null
  }

  const total = points.reduce((sum, p) => sum + p.amount, 0)
  const max = points.reduce((peak, point) => Math.max(peak, point.amount), 0)

  // Dimensi SVG
  const isMonthly = mode === 'monthly'
  const svgWidth = isMonthly ? 600 : 400
  const svgHeight = 140
  const padX = isMonthly ? 12 : 20
  const padY = 20
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
      aria-label="Grafik garis transaksi"
      className="rounded-2xl border bg-card p-4 transition-all"
    >
      <div className="flex items-center justify-between pb-3 border-b mb-3">
        <div className="flex items-center gap-2">
          <span
            className="flex size-7 items-center justify-center rounded-lg"
            style={{
              backgroundColor: color ? `${color}20` : 'oklch(from var(--primary) l c h / 0.15)',
              color: color || 'var(--primary)',
            }}
          >
            <TrendingUp className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {title ?? (mode === 'yearly' ? t.stats.monthlyTrend : t.stats.dailyTrend)}
            </h3>
            <p className="text-sm font-bold tabular-nums text-foreground">
              {formatCurrency(total, currency)}
            </p>
          </div>
        </div>

        {activePoint && (
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">{activePoint.fullDate}</p>
            <p className="text-xs font-bold text-primary tabular-nums">
              {formatCurrency(activePoint.amount, currency)}
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {/* Label sumbu Y */}
        <div
          aria-hidden="true"
          className="flex h-32 shrink-0 flex-col justify-between text-right text-[10px] tabular-nums text-muted-foreground pr-1"
        >
          <span>{formatCompactAmount(max)}</span>
          <span>{formatCompactAmount(max / 2)}</span>
          <span>0</span>
        </div>

        {/* Grafik Garis SVG */}
        <div className="flex h-32 min-w-0 flex-1 flex-col overflow-x-auto">
          <div className="relative min-h-0 flex-1">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              preserveAspectRatio="none"
              className="size-full overflow-visible"
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color || 'var(--primary)'} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={color || 'var(--primary)'} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Garis batas dasar 0 */}
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

              {/* Garis tren utama */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke={color || 'var(--primary)'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Titik data pada kurva */}
              {coords.map((c) => (
                <circle
                  key={c.key}
                  cx={c.x}
                  cy={c.y}
                  r={c.amount > 0 ? (isMonthly ? '3' : '4') : '2'}
                  fill={c.amount > 0 ? (color || 'var(--primary)') : 'var(--muted-foreground)'}
                  stroke="var(--card)"
                  strokeWidth="1.5"
                  opacity={c.amount > 0 ? 1 : 0.4}
                  className={cn(
                    activePoint?.key === c.key && 'r-5 ring-2 ring-primary ring-offset-1',
                  )}
                />
              ))}
            </svg>

            {/* Area hover / sentuh untuk interaksi */}
            <div className="absolute inset-0 flex items-stretch">
              {coords.map((point) => (
                <div
                  key={point.key}
                  data-testid={`stats-line-point-${point.key}`}
                  role="button"
                  tabIndex={0}
                  onMouseEnter={() => setActivePoint(point)}
                  onClick={() => setActivePoint(point)}
                  aria-label={`${point.fullDate}: ${formatCurrency(point.amount, currency)}`}
                  className="flex-1 cursor-pointer focus:outline-none"
                />
              ))}
            </div>
          </div>

          {/* Label sumbu X */}
          <div className="flex justify-between pt-1.5 text-[10px] text-muted-foreground">
            {coords.map((p, idx) => {
              // Untuk mode bulanan, tampilkan secukupnya agar tidak bertumpuk
              if (isMonthly && idx % 4 !== 0 && idx !== coords.length - 1 && idx !== 0) {
                return null
              }
              return (
                <span key={p.key} className="text-center font-medium">
                  {p.label}
                  {p.subLabel && <span className="block text-[9px] text-muted-foreground/75">{p.subLabel}</span>}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
