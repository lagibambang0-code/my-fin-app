'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, Filter, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FullScreenSheet } from '@/components/ui/overlay'
import { TransactionRow, TransactionsEmpty, FilterChip, type Lookups } from '@/components/transaction-list'
import { TransactionFilterSheet } from '@/components/transaction-filter-sheet'
import type { Asset, Transaction } from '@/lib/db'
import {
  EMPTY_FILTER,
  applyFilter,
  isFilterActive,
  type TransactionFilter,
} from '@/lib/transaction-utils'

type SearchScreenProps = {
  open: boolean
  transactions: Transaction[]
  lookups: Lookups
  assets: Asset[]
  onClose: () => void
  onOpen: (tx: Transaction) => void
}

/** "Pencarian" screen: keyword (Enter to search) + optional Period/Total filter. */
export function TransactionSearchScreen({
  open,
  transactions,
  lookups,
  assets,
  onClose,
  onOpen,
}: SearchScreenProps) {
  const [input, setInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [searched, setSearched] = useState(false)
  const [filter, setFilter] = useState<TransactionFilter>({ ...EMPTY_FILTER })
  const [filterOpen, setFilterOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setInput('')
    setKeyword('')
    setSearched(false)
    setFilter({ ...EMPTY_FILTER })
    setFilterOpen(false)
  }, [open])

  const results = useMemo(
    () => applyFilter(transactions, { ...filter, keyword }),
    [transactions, filter, keyword],
  )

  const runSearch = () => {
    setKeyword(input.trim())
    setSearched(true)
  }

  // Nothing is listed until the user searches or applies a filter.
  const showResults = searched || isFilterActive(filter)

  if (!open) return null

  return (
    <FullScreenSheet open={open} testId="search-screen">
      <header className="sticky top-0 z-30 border-b bg-background/85 px-3 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-lg items-center gap-2">
          <Button variant="ghost" size="icon-sm" aria-label="Kembali" onClick={onClose}>
            <ChevronLeft className="size-5" />
          </Button>
          <form
            className="relative min-w-0 flex-1"
            onSubmit={(event) => {
              event.preventDefault()
              runSearch()
            }}
          >
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              data-testid="search-input"
              aria-label="Cari transaksi"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Cari catatan atau deskripsi"
              className="w-full rounded-lg border border-input bg-background py-2 pr-3 pl-9 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </form>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Filter pencarian"
            aria-pressed={isFilterActive(filter)}
            data-testid="search-filter-button"
            onClick={() => setFilterOpen(true)}
          >
            <Filter className="size-5" />
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-lg space-y-3 px-4 py-4">
          <p className="text-xs text-muted-foreground">
            Tekan Enter untuk mencari. Kata kunci mencakup catatan dan deskripsi.
          </p>

          {isFilterActive(filter) && (
            <FilterChip onClear={() => setFilter({ ...EMPTY_FILTER })} />
          )}

          {!showResults || results.length === 0 ? (
            <TransactionsEmpty
              hint={
                showResults && keyword
                  ? `Tidak ada transaksi yang cocok dengan "${keyword}".`
                  : 'Masukkan kata kunci lalu tekan Enter.'
              }
            />
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card">
              {results.map((tx) => (
                <TransactionRow
                  key={tx.uid}
                  tx={tx}
                  lookups={lookups}
                  onOpen={(row) => {
                    onClose()
                    onOpen(row)
                  }}
                  showDate
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <TransactionFilterSheet
        open={filterOpen}
        extended
        filter={filter}
        assets={assets}
        pool={transactions}
        onApply={setFilter}
        onClose={() => setFilterOpen(false)}
      />
    </FullScreenSheet>
  )
}
