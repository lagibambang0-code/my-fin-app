'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FullScreenSheet } from '@/components/ui/overlay'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { cn } from '@/lib/utils'
import { type Memo, createMemo, softDeleteMemos, updateMemo } from '@/lib/db'
import { todayIso } from '@/lib/format'
import {
  DEFAULT_MEMO_COLOR,
  MEMO_COLORS,
  memoColor,
  memoEpoch,
  memoTimeLabel,
} from '@/lib/memo-utils'

type MemoFormProps = {
  open: boolean
  /** Set when editing an existing memo; `null` creates a new one. */
  memo: Memo | null
  onClose: () => void
  /** Called after a successful save with the memo's date (parent jumps there). */
  onSaved: (memoDate: string) => void
  onDeleted: () => void
}

/** "Tambah/ubah memo" — PRD-11 sub-tab Memo. */
export function MemoForm({ open, memo, onClose, onSaved, onDeleted }: MemoFormProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('00:00')
  const [color, setColor] = useState<string>(DEFAULT_MEMO_COLOR)
  const [pinned, setPinned] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const now = new Date()
    setTitle(memo?.title ?? '')
    setContent(memo?.content ?? '')
    setDate(memo?.memoDate ?? todayIso())
    setTime(
      memo
        ? memoTimeLabel(memo.memoTime)
        : `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    )
    setColor(memo ? memoColor(memo.color) : DEFAULT_MEMO_COLOR)
    setPinned(memo ? memo.pinned === 1 : false)
    setError(null)
    setConfirmOpen(false)
    setSaving(false)
  }, [open, memo])

  const submit = async () => {
    if (!title.trim() && !content.trim()) {
      setError('Judul atau isi memo wajib diisi.')
      titleRef.current?.focus()
      return
    }
    setSaving(true)
    const payload = {
      title: title.trim(),
      content: content,
      memoDate: date,
      memoTime: memoEpoch(date, time),
      color,
      pinned,
    }
    if (memo) {
      await updateMemo(memo.uid, { ...payload, pinned: pinned ? 1 : 0 })
    } else {
      await createMemo(payload)
    }
    setSaving(false)
    onSaved(date)
  }

  if (!open) return null

  return (
    <FullScreenSheet open={open} testId="memo-form">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/85 px-3 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Kembali"
          data-testid="memo-form-back"
          onClick={onClose}
        >
          <ChevronLeft className="size-5" />
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight">
          {memo ? 'Ubah memo' : 'Tambah memo'}
        </h1>
        {memo && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Hapus memo"
            data-testid="memo-delete"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="size-5 text-destructive" />
          </Button>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-4">
          {error && (
            <p
              role="alert"
              data-testid="memo-form-error"
              className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <div className="rounded-2xl border bg-card">
            <div className="flex items-center gap-3 px-4 py-3">
              <label htmlFor="memo-title-input" className="w-16 shrink-0 text-sm text-muted-foreground">
                Judul
              </label>
              <input
                ref={titleRef}
                id="memo-title-input"
                type="text"
                data-testid="memo-title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Judul memo"
                className="min-w-0 flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="border-t px-4 py-3">
              <label htmlFor="memo-content-input" className="text-sm text-muted-foreground">
                Isi
              </label>
              <textarea
                id="memo-content-input"
                data-testid="memo-content-input"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                placeholder="Tulis memo…"
                className="mt-1.5 w-full resize-none rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="rounded-2xl border bg-card">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <label htmlFor="memo-date-input" className="text-sm text-muted-foreground">
                Tanggal
              </label>
              <input
                id="memo-date-input"
                type="date"
                data-testid="memo-date-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm tabular-nums focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
              <label htmlFor="memo-time-input" className="text-sm text-muted-foreground">
                Waktu
              </label>
              <input
                id="memo-time-input"
                type="time"
                data-testid="memo-time-input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm tabular-nums focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
              <span className="text-sm text-muted-foreground">Sematkan</span>
              <Switch
                checked={pinned}
                onChange={setPinned}
                label="Sematkan memo"
                testId="memo-pin-toggle"
              />
            </div>
          </div>

          <div className="rounded-2xl border bg-card px-4 py-3">
            <span className="text-sm text-muted-foreground">Warna</span>
            <div className="mt-2 flex flex-wrap items-center gap-2" data-testid="memo-colors">
              {MEMO_COLORS.map((value, index) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`Warna ${index + 1}`}
                  aria-pressed={color === value}
                  data-testid={`memo-color-${index}`}
                  onClick={() => setColor(value)}
                  className={cn(
                    'size-8 rounded-full border transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    color === value
                      ? 'scale-110 border-foreground ring-2 ring-ring'
                      : 'border-border/60',
                  )}
                  style={{ backgroundColor: value }}
                />
              ))}
            </div>
          </div>

          <Button
            type="button"
            className="h-11 w-full"
            data-testid="memo-save"
            disabled={saving}
            onClick={() => void submit()}
          >
            Menyimpan
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Hapus memo?"
        description="Apakah anda yakin ingin menghapusnya?"
        confirmLabel="YA"
        cancelLabel="TIDAK"
        onConfirm={async () => {
          setConfirmOpen(false)
          if (memo) await softDeleteMemos([memo.uid])
          onDeleted()
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </FullScreenSheet>
  )
}
