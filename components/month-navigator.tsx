'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MONTHS, shiftMonth, type MonthValue } from '@/lib/month'

// Re-exported so existing imports keep working (source of truth: lib/month.ts).
export { MONTHS, shiftMonth }
export type { MonthValue }

const iconButton =
  'flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:size-10'

type MonthNavigatorProps = {
  value: MonthValue
  today: MonthValue
  onChange: (value: MonthValue) => void
  /** `month` (default) shows "Okt 2026"; `year` shows only the year (Bulanan view). */
  variant?: 'month' | 'year'
}

export function MonthNavigator({ value, today, onChange, variant = 'month' }: MonthNavigatorProps) {
  const isYear = variant === 'year'
  const [open, setOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(value.year)
  const popupRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupId = useId()

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (popupRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const togglePicker = () => {
    if (!open) setPickerYear(value.year)
    setOpen((current) => !current)
  }

  const selectMonth = (month: number) => {
    onChange({ year: pickerYear, month })
    setOpen(false)
    triggerRef.current?.focus()
  }

  const label = isYear ? String(value.year) : `${MONTHS[value.month].short} ${value.year}`
  const fullLabel = isYear ? String(value.year) : `${MONTHS[value.month].full} ${value.year}`
  const step = isYear ? 12 : 1

  return (
    <div className="relative inline-flex items-center gap-0.5 md:gap-1">
      <button
        type="button"
        onClick={() => onChange(shiftMonth(value, -step))}
        aria-label={isYear ? 'Tahun sebelumnya' : 'Bulan sebelumnya'}
        className={iconButton}
      >
        <ChevronLeft aria-hidden="true" className="size-4 md:size-5" />
      </button>

      <button
        ref={triggerRef}
        type="button"
        onClick={togglePicker}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popupId : undefined}
        aria-label={`${isYear ? 'Pilih tahun' : 'Pilih bulan'}, saat ini ${fullLabel}`}
        data-testid="month-navigator-label"
        className={cn(
          'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-base font-semibold tracking-tight tabular-nums transition-colors duration-200 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:gap-2 md:px-4 md:py-2 md:text-xl md:font-bold',
          open && 'bg-secondary',
        )}
      >
        <span aria-live="polite">{label}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'size-3.5 text-muted-foreground transition-transform duration-200 md:size-4',
            open && 'rotate-180',
          )}
        />
      </button>

      <button
        type="button"
        onClick={() => onChange(shiftMonth(value, step))}
        aria-label={isYear ? 'Tahun selanjutnya' : 'Bulan selanjutnya'}
        className={iconButton}
      >
        <ChevronRight aria-hidden="true" className="size-4 md:size-5" />
      </button>

      {open && (
        <div
          ref={popupRef}
          id={popupId}
          role="dialog"
          aria-label={isYear ? 'Pilih tahun' : 'Pilih bulan dan tahun'}
          className="absolute top-full left-0 z-40 mt-3 w-[min(20rem,calc(100vw-2.5rem))] rounded-3xl border bg-popover p-3 text-popover-foreground shadow-xl animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 ease-out-quart md:w-[32rem] md:p-4"
        >
          <div className="mb-3 flex items-center justify-between border-b pb-3 md:mb-4 md:pb-4">
            <button
              type="button"
              onClick={() => setPickerYear((year) => year - (isYear ? 12 : 1))}
              aria-label="Tahun sebelumnya"
              className={iconButton}
            >
              <ChevronLeft aria-hidden="true" className="size-4 md:size-5" />
            </button>
            <p className="text-sm font-semibold tabular-nums md:text-base" aria-live="polite">
              {pickerYear}
            </p>
            <button
              type="button"
              onClick={() => setPickerYear((year) => year + (isYear ? 12 : 1))}
              aria-label="Tahun selanjutnya"
              className={iconButton}
            >
              <ChevronRight aria-hidden="true" className="size-4 md:size-5" />
            </button>
          </div>

          {isYear ? (
            <ul className="grid grid-cols-4 gap-1.5 md:gap-2">
              {Array.from({ length: 12 }, (_, i) => pickerYear - 8 + i).map((year) => {
                const isSelected = value.year === year
                const isCurrent = today.year === year
                return (
                  <li key={year}>
                    <button
                      type="button"
                      data-testid={`year-option-${year}`}
                      onClick={() => {
                        onChange({ year, month: value.month })
                        setOpen(false)
                        triggerRef.current?.focus()
                      }}
                      aria-pressed={isSelected}
                      aria-label={String(year)}
                      className={cn(
                        'relative flex h-11 w-full items-center justify-center rounded-xl text-xs font-medium tabular-nums transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-12 md:text-sm',
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'hover:bg-secondary hover:text-foreground',
                        !isSelected && isCurrent && 'text-primary',
                      )}
                    >
                      {year}
                      {isCurrent && !isSelected && (
                        <span
                          aria-hidden="true"
                          className="absolute bottom-1.5 size-1.5 rounded-full bg-primary md:bottom-2"
                        />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <ul className="grid grid-cols-4 gap-1.5 md:gap-2">
              {MONTHS.map((month, index) => {
                const isSelected = value.year === pickerYear && value.month === index
                const isCurrent = today.year === pickerYear && today.month === index
                return (
                  <li key={month.full}>
                    <button
                      type="button"
                      onClick={() => selectMonth(index)}
                      aria-pressed={isSelected}
                      aria-label={`${month.full} ${pickerYear}`}
                      className={cn(
                        'relative flex h-11 w-full items-center justify-center rounded-xl text-xs font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-12 md:text-sm',
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'hover:bg-secondary hover:text-foreground',
                        !isSelected && isCurrent && 'text-primary',
                      )}
                    >
                      <span className="uppercase md:hidden">{month.short}</span>
                      <span className="hidden md:inline">{month.full}</span>
                      {isCurrent && !isSelected && (
                        <span
                          aria-hidden="true"
                          className="absolute bottom-1.5 size-1.5 rounded-full bg-primary md:bottom-2"
                        />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
