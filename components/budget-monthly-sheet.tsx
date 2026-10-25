'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, HelpCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FullScreenSheet } from '@/components/ui/overlay'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { BudgetAmountSheet } from '@/components/budget-amount-sheet'
import type { Budget, Category, Currency } from '@/lib/db'
import { setBudgetMonthAmount, updateBudgetBase } from '@/lib/db'
import { budgetAmountFor, budgetMonthCustomized, budgetName } from '@/lib/budget-utils'
import { formatCurrency } from '@/lib/format'
import { getLocalizedMonths, MONTHS } from '@/lib/month'
import { useTranslation } from '@/components/language-provider'
import { cn } from '@/lib/utils'

type BudgetMonthlySheetProps = {
  open: boolean
  budget: Budget | null
  /** Overrides per budget uid (see `budgetAmountMap`). */
  overrides: Map<string, Map<number, number>>
  categories: Map<string, Category>
  currency: Currency | null
  /** Year shown when the sheet opens. */
  initialYear: number
  /** Real "today" — the base change rolls over from the next month (BR-01). */
  currentYear: number
  currentMonth: number
  onClose: () => void
  onDelete: (budget: Budget) => void
  onChanged: () => void
}

/** "Anggaran bulanan" (ConfigBudgetMonthly) — PRD-04 §3.3. */
export function BudgetMonthlySheet({
  open,
  budget,
  overrides,
  categories,
  currency,
  initialYear,
  currentYear,
  currentMonth,
  onClose,
  onDelete,
  onChanged,
}: BudgetMonthlySheetProps) {
  const { t, language } = useTranslation()
  const localizedMonths = getLocalizedMonths(language)
  const [year, setYear] = useState(initialYear)
  const [pad, setPad] = useState<
    { kind: 'base' } | { kind: 'month'; month: number } | null
  >(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    if (open) {
      setYear(initialYear)
      setPad(null)
      setConfirmOpen(false)
    }
  }, [open, initialYear])

  if (!budget) return null

  const name = budgetName(budget, categories)
  const padTitle = pad?.kind === 'base' ? 'Anggaran dasar' : MONTHS[pad?.month ?? 0].short
  const padInitial =
    pad?.kind === 'base'
      ? budget.BASE_AMOUNT
      : pad
        ? budgetAmountFor(budget, overrides, year, pad.month)
        : 0

  const savePad = async (value: number) => {
    if (!pad) return
    if (pad.kind === 'base') {
      // FR-02/BR-01: nilai bulan berjalan (dan bulan lampau di tahun aktif)
      // tetap, perubahan berlaku mulai bulan depan.
      const freezeThrough = year === currentYear ? currentMonth : -1
      await updateBudgetBase(budget, value, year, freezeThrough)
    } else {
      await setBudgetMonthAmount(budget.uid, year, pad.month, value)
    }
    setPad(null)
    onChanged()
  }

  return (
    <>
      <FullScreenSheet open={open} onClose={onClose} testId="budget-monthly" variant="drawer">
        <header className="flex items-center gap-2 border-b px-3 py-2.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Kembali"
            data-testid="budget-monthly-back"
            onClick={onClose}
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Button>
          <h1
            className="min-w-0 flex-1 truncate text-base font-bold tracking-tight"
            data-testid="budget-monthly-title"
          >
            {name}
          </h1>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Tahun sebelumnya"
              data-testid="budget-year-prev"
              onClick={() => setYear((y) => y - 1)}
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </Button>
            <span className="text-sm font-semibold tabular-nums" data-testid="budget-year">
              {year}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Tahun berikutnya"
              data-testid="budget-year-next"
              onClick={() => setYear((y) => y + 1)}
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Hapus anggaran"
              data-testid="budget-delete"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 aria-hidden="true" className="size-4 text-destructive" />
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto pb-8">
          <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-4">
            <div className="flex items-start gap-2 rounded-xl border border-dashed px-3 py-3 text-xs text-muted-foreground">
              <HelpCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <p>
                {t.budget.baseBudgetHelp}
              </p>
            </div>

            <button
              type="button"
              data-testid="budget-base-row"
              onClick={() => setPad({ kind: 'base' })}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="text-sm">{t.budget.baseBudget}</span>
              <span
                className="text-sm font-semibold tabular-nums"
                data-testid="budget-base-value"
              >
                {formatCurrency(budget.BASE_AMOUNT, currency)}
              </span>
            </button>

            <div className="rounded-2xl border bg-card">
              {Array.from({ length: 12 }, (_, i) => 11 - i).map((m, index) => {
                const amount = budgetAmountFor(budget, overrides, year, m)
                const customized = budgetMonthCustomized(budget, overrides, year, m)
                const isCurrent = year === currentYear && m === currentMonth
                return (
                  <button
                    key={m}
                    type="button"
                    data-testid={`budget-month-row-${m}`}
                    onClick={() => setPad({ kind: 'month', month: m })}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                      index > 0 && 'border-t',
                      isCurrent && 'bg-primary/5',
                    )}
                  >
                    <span
                      className={cn(
                        'flex items-center gap-2 text-sm',
                        isCurrent
                          ? 'font-bold text-primary'
                          : 'font-medium text-muted-foreground',
                      )}
                    >
                      {localizedMonths[m].short}
                      {isCurrent && (
                        <span className="size-1.5 rounded-full bg-primary" />
                      )}
                      {customized && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                          {t.budget.edited}
                        </span>
                      )}
                    </span>
                    <span
                      className="text-sm font-medium tabular-nums"
                      data-testid={`budget-month-value-${m}`}
                    >
                      {formatCurrency(amount, currency)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <BudgetAmountSheet
          open={pad !== null}
          title={padTitle}
          initial={padInitial}
          currency={currency}
          onClose={() => setPad(null)}
          onSubmit={savePad}
        />
      </FullScreenSheet>

      <ConfirmDialog
        open={confirmOpen}
        title={t.budget.deleteConfirmTitle}
        description={t.budget.deleteConfirmDesc}
        confirmLabel={t.common.confirm}
        cancelLabel={t.common.refuse}
        onConfirm={() => {
          setConfirmOpen(false)
          onDelete(budget)
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}
