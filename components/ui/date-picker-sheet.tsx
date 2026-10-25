'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Overlay } from '@/components/ui/overlay'
import { cn } from '@/lib/utils'
import { WEEKDAYS_SHORT, addDays, fromIso, toIso, todayIso } from '@/lib/format'

const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

type DatePickerSheetProps = {
  open: boolean
  /** Selected day as `YYYY-MM-DD`. */
  value: string
  onSelect: (iso: string) => void
  onClose: () => void
  title?: string
  testId?: string
}

/**
 * Bottom-sheet calendar used by every date field in the app. Keeping the grid
 * inside a sheet (instead of expanding inline) means it never fights the
 * transaksi numpad and always has room to render a full month.
 */
export function DatePickerSheet({
  open,
  value,
  onSelect,
  onClose,
  title = 'Pilih tanggal',
  testId = 'date-picker-sheet',
}: DatePickerSheetProps) {
  const [cursor, setCursor] = useState(() => fromIso(value || todayIso()))

  // Re-open on the selected month, not wherever the user last browsed.
  useEffect(() => {
    if (open) setCursor(fromIso(value || todayIso()))
  }, [open, value])

  const today = todayIso()
  const year = cursor.getFullYear()
  const month = cursor.getMonth()

  const cells = useMemo(() => {
    const firstWeekday = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const list: (string | null)[] = []
    for (let i = 0; i < firstWeekday; i += 1) list.push(null)
    for (let day = 1; day <= daysInMonth; day += 1) list.push(toIso(new Date(year, month, day)))
    return list
  }, [year, month])

  const yearOptions = useMemo(() => {
    const base = new Date().getFullYear()
    const selected = fromIso(value || todayIso()).getFullYear()
    const from = Math.min(base - 20, selected)
    const to = Math.max(base + 5, selected)
    const list: number[] = []
    for (let y = from; y <= to; y += 1) list.push(y)
    return list
  }, [value])

  const quick = [
    { id: 'today', label: 'Hari ini', iso: today },
    { id: 'yesterday', label: 'Kemarin', iso: toIso(addDays(new Date(), -1)) },
    { id: 'tomorrow', label: 'Besok', iso: toIso(addDays(new Date(), 1)) },
  ]

  const shiftMonth = (delta: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1))

  return (
    <Overlay open={open} onClose={onClose} align="bottom" testId={testId} label={title}>
      <div className="mx-auto flex max-h-[85vh] w-full max-w-full flex-col overflow-hidden rounded-t-[1.75rem] border-t bg-card pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl md:max-w-md md:rounded-2xl md:border md:pb-0">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h2 className="text-base font-bold">{title}</h2>
          <button
            type="button"
            data-testid="date-picker-close"
            aria-label="Tutup"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="flex gap-2 px-4 pt-3">
          {quick.map((option) => {
            const active = option.iso === value
            return (
              <button
                key={option.id}
                type="button"
                data-testid={`date-picker-quick-${option.id}`}
                aria-pressed={active}
                onClick={() => {
                  onSelect(option.iso)
                  onClose()
                }}
                className={cn(
                  'flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background text-foreground hover:bg-secondary',
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between gap-2 px-4 pt-4">
          <button
            type="button"
            data-testid="date-picker-prev-month"
            aria-label="Bulan sebelumnya"
            onClick={() => shiftMonth(-1)}
            className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>

          <div className="flex items-center gap-2">
            <span data-testid="date-picker-month-label" className="text-sm font-semibold">
              {MONTHS[month]} {year}
            </span>
            <select
              data-testid="date-picker-year"
              aria-label="Pilih tahun"
              value={year}
              onChange={(e) => setCursor((c) => new Date(Number(e.target.value), c.getMonth(), 1))}
              className="rounded-lg border border-input bg-background px-2 py-1 text-xs font-medium tabular-nums transition-colors hover:bg-secondary focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {yearOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            data-testid="date-picker-next-month"
            aria-label="Bulan selanjutnya"
            onClick={() => shiftMonth(1)}
            className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="px-3 pt-3 pb-4">
          <div className="mb-1 grid grid-cols-7" aria-hidden="true">
            {WEEKDAYS_SHORT.map((day) => (
              <span
                key={day}
                className="py-1 text-center text-xs font-medium text-muted-foreground"
              >
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((iso, index) => {
              if (!iso) return <span key={`empty-${index}`} aria-hidden="true" />
              const isSelected = iso === value
              const isToday = iso === today
              const label = fromIso(iso).toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
              return (
                <button
                  key={iso}
                  type="button"
                  data-testid={`date-picker-day-${iso}`}
                  aria-label={label}
                  aria-pressed={isSelected}
                  aria-current={isToday ? 'date' : undefined}
                  onClick={() => {
                    onSelect(iso)
                    onClose()
                  }}
                  className={cn(
                    'flex h-11 items-center justify-center rounded-xl text-sm font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : isToday
                        ? 'text-primary ring-1 ring-primary/50 hover:bg-secondary'
                        : 'text-foreground hover:bg-secondary',
                  )}
                >
                  {fromIso(iso).getDate()}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </Overlay>
  )
}
