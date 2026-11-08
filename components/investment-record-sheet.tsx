'use client'

import { useEffect, useState } from 'react'
import { Calendar, Check, ChevronLeft, ChevronRight, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FullScreenSheet } from '@/components/ui/overlay'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DatePickerSheet } from '@/components/ui/date-picker-sheet'
import { TimePickerSheet } from '@/components/ui/time-picker-sheet'
import { useTranslation } from '@/components/language-provider'
import {
  type Currency,
  type InvestmentRecord,
  type InvestmentRecordType,
  createInvestmentRecord,
  deleteInvestmentRecord,
  updateInvestmentRecord,
} from '@/lib/db'
import {
  formatCurrency,
  formatShortDate,
  formatTypingAmount,
  fromIso,
  normalizeAmountInput,
  parseAmount,
  todayIso,
  WEEKDAYS_SHORT,
} from '@/lib/format'
import { relativeDateLabel } from '@/lib/transaction-utils'
import { cn } from '@/lib/utils'
type InvestmentRecordSheetProps = {
  open: boolean
  investmentUid: string
  record: InvestmentRecord | null
  previousAmount?: number | null
  runningCapital?: number | null
  previousPnl?: number | null
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
  runningCapital,
  previousPnl,
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
  const [entryMode, setEntryMode] = useState<InvestmentRecordType>('deposit')
  const [amountText, setAmountText] = useState('')
  const [note, setNote] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [timePickerOpen, setTimePickerOpen] = useState(false)

  const relative = relativeDateLabel(date)
  const weekday = WEEKDAYS_SHORT[fromIso(date).getDay()]
  useEffect(() => {
    if (!open) return
    const now = new Date()
    setDate(record?.date ?? todayIso())
    setTime(
      record?.time ??
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    )
    if (record) {
      setEntryMode(record.type)
      setAmountText(String(record.amount))
    } else {
      setEntryMode('deposit')
      setAmountText('')
    }
    setNote(record?.note ?? '')
    setError(null)
  }, [open, record])

  const parsedAmount = parseAmount(amountText)
  const hasValidAmount = Number.isFinite(parsedAmount) && (entryMode === 'deposit' ? parsedAmount > 0 : true)

  const baseCapital = runningCapital != null && runningCapital > 0 ? runningCapital : (previousAmount ?? 0)
  const prevPnlVal = previousPnl ?? 0
  const pnlDelta = entryMode === 'pnl' && Number.isFinite(parsedAmount) ? parsedAmount - prevPnlVal : 0

  // Nilai aset portofolio total saat entri ini:
  // - Deposit: modal sebelumnya + modal baru + PnL berjalan
  // - PnL: modal berjalan + PnL kumulatif
  const effectiveAmount = entryMode === 'deposit'
    ? (previousAmount != null && previousAmount > 0
        ? previousAmount + (Number.isFinite(parsedAmount) ? parsedAmount : 0)
        : (Number.isFinite(parsedAmount) ? parsedAmount : 0))
    : baseCapital + (Number.isFinite(parsedAmount) ? parsedAmount : 0)

  let diff = 0
  let diffPercent = 0
  if (hasValidAmount && previousAmount != null && previousAmount > 0) {
    diff = effectiveAmount - previousAmount
    diffPercent = (diff / previousAmount) * 100
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasValidAmount) {
      setError(
        entryMode === 'deposit'
          ? 'Masukkan nominal deposit yang valid.'
          : 'Masukkan nominal PnL yang valid.',
      )
      return
    }

    setSaving(true)
    try {
      const payload = {
        investmentUid,
        date,
        time,
        type: entryMode,
        amount: parsedAmount,
        note: note.trim() || undefined,
      }
      if (record?.uid) {
        await updateInvestmentRecord(record.uid, payload)
      } else {
        await createInvestmentRecord(payload)
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
      await deleteInvestmentRecord(record.uid)
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
          {/* Tanggal & Waktu (Parity dengan Form Transaksi) */}
          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="flex min-h-12 items-center justify-between gap-2 px-3.5 py-2">
              <span className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary/60 text-secondary-foreground">
                  <Calendar aria-hidden="true" className="size-3.5" />
                </span>
                {t.investments.recordDate}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-testid="inv-record-date-button"
                  aria-haspopup="dialog"
                  aria-expanded={datePickerOpen}
                  onClick={() => setDatePickerOpen(true)}
                  className="flex items-center gap-1 rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors hover:bg-secondary focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {formatShortDate(date)}
                  <span className="text-[10px] font-normal text-muted-foreground">
                    ({relative || weekday})
                  </span>
                  <ChevronRight aria-hidden="true" className="size-3.5 text-muted-foreground" />
                </button>
                <button
                  type="button"
                  data-testid="inv-record-time-button"
                  aria-haspopup="dialog"
                  aria-label="Waktu catatan"
                  onClick={() => setTimePickerOpen(true)}
                  className="flex items-center gap-1 rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors hover:bg-secondary focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {time}
                  <ChevronRight aria-hidden="true" className="size-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>

          <DatePickerSheet
            open={datePickerOpen}
            value={date}
            onSelect={setDate}
            onClose={() => setDatePickerOpen(false)}
            title={t.investments.recordDate}
          />
          <TimePickerSheet
            open={timePickerOpen}
            value={time}
            onSelect={setTime}
            onClose={() => setTimePickerOpen(false)}
          />

          {/* Mode Toggle: Deposit vs PnL */}
          <div className="flex rounded-xl border bg-muted/40 p-1 text-xs font-semibold">
            <button
              type="button"
              data-testid="inv-mode-deposit"
              onClick={() => setEntryMode('deposit')}
              className={cn(
                'flex-1 rounded-lg py-1.5 transition-all text-center',
                entryMode === 'deposit'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Deposit
            </button>
            <button
              type="button"
              data-testid="inv-mode-pnl"
              onClick={() => setEntryMode('pnl')}
              className={cn(
                'flex-1 rounded-lg py-1.5 transition-all text-center',
                entryMode === 'pnl'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              PnL
            </button>
          </div>

          {entryMode === 'deposit' ? (
            /* Toggle Deposit: Hanya berisi input deposit */
            <div>
              <label htmlFor="inv-rec-deposit" className="mb-1 block text-xs font-semibold text-muted-foreground uppercase">
                Nominal Deposit
              </label>
              <div className="flex items-center gap-2">
                <span className="flex h-11 shrink-0 items-center justify-center rounded-xl border bg-muted/40 px-3 text-sm font-semibold tabular-nums text-muted-foreground">
                  {currency?.SYMBOL ?? 'Rp'}
                </span>
                <input
                  id="inv-rec-deposit"
                  type="text"
                  inputMode="decimal"
                  required
                  autoFocus
                  placeholder="Contoh: 1000000"
                  value={amountText ? formatTypingAmount(amountText, currency) : ''}
                  onChange={(e) => setAmountText(normalizeAmountInput(e.target.value, currency))}
                  data-testid="inv-record-deposit-input"
                  className={cn(inputClass, 'h-11 text-base font-bold tabular-nums')}
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {previousAmount != null && previousAmount > 0 ? (
                  <>
                    Nilai aset baru: {formatCurrency(previousAmount, currency)} + {formatCurrency(Number.isFinite(parsedAmount) ? parsedAmount : 0, currency)} = <strong className="text-foreground">{formatCurrency(effectiveAmount, currency)}</strong>
                  </>
                ) : (
                  <>Setoran modal awal untuk investasi ini.</>
                )}
              </p>
            </div>
          ) : (
            /* Toggle PnL: Hanya berisi input PnL kumulatif terakhir */
            <div>
              <label htmlFor="inv-rec-pnl" className="mb-1 block text-xs font-semibold text-muted-foreground uppercase">
                Nominal PnL Terakhir (+/-)
              </label>
              <div className="flex items-center gap-2">
                <span className="flex h-11 shrink-0 items-center justify-center rounded-xl border bg-muted/40 px-3 text-sm font-semibold tabular-nums text-muted-foreground">
                  {currency?.SYMBOL ?? 'Rp'}
                </span>
                <input
                  id="inv-rec-pnl"
                  type="text"
                  inputMode="decimal"
                  required
                  autoFocus
                  placeholder="Contoh: 100 atau -50"
                  value={amountText ? formatTypingAmount(amountText, currency) : ''}
                  onChange={(e) => setAmountText(normalizeAmountInput(e.target.value, currency))}
                  data-testid="inv-record-pnl-input"
                  className={cn(inputClass, 'h-11 text-base font-bold tabular-nums')}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  Naik/Turun PnL:{' '}
                  <strong className={cn(pnlDelta >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
                    {pnlDelta >= 0 ? '+' : ''}
                    {formatCurrency(pnlDelta, currency)}
                  </strong>
                  {previousPnl != null && ` (sebelumnya ${formatCurrency(previousPnl, currency)})`}
                </span>
                <span>
                  Return:{' '}
                  <strong className={cn(parsedAmount >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
                    {parsedAmount >= 0 ? '+' : ''}
                    {baseCapital > 0 && Number.isFinite(parsedAmount) ? ((parsedAmount / baseCapital) * 100).toFixed(2) : '0'}%
                  </strong>
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Nilai aset baru: Modal {formatCurrency(baseCapital, currency)} + PnL ({formatCurrency(Number.isFinite(parsedAmount) ? parsedAmount : 0, currency)}) = <strong className="text-foreground">{formatCurrency(effectiveAmount, currency)}</strong>
              </p>
            </div>
          )}
          {/* Pratinjau Selisih Otomatis */}
          {hasValidAmount && previousAmount != null && previousAmount > 0 && (
            <div className="rounded-xl border bg-card p-3 text-xs">
              <div className="flex items-center justify-between">
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
                  {diffPercent.toFixed(3).replace(/(\.\d*?[1-9])0+$|\.0*$/, '$1')}%)
                </span>
              </div>
            </div>
          )}

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
