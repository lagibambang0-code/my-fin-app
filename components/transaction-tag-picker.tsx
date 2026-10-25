'use client'

import { useEffect, useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Overlay } from '@/components/ui/overlay'
import { cn } from '@/lib/utils'
import type { Tag } from '@/lib/db'

type TransactionTagPickerProps = {
  open: boolean
  tags: Tag[]
  selected: string[]
  onToggle: (uid: string) => void
  /** Quick-create a tag without leaving the form (keeps the draft alive). */
  onCreate: (name: string) => Promise<void>
  onClose: () => void
}

/**
 * Multi-select tag sheet for the transaction form (`TX_TAG`). New tags can be
 * created inline so the in-progress draft is never lost; renaming/deleting
 * lives in Lainnya → Kelola tag.
 */
export function TransactionTagPicker({
  open,
  tags,
  selected,
  onToggle,
  onCreate,
  onClose,
}: TransactionTagPickerProps) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setName('')
    setBusy(false)
  }, [open])

  const submit = async () => {
    const value = name.trim()
    if (!value || busy) return
    setBusy(true)
    await onCreate(value)
    setName('')
    setBusy(false)
  }

  return (
    <Overlay open={open} onClose={onClose} align="bottom" testId="trx-tag-picker" label="Tag">
      <div className="mx-auto flex max-h-[85vh] w-full max-w-full flex-col overflow-hidden rounded-t-[1.75rem] border-t bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl md:max-w-md md:rounded-2xl md:border md:pb-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold">Tag</h2>
          <Button variant="ghost" size="icon-sm" aria-label="Tutup" onClick={onClose}>
            <X className="size-4.5" />
          </Button>
        </div>

        {tags.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground" data-testid="trx-tag-empty">
            Belum ada tag. Tambahkan lewat kolom di bawah.
          </p>
        ) : (
          <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
            {tags.map((tag) => {
              const active = selected.includes(tag.uid)
              return (
                <button
                  key={tag.uid}
                  type="button"
                  aria-pressed={active}
                  data-testid={`trx-tag-option-${tag.uid}`}
                  onClick={() => onToggle(tag.uid)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                    'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active && 'bg-accent text-accent-foreground',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/40',
                    )}
                  >
                    {active && <Check className="size-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{tag.name}</span>
                </button>
              )
            })}
          </div>
        )}

        <div className="mt-3 flex items-center gap-2 border-t pt-3">
          <input
            id="trx-tag-input"
            type="text"
            data-testid="trx-tag-input"
            value={name}
            placeholder="Tambah tag baru"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit()
            }}
            className="min-w-0 flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Tambah tag"
            data-testid="trx-tag-add"
            disabled={busy || name.trim() === ''}
            onClick={() => void submit()}
          >
            <Plus className="size-4" />
          </Button>
        </div>

        <Button
          type="button"
          className="mt-3 h-11 w-full"
          data-testid="trx-tag-done"
          onClick={onClose}
        >
          Selesai
        </Button>
      </div>
    </Overlay>
  )
}
