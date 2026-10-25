'use client'

import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Overlay } from '@/components/ui/overlay'
import { cn } from '@/lib/utils'
import type { Asset } from '@/lib/db'
import {
  EMPTY_FILTER,
  FILTER_EXPENSE_OPTIONS,
  FILTER_PERIOD_OPTIONS,
  FILTER_TYPE_OPTIONS,
  filterCounts,
  percentOf,
  type FilterType,
  type TransactionFilter,
} from '@/lib/transaction-utils'
import type { Transaction } from '@/lib/db'

type FilterSheetProps = {
  open: boolean
  /** Search mode additionally offers Periode and a Total range. */
  extended?: boolean
  filter: TransactionFilter
  assets: Asset[]
  /** Rows currently in view — drives the "%" badge per type. */
  pool: Transaction[]
  onApply: (filter: TransactionFilter) => void
  onClose: () => void
}

/** "Silahkan pilih item yang ingin Anda filter" — transaction filter screen. */
export function TransactionFilterSheet({
  open,
  extended = false,
  filter,
  assets,
  pool,
  onApply,
  onClose,
}: FilterSheetProps) {
  const [draft, setDraft] = useState<TransactionFilter>(filter)

  useEffect(() => {
    if (open) setDraft(filter)
  }, [open, filter])

  const counts = filterCounts(pool)

  const percentageFor = (value: FilterType): string => {
    if (value === 'all') return percentOf(counts.total, counts.total)
    if (value === 'income') return percentOf(counts.income, counts.total)
    if (value === 'expense') return percentOf(counts.expense, counts.total)
    if (value === 'transferIn') return percentOf(counts.transferIn, counts.total)
    return percentOf(counts.transferOut, counts.total)
  }

  const toggleAsset = (uid: string) => {
    setDraft((current) => ({
      ...current,
      assetUids: current.assetUids.includes(uid)
        ? current.assetUids.filter((item) => item !== uid)
        : [...current.assetUids, uid],
    }))
  }

  const typeOption = (
    section: 'pendapatan' | 'pengeluaran',
    option: { value: FilterType; label: string },
  ) => {
    const selected = draft.type === option.value
    return (
      <li key={`${section}-${option.value}`}>
        <button
          type="button"
          data-testid={`filter-type-${section}-${option.value}`}
          aria-pressed={selected}
          onClick={() =>
            setDraft((current) => ({
              ...current,
              type: current.type === option.value && option.value !== 'all' ? 'all' : option.value,
            }))
          }
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
            'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            selected && 'bg-accent text-accent-foreground',
          )}
        >
          <span className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className={cn(
                'flex size-4 shrink-0 items-center justify-center rounded-full border',
                selected && 'border-primary bg-primary text-primary-foreground',
              )}
            >
              {selected && <Check className="size-3" />}
            </span>
            {option.label}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {percentageFor(option.value)}
          </span>
        </button>
      </li>
    )
  }

  if (!open) return null

  return (
    <Overlay open={open} onClose={onClose} align="bottom" testId="filter-screen" label="Filter transaksi">
      <div className="mx-auto flex max-h-[85vh] w-full max-w-full flex-col overflow-hidden rounded-t-[1.75rem] border-t bg-card pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl md:max-w-md md:rounded-2xl md:border md:pb-0">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h2 className="min-w-0 text-sm font-bold text-balance">
            Silahkan pilih item yang ingin Anda filter
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <section data-testid="filter-section-pendapatan">
            <h3 className="px-2 pb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Pendapatan
            </h3>
            <ul>{FILTER_TYPE_OPTIONS.map((option) => typeOption('pendapatan', option))}</ul>
          </section>

          <section className="mt-3" data-testid="filter-section-pengeluaran">
            <h3 className="px-2 pb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Pengeluaran
            </h3>
            <ul>{FILTER_EXPENSE_OPTIONS.map((option) => typeOption('pengeluaran', option))}</ul>
          </section>

          <section className="mt-3" data-testid="filter-section-aset">
            <h3 className="px-2 pb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Aset
            </h3>
            {assets.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">Belum ada aset</p>
            ) : (
              <ul className="space-y-1">
                {assets.map((asset) => {
                  const selected = draft.assetUids.includes(asset.uid)
                  return (
                    <li key={asset.uid}>
                      <label
                        data-testid={`filter-asset-${asset.NIC_NAME}`}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                          'hover:bg-secondary',
                          selected && 'bg-accent text-accent-foreground',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleAsset(asset.uid)}
                          className="size-4 shrink-0 accent-[var(--primary)]"
                        />
                        <span className="truncate">{asset.NIC_NAME}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {extended && (
            <>
              <section className="mt-3" data-testid="filter-section-periode">
                <h3 className="px-2 pb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Periode
                </h3>
                <ul className="grid grid-cols-2 gap-1">
                  {FILTER_PERIOD_OPTIONS.map((option) => {
                    const selected = draft.period === option.value
                    return (
                      <li key={option.value}>
                        <button
                          type="button"
                          data-testid={`filter-period-${option.value}`}
                          aria-pressed={selected}
                          onClick={() =>
                            setDraft((current) => ({ ...current, period: option.value }))
                          }
                          className={cn(
                            'w-full rounded-xl px-3 py-2.5 text-sm transition-colors',
                            'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            selected && 'bg-accent text-accent-foreground',
                          )}
                        >
                          {option.label}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>

              <section className="mt-3" data-testid="filter-section-total">
                <h3 className="px-2 pb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Total
                </h3>
                <div className="flex items-center gap-2 px-1">
                  <label className="min-w-0 flex-1">
                    <span className="block pb-1 text-xs text-muted-foreground">Minimal</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      data-testid="filter-total-min"
                      value={draft.min ?? ''}
                      onChange={(e) =>
                        setDraft((current) => ({
                          ...current,
                          min: e.target.value === '' ? null : Number(e.target.value),
                        }))
                      }
                      placeholder="0"
                      className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm tabular-nums focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </label>
                  <span aria-hidden="true" className="pt-4 text-muted-foreground">
                    ~
                  </span>
                  <label className="min-w-0 flex-1">
                    <span className="block pb-1 text-xs text-muted-foreground">Maksimal</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      data-testid="filter-total-max"
                      value={draft.max ?? ''}
                      onChange={(e) =>
                        setDraft((current) => ({
                          ...current,
                          max: e.target.value === '' ? null : Number(e.target.value),
                        }))
                      }
                      placeholder="0"
                      className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm tabular-nums focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </label>
                </div>
              </section>
            </>
          )}
        </div>

        <div className="flex gap-2 border-t px-3 py-3">
          <Button
            type="button"
            variant="outline"
            className="h-10 flex-1"
            data-testid="filter-reset"
            onClick={() => setDraft({ ...EMPTY_FILTER })}
          >
            Atur ulang
          </Button>
          <Button
            type="button"
            className="h-10 flex-1"
            data-testid="filter-apply"
            onClick={() => {
              onApply(draft)
              onClose()
            }}
          >
            Terapkan
          </Button>
        </div>
      </div>
    </Overlay>
  )
}
