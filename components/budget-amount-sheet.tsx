'use client'

import { AmountSheet } from '@/components/ui/amount-sheet'
import type { Currency } from '@/lib/db'

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
 * Number pad bottom sheet for budget inputs (PRD-04 §3.2.4). Thin wrapper over
 * the shared `AmountSheet` so every money field in the app uses one pad.
 */
export function BudgetAmountSheet({
  open,
  title,
  initial,
  currency,
  onClose,
  onSubmit,
}: BudgetAmountSheetProps) {
  return (
    <AmountSheet
      open={open}
      title={title}
      initialRaw={initial > 0 ? String(initial) : ''}
      currency={currency}
      onClose={onClose}
      onDone={onSubmit}
      testId="budget-pad"
      valueTestId="budget-pad-value"
      doneTestId="budget-pad-done"
    />
  )
}
