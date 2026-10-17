'use client'

import { useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type OverlayProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  align?: 'center' | 'bottom' | 'top'
  testId?: string
  label?: string
}

/** Centered / bottom modal scrim that closes on Escape and backdrop click. */
export function Overlay({
  open,
  onClose,
  children,
  className,
  align = 'center',
  testId,
  label,
}: OverlayProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      data-testid={testId}
      className={cn(
        'fixed inset-0 z-[70] flex bg-background/90 p-4 backdrop-blur-sm',
        align === 'center' && 'items-center justify-center',
        align === 'bottom' && 'items-end justify-center pb-[max(1rem,env(safe-area-inset-bottom))]',
        align === 'top' && 'items-start justify-center pt-[max(1rem,env(safe-area-inset-top))]',
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn('w-full', align === 'bottom' && 'pb-1', className)}
      >
        {children}
      </div>
    </div>
  )
}

/** Full-screen panel used for forms and detail views inside the tab shell. */
export function FullScreenSheet({
  open,
  children,
  testId,
  className,
}: {
  open: boolean
  children: ReactNode
  testId?: string
  className?: string
}) {
  if (!open) return null
  return (
    <div
      data-testid={testId}
      className={cn('fixed inset-0 z-[70] flex flex-col bg-background', className)}
    >
      {children}
    </div>
  )
}
