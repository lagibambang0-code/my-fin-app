'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FullScreenSheet, Overlay } from '@/components/ui/overlay'
import { BudgetAmountSheet } from '@/components/budget-amount-sheet'
import type { Budget, Category, Currency } from '@/lib/db'
import { saveBudget, updateBudgetBase } from '@/lib/db'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'

type BudgetFormSheetProps = {
  open: boolean
  /** Set when editing an existing budget (the pencil in the list). */
  budget: Budget | null
  /** Main expense categories shown in the picker grid. */
  categories: Category[]
  currency: Currency | null
  /** Month the typed value is stored on (EC-03: the month currently in view). */
  year: number
  month: number
  /** Value prefilled from the budget being edited. */
  initialAmount: number
  onClose: () => void
  onSaved: () => void
}

/** `'ALL'` = the "· Semua" option (all categories). */
const ALL = '__all__'

/** "Tambah anggaran" (ConfigBudgetAdd) — PRD-04 §3.2. */
export function BudgetFormSheet({
  open,
  budget,
  categories,
  currency,
  year,
  month,
  initialAmount,
  onClose,
  onSaved,
}: BudgetFormSheetProps) {
  const [target, setTarget] = useState<string>('')
  const [amount, setAmount] = useState(0)
  const [padOpen, setPadOpen] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setTarget(budget ? (budget.IS_TOTAL === 1 ? ALL : budget.targetUid) : '')
    setAmount(budget ? initialAmount : 0)
    setPadOpen(false)
    setAlertOpen(false)
    setSaving(false)
  }, [open, budget, initialAmount])

  const targetLabel = target
    ? target === ALL
      ? '· Semua'
      : (categories.find((c) => c.uid === target)?.NAME ?? '—')
    : null

  const submit = async () => {
    if (!target) {
      setAlertOpen(true)
      return
    }
    setSaving(true)
    const targetUid = target === ALL ? null : target
    // Changing the value of an existing budget moves the base too, but months
    // already past keep their old value (BR-01).
    if (budget) await updateBudgetBase(budget, amount, year, month)
    await saveBudget({ targetUid, amount, year, month })
    setSaving(false)
    onSaved()
  }

  return (
    <>
      <FullScreenSheet open={open} testId="budget-form">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/85 px-3 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Kembali"
            data-testid="budget-form-back"
            onClick={onClose}
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight">
            {budget ? 'Ubah anggaran' : 'Tambah anggaran'}
          </h1>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto pb-8">
          <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-4">
            <div className="rounded-2xl border bg-card">
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <span className="text-sm text-muted-foreground">Kategori</span>
                <span
                  data-testid="budget-category-value"
                  className={cn(
                    'truncate text-sm',
                    targetLabel ? 'font-medium' : 'text-muted-foreground',
                  )}
                >
                  {targetLabel ?? 'Pilih kategori'}
                </span>
              </div>
              <button
                type="button"
                data-testid="budget-total-button"
                onClick={() => setPadOpen(true)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <span className="text-sm text-muted-foreground">Total</span>
                <span
                  data-testid="budget-total-value"
                  className="text-sm font-medium tabular-nums"
                >
                  {formatCurrency(amount, currency)}
                </span>
              </button>
            </div>

            <Button
              type="button"
              data-testid="budget-save"
              className="h-11 w-full"
              disabled={saving}
              onClick={submit}
            >
              Menyimpan
            </Button>

            <section className="rounded-2xl border bg-card p-3">
              <h2 className="px-1 pb-2 text-sm font-semibold">Kategori</h2>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  data-testid="budget-category-option-all"
                  aria-pressed={target === ALL}
                  onClick={() => setTarget(ALL)}
                  className={cn(
                    'flex min-h-16 items-center justify-center rounded-xl border px-2 py-3 text-center text-xs font-medium transition-colors',
                    'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    target === ALL
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'bg-card text-foreground',
                  )}
                >
                  · Semua
                </button>
                {categories.map((category) => (
                  <button
                    key={category.uid}
                    type="button"
                    data-testid={`budget-category-option-${category.uid}`}
                    aria-pressed={target === category.uid}
                    onClick={() => setTarget(category.uid)}
                    className={cn(
                      'flex min-h-16 items-center justify-center rounded-xl border px-2 py-3 text-center text-xs font-medium transition-colors',
                      'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      target === category.uid
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'bg-card text-foreground',
                    )}
                  >
                    <span className="line-clamp-2">{category.NAME}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>

        <BudgetAmountSheet
          open={padOpen}
          title="Total"
          initial={amount}
          currency={currency}
          onClose={() => setPadOpen(false)}
          onSubmit={(value) => {
            setAmount(value)
            setPadOpen(false)
          }}
        />
      </FullScreenSheet>

      {/* BR-06 / E-01: menyimpan tanpa kategori diblokir dengan dialog. */}
      <Overlay
        open={alertOpen}
        onClose={() => setAlertOpen(false)}
        align="center"
        label="Silahkan pilih kategori"
        testId="budget-category-alert"
      >
        <div className="mx-auto w-full max-w-sm rounded-2xl border bg-card p-5 shadow-xl">
          <h2 className="text-base font-bold">Silahkan pilih kategori</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pilih salah satu kategori (atau “· Semua”) sebelum menyimpan anggaran.
          </p>
          <Button
            type="button"
            className="mt-4 h-10 w-full"
            data-testid="budget-category-alert-ok"
            onClick={() => setAlertOpen(false)}
          >
            YA
          </Button>
        </div>
      </Overlay>
    </>
  )
}
