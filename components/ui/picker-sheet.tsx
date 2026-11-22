'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import { Overlay } from '@/components/ui/overlay'
import { cn } from '@/lib/utils'

export type PickerItem = {
  value: string
  label: string
  sublabel?: string
  trailing?: string
  group?: string
}

export type PickerViewProps = {
  title: string
  items: PickerItem[]
  selected?: string | null
  onSelect: (value: string) => void
  onClose?: () => void
  searchable?: boolean
  searchPlaceholder?: string
  emptyLabel?: string
  testId?: string
  showHeader?: boolean
  layout?: 'list' | 'grid'
  columns?: 2 | 3 | 4
}

type PickerSheetProps = PickerViewProps & {
  open: boolean
  onClose: () => void
}

/** Bottom sheet view for selecting options (can be embedded directly in a shared sheet). */
export function PickerView({
  title,
  items,
  selected,
  onSelect,
  onClose,
  searchable = true,
  searchPlaceholder = 'Cari…',
  emptyLabel = 'Tidak ada data',
  testId = 'picker-sheet',
  showHeader = true,
  layout = 'list',
  columns = 3,
}: PickerViewProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.value.toLowerCase().includes(q) ||
        (item.sublabel ?? '').toLowerCase().includes(q),
    )
  }, [items, query])

  const grouped = useMemo(() => {
    const map = new Map<string, PickerItem[]>()
    for (const item of filtered) {
      const key = item.group ?? ''
      const bucket = map.get(key)
      if (bucket) bucket.push(item)
      else map.set(key, [item])
    }
    return [...map.entries()]
  }, [filtered])

  return (
    <div data-testid={testId} className="flex flex-col min-h-0 flex-1">
      {showHeader && (
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h2 className="text-base font-bold">{title}</h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      )}

      {searchable && (
        <div className="border-b px-4 py-3">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="w-full rounded-lg border border-input bg-background py-2 pr-3 pl-9 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        {grouped.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          grouped.map(([letter, options]) => (
            <div key={letter || 'all'}>
              {letter && (
                <p className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {letter}
                </p>
              )}
              {layout === 'grid' ? (
                <div
                  className={cn(
                    'grid gap-2',
                    columns === 2 && 'grid-cols-2',
                    columns === 3 && 'grid-cols-3',
                    columns === 4 && 'grid-cols-4',
                  )}
                >
                  {options.map((item) => {
                    const isSelected = selected === item.value
                    return (
                      <button
                        key={item.value}
                        type="button"
                        data-testid={`picker-option-${item.value}`}
                        aria-pressed={isSelected}
                        onClick={() => onSelect(item.value)}
                        className={cn(
                          'relative flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center transition-colors',
                          'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs'
                            : 'border-border bg-card text-foreground',
                        )}
                      >
                        <span className="w-full truncate text-xs sm:text-sm font-medium">
                          {item.label}
                        </span>
                        {item.trailing && (
                          <span
                            className={cn(
                              'w-full truncate text-[10px] sm:text-xs tabular-nums',
                              isSelected ? 'text-primary/85 font-medium' : 'text-muted-foreground',
                            )}
                          >
                            {item.trailing}
                          </span>
                        )}
                        {isSelected && (
                          <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="size-2.5" />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <ul>
                  {options.map((item) => {
                    const isSelected = selected === item.value
                    return (
                      <li key={item.value}>
                        <button
                          type="button"
                          data-testid={`picker-option-${item.value}`}
                          aria-pressed={isSelected}
                          onClick={() => onSelect(item.value)}
                          className={cn(
                            'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                            'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            isSelected && 'bg-accent text-accent-foreground',
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {item.label}
                            </span>
                            {item.sublabel && (
                              <span className="block truncate text-xs text-muted-foreground">
                                {item.sublabel}
                              </span>
                            )}
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            {item.trailing && (
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {item.trailing}
                              </span>
                            )}
                            {isSelected && <Check className="size-4 text-primary" />}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/** Bottom sheet with an optional search box and letter-grouped options. */
export function PickerSheet({
  open,
  title,
  items,
  selected,
  onSelect,
  onClose,
  searchable = true,
  searchPlaceholder = 'Cari…',
  emptyLabel = 'Tidak ada data',
  testId = 'picker-sheet',
}: PickerSheetProps) {
  if (!open) return null
  return (
    <Overlay open={open} onClose={onClose} align="bottom" testId={testId} label={title}>
      <div className="mx-auto flex max-h-[85vh] w-full max-w-full flex-col overflow-hidden rounded-t-[1.75rem] border border-b-0 border-border/80 bg-card pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl md:max-w-md md:rounded-2xl md:border md:pb-0">
        <PickerView
          title={title}
          items={items}
          selected={selected}
          onSelect={onSelect}
          onClose={onClose}
          searchable={searchable}
          searchPlaceholder={searchPlaceholder}
          emptyLabel={emptyLabel}
          testId={testId}
        />
      </div>
    </Overlay>
  )
}
