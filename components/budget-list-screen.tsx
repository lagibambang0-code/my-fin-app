'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, HelpCircle, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BudgetFormSheet } from '@/components/budget-form-sheet'
import { BudgetMonthlySheet } from '@/components/budget-monthly-sheet'
import {
  type Budget,
  type BudgetAmount,
  type Category,
  type Currency,
  deleteBudget,
  getAllBudgetAmounts,
  getBudgets,
  getMainCategoriesByType,
  getMainCurrency,
  initDB,
} from '@/lib/db'
import { budgetAmountFor, budgetAmountMap, budgetName } from '@/lib/budget-utils'
import { formatCurrency } from '@/lib/format'

/** "Pengaturan anggaran" (ConfigBudgetList) — PRD-04 §3.1. */
export function BudgetListScreen() {
  const router = useRouter()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [amounts, setAmounts] = useState<BudgetAmount[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [currency, setCurrency] = useState<Currency | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)
  const [detailUid, setDetailUid] = useState<string | null>(null)

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const load = useCallback(async () => {
    await initDB()
    const [rows, overrides, cats, main] = await Promise.all([
      getBudgets(),
      getAllBudgetAmounts(),
      getMainCategoriesByType(1),
      getMainCurrency(),
    ])
    setBudgets(rows)
    setAmounts(overrides)
    setCategories(cats)
    setCurrency(main ?? null)
    setLoaded(true)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const overrides = budgetAmountMap(amounts)
  const categoryMap = new Map(categories.map((c) => [c.uid, c]))
  const detail = budgets.find((b) => b.uid === detailUid) ?? null

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 bg-background/80 px-4 pt-[calc(0.875rem+env(safe-area-inset-top))] pb-4 backdrop-blur-xl md:px-10 md:pt-6 md:pb-8">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Kembali"
            data-testid="budget-back"
            onClick={() => router.back()}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Lainnya
            </p>
            <h1 className="truncate text-lg font-bold tracking-tight">Anggaran</h1>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Tambah anggaran"
            data-testid="budget-add"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-5" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-3 px-4 md:px-10" data-testid="budget-list">
        <div className="flex items-start gap-2 rounded-xl border border-dashed px-3 py-3 text-xs text-muted-foreground">
          <HelpCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>Anda dapat memeriksa status anggaran di “tab transaksi &gt; total”.</p>
        </div>

        {loaded && budgets.length === 0 ? (
          <p
            className="py-16 text-center text-sm text-muted-foreground"
            data-testid="budget-empty"
          >
            Tidak ada data
          </p>
        ) : (
          <div className="space-y-1">
            {budgets.map((budget) => (
              <div
                key={budget.uid}
                data-testid={`budget-row-${budget.uid}`}
                className="flex items-center gap-1 rounded-xl border bg-card pr-1"
              >
                <button
                  type="button"
                  data-testid={`budget-open-${budget.uid}`}
                  onClick={() => setDetailUid(budget.uid)}
                  className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <span className="min-w-0 truncate text-sm font-medium">
                    {budgetName(budget, categoryMap)}
                  </span>
                  <span
                    className="shrink-0 text-sm font-semibold tabular-nums"
                    data-testid={`budget-amount-${budget.uid}`}
                  >
                    {formatCurrency(budgetAmountFor(budget, overrides, year, month), currency)}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Ubah anggaran ${budgetName(budget, categoryMap)}`}
                  data-testid={`budget-edit-${budget.uid}`}
                  onClick={() => {
                    setEditing(budget)
                    setFormOpen(true)
                  }}
                >
                  <Pencil aria-hidden="true" className="size-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <BudgetFormSheet
        open={formOpen}
        budget={editing}
        categories={categories}
        currency={currency}
        year={year}
        month={month}
        initialAmount={editing ? budgetAmountFor(editing, overrides, year, month) : 0}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSaved={async () => {
          setFormOpen(false)
          setEditing(null)
          await load()
        }}
      />

      <BudgetMonthlySheet
        open={detail !== null}
        budget={detail}
        overrides={overrides}
        categories={categoryMap}
        currency={currency}
        initialYear={year}
        currentYear={year}
        currentMonth={month}
        onClose={() => setDetailUid(null)}
        onDelete={async (budget) => {
          await deleteBudget(budget.uid)
          setDetailUid(null)
          await load()
        }}
        onChanged={load}
      />
    </div>
  )
}
