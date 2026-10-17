'use client'

import { cn } from '@/lib/utils'

type SwitchProps = {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  testId?: string
  disabled?: boolean
}

/** Accessible role="switch" toggle matching the settings look. */
export function Switch({ checked, onChange, label, testId, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-testid={testId}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-muted-foreground/30',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 size-5 rounded-full bg-white shadow transition-all',
          checked ? 'left-[1.375rem]' : 'left-0.5',
        )}
      />
    </button>
  )
}
