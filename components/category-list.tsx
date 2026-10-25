'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  GripVertical,
  Pencil,
  Plus,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { SubCategoryManager } from '@/components/sub-category-manager'
import { useTranslation } from '@/components/language-provider'
import { cn } from '@/lib/utils'
import {
  type Category,
  createCategory,
  deleteCategory,
  getMainCategoriesByType,
  getMaxOrderSeq,
  getSettingByKey,
  getSubCategoriesByParent,
  initDB,
  reorderCategories,
  restoreCategory,
  setSetting,
  updateCategory,
} from '@/lib/db'

type CategoryType = 'income' | 'expense'

const TYPE_LABELS: Record<CategoryType, { title: string; type: number }> = {
  income: { title: 'Kategori pendapatan', type: 0 },
  expense: { title: 'Kategori pengeluaran', type: 1 },
}

type DeletedEntry = { id: number; name: string }

/** Matches a leading emoji (including ZWJ sequences and skin-tone modifiers). */
const LEADING_EMOJI_RE =
  /^([\p{Extended_Pictographic}\u200D\uFE0F\p{Emoji_Modifier}\u20E3]+)\s*/u

/** Keep the original leading emoji when the user renames a category. */
function preserveEmoji(original: string, next: string): string {
  const match = original.match(LEADING_EMOJI_RE)
  if (!match) return next
  if (LEADING_EMOJI_RE.test(next)) return next
  return `${match[1]} ${next}`
}

/** Compare category names ignoring the leading emoji, whitespace and case. */
function normalizeName(name: string): string {
  return name.replace(LEADING_EMOJI_RE, '').trim().toLowerCase()
}

