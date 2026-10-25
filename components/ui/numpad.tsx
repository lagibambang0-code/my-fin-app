'use client'

import type { ReactNode } from 'react'
import { Delete } from 'lucide-react'
import { cn } from '@/lib/utils'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '.'] as const

export type NumpadKey = (typeof KEYS)[number] | 'back'

/**
 * Append a key press to a raw amount string. Keeps a single decimal separator
 * and never leaves a leading zero run ("0" then "5" → "5").
 */
export function applyNumpadKey(current: string, key: NumpadKey, decimals = 2): string {
  if (key === 'back') return current.slice(0, -1)

  if (key === '.') {
    if (decimals === 0 || current.includes('.')) return current
    return current === '' ? '0.' : `${current}.`
  }

  if (key === '00') {
    if (current === '' || current === '0') return current
    const fractional = current.split('.')[1]
    if (fractional !== undefined && fractional.length + 2 > decimals) return current
    return `${current}00`
  }

  const [, fractional] = current.split('.')
  if (fractional !== undefined && fractional.length >= decimals) return current
  if (current === '0') return key
  return current + key
}

/** The `⌫` key. Kept separate so screens can park it next to the amount. */
export function NumpadBackspace({
  onKey,
  className,
  testId = 'numpad-back',
}: {
  onKey: () => void
  className?: string
  testId?: string
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-label="Hapus satu digit"
      onClick={onKey}
      className={cn(
        'flex h-10 w-full items-center justify-center rounded-xl border border-transparent bg-secondary/60 text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-12',
        className,
      )}
    >
      <Delete aria-hidden="true" className="size-5" />
    </button>
  )
}

type NumpadProps = {
  onKey: (key: NumpadKey) => void
  decimals?: number
  className?: string
  /** Set to false when the screen renders its own `NumpadBackspace`. */
  showBackspace?: boolean
  /**
   * Test-id prefix for the keys. Pass a distinct value when a pad can be on
   * screen at the same time as another one (e.g. a sheet over a form).
   */
  testIdPrefix?: string
  /**
   * Show the minus (sign-toggle) button in column 4, row 2.
   * Passing either `showMinus` or `showDone` activates the 4-column layout
   * which also moves the backspace key into the grid (col 4, row 1).
   * Pass `false` to reserve the slot without rendering the button (e.g. transfer).
   */
  showMinus?: boolean
  /** Whether the current value is negative; reflected as `aria-pressed` on the minus button. */
  negative?: boolean
  /** Called when the minus button is pressed. */
  onMinus?: () => void
  /**
   * Show the "Selesai" (done/close) button in column 4, row 3.
   * Passing this activates the 4-column layout.
   */
  showDone?: boolean
  /** Called when the Selesai button is pressed. */
  onDone?: () => void
}

/** Digits, `00`, decimal point and (optionally) backspace — the shared keypad. */
export function Numpad({
  onKey,
  decimals = 2,
  className,
  showBackspace = true,
  testIdPrefix = 'numpad-',
  showMinus,
  negative = false,
  onMinus,
  showDone,
  onDone,
}: NumpadProps) {
  // 4-column layout when minus/done buttons are requested.
  const fourCol = showMinus !== undefined || showDone !== undefined

  const digitBtn = (key: (typeof KEYS)[number]) => {
    const disabled = key === '.' && decimals === 0
    return (
      <button
        key={key}
        type="button"
        data-testid={`${testIdPrefix}${key === '.' ? 'dot' : key}`}
        disabled={disabled}
        onClick={() => onKey(key)}
        className={cn(
          'flex h-10 items-center justify-center rounded-xl border border-transparent bg-secondary/60 text-base font-semibold tabular-nums transition-colors duration-150 md:h-12',
          'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-accent',
          disabled && 'pointer-events-none opacity-40',
        )}
      >
        {key}
      </button>
    )
  }

  if (fourCol) {
    // Split the 12 digit keys into 4 rows of 3, then append a 4th-column
    // button per row: ⌫ / − / Selesai / (empty).
    const rows = [
      { digits: ['1', '2', '3'] as const },
      { digits: ['4', '5', '6'] as const },
      { digits: ['7', '8', '9'] as const },
      { digits: ['00', '0', '.'] as const },
    ]

    const col4: ReactNode[] = [
      // Row 1 col 4: backspace always shown in 4-col layout
      <NumpadBackspace
        key="back"
        onKey={() => onKey('back')}
        testId={`${testIdPrefix}back`}
      />,
      // Row 2 col 4: minus or empty placeholder
      showMinus ? (
        <button
          key="minus"
          type="button"
          data-testid={`${testIdPrefix}minus`}
          aria-label="Minus"
          aria-pressed={negative}
          onClick={onMinus}
          className={cn(
            'flex h-10 items-center justify-center rounded-xl border border-transparent bg-secondary/60 text-lg font-semibold transition-colors duration-150 md:h-12',
            'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-accent',
            negative && 'bg-primary/15 text-primary',
          )}
        >
          −
        </button>
      ) : (
        <span key="minus-empty" aria-hidden="true" />
      ),
      // Row 3 col 4: Selesai or empty placeholder
      showDone ? (
        <button
          key="done"
          type="button"
          data-testid={`${testIdPrefix}done`}
          aria-label="Selesai"
          onClick={onDone}
          className={cn(
            'flex h-10 items-center justify-center rounded-xl border border-transparent bg-secondary/60 text-xs font-bold text-primary transition-colors duration-150 md:h-12',
            'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-accent',
          )}
        >
          Selesai
        </button>
      ) : (
        <span key="done-empty" aria-hidden="true" />
      ),
      // Row 4 col 4: intentionally empty
      <span key="empty4" aria-hidden="true" />,
    ]

    return (
      <div className={cn('grid grid-cols-4 gap-1.5 md:gap-2', className)}>
        {rows.flatMap((row, i) => [...row.digits.map(digitBtn), col4[i]])}
      </div>
    )
  }

  // Default 3-column layout — unchanged behaviour for all other callers.
  return (
    <div className={cn('grid grid-cols-3 gap-1.5 md:gap-2', className)}>
      {KEYS.map(digitBtn)}
      {showBackspace && (
        <NumpadBackspace
          onKey={() => onKey('back')}
          testId={`${testIdPrefix}back`}
          className="col-span-3 w-full"
        />
      )}
    </div>
  )
}
