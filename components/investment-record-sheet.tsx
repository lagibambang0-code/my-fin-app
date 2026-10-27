'use client'

import { useEffect, useState } from 'react'
import { Calendar, Check, ChevronLeft, Clock, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FullScreenSheet } from '@/components/ui/overlay'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useTranslation } from '@/components/language-provider'
import {
  type Currency,
  type InvestmentRecord,
  createInvestmentRecord,
  softDeleteInvestmentRecord,
  updateInvestmentRecord,
} from '@/lib/db'
import { formatCurrency, formatTypingAmount, normalizeAmountInput, parseAmount, todayIso } from '@/lib/format'
import { cn } from '@/lib/utils'

type InvestmentRecordSheetProps = {
  open: boolean
  investmentUid: string
  record: InvestmentRecord | null
  previousAmount?: number | null
  currency: Currency | null
  onClose: () => void
  onSaved: () => void
  onDeleted?: () => void
}

const inputClass =
  'w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function InvestmentRecordSheet({
  open,
  investmentUid,
  record,
  previousAmount,
  currency,
  onClose,
  onSaved,
  onDeleted,
}: InvestmentRecordSheetProps) {
  const { t } = useTranslation()
  const [date, setDate] = useState(() => todayIso())
  const [time, setTime] = useState(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  const [amountText, setAmountText] = useState('')
  const [note, setNote] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const now = new Date()
    setDate(record?.date ?? todayIso())
    setTime(
      record?.time ??
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    )
    setAmountText(record ? String(record.amount) : '')
    setNote(record?.note ?? '')
    setError(null)
  }, [open, record])

  const parsed = parseAmount(amountText)
  const hasValidAmount = Number.isFinite(parsed) && parsed > 0

  // Hitung selisih langsung terhadap entri sebelumnya
  let diff = 0
  let diffPercent = 0
  if (hasValidAmount && previousAmount != null && previousAmount > 0) {
    diff = parsed - previousAmount
    diffPercent = (diff / previousAmount) * 100
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasValidAmount) {
      setError('Masukkan nominal nilai investasi yang valid.')
      return
    }

    setSaving(true)
    try {
      if (record?.uid) {
        await updateInvestmentRecord(record.uid, {
          date,
          time,
          amount: parsed,
          note: note.trim() || undefined,
        })
      } else {
        await createInvestmentRecord({
          investmentUid,
          date,
          time,
          amount: parsed,
          note: note.trim() || undefined,
        })
      }
      onSaved()
      onClose()
    } catch {
      setError('Gagal menyimpan catatan nilai. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!record?.uid) return
    setSaving(true)
    try {
      await softDeleteInvestmentRecord(record.uid)
      setConfirmDelete(false)
      onDeleted?.()
      onClose()
    } catch {
      /* ignore */
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <FullScreenSheet open={open} onClose={onClose} testId="investment-record-sheet" variant="drawer">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-card/95 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:pt-3 backdrop-blur-md">
        <Button variant="ghost" size="icon-sm" aria-label="Tutup" onClick={onClose}>
          <ChevronLeft className="size-5" />
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-base font-bold tracking-tight">
          {record ? t.investments.editRecord : t.investments.recordValue}
        </h1>
        {record?.uid && onDeleted && (
          <Button
            variant="destructive"
            size="icon-sm"
            aria-label="Hapus catatan"
            data-testid="investment-record-delete"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </header>

      <form onSubmit={handleSave} className="flex flex-1 flex-col overflow-y-auto px-4 py-4 md:px-10">
        <div className="mx-auto w-full max-w-lg space-y-4">
          {/* Tanggal & Waktu */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="inv-rec-date" className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
                <Calendar className="size-3.5" />
                <span>{t.investments.recordDate}</span>
              </label>
              <input
                id="inv-rec-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                data-testid="inv-record-date-input"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="inv-rec-time" className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
                <Clock className="size-3.5" />
                <span>{t.investments.recordTime}</span>
              </label>
              <input
                id="inv-rec-time"
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                data-testid="inv-record-time-input"
                className={inputClass}
              />
            </div>
          </div>

          {/* Nominal Nilai */}
          <div>
            <label htmlFor="inv-rec-amount" className="mb-1 block text-xs font-semibold text-muted-foreground uppercase">
              {t.investments.recordAmount}
            </label>
            <div className="flex items-center gap-2">
              <span className="flex h-11 shrink-0 items-center justify-center rounded-xl border bg-muted/40 px-3 text-sm font-semibold tabular-nums text-muted-foreground">
                {currency?.SYMBOL ?? 'Rp'}
              </span>
              <input
                id="inv-rec-amount"
                type="text"
                inputMode="decimal"
                required
                autoFocus
                placeholder="10000"
                value={amountText ? formatTypingAmount(amountText, currency) : ''}
                onChange={(e) => setAmountText(normalizeAmountInput(e.target.value, currency))}
                data-testid="inv-record-amount-input"
                className={cn(inputClass, 'h-11 text-base font-bold tabular-nums')}
              />
            </div>

            {/* Pratinjau Selisih Otomatis */}
            {hasValidAmount && previousAmount != null && previousAmount > 0 && (
              <div className="mt-2.5 flex items-center justify-between rounded-xl border bg-card p-3 text-xs">
                <span className="text-muted-foreground">Perubahan dari nilai sebelumnya:</span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 font-semibold tabular-nums',
                    diff > 0
                      ? 'text-emerald-500'
                      : diff < 0
                      ? 'text-rose-500'
                      : 'text-muted-foreground',
                  )}
                >
                  {diff > 0 ? (
                    <TrendingUp className="size-3.5" />
                  ) : diff < 0 ? (
                    <TrendingDown className="size-3.5" />
                  ) : null}
                  {diff > 0 ? '+' : ''}
                  {formatCurrency(diff, currency)} ({diff > 0 ? '+' : ''}
                  {diffPercent.toFixed(2)}%)
                </span>
              </div>
            )}
          </div>

          {/* Catatan Tambahan */}
          <div>
            <label htmlFor="inv-rec-note" className="mb-1 block text-xs font-semibold text-muted-foreground uppercase">
              {t.investments.recordNote}
            </label>
            <input
              id="inv-rec-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Mis. Dividen reinvest, DCA bulanan, dsb."
              className={inputClass}
            />
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </p>
          )}

          <div className="pt-4">
            <Button
              type="submit"
              disabled={saving}
              className="h-11 w-full gap-2 text-sm font-semibold shadow-md"
              data-testid="inv-record-save-button"
            >
              <Check className="size-4" />
              {t.common.save}
            </Button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDelete}
        title={t.investments.deleteRecordTitle}
        description={t.investments.deleteRecordDesc}
        confirmLabel={t.common.yes}
        cancelLabel={t.common.no}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </FullScreenSheet>
  )
}
