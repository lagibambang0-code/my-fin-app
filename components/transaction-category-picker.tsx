'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, ChevronDown, ChevronRight, X } from 'lucide-react'
import { Overlay } from '@/components/ui/overlay'
import { cn } from '@/lib/utils'
import {
  type Category,
  getMainCategoriesByType,
  getSettingByKey,
} from '@/lib/db'

type CategoryPickerProps = {
  open: boolean
  /** Which category tree to show: income (TYPE 0) or expense (TYPE 1). */
  type: 'income' | 'expense'
  selectedUid: string | null
  onSelect: (category: Category, parent: Category | null) => void
  onClose: () => void
}

const TYPE_INDEX = { income: 0, expense: 1 } as const

/**
 * Category grid used by the transaction form. Sub-categories stay hidden
 * until "Fungsi sub kategori" is enabled in Kelola Pengaturan (PRD-12).
 */
export function CategoryPicker({
  open,
  type,
  selectedUid,
  onSelect,
  onClose,
}: CategoryPickerProps) {
  const [mains, setMains] = useState<Category[]>([])
  const [subsByParent, setSubsByParent] = useState<Record<string, Category[]>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [subsEnabled, setSubsEnabled] = useState(false)

  useEffect(() => {
    if (!open) return
    let active = true
    setExpanded(null)
    setSubsByParent({})
    ;(async () => {
      const [list, setting] = await Promise.all([
        getMainCategoriesByType(TYPE_INDEX[type]),
        getSettingByKey('use_sub_category'),
      ])
      if (!active) return
      setMains(list)
      setSubsEnabled(setting?.ZDATA === '1')
    })()
    return () => {
      active = false
    }
  }, [open, type])

  const chooseSub = (sub: Category, parent: Category) => {
    onSelect(sub, parent)
    onClose()
  }

  const handleMain = useCallback(
    async (parent: Category) => {
      if (!subsEnabled) {
        onSelect(parent, null)
        onClose()
        return
      }

      // Single click on a category with subs selects the main category directly.
      onSelect(parent, null)
      onClose()
    },
    [subsEnabled, onSelect, onClose],
  )

  return (
    <Overlay open={open} onClose={onClose} align="bottom" testId="category-picker" label="Kategori">
      <div className="mx-auto flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border bg-card shadow-xl">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h2 className="text-base font-bold">
            {type === 'income' ? 'Kategori pendapatan' : 'Kategori pengeluaran'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
          {mains.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Belum ada kategori. Tambahkan dari Kelola Pengaturan.
            </p>
          ) : (
            <ul className="space-y-2">
              {mains.map((parent) => {
                const subs = subsByParent[parent.uid]
                const isExpanded = expanded === parent.uid
                const isSelected = selectedUid === parent.uid
                return (
                  <li key={parent.uid}>
                    <button
                      type="button"
                      data-testid={`category-option-${parent.NAME}`}
                      aria-expanded={subsEnabled ? isExpanded : undefined}
                      aria-pressed={!subsEnabled ? isSelected : undefined}
                      onClick={() => handleMain(parent)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors duration-150',
                        'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isExpanded && 'border-primary/40 bg-accent/40',
                        !isExpanded && isSelected && 'border-primary bg-accent text-accent-foreground',
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        {isSelected && !subsEnabled ? (
                          <Check aria-hidden="true" className="size-4 shrink-0 text-primary" />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="size-4 shrink-0 rounded-full border border-muted-foreground/40"
                          />
                        )}
                        <span className="truncate text-sm font-medium">{parent.NAME}</span>
                      </span>
                      {subsEnabled && (
                        <ChevronDown
                          aria-hidden="true"
                          className={cn(
                            'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
                            isExpanded && 'rotate-180',
                          )}
                        />
                      )}
                    </button>

                    {subsEnabled && isExpanded && (
                      <ul className="mt-1.5 ml-4 space-y-1 border-l pl-3">
                        {subs?.length ? (
                          subs.map((sub) => {
                            const subSelected = selectedUid === sub.uid
                            return (
                              <li key={sub.uid}>
                                <button
                                  type="button"
                                  data-testid={`subcategory-option-${sub.NAME}`}
                                  aria-pressed={subSelected}
                                  onClick={() => chooseSub(sub, parent)}
                                  className={cn(
                                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-150',
                                    'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                    subSelected && 'bg-accent text-accent-foreground',
                                  )}
                                >
                                  <ChevronRight
                                    aria-hidden="true"
                                    className="size-3.5 shrink-0 text-muted-foreground"
                                  />
                                  <span className="truncate">{sub.NAME}</span>
                                  {subSelected && (
                                    <Check
                                      aria-hidden="true"
                                      className="ml-auto size-4 text-primary"
                                    />
                                  )}
                                </button>
                              </li>
                            )
                          })
                        ) : (
                          <li className="px-3 py-2 text-xs text-muted-foreground">
                            Belum ada sub kategori
                          </li>
                        )}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </Overlay>
  )
}
