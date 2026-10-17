'use client'

import { useEffect, useState } from 'react'
import { Check, Pencil, Pin, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { TransactionsEmpty } from '@/components/transaction-list'
import { cn } from '@/lib/utils'
import { type Memo, softDeleteMemos, toggleMemoPin } from '@/lib/db'
import { memoColor, memoSubtitle } from '@/lib/memo-utils'

type MemoListProps = {
  memos: Memo[]
  onOpen: (memo: Memo) => void
  /** Called after pin toggles or deletions so the parent can reload. */
  onChanged: () => void
}

/**
 * Memo list rendered inside the Transaksi tab's "Memo" sub-tab (PRD-11).
 * Rows open the memo form; the pencil switches to a select → delete mode.
 */
export function MemoList({ memos, onOpen, onChanged }: MemoListProps) {
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Drop selection entries that no longer exist (e.g. after a delete).
  useEffect(() => {
    setSelected((current) => {
      const alive = new Set(memos.map((memo) => memo.uid))
      const next = new Set([...current].filter((uid) => alive.has(uid)))
      return next.size === current.size ? current : next
    })
  }, [memos])

  const toggle = (uid: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(uid)) next.delete(uid)
      else next.add(uid)
      return next
    })
  }

  const deleteSelected = async () => {
    setConfirmDelete(false)
    if (selected.size === 0) return
    await softDeleteMemos([...selected])
    setSelected(new Set())
    setEditing(false)
    onChanged()
  }

  return (
    <div className="space-y-3" data-testid="memo-list">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground" data-testid="memo-count">
          {memos.length} memo pada periode ini
        </p>
        <div className="flex items-center gap-1">
          {editing && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Hapus memo terpilih"
              data-testid="memo-delete-selected"
              disabled={selected.size === 0}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={editing ? 'Selesai mengubah' : 'Ubah memo'}
            aria-pressed={editing}
            data-testid="memo-edit-toggle"
            onClick={() => {
              setEditing((value) => !value)
              setSelected(new Set())
            }}
          >
            {editing ? <Check className="size-5" /> : <Pencil className="size-4.5" />}
          </Button>
        </div>
      </div>

      {memos.length === 0 ? (
        <div data-testid="memo-empty">
          <TransactionsEmpty hint="Tekan tombol + untuk membuat memo baru pada periode ini." />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          {memos.map((memo) => (
            <div
              key={memo.uid}
              data-testid={`memo-row-${memo.uid}`}
              className="flex items-stretch border-t first:border-t-0"
            >
              {editing && (
                <button
                  type="button"
                  aria-pressed={selected.has(memo.uid)}
                  aria-label={`Pilih memo ${memo.title || memo.memoDate}`}
                  data-testid={`memo-select-${memo.uid}`}
                  onClick={() => toggle(memo.uid)}
                  className="flex items-center px-3"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-5 items-center justify-center rounded-md border transition-colors',
                      selected.has(memo.uid)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/40',
                    )}
                  >
                    {selected.has(memo.uid) && <Check className="size-3.5" />}
                  </span>
                </button>
              )}

              <button
                type="button"
                data-testid={`memo-open-${memo.uid}`}
                onClick={() => onOpen(memo)}
                className="flex min-w-0 flex-1 items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  aria-hidden="true"
                  data-testid={`memo-color-bar-${memo.uid}`}
                  className="mt-0.5 h-10 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: memoColor(memo.color) }}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    {memo.pinned === 1 && (
                      <Pin
                        aria-label="Disematkan"
                        data-testid={`memo-pinned-${memo.uid}`}
                        className="size-3.5 shrink-0 fill-primary text-primary"
                      />
                    )}
                    <span
                      data-testid={`memo-title-${memo.uid}`}
                      className="truncate text-sm font-semibold"
                    >
                      {memo.title || 'Tanpa judul'}
                    </span>
                  </span>
                  {memo.content && (
                    <span
                      data-testid={`memo-content-${memo.uid}`}
                      className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground"
                    >
                      {memo.content}
                    </span>
                  )}
                  <span
                    data-testid={`memo-date-${memo.uid}`}
                    className="mt-1 block text-[11px] text-muted-foreground tabular-nums"
                  >
                    {memoSubtitle(memo)}
                  </span>
                </span>
              </button>

              <button
                type="button"
                aria-label={memo.pinned === 1 ? 'Lepas sematan' : 'Sematkan memo'}
                aria-pressed={memo.pinned === 1}
                data-testid={`memo-pin-${memo.uid}`}
                onClick={async () => {
                  await toggleMemoPin(memo.uid, memo.pinned !== 1)
                  onChanged()
                }}
                className="flex items-center px-2 text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Pin
                  aria-hidden="true"
                  className={cn('size-4', memo.pinned === 1 && 'fill-primary text-primary')}
                />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Hapus memo?"
        description={`${selected.size} memo akan dihapus. Apakah anda yakin ingin menghapusnya?`}
        confirmLabel="YA"
        cancelLabel="TIDAK"
        onConfirm={() => void deleteSelected()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
