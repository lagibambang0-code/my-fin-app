'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, ChevronRight, X } from 'lucide-react'
import { Overlay } from '@/components/ui/overlay'
import { cn } from '@/lib/utils'
import {
  type Category,
  getAllCategories,
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
 * Pemilih kategori pada form transaksi:
 * Menggunakan layout 2 kolom persis seperti pada form tambah anggaran:
 * - Kolom Kiri: Kategori Utama
 * - Kolom Kanan: Opsi "(Semua)" & Sub-kategori terkait
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
  const [selectedMain, setSelectedMain] = useState<Category | null>(null)
  const [subsEnabled, setSubsEnabled] = useState(false)

  useEffect(() => {
    if (!open) return
    let active = true
    ;(async () => {
      const [list, setting, allCats] = await Promise.all([
        getMainCategoriesByType(TYPE_INDEX[type]),
        getSettingByKey('use_sub_category'),
        getAllCategories(),
      ])
      if (!active) return
      setMains(list)
      const isSubActive = setting?.ZDATA === '1'
      setSubsEnabled(isSubActive)

      // Kelompokkan sub-kategori berdasarkan pUid
      const grouped: Record<string, Category[]> = {}
      for (const cat of allCats) {
        if (cat.STATUS === 2 && cat.pUid && cat.C_IS_DEL === 0) {
          if (!grouped[cat.pUid]) grouped[cat.pUid] = []
          grouped[cat.pUid].push(cat)
        }
      }
      setSubsByParent(grouped)

      // Inisialisasi kategori utama terpilih
      if (selectedUid) {
        const found = allCats.find((c) => c.uid === selectedUid)
        if (found?.STATUS === 2 && found.pUid) {
          const parent = list.find((p) => p.uid === found.pUid)
          setSelectedMain(parent ?? list[0] ?? null)
        } else if (found) {
          const parent = list.find((p) => p.uid === found.uid)
          setSelectedMain(parent ?? list[0] ?? null)
        }
      } else {
        setSelectedMain(list[0] ?? null)
      }
    })()

    return () => {
      active = false
    }
  }, [open, type, selectedUid])

  const chooseSub = (sub: Category, parent: Category) => {
    onSelect(sub, parent)
    onClose()
  }

  const handleMain = useCallback(
    (parent: Category) => {
      if (!subsEnabled) {
        onSelect(parent, null)
        onClose()
        return
      }

      // Bila kategori yang sama diketuk dua kali, pilih kategori utama tersebut (PRD-12 §3.3)
      if (selectedMain?.uid === parent.uid) {
        onSelect(parent, null)
        onClose()
        return
      }

      setSelectedMain(parent)
    },
    [selectedMain, subsEnabled, onSelect, onClose],
  )

  return (
    <Overlay open={open} onClose={onClose} align="bottom" testId="category-picker" label="Kategori">
      <div className="mx-auto flex max-h-[85vh] w-full max-w-full flex-col overflow-hidden rounded-t-[1.75rem] border border-b-0 border-border/80 bg-card pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl md:max-w-lg md:rounded-2xl md:border md:pb-0">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div>
            <h2 className="text-base font-bold">
              {type === 'income' ? 'Kategori pendapatan' : 'Kategori pengeluaran'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {subsEnabled ? 'Kategori utama & sub-kategori' : 'Pilih kategori'}
            </p>
          </div>
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
          ) : !subsEnabled ? (
            /* Tampilan 1 kolom / grid saat fungsi sub-kategori nonaktif */
            <div className="grid grid-cols-2 gap-1.5">
              {mains.map((parent) => {
                const isSelected = selectedUid === parent.uid
                return (
                  <button
                    key={parent.uid}
                    type="button"
                    data-testid={`category-option-${parent.NAME}`}
                    aria-pressed={isSelected}
                    onClick={() => {
                      onSelect(parent, null)
                      onClose()
                    }}
                    className={cn(
                      'flex items-center justify-between rounded-xl border px-3 py-3 text-left transition-colors',
                      'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'bg-card text-foreground',
                    )}
                  >
                    <span className="truncate text-sm">{parent.NAME}</span>
                    {isSelected && <Check className="size-4 text-primary shrink-0" />}
                  </button>
                )
              })}
            </div>
          ) : (
            /* Layout 2 Kolom seperti pada form Tambah Anggaran */
            <div className="grid grid-cols-2 gap-2">
              {/* Kolom Kiri: Kategori Utama */}
              <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto pr-1">
                {mains.map((parent) => {
                  const isParentActive = selectedMain?.uid === parent.uid
                  const isDirectlySelected = selectedUid === parent.uid
                  return (
                    <button
                      key={parent.uid}
                      type="button"
                      data-testid={`category-option-${parent.NAME}`}
                      aria-pressed={isDirectlySelected}
                      onClick={() => handleMain(parent)}
                      className={cn(
                        'flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors',
                        'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isParentActive
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'bg-card text-foreground',
                      )}
                    >
                      <span className="truncate">{parent.NAME}</span>
                      <ChevronRight className="size-3.5 shrink-0 opacity-50" />
                    </button>
                  )
                })}
              </div>

              {/* Kolom Kanan: Opsi (Semua) & Sub-kategori */}
              <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto pl-1 border-l">
                {selectedMain ? (
                  <>
                    {/* Opsi Kategori Utama Sendiri: [Nama Kategori] (Semua) */}
                    <button
                      type="button"
                      data-testid={`subcategory-option-all-${selectedMain.NAME}`}
                      aria-pressed={selectedUid === selectedMain.uid}
                      onClick={() => {
                        onSelect(selectedMain, null)
                        onClose()
                      }}
                      className={cn(
                        'flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors',
                        'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        selectedUid === selectedMain.uid
                          ? 'border-primary bg-primary text-primary-foreground font-semibold'
                          : 'bg-muted/40 text-foreground',
                      )}
                    >
                      <span className="truncate">{selectedMain.NAME} (Semua)</span>
                      {selectedUid === selectedMain.uid && <Check className="size-3.5 shrink-0" />}
                    </button>

                    {/* Daftar Sub-kategori */}
                    {subsByParent[selectedMain.uid]?.length ? (
                      subsByParent[selectedMain.uid].map((sub) => {
                        const isSubSelected = selectedUid === sub.uid
                        return (
                          <button
                            key={sub.uid}
                            type="button"
                            data-testid={`subcategory-option-${sub.NAME}`}
                            aria-pressed={isSubSelected}
                            onClick={() => chooseSub(sub, selectedMain)}
                            className={cn(
                              'flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors',
                              'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              isSubSelected
                                ? 'border-primary bg-primary/15 text-primary font-semibold'
                                : 'bg-card text-foreground',
                            )}
                          >
                            <span className="truncate">{sub.NAME}</span>
                            {isSubSelected && <Check className="size-3.5 shrink-0 text-primary" />}
                          </button>
                        )
                      })
                    ) : (
                      <div className="p-3 text-center text-xs text-muted-foreground">
                        Belum ada sub-kategori
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex h-36 items-center justify-center p-3 text-center text-xs text-muted-foreground">
                    Pilih kategori utama di sebelah kiri
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Overlay>
  )
}
