'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronLeft, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FullScreenSheet } from '@/components/ui/overlay'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/lib/db'
import { TransactionRow, TransactionsEmpty, type Lookups } from '@/components/transaction-list'

type BookmarkScreenProps = {
  open: boolean
  transactions: Transaction[]
  lookups: Lookups
  onClose: () => void
  onOpen: (tx: Transaction) => void
  /** Remove the bookmark flag from the selected transactions. */
  onUnmark: (uids: string[]) => void
}

/** "Bookmark" screen — favourited transactions with an edit (select → remove) mode. */
export function BookmarkScreen({
  open,
  transactions,
  lookups,
  onClose,
  onOpen,
  onUnmark,
}: BookmarkScreenProps) {
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open) return
    setEditing(false)
    setSelected(new Set())
  }, [open])

  const toggle = (uid: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(uid)) next.delete(uid)
      else next.add(uid)
      return next
    })
  }

  const removeSelected = () => {
    const uids = transactions.filter((tx) => selected.has(tx.uid)).map((tx) => tx.uid)
    if (uids.length === 0) return
    onUnmark(uids)
    setSelected(new Set())
    setEditing(false)
  }

  if (!open) return null

  return (
    <FullScreenSheet open={open} testId="bookmark-screen">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/85 px-3 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl">
        <Button variant="ghost" size="icon-sm" aria-label="Kembali" onClick={onClose}>
          <ChevronLeft className="size-5" />
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight">Bookmark</h1>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={editing ? 'Selesai mengubah' : 'Ubah bookmark'}
          aria-pressed={editing}
          data-testid="bookmark-edit-button"
          onClick={() => {
            setEditing((value) => !value)
            setSelected(new Set())
          }}
        >
          {editing ? <Check className="size-5" /> : <Pencil className="size-4.5" />}
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-lg space-y-3 px-4 py-4">
          <p className="text-xs text-muted-foreground">
            Pilih rincian transaksi anda, lalu di bagian bawah halaman terdapat tombol Hapus,
            Salin, Bookmark. Klik tombol Bookmark dan otomatis transaksi anda terdaftar di
            bookmark.
          </p>

          {transactions.length === 0 ? (
            <TransactionsEmpty hint="Tandai transaksi sebagai Bookmark lewat form edit transaksi." />
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card">
              {transactions.map((tx) => (
                <TransactionRow
                  key={tx.uid}
                  tx={tx}
                  lookups={lookups}
                  onOpen={onOpen}
                  showDate
                  leading={
                    editing ? (
                      <button
                        type="button"
                        data-testid={`bookmark-select-${tx.uid}`}
                        aria-pressed={selected.has(tx.uid)}
                        aria-label={`Pilih transaksi ${tx.ZDATE}`}
                        onClick={() => toggle(tx.uid)}
                        className="flex items-center border-t px-3 first:border-t-0"
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            'flex size-5 items-center justify-center rounded-md border transition-colors',
                            selected.has(tx.uid)
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-muted-foreground/40',
                          )}
                        >
                          {selected.has(tx.uid) && <Check className="size-3.5" />}
                        </span>
                      </button>
                    ) : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <div className="border-t bg-card/80 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground" data-testid="bookmark-selected-count">
              {selected.size} dipilih
            </span>
            <Button
              type="button"
              variant="destructive"
              className="h-10"
              data-testid="bookmark-remove-button"
              disabled={selected.size === 0}
              onClick={removeSelected}
            >
              <Trash2 className="size-4" />
              Hapus bookmark
            </Button>
          </div>
        </div>
      )}
    </FullScreenSheet>
  )
}
