'use client'

import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Numpad, NumpadBackspace, applyNumpadKey, type NumpadKey } from '@/components/ui/numpad'
import { Overlay } from '@/components/ui/overlay'
import type { Currency } from '@/lib/db'
import { formatTypingAmount } from '@/lib/format'

type BudgetAmountSheetProps = {
  open: boolean
  /** Sheet title — "Total" or "Anggaran dasar". */
  title: string
  /** Current amount in rupiah; shown prefilled when the sheet opens. */
  initial: number
  currency: Currency | null
  onClose: () => void
  onSubmit: (amount: number) => void
}

/**
 * Number pad bottom sheet for budget inputs (PRD-04 §3.2.4). Kept local to the
 * budget module so the pad can be reused by the form and the monthly detail.
 */
export function BudgetAmountSheet({
  open,
  title,
  initial,
  currency,
  onClose,
  onSubmit,
}: BudgetAmountSheetProps) {
  const [raw, setRaw] = useState('')

  useEffect(() => {
    if (open) setRaw(initial > 0 ? String(initial) : '')
  }, [open, initial])

  const decimals = currency?.DECIMAL_POINT ?? 0
  const handleKey = (key: NumpadKey) => setRaw((current) => applyNumpadKey(current, key, decimals))

  return (
    <Overlay open={open} onClose={onClose} align="bottom" label={title} testId="budget-pad">
      <div className="mx-auto w-full max-w-md rounded-2xl border bg-card p-4 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <p
          data-testid="budget-pad-value"
          className="mt-3 rounded-xl bg-secondary/40 px-3 py-2 text-right text-2xl font-bold tabular-nums"
        >
          {formatTypingAmount(raw, currency)}
        </p>

        <div className="mt-3">
          <Numpad decimals={decimals} onKey={handleKey} showBackspace={false} />
          <div className="mt-1.5 flex items-center gap-1.5">
            <NumpadBackspace onKey={() => handleKey('back')} />
            <Button
              type="button"
              data-testid="budget-pad-done"
              className="h-11 flex-1"
              onClick={() => onSubmit(raw ? Number(raw) : 0)}
            >
              <Check aria-hidden="true" className="size-4" />
              Selesai
            </Button>
          </div>
        </div>
      </div>
    </Overlay>
  )
}
