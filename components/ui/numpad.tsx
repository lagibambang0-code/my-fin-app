'use client'

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
}: {
  onKey: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      data-testid="numpad-back"
      aria-label="Hapus satu digit"
      onClick={onKey}
      className={cn(
        'flex size-11 shrink-0 items-center justify-center rounded-xl border text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:size-12',
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
}

/** Digits, `00`, decimal point and (optionally) backspace — the shared keypad. */
export function Numpad({ onKey, decimals = 2, className, showBackspace = true }: NumpadProps) {
  return (
    <div className={cn('grid grid-cols-3 gap-1.5 md:gap-2', className)}>
      {KEYS.map((key) => {
        const disabled = key === '.' && decimals === 0
        return (
          <button
            key={key}
            type="button"
            data-testid={`numpad-${key === '.' ? 'dot' : key}`}
            disabled={disabled}
            onClick={() => onKey(key)}
            className={cn(
              'flex h-11 items-center justify-center rounded-xl border border-transparent bg-secondary/60 text-lg font-semibold tabular-nums transition-colors duration-150 md:h-12',
              'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-accent',
              disabled && 'pointer-events-none opacity-40',
            )}
          >
            {key}
          </button>
        )
      })}
      {showBackspace && (
        <NumpadBackspace onKey={() => onKey('back')} className="col-span-3 w-full" />
      )}
    </div>
  )
}
