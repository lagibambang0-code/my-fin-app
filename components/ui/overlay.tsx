'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const content = (
    <div
      data-testid={testId}
      className={cn(
        'fixed inset-0 z-[70] flex bg-black/40 backdrop-blur-[2px] transition-all animate-in fade-in duration-150',
        align === 'center' && 'items-center justify-center p-4',
        align === 'bottom' && 'items-end justify-center p-0 md:p-4 md:pb-[max(1rem,env(safe-area-inset-bottom))]',
        align === 'top' && 'items-start justify-center pt-[max(1rem,env(safe-area-inset-top))] p-4',
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          align === 'bottom'
            ? 'w-full max-w-full md:max-w-md cursor-default'
            : 'w-full cursor-default',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )

  if (mounted && typeof document !== 'undefined') {
    return createPortal(content, document.body)
  }
  return content
}

/**
 * Panel used for forms and detail views inside the tab shell.
 *
 * - `plain` (default) — opaque, edge-to-edge full-screen surface.
 * - `drawer` — rises from the bottom over a dimmed scrim; the surface is a
 *   translucent glass layer so the page behind stays faintly visible.
 */
export function FullScreenSheet({
  open,
  onClose,
  children,
  testId,
  className,
  variant = 'plain',
}: {
  open: boolean
  onClose?: () => void
  children: ReactNode
  testId?: string
  className?: string
  variant?: 'plain' | 'drawer'
}) {
  useEffect(() => {
    if (!open || !onClose) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  if (variant === 'drawer') {
    return (
      <div data-testid={testId} className="fixed inset-0 z-[70] flex flex-col justify-end">
        <div
          aria-hidden="true"
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px] cursor-pointer animate-in fade-in duration-150 motion-reduce:animate-none"
        />
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            'relative mx-auto flex h-[93dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[1.75rem] border-t border-border/60 bg-background/85 shadow-2xl backdrop-blur-2xl',
            'animate-in fade-in slide-in-from-bottom-8 duration-200 ease-out motion-reduce:animate-none',
            'md:mb-8 md:h-[calc(100dvh-4rem)] md:max-w-3xl md:rounded-[2rem] md:border lg:max-w-5xl',
            className,
          )}
        >
          {children}
        </div>
      </div>
    )
  }

  return (
    <div
      data-testid={testId}
      className={cn('fixed inset-0 z-[70] flex flex-col bg-background', className)}
    >
      {children}
    </div>
  )
}
