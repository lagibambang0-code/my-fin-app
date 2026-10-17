'use client'

import { useEffect, useRef } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Accessible confirmation dialog used to guard destructive actions.
 * Renders a scrim, traps initial focus and closes on Escape.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      data-testid="confirm-dialog"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className="w-full max-w-sm rounded-2xl border bg-card p-5 shadow-xl"
      >
        <div className="mb-3 flex items-start gap-3">
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-full',
              destructive
                ? 'bg-destructive/10 text-destructive'
                : 'bg-primary/10 text-primary',
            )}
            aria-hidden="true"
          >
            <AlertCircle className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 id="confirm-dialog-title" className="text-base font-bold">
              {title}
            </h2>
            <p
              id="confirm-dialog-desc"
              className="mt-1 text-sm text-pretty text-muted-foreground"
            >
              {description}
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button ref={cancelRef} type="button" variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? 'destructive' : 'default'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
