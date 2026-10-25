'use client'

import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/components/language-provider'
import { FullScreenSheet } from '@/components/ui/overlay'
import { RECUR_FREQUENCIES } from '@/lib/transaction-utils'

type RepeatTypeSheetProps = {
  open: boolean
  /** Index into `RECUR_FREQUENCIES` (also the `REPEAT_TYPE` value). */
  onSelect: (index: number) => void
  onClose: () => void
}

/** "Ulang" (RepeatTypeList) — the 14 repeat frequencies, PRD-05 §3.3. */
export function RepeatTypeSheet({ open, onSelect, onClose }: RepeatTypeSheetProps) {
  const { t } = useTranslation()
  const freqKeys = [
    'none',
    'daily',
    'weekdays',
    'weekends',
    'weekly',
    'biweekly',
    'fourWeekly',
    'monthly',
    'endOfMonth',
    'bimonthly',
    'quarterly',
    'fourMonthly',
    'semiannual',
    'yearly',
  ] as const

  return (
    <FullScreenSheet open={open} testId="repeat-type-screen">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/85 px-3 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Kembali"
          data-testid="repeat-type-back"
          onClick={onClose}
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight">{t.transaction.repeat}</h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto pb-8">
        <ul className="mx-auto w-full max-w-lg px-2 py-2">
          {RECUR_FREQUENCIES.map((_, index) => {
            const label = t.repeat.frequencies[freqKeys[index]] ?? RECUR_FREQUENCIES[index]
            return (
              <li key={freqKeys[index]}>
                <button
                  type="button"
                  data-testid={`repeat-option-${index}`}
                  onClick={() => onSelect(index)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    aria-hidden="true"
                    className="size-5 shrink-0 rounded-full border border-muted-foreground/50"
                  />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </FullScreenSheet>
  )
}
