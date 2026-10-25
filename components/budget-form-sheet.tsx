'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/components/language-provider'
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
  const { t } = useTranslation()
  const [target, setTarget] = useState<string | null>(budget?.targetUid ?? null)
  const [amount, setAmount] = useState(initialAmount)
  const [padOpen, setPadOpen] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
   const [saving, setSaving] = useState(false)
  const [selectedMain, setSelectedMain] = useState<string | null>(null)

  const mainCategories = categories.filter((c) => c.TYPE === 1 && c.STATUS !== 2 && !c.pUid)

  useEffect(() => {
    if (!open) return
    const initTarget = budget ? (budget.IS_TOTAL === 1 ? ALL : budget.targetUid) : ''
    setTarget(initTarget)
    setAmount(budget ? initialAmount : 0)
    setPadOpen(false)
    setAlertOpen(false)
    setSaving(false)
    if (initTarget && initTarget !== ALL) {
      const found = categories.find((c) => c.uid === initTarget)
      if (found?.STATUS === 2 && found.pUid) {
        setSelectedMain(found.pUid)
      } else if (found) {
        setSelectedMain(found.uid)
      }
    } else {
      setSelectedMain(null)
    }
  }, [open, budget, initialAmount, categories])

  const targetCategory = target && target !== ALL ? categories.find((c) => c.uid === target) : null
  const targetLabel = target
    ? target === ALL
      ? '· Semua'
      : targetCategory
        ? targetCategory.STATUS === 2 && targetCategory.pUid
          ? `${categories.find((c) => c.uid === targetCategory.pUid)?.NAME ?? ''} › ${targetCategory.NAME}`
          : targetCategory.NAME
        : '—'
    : null

  const selectTarget = (uid: string) => {
    setTarget(uid)
    setPadOpen(true)
  }

  const onMainCategoryClick = (uid: string) => {
    if (uid === ALL) {
      setSelectedMain(null)
      selectTarget(ALL)
      return
    }
    setSelectedMain(uid)
    setTarget(uid)
  }

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
      <FullScreenSheet open={open} onClose={onClose} testId="budget-form" variant="drawer">
      <header className="flex items-center gap-2 border-b px-3 py-2.5">
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
            {budget ? t.budget.editBudget : t.budget.addBudget}
          </h1>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto pb-8">
          <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-4">
            <div className="rounded-2xl border bg-card">
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <span className="text-sm text-muted-foreground">{t.transaction.category}</span>
                <span
                  data-testid="budget-category-value"
                  className={cn(
                    'truncate text-sm',
                    targetLabel ? 'font-medium' : 'text-muted-foreground',
                  )}
                >
                  {targetLabel ?? t.budget.selectCategory}
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
              <div className="flex items-center justify-between pb-2">
                <h2 className="px-1 text-sm font-semibold">Pilih Kategori</h2>
                <span className="text-xs text-muted-foreground">Kategori utama & sub</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {/* Kolom Kiri: Kategori Utama */}
                <div className="flex flex-col gap-1 max-h-80 overflow-y-auto pr-1">
                  <button
                    type="button"
                    data-testid="budget-category-option-all"
                    aria-pressed={target === ALL}
                    onClick={() => onMainCategoryClick(ALL)}
                    className={cn(
                      'flex items-center justify-start rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors',
                      'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      target === ALL
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'bg-card text-foreground',
                    )}
                  >
                    {t.common.all}
                  </button>
                  {mainCategories.map((category) => (
                    <button
                      key={category.uid}
                       type="button"
                      data-testid={`budget-category-option-${category.uid}`}
                      aria-pressed={selectedMain === category.uid}
                      onClick={() => onMainCategoryClick(category.uid)}
                      className={cn(
                        'flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors',
                        'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        selectedMain === category.uid
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'bg-card text-foreground',
                      )}
                    >
                      <span className="truncate">{category.NAME}</span>
                      <ChevronRight className="size-3.5 shrink-0 opacity-50" />
                    </button>
                  ))}
                </div>

                {/* Kolom Kanan: Sub-kategori */}
                <div className="flex flex-col gap-1 max-h-80 overflow-y-auto pl-1 border-l">
                  {selectedMain ? (
                    <>
                      {(() => {
                        const activeMain = categories.find((c) => c.uid === selectedMain)
                        const subList = categories.filter((c) => c.pUid === selectedMain && c.C_IS_DEL === 0)
                        return (
                          <>
                            <button
                              type="button"
                              data-testid={`budget-subcategory-option-all-${selectedMain}`}
                              aria-pressed={target === selectedMain}
                              onClick={() => selectTarget(selectedMain)}
                              className={cn(
                                'flex items-center justify-start rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors',
                                'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                target === selectedMain
                                  ? 'border-primary bg-primary text-primary-foreground font-semibold'
                                  : 'bg-muted/40 text-foreground',
                              )}
                            >
                              <span className="truncate">{activeMain?.NAME} (Semua)</span>
                            </button>

                            {subList.map((sub) => (
                              <button
                                key={sub.uid}
                                type="button"
                                data-testid={`budget-subcategory-option-${sub.uid}`}
                                aria-pressed={target === sub.uid}
                                onClick={() => selectTarget(sub.uid)}
                                className={cn(
                                  'flex items-center justify-start rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors',
                                  'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                  target === sub.uid
                                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                                    : 'bg-card text-foreground',
                                )}
                              >
                                <span className="truncate">{sub.NAME}</span>
                              </button>
                            ))}
                          </>
                        )
                      })()}
                    </>
                  ) : (
                    <div className="flex h-36 items-center justify-center p-3 text-center text-xs text-muted-foreground">
                      Pilih kategori utama di sebelah kiri untuk melihat sub-kategori
                    </div>
                  )}
                </div>
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
        label={t.budget.alertSelectCategory}
        testId="budget-category-alert"
      >
        <div className="mx-auto w-full max-w-sm rounded-2xl border bg-card p-5 shadow-xl">
          <h2 className="text-base font-bold">{t.budget.alertSelectCategory}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.budget.alertSelectCategoryDesc}
          </p>
          <Button
            type="button"
            className="mt-4 h-10 w-full"
            data-testid="budget-category-alert-ok"
            onClick={() => setAlertOpen(false)}
          >
            {t.common.confirm}
          </Button>
        </div>
      </Overlay>
    </>
  )
}