export function CategoryList({ categoryType }: { categoryType: CategoryType }) {
  const router = useRouter()
  const { t } = useTranslation()
  const title = categoryType === 'income' ? t.settings.incomeCategory : t.settings.expenseCategory
  const type = categoryType === 'income' ? 0 : 1
  const [categories, setCategories] = useState<Category[]>([])
  const [subCategoryMap, setSubCategoryMap] = useState<Record<string, Category[]>>({})
  const [subCategoryEnabled, setSubCategoryEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formName, setFormName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [openParentUid, setOpenParentUid] = useState<string | null>(null)
  const [lastDeleted, setLastDeleted] = useState<DeletedEntry[]>([])
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const touchDragIndex = useRef<number | null>(null)
  const loadData = useCallback(async () => {
    await initDB()
    const [cats, setting] = await Promise.all([
      getMainCategoriesByType(type),
      getSettingByKey('use_sub_category'),
    ])
    setCategories(cats)
    const enabled = setting?.ZDATA === '1'
    setSubCategoryEnabled(enabled)

    const subs: Record<string, Category[]> = {}
    for (const cat of cats) {
      subs[cat.uid] = await getSubCategoriesByParent(cat.uid)
    }
    setSubCategoryMap(subs)
    setLoading(false)
  }, [type])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openParent = openParentUid
    ? categories.find((c) => c.uid === openParentUid) ?? null
    : null

  const handleBack = () => router.back()

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openAdd = () => {
    setFormMode('add')
    setEditingId(null)
    setFormName('')
    setError(null)
  }

  const openEdit = (cat: Category) => {
    setFormMode('edit')
    setEditingId(cat.id!)
    setFormName(cat.NAME)
    setError(null)
  }

  const closeForm = () => {
    setFormMode(null)
    setEditingId(null)
    setFormName('')
    setError(null)
  }

  const handleSave = async () => {
    const trimmed = formName.trim()
    if (!trimmed) {
      setError('Nama kategori tidak boleh kosong')
      return
    }
    const duplicate = categories.some(
      (c) => c.id !== editingId && normalizeName(c.NAME) === normalizeName(trimmed),
    )
    if (duplicate) {
      setError('Nama kategori sudah digunakan')
      return
    }

    try {
      if (formMode === 'add') {
        const maxOrder = await getMaxOrderSeq(type, 0)
        await createCategory({
          uid: `cat_${Date.now()}`,
          C_IS_DEL: 0,
          C_UTIME: Date.now(),
          NAME: trimmed,
          ORDERSEQ: maxOrder + 1,
          TYPE: type,
          STATUS: 0,
          pUid: null,
          IS_DEFAULT: 0,
          isSynced: 0,
          syncTime: 0,
          syncVersion: 1,
        })
      } else if (editingId !== null) {
        await updateCategory(editingId, {
          NAME: trimmed,
          C_UTIME: Date.now(),
        })
      }
      closeForm()
      await loadData()
    } catch {
      setError('Gagal menyimpan kategori. Coba lagi.')
    }
  }

  const handleDelete = async () => {
    const entries: DeletedEntry[] = []
    for (const id of Array.from(selectedIds)) {
      const cat = categories.find((c) => c.id === id)
      if (cat) entries.push({ id, name: cat.NAME })
      await deleteCategory(id)
    }
    setSelectedIds(new Set())
    setConfirmDelete(false)
    setLastDeleted(entries)
    await loadData()
  }

  const handleRestore = async () => {
    for (const entry of lastDeleted) {
      await restoreCategory(entry.id)
    }
    setLastDeleted([])
    await loadData()
  }

  const applySubToggle = async (enable: boolean) => {
    await setSetting('use_sub_category', enable ? '1' : '0')
    setSubCategoryEnabled(enable)
    await loadData()
  }

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= categories.length) return
    const next = [...categories]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    setCategories(next)
    await reorderCategories(next.map((c) => c.id!))
    await loadData()
  }

  const handleDrop = async (fromIndex: number, targetIndex: number) => {
    if (
      fromIndex === targetIndex ||
      fromIndex < 0 ||
      targetIndex < 0 ||
      fromIndex >= categories.length ||
      targetIndex >= categories.length
    ) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }
    const next = [...categories]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(targetIndex, 0, moved)
    setDragIndex(null)
    setDragOverIndex(null)
    setCategories(next)
    await reorderCategories(next.map((c) => c.id!))
    await loadData()
  }
  const selectedCount = selectedIds.size

  if (openParent) {
    return (
      <SubCategoryManager
        parent={openParent}
        parentType={type}
        onClose={() => setOpenParentUid(null)}
        onChanged={loadData}
      />
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 bg-background/80 px-4 pt-[calc(0.875rem+env(safe-area-inset-top))] pb-4 backdrop-blur-xl md:px-10 md:pt-6 md:pb-8">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Kembali"
            onClick={handleBack}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t.settings.sectionSettings}
            </p>
            <h1 className="truncate text-lg font-bold tracking-tight">{title}</h1>
          </div>
          <Button aria-label="Tambah kategori" data-testid="add-category" onClick={openAdd}>
            <Plus className="size-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col px-4 md:px-10">
        <div className="mb-3 flex items-center justify-between rounded-xl border bg-secondary/40 p-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={subCategoryEnabled}
              aria-label="Fungsi sub kategori"
              data-testid="sub-toggle"
              onClick={() => applySubToggle(!subCategoryEnabled)}
              className={cn(
                'relative h-6 w-11 shrink-0 rounded-full transition-colors',
                subCategoryEnabled ? 'bg-primary' : 'bg-muted-foreground/30',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 size-5 rounded-full bg-white shadow transition-all',
                  subCategoryEnabled ? 'left-[1.375rem]' : 'left-0.5',
                )}
              />
            </button>
            <span className="text-sm font-medium">{t.settings.subCategoryFunction}</span>
          </div>
          <span className="text-xs text-muted-foreground" data-testid="sub-toggle-state">
            {subCategoryEnabled ? t.common.active : t.common.inactive}
          </span>
        </div>

        {lastDeleted.length > 0 && (
          <div
            role="status"
            className="mb-3 flex items-center justify-between gap-2 rounded-lg border bg-secondary/50 p-3"
          >
            <span className="text-sm text-muted-foreground">
              {lastDeleted.length} kategori dihapus
            </span>
            <Button variant="outline" size="sm" onClick={handleRestore}>
              <RotateCcw className="size-3.5" />
              Pulihkan
            </Button>
          </div>
        )}

        {selectedCount > 0 && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive">
            <span className="text-sm font-medium">{selectedCount} kategori dipilih</span>
            <Button
              variant="destructive"
              size="sm"
              aria-label="Hapus kategori terpilih"
              onClick={() => setConfirmDelete(true)}
            >
              Hapus
            </Button>
          </div>
        )}

        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Memuat…</p>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex size-16 items-center justify-center rounded-full bg-secondary/40">
              <AlertCircle className="size-8 text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold">Belum ada kategori</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tambah kategori pertama Anda dengan tombol di atas.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {categories.map((cat, index) => {
              const subs = subCategoryMap[cat.uid] || []
              const isSelected = selectedIds.has(cat.id!)
              return (
                <div
                  key={cat.uid}
                  data-testid={`category-row-${cat.NAME}`}
                  data-category-index={index}
                  draggable
                  onDragStart={(e) => {
                    setDragIndex(index)
                    e.dataTransfer.setData('text/plain', String(index))
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragEnd={() => {
                    setDragIndex(null)
                    setDragOverIndex(null)
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    if (dragOverIndex !== index) {
                      setDragOverIndex(index)
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverIndex === index) {
                      setDragOverIndex(null)
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    const fromIdx = dragIndex ?? Number(e.dataTransfer.getData('text/plain'))
                    if (!isNaN(fromIdx)) {
                      void handleDrop(fromIdx, index)
                    }
                    setDragIndex(null)
                    setDragOverIndex(null)
                  }}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border p-2 pl-3 transition-all',
                    dragIndex === index && 'opacity-40 scale-[0.98] border-dashed border-primary',
                    dragOverIndex === index &&
                      dragIndex !== index &&
                      'border-primary ring-2 ring-primary/30 bg-primary/5',
                    isSelected
                      ? 'border-primary/50 bg-accent text-accent-foreground'
                      : 'bg-card hover:bg-secondary',
                  )}
                >
                  <input
                    type="checkbox"
                    onChange={() => toggleSelect(cat.id!)}
                    aria-label={`Pilih kategori ${cat.NAME}`}
                    className="size-4 shrink-0 rounded text-primary ring-offset-background focus:ring-primary"
                  />
                  {/*
                    Baris tetap berguna walau fungsi sub kategori dimatikan:
                    saklar hidup → membuka pengelola sub-kategori,
                    saklar mati  → membuka pengubahan kategori (perilaku aplikasi asli).
                    aria-label selalu ada supaya baris tetap terbaca pembaca layar.
                  */}
                  <button
                    type="button"
                    onClick={() =>
                      subCategoryEnabled ? setOpenParentUid(cat.uid) : openEdit(cat)
                    }
                    className="flex min-w-0 flex-1 flex-col items-start text-left"
                    aria-label={
                      subCategoryEnabled
                        ? `Kelola sub kategori ${cat.NAME}`
                        : `Ubah kategori ${cat.NAME}`
                    }
                  >
                    <span className="flex w-full items-center gap-1.5">
                      <span className="truncate text-sm">{cat.NAME}</span>
                      {/* Jumlah sub hanya bermakna saat fungsi sub kategori menyala. */}
                      {subCategoryEnabled && subs.length > 0 && (
                        <span
                          className="shrink-0 text-xs font-medium text-primary"
                          data-testid={`sub-count-${cat.NAME}`}
                        >
                          ({subs.length})
                        </span>
                      )}
                      {cat.IS_DEFAULT === 1 && (
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {t.common.default}
                        </span>
                      )}
                    </span>
                    {subCategoryEnabled && subs.length > 0 && (
                      <span className="mt-0.5 w-full truncate text-xs text-muted-foreground">
                        {subs.map((s) => s.NAME).join(', ')}
                      </span>
                    )}
                  </button>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Naikkan ${cat.NAME}`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      className="sr-only"
                    >
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Turunkan ${cat.NAME}`}
                      disabled={index === categories.length - 1}
                      onClick={() => move(index, 1)}
                      className="sr-only"
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Ubah kategori ${cat.NAME}`}
                      onClick={() => openEdit(cat)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <span
                      data-testid="drag-handle"
                      onDragStart={(e) => {
                        e.stopPropagation()
                        setDragIndex(index)
                        e.dataTransfer.setData('text/plain', String(index))
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      onDragEnd={() => {
                        setDragIndex(null)
                        setDragOverIndex(null)
                      }}
                      onTouchStart={() => {
                        touchDragIndex.current = index
                        setDragIndex(index)
                      }}
                      onTouchMove={(e) => {
                        if (touchDragIndex.current === null) return
                        const touch = e.touches[0]
                        const target = document.elementFromPoint(touch.clientX, touch.clientY)
                        const row = target?.closest('[data-category-index]')
                        if (row) {
                          const targetIdx = Number(row.getAttribute('data-category-index'))
                          if (!isNaN(targetIdx) && targetIdx !== dragOverIndex) {
                            setDragOverIndex(targetIdx)
                          }
                        }
                      }}
                      onTouchEnd={() => {
                        if (
                          touchDragIndex.current !== null &&
                          dragOverIndex !== null &&
                          touchDragIndex.current !== dragOverIndex
                        ) {
                          void handleDrop(touchDragIndex.current, dragOverIndex)
                        }
                        touchDragIndex.current = null
                        setDragIndex(null)
                        setDragOverIndex(null)
                      }}
                      className="cursor-grab p-1.5 text-muted-foreground hover:text-foreground active:cursor-grabbing touch-none select-none"
                      aria-hidden="true"
                    >
                      <GripVertical className="size-4" />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {formMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px] transition-all animate-in fade-in duration-150">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-form-title"
            className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-xl"
          >
            <h2 id="category-form-title" className="mb-4 text-lg font-bold">
              {formMode === 'add' ? 'Tambah kategori' : 'Edit kategori'}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSave()
              }}
              className="space-y-3"
            >
              <div>
                <label
                  htmlFor="category-name-input"
                  className="mb-1 block text-xs font-medium text-muted-foreground"
                >
                  Nama kategori
                </label>
                <input
                  id="category-name-input"
                  type="text"
                  value={formName}
                  autoFocus
                  onChange={(e) => setFormName(e.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? 'category-form-error' : undefined}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Mis. Gaji, Makanan, Transport"
                />
              </div>
              {error && (
                <div
                  id="category-form-error"
                  role="alert"
                  className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive"
                >
                  <AlertCircle className="size-4 shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
              <div className="mt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeForm}>
                  Batal
                </Button>
                <Button type="submit" aria-label="Simpan kategori">
                  <Check className="size-4" />
                  Menyimpan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Hapus kategori?"
        description={`${selectedCount} kategori akan dihapus. Kategori bawaan dapat dipulihkan kembali setelah dihapus.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
