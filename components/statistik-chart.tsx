'use client'

import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import type { Currency } from '@/lib/db'
import {
  formatCompactAmount,
  formatPercent,
  type CategoryStat,
  type TrendPoint,
} from '@/lib/statistics-utils'

/**
 * "Bar Chart" section of the Statistik tab (PRD-13 §3.2.4): one horizontal bar
 * per category, labelled with the category name and its ratio.
 */
export function CategoryBarChart({
  stats,
  testId = 'stats-chart',
}: {
  stats: CategoryStat[]
  testId?: string
}) {
  return (
    <section data-testid={testId} className="rounded-2xl border bg-card p-4">
      <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Bar Chart
      </h2>
      <div className="mt-3 flex flex-col gap-3">
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
                className="flex h-full items-center justify-end rounded-full pr-1.5 transition-[width] duration-300 ease-out-quart"
                style={{
                  // Keep a sliver visible so tiny slices still show their colour.
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
    </section>
  )
}

/**
 * Monthly bar chart of one category with a value axis, used by the
 * drill-down screen (PRD-13 §3.2.6).
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
  const max = points.reduce((peak, point) => Math.max(peak, point.amount), 0)

  return (
    <section data-testid={testId} className="rounded-2xl border bg-card p-4">
      <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Bar Chart
      </h2>

      <div className="mt-3 flex gap-2">
        <div
          aria-hidden="true"
          className="flex h-28 shrink-0 flex-col justify-between text-right text-[10px] tabular-nums text-muted-foreground"
        >
          <span data-testid="stats-detail-axis-max">{formatCompactAmount(max)}</span>
          <span>{formatCompactAmount(max / 2)}</span>
          <span>0</span>
        </div>

        <div className="flex h-28 min-w-0 flex-1 items-stretch gap-1">
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
                      'w-full rounded-t-md transition-[height] duration-300 ease-out-quart',
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
      </div>
    </section>
  )
}
