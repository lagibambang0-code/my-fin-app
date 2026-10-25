'use client'

import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Numpad, NumpadBackspace, applyNumpadKey, type NumpadKey } from '@/components/ui/numpad'
import { Overlay } from '@/components/ui/overlay'
import type { Currency } from '@/lib/db'
import { formatTypingAmount, parseAmount } from '@/lib/format'

type AmountSheetProps = {
  open: boolean
  /** Sheet heading, e.g. "Biaya transfer". */
  title: string
  /** Canonical digit string to prefill — `"1500"`, `"1500.5"`, `""` for empty. */
  initialRaw: string
  currency: Currency | null
  onClose: () => void
  /** Receives the parsed amount when the user confirms. */
  onDone: (amount: number) => void
  testId: string
  valueTestId: string
  doneTestId: string
  doneLabel?: string
  /**
   * Prefix for the pad keys. Pass a distinct value whenever this sheet can be
   * open on top of a screen that already renders its own pad.
   */
  padTestIdPrefix?: string
  /** Optional note under the value, e.g. what the amount is deducted from. */
  hint?: string
}

/**
 * Bottom sheet holding the shared number pad, for amount fields that live
 * inside another sheet or form (transfer fee, budget total). Editing money with
 * the app's own pad keeps entry consistent and avoids the native keyboard.
 */
export function AmountSheet({
  open,
  title,
  initialRaw,
  currency,
  onClose,
  onDone,
  testId,
  valueTestId,
  doneTestId,
  doneLabel = 'Selesai',
  padTestIdPrefix = 'numpad-',
  hint,
}: AmountSheetProps) {
  const [raw, setRaw] = useState('')

  useEffect(() => {
    if (open) setRaw(initialRaw)
  }, [open, initialRaw])

  const decimals = currency?.DECIMAL_POINT ?? 0
  const handleKey = (key: NumpadKey) =>
    setRaw((current) => applyNumpadKey(current, key, decimals))

  return (
    <Overlay open={open} onClose={onClose} align="bottom" label={title} testId={testId}>
      <div className="mx-auto flex max-h-[85vh] w-full max-w-full flex-col overflow-hidden rounded-t-[1.75rem] border-t bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl md:max-w-md md:rounded-2xl md:border md:pb-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="mt-3 flex items-baseline justify-end gap-2 rounded-xl bg-secondary/40 px-3 py-2.5">
          <span aria-hidden="true" className="text-xs font-semibold text-muted-foreground">
            {currency?.SYMBOL ?? 'Rp'}
          </span>
          <p
            data-testid={valueTestId}
            className="min-w-0 truncate text-2xl font-bold tabular-nums"
          >
            {formatTypingAmount(raw, currency)}
          </p>
        </div>

        {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}

        <div className="mt-3">
          <Numpad
            decimals={decimals}
            onKey={handleKey}
            showBackspace={false}
            testIdPrefix={padTestIdPrefix}
          />
          <div className="mt-1.5 flex items-center gap-1.5">
            <NumpadBackspace onKey={() => handleKey('back')} testId={`${padTestIdPrefix}back`} />
            <Button
              type="button"
              data-testid={doneTestId}
              className="h-11 flex-1"
              onClick={() => onDone(parseAmount(raw) || 0)}
            >
              <Check aria-hidden="true" className="size-4" />
              {doneLabel}
            </Button>
          </div>
        </div>
      </div>
    </Overlay>
  )
}
