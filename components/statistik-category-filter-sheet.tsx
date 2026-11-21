'use client'

import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Overlay } from '@/components/ui/overlay'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import type { Currency } from '@/lib/db'
import type { CategoryStat } from '@/lib/statistics-utils'

type CategoryFilterSheetProps = {
  open: boolean
  onClose: () => void
  categories: CategoryStat[]
  selectedUids: string[] | null
  onApply: (selectedUids: string[] | null) => void
  currency: Currency | null
}

/** Bottom sheet modal untuk memilih atau mengecualikan kategori pada tab Statistik. */
export function StatistikCategoryFilterSheet({
  open,
  onClose,
  categories,
  selectedUids,
  onApply,
  currency,
}: CategoryFilterSheetProps) {
  const [draft, setDraft] = useState<Set<string>>(() => new Set())

  // Inisialisasi draft saat sheet dibuka
  useEffect(() => {
    if (!open) return
    if (selectedUids === null) {
      // Jika null, berarti semua kategori terpilih secara default
      setDraft(new Set(categories.map((c) => c.uid)))
    } else {
      setDraft(new Set(selectedUids))
    }
  }, [open, selectedUids, categories])

  if (!open) return null

  const allUids = categories.map((c) => c.uid)
  const isAllSelected = categories.length > 0 && draft.size === categories.length
  const isNoneSelected = draft.size === 0

  const toggleCategory = (uid: string) => {
    setDraft((prev) => {
      const next = new Set(prev)
      if (next.has(uid)) {
        next.delete(uid)
      } else {
        next.add(uid)
      }
      return next
    })
  }

  const selectAll = () => {
    setDraft(new Set(allUids))
  }

  const clearAll = () => {
    setDraft(new Set())
  }

  const handleApply = () => {
    // Jika semua dipilih, anggap filter nonaktif (null)
    if (draft.size === categories.length) {
      onApply(null)
    } else {
      onApply(Array.from(draft))
    }
  }

  const handleReset = () => {
    onApply(null)
  }

  return (
    <Overlay
      open={open}
      onClose={onClose}
      align="bottom"
      testId="stats-category-filter-sheet"
      label="Filter Kategori Statistik"
    >
      <div className="mx-auto flex max-h-[85vh] w-full max-w-full flex-col overflow-hidden rounded-t-[1.75rem] border-t bg-card pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl md:max-w-md md:rounded-2xl md:border md:pb-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-foreground">Pilih Kategori</h2>
            <span className="text-xs text-muted-foreground">
              {draft.size} dari {categories.length} kategori dipilih
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        {/* Action bar cepat */}
        <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
          <span className="text-xs text-muted-foreground">Pilihan Cepat</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isAllSelected}
              onClick={selectAll}
              className="text-xs font-semibold text-primary transition-opacity hover:underline disabled:cursor-not-allowed disabled:opacity-40"
            >
              Pilih Semua
            </button>
            <span className="text-xs text-muted-foreground/40">•</span>
            <button
              type="button"
              disabled={isNoneSelected}
              onClick={clearAll}
              className="text-xs font-semibold text-muted-foreground transition-opacity hover:underline hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              Batal Semua
            </button>
          </div>
        </div>

        {/* Daftar kategori */}
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {categories.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              Tidak ada kategori transaksi pada periode ini
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {categories.map((cat) => {
                const checked = draft.has(cat.uid)
                return (
                  <li key={cat.uid}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      data-testid={`stats-filter-category-${cat.uid}`}
                      onClick={() => toggleCategory(cat.uid)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                        'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        checked ? 'bg-secondary/40' : 'opacity-60',
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className={cn(
                            'flex size-4.5 shrink-0 items-center justify-center rounded-md border transition-colors',
                            checked
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-muted-foreground/40 bg-background',
                          )}
                        >
                          {checked && <Check className="size-3 stroke-[2.5]" />}
                        </span>
                        <span
                          aria-hidden="true"
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: cat.color }}
                        />
                        <span className="truncate font-medium text-xs sm:text-sm text-foreground">
                          {cat.name}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                        {formatCurrency(cat.amount, currency)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t p-3 bg-card">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="flex-1 h-10 text-xs font-medium"
          >
            Reset
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            className="flex-1 h-10 text-xs font-semibold"
          >
            Terapkan
          </Button>
        </div>
      </div>
    </Overlay>
  )
}
