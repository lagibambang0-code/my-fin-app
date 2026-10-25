import type { Budget, BudgetAmount, Category, Transaction } from '@/lib/db'

/** `YYYYMM` — the `BUDGET_AMOUNT.BUDGET_PERIOD` key for a year + 0-based month. */
export function budgetPeriodKey(year: number, month: number): number {
  return year * 100 + (month + 1)
}

/** Override rows per budget uid, keyed by `YYYYMM`. */
export function budgetAmountMap(amounts: BudgetAmount[]): Map<string, Map<number, number>> {
  const map = new Map<string, Map<number, number>>()
  for (const row of amounts) {
    if (row.IS_DEL !== 0) continue
    let perBudget = map.get(row.budgetUid)
    if (!perBudget) {
      perBudget = new Map<number, number>()
      map.set(row.budgetUid, perBudget)
    }
    perBudget.set(row.BUDGET_PERIOD, row.AMOUNT)
  }
  return map
}

/**
 * Budget value for a month: an explicit `BUDGET_AMOUNT` override when the user
 * customised that month, otherwise the base budget (PRD-04 BR-01/FR-03).
 */
export function budgetAmountFor(
  budget: Budget,
  overrides: Map<string, Map<number, number>>,
  year: number,
  month: number,
): number {
  const per = overrides.get(budget.uid)
  const value = per?.get(budgetPeriodKey(year, month))
  return value ?? budget.BASE_AMOUNT
}

/** Does this month hold an explicit override (i.e. differs from the base)? */
export function budgetMonthCustomized(
  budget: Budget,
  overrides: Map<string, Map<number, number>>,
  year: number,
  month: number,
): boolean {
  return overrides.get(budget.uid)?.has(budgetPeriodKey(year, month)) ?? false
}

/** Display name of a budget: the category name, or "Total anggaran" (BR-03). */
export function budgetName(budget: Budget, categories: Map<string, Category>, totalLabel?: string): string {
  if (budget.IS_TOTAL === 1) return totalLabel ?? 'Total anggaran'
  const cat = categories.get(budget.targetUid)
  if (!cat) return 'Tanpa kategori'
  if (cat.STATUS === 2 && cat.pUid) {
    const parent = categories.get(cat.pUid)
    return parent ? `${parent.NAME} › ${cat.NAME}` : cat.NAME
  }
  return cat.NAME
}
/**
 * Expense total per **main** category for a set of transactions. Sub-categories
 * roll up into their parent so the report matches the Statistik tab (E-04).
 * Transfers are excluded — they are not spending.
 */
export function expenseByCategory(
  transactions: Transaction[],
  categories: Map<string, Category>,
): Map<string, number> {
  const totals = new Map<string, number>()
  for (const tx of transactions) {
    if (tx.DO_TYPE !== 'expense') continue
    const amount = Number(tx.AMOUNT_ACCOUNT ?? tx.ZMONEY) || 0
    if (amount === 0 && !tx.ctgUid) continue
    const category = tx.ctgUid ? categories.get(tx.ctgUid) : undefined
    const key =
      category && category.STATUS === 2 && category.pUid
        ? category.pUid
        : (category?.uid ?? tx.ctgUid ?? '')
    if (!key) continue
    totals.set(key, (totals.get(key) ?? 0) + amount)
  }
  return totals
}

export type BudgetStatus = {
  uid: string
  name: string
  isTotal: boolean
  amount: number
  spent: number
  remaining: number
  /** 0-100, capped so the progress bar stays inside its track. */
  percent: number
  over: boolean
}

/**
 * Budget vs actual spending for one month (PRD-04 FR-05:
 * `sisa = anggaran − pengeluaran`).
 */
export function budgetStatuses(
  budgets: Budget[],
  overrides: Map<string, Map<number, number>>,
  spend: Map<string, number>,
  totalExpense: number,
  categories: Map<string, Category>,
  year: number,
  month: number,
): BudgetStatus[] {
  return budgets.map((budget) => {
    const amount = budgetAmountFor(budget, overrides, year, month)
    const spent = budget.IS_TOTAL === 1 ? totalExpense : (spend.get(budget.targetUid) ?? 0)
    const percent = amount > 0 ? Math.min(100, Math.round((spent / amount) * 100)) : spent > 0 ? 100 : 0
    return {
      uid: budget.uid,
      name: budgetName(budget, categories),
      isTotal: budget.IS_TOTAL === 1,
      amount,
      spent,
      remaining: amount - spent,
      percent,
      over: spent > amount,
    }
  })
}

/**
 * Headline budget figure for the Tutup buku row: the "Total anggaran" budget
 * when the user created one, otherwise the sum of the per-category budgets.
 */
export function budgetTotals(rows: BudgetStatus[]): { amount: number; spent: number; remaining: number } {
  const total = rows.find((r) => r.isTotal)
  if (total) return { amount: total.amount, spent: total.spent, remaining: total.remaining }
  const amount = rows.reduce((sum, r) => sum + r.amount, 0)
  const spent = rows.reduce((sum, r) => sum + r.spent, 0)
  return { amount, spent, remaining: amount - spent }
}
