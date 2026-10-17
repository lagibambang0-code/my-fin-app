'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, FileSpreadsheet, Wallet, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Overlay } from '@/components/ui/overlay'
import { cn } from '@/lib/utils'
import type { Budget, BudgetAmount, Transaction } from '@/lib/db'
import { getAllBudgetAmounts, getBudgets, initDB } from '@/lib/db'
import {
  budgetAmountMap,
  budgetStatuses,
  budgetTotals,
  expenseByCategory,
} from '@/lib/budget-utils'
import { formatCurrency, formatDotRange, monthBounds } from '@/lib/format'
import { amountOf, comparisonPercent, summarize } from '@/lib/transaction-utils'
import { categoryLabelFor, assetLabelFor, type Lookups } from '@/components/transaction-list'
import { buildExcelHtml, downloadFile } from '@/lib/export'
import { MONTHS } from '@/components/month-navigator'

type CloseBookProps = {
  year: number
  month: number
  transactions: Transaction[]
  previousTransactions: Transaction[]
  lookups: Lookups
  /** Asset uids that belong to a card group (credit/debit card). */
  cardAssetUids: Set<string>
}

/** "Tutup buku" sub-tab: monthly closing summary + Excel export. */
export function TransactionCloseBook({
  year,
  month,
  transactions,
  previousTransactions,
  lookups,
  cardAssetUids,
}: CloseBookProps) {
  const router = useRouter()
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [budgetAmounts, setBudgetAmounts] = useState<BudgetAmount[]>([])

  useEffect(() => {
    let active = true
    ;(async () => {
      await initDB()
      const [list, amounts] = await Promise.all([getBudgets(), getAllBudgetAmounts()])
      if (!active) return
      setBudgets(list)
      setBudgetAmounts(amounts)
    })()
    return () => {
      active = false
    }
  }, [])

  const current = useMemo(() => summarize(transactions), [transactions])
  const previous = useMemo(() => summarize(previousTransactions), [previousTransactions])
  const percent = comparisonPercent(current.expense, previous.expense)

  const statuses = useMemo(
    () =>
      budgetStatuses(
        budgets,
        budgetAmountMap(budgetAmounts),
        expenseByCategory(transactions, lookups.categories),
        current.expense,
        lookups.categories,
        year,
        month,
      ),
    [budgets, budgetAmounts, transactions, current.expense, lookups.categories, year, month],
  )
  const totals = useMemo(() => budgetTotals(statuses), [statuses])

  const { cashExpense, cardExpense, transferTotal, transferFee } = useMemo(() => {
    let cash = 0
    let card = 0
    let transfer = 0
    let fee = 0
    for (const tx of transactions) {
      if (tx.DO_TYPE === 'expense') {
        if (cardAssetUids.has(tx.assetUid)) card += amountOf(tx)
        else cash += amountOf(tx)
      } else if (tx.DO_TYPE === 'transfer') {
        transfer += amountOf(tx)
        fee += Number(tx.FEE) || 0
      }
    }
    return { cashExpense: cash, cardExpense: card, transferTotal: transfer, transferFee: fee }
  }, [transactions, cardAssetUids])

  const bounds = monthBounds(year, month)
  const periodLabel = formatDotRange(bounds.start, bounds.end)

  const exportExcel = () => {
    const heading = [
      'Tanggal',
      'Tipe',
      'Kategori',
      'Aset',
      'Jumlah',
      'Catatan',
      'Deskripsi',
    ]
    const body = transactions.map((tx) => [
      tx.ZDATE,
      tx.DO_TYPE,
      tx.DO_TYPE === 'transfer' ? 'Transfer' : categoryLabelFor(tx, lookups),
      assetLabelFor(tx, lookups),
      amountOf(tx),
      tx.ZCONTENT ?? '',
      tx.ZDATA ?? '',
    ])
    const summaryRows = [
      ['Ringkasan', ''],
      ['Pendapatan', current.income],
      ['Pengeluaran', current.expense],
      ['Total', current.total],
      ['Pengeluaran (Cash, Accounts)', cashExpense],
      ['Pengeluaran (Kartu)', cardExpense],
      ['Transfer (Cash, Accounts)', transferTotal],
      ['Biaya transfer', transferFee],
      ['Perbandingan pengeluaran bulan lalu', `${percent}%`],
    ]

    const html = buildExcelHtml([
      {
        title: `Tutup buku ${MONTHS[month].full} ${year}`,
        rows: [heading, ...body, [], ...summaryRows],
      },
    ])
    downloadFile(`tutup-buku-${year}-${String(month + 1).padStart(2, '0')}.xls`, 'application/vnd.ms-excel', html)
  }

  return (
    <div className="space-y-3" data-testid="close-book-view">
      <button
        type="button"
        data-testid="close-book-budget"
        onClick={() => setBudgetOpen(true)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="min-w-0">
          <span className="block text-sm font-medium">Anggaran</span>
          <span
            className="block text-xs text-muted-foreground tabular-nums"
            data-testid="close-book-budget-value"
          >
            {statuses.length > 0
              ? `${formatCurrency(totals.spent, lookups.currency)} / ${formatCurrency(totals.amount, lookups.currency)}`
              : 'Belum ada anggaran'}
          </span>
        </span>
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </button>

      <div className="rounded-2xl border bg-card">
        <Row
          label="Periode Aset"
          value={periodLabel}
          testId="close-book-asset-period"
          icon={<Wallet aria-hidden="true" className="size-4 text-muted-foreground" />}
        />
        <div className="border-t px-4 py-3" data-testid="close-book-comparison">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">
              Perbandingan pengeluaran bulan lalu
            </span>
            <span className="text-sm font-semibold tabular-nums">{percent}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="Perbandingan pengeluaran bulan lalu"
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary"
          >
            <div
              className={cn('h-full rounded-full', percent >= 100 ? 'bg-destructive' : 'bg-primary')}
              style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card">
        <Row
          label="Pengeluaran (Cash, Accounts)"
          value={formatCurrency(cashExpense, lookups.currency)}
          testId="close-book-cash-expense"
        />
        <Row
          label="Pengeluaran (Kartu)"
          value={formatCurrency(cardExpense, lookups.currency)}
          testId="close-book-card-expense"
        />
        <Row
          label="Transfer (Cash, Accounts →)"
          value={formatCurrency(transferTotal, lookups.currency)}
          testId="close-book-transfer"
        />
        {transferFee > 0 && (
          <Row
            label="Biaya transfer"
            value={formatCurrency(transferFee, lookups.currency)}
            testId="close-book-transfer-fee"
          />
        )}
        <Row
          label="Total"
          value={formatCurrency(current.total, lookups.currency)}
          testId="close-book-total"
          emphasis
        />
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        data-testid="close-book-export"
        onClick={exportExcel}
      >
        <FileSpreadsheet className="size-4" />
        Ekspor Excel
      </Button>

      <Overlay
        open={budgetOpen}
        onClose={() => setBudgetOpen(false)}
        align="bottom"
        label="Anggaran"
        testId="budget-notice"
      >
        <div className="mx-auto w-full max-w-md rounded-2xl border bg-card p-4 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold">Anggaran</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {statuses.length > 0
                  ? `Realisasi ${MONTHS[month].full} ${year} terhadap anggaran.`
                  : 'Belum ada anggaran. Atur batas pengeluaran per kategori di Pengaturan anggaran.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBudgetOpen(false)}
              aria-label="Tutup"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>

          {statuses.length > 0 && (
            <div className="mt-3 space-y-3" data-testid="budget-statuses">
              {statuses.map((status) => (
                <div key={status.uid} data-testid={`budget-status-${status.uid}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-medium">{status.name}</span>
                    <span className="shrink-0 text-xs tabular-nums">
                      {formatCurrency(status.spent, lookups.currency)} /{' '}
                      {formatCurrency(status.amount, lookups.currency)}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={status.percent}
                    aria-label={`Anggaran ${status.name}`}
                    className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary"
                  >
                    <div
                      className={cn(
                        'h-full rounded-full',
                        status.over ? 'bg-destructive' : 'bg-primary',
                      )}
                      style={{ width: `${status.percent}%` }}
                    />
                  </div>
                  <p
                    className={cn(
                      'mt-1 text-xs',
                      status.over ? 'text-destructive' : 'text-muted-foreground',
                    )}
                    data-testid={`budget-remain-${status.uid}`}
                  >
                    {status.over
                      ? `Lebih ${formatCurrency(Math.abs(status.remaining), lookups.currency)}`
                      : `Sisa ${formatCurrency(status.remaining, lookups.currency)}`}
                  </p>
                </div>
              ))}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            className="mt-4 h-10 w-full"
            data-testid="budget-open-settings"
            onClick={() => {
              setBudgetOpen(false)
              router.push('/lainnya/anggaran')
            }}
          >
            Buka pengaturan anggaran
          </Button>
        </div>
      </Overlay>
    </div>
  )
}

function Row({
  label,
  value,
  testId,
  icon,
  emphasis,
}: {
  label: string
  value: string
  testId: string
  icon?: React.ReactNode
  emphasis?: boolean
}) {
  return (
    <div
      data-testid={testId}
      className="flex items-center justify-between gap-3 border-t px-4 py-3 first:border-t-0"
    >
      <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <span
        className={cn(
          'shrink-0 text-sm tabular-nums',
          emphasis ? 'font-bold' : 'font-medium',
        )}
      >
        {value}
      </span>
    </div>
  )
}
