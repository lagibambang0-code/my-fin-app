'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  CornerUpRight,
  Pencil,
  Plus,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { cn } from '@/lib/utils'
import {
  type Category,
  createCategory,
  deleteCategory,
  getMainCategoriesByType,
  getMaxOrderSeq,
  getSubCategoriesByParent,
  promoteSubToMain,
  reorderCategories,
  updateCategory,
} from '@/lib/db'

type SubCategoryManagerProps = {
  parent: Category
  parentType: number
  onClose: () => void
  onChanged: () => void
}

export function SubCategoryManager({
  parent,
  parentType,
  onClose,
  onChanged,
}: SubCategoryManagerProps) {
  const [subs, setSubs] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmPromote, setConfirmPromote] = useState(false)
  /** Kategori utama sejenis, dipakai oleh pemilih kategori induk. */
  const [mainCategories, setMainCategories] = useState<Category[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  /** Induk yang dipilih di pemilih; `null` berarti induk saat ini. */
  const [targetParentUid, setTargetParentUid] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [list, mains] = await Promise.all([
      getSubCategoriesByParent(parent.uid),
      getMainCategoriesByType(parentType),
    ])
    setSubs(list)
    setMainCategories(mains)
    setLoading(false)
  }, [parent.uid, parentType])

  useEffect(() => {
    loadData()
  }, [loadData])

  const activeParentUid = targetParentUid ?? parent.uid
  const activeParentName =
    mainCategories.find((m) => m.uid === activeParentUid)?.NAME ?? parent.NAME

  const openAdd = () => {
    setFormMode('add')
    setEditingId(null)
    setName('')
    setError(null)
    setTargetParentUid(null)
    setPickerOpen(false)
  }

  const openEdit = (sub: Category) => {
    setFormMode('edit')
    setEditingId(sub.id!)
    setName(sub.NAME)
    setError(null)
    setTargetParentUid(null)
    setPickerOpen(false)
  }

  const closeForm = () => {
    setFormMode(null)
    setEditingId(null)
    setName('')
    setError(null)
    setTargetParentUid(null)
    setPickerOpen(false)
  }

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Nama sub kategori tidak boleh kosong')
      return
    }

    try {
      const siblings = await getSubCategoriesByParent(activeParentUid)
      const duplicate = siblings.some(
        (s) => s.id !== editingId && s.NAME.toLowerCase() === trimmed.toLowerCase(),
      )
      if (duplicate) {
        setError('Nama sub kategori sudah digunakan')
        return
      }

      if (formMode === 'add') {
        const maxOrder = await getMaxOrderSeq(2, 2, activeParentUid)
        await createCategory({
          uid: `sub_${Date.now()}`,
          C_IS_DEL: 0,
          C_UTIME: Date.now(),
          NAME: trimmed,
          ORDERSEQ: maxOrder + 1,
          TYPE: 2,
          STATUS: 2,
          pUid: activeParentUid,
          IS_DEFAULT: 0,
          isSynced: 0,
          syncTime: 0,
          syncVersion: 1,
        })
      } else if (editingId !== null) {
        const patch: Partial<Category> = { NAME: trimmed, C_UTIME: Date.now() }
        if (activeParentUid !== parent.uid) {
          // Pindah induk: sub masuk di akhir daftar kategori tujuan.
          patch.pUid = activeParentUid
          patch.ORDERSEQ = (await getMaxOrderSeq(2, 2, activeParentUid)) + 1
        }
        await updateCategory(editingId, patch)
      }
      closeForm()
      await loadData()
      onChanged()
    } catch {
      setError('Gagal menyimpan sub kategori. Coba lagi.')
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDelete = async () => {
    for (const id of Array.from(selectedIds)) {
      await deleteCategory(id)
    }
    setSelectedIds(new Set())
    setConfirmDelete(false)
    await loadData()
    onChanged()
  }

  /**
   * Mode ubah: sub yang sudah ada naik pangkat jadi kategori utama.
   * Mode tambah: kategori utama baru dibuat dari nama yang sudah diketik
   * (mengikuti tombol "Kategori utama" pada layar tambah aplikasi asli).
   */
  const handlePromote = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setConfirmPromote(false)
      setError('Nama kategori tidak boleh kosong')
      return
    }

    if (formMode === 'add') {
      try {
        const mains = await getMainCategoriesByType(parentType)
        if (mains.some((m) => m.NAME.toLowerCase() === trimmed.toLowerCase())) {
          setConfirmPromote(false)
          setError('Nama kategori sudah digunakan')
          return
        }
        const maxOrder = await getMaxOrderSeq(parentType, 0)
        await createCategory({
          uid: `cat_${Date.now()}`,
          C_IS_DEL: 0,
          C_UTIME: Date.now(),
          NAME: trimmed,
          ORDERSEQ: maxOrder + 1,
          TYPE: parentType,
          STATUS: 0,
          pUid: null,
          IS_DEFAULT: 0,
          isSynced: 0,
          syncTime: 0,
          syncVersion: 1,
        })
      } catch {
        setConfirmPromote(false)
        setError('Gagal menyimpan kategori. Coba lagi.')
        return
      }
    } else if (editingId !== null) {
      await promoteSubToMain(editingId, parentType)
    }

    setConfirmPromote(false)
    closeForm()
    await loadData()
    onChanged()
  }

  const requestPromote = () => {
    if (!name.trim()) {
      setError('Nama kategori tidak boleh kosong')
      return
    }
    setConfirmPromote(true)
  }

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= subs.length) return
    const next = [...subs]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    setSubs(next)
    await reorderCategories(next.map((s) => s.id!))
    await loadData()
  }

  const selectedCount = selectedIds.size

  return (
    <div className="flex flex-1 flex-col" data-testid="sub-category-manager">
      <header className="sticky top-0 z-30 bg-background/80 px-4 pt-[calc(0.875rem+env(safe-area-inset-top))] pb-4 backdrop-blur-xl md:px-10 md:pt-6 md:pb-8">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Kembali ke daftar kategori"
            onClick={onClose}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Sub kategori
            </p>
            <h1 className="truncate text-lg font-bold tracking-tight">{parent.NAME}</h1>
          </div>
          <Button aria-label="Tambah sub kategori" onClick={openAdd}>
            <Plus className="size-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col px-4 md:px-10">
        {selectedCount > 0 && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive">
            <span className="text-sm font-medium">{selectedCount} sub dipilih</span>
            <Button
              variant="destructive"
              size="sm"
              aria-label="Hapus sub terpilih"
              onClick={() => setConfirmDelete(true)}
            >
              Hapus
            </Button>
          </div>
        )}

        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Memuat…</p>
        ) : subs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex size-16 items-center justify-center rounded-full bg-secondary/40">
              <AlertCircle className="size-8 text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold">Belum ada sub kategori</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tambah sub kategori untuk {parent.NAME} dengan tombol di atas.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {subs.map((sub, index) => {
              const isSelected = selectedIds.has(sub.id!)
              return (
                <div
                  key={sub.uid}
                  data-testid={`sub-row-${sub.NAME}`}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border p-2 pl-3 transition-colors',
                    isSelected
                      ? 'border-primary/50 bg-accent text-accent-foreground'
                      : 'bg-card hover:bg-secondary',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(sub.id!)}
                    aria-label={`Pilih sub kategori ${sub.NAME}`}
                    className="size-4 shrink-0 rounded text-primary ring-offset-background focus:ring-primary"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">{sub.NAME}</span>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Naikkan ${sub.NAME}`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      className="text-muted-foreground"
                    >
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Turunkan ${sub.NAME}`}
                      disabled={index === subs.length - 1}
                      onClick={() => move(index, 1)}
                      className="text-muted-foreground"
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Ubah sub kategori ${sub.NAME}`}
                      onClick={() => openEdit(sub)}
                    >
                      <Pencil className="size-4" />
                    </Button>
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
            aria-labelledby="sub-form-title"
            className="relative w-full max-w-md rounded-2xl border bg-card p-5 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 id="sub-form-title" className="text-lg font-bold">
                {formMode === 'add' ? 'Sub kategori' : 'Edit sub kategori'}
              </h2>
              <Button
                variant="outline"
                size="sm"
                aria-label="Jadikan kategori utama"
                onClick={requestPromote}
              >
                <CornerUpRight className="size-3.5" />
                Kategori utama
              </Button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSave()
              }}
              className="space-y-3"
            >
              <div>
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  Kategori
                </span>
                <button
                  type="button"
                  aria-label="Kategori induk"
                  aria-haspopup="dialog"
                  onClick={() => setPickerOpen(true)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2.5 text-left text-sm hover:bg-secondary"
                >
                  <span className="truncate">{activeParentName}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </div>
              <div>
                <label
                  htmlFor="sub-name-input"
                  className="mb-1 block text-xs font-medium text-muted-foreground"
                >
                  Nama sub kategori
                </label>
                <input
                  id="sub-name-input"
                  type="text"
                  value={name}
                  autoFocus
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? 'sub-form-error' : undefined}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Mis. Lunch, Dinner"
                />
              </div>
              {error && (
                <div
                  id="sub-form-error"
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
                <Button type="submit" aria-label="Simpan sub kategori">
                  <Check className="size-4" />
                  Menyimpan
                </Button>
              </div>
            </form>

            {pickerOpen && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/40 p-4 backdrop-blur-[2px] transition-all animate-in fade-in duration-150">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="sub-parent-picker-title"
                  className="w-full max-w-sm rounded-2xl border bg-card p-4 shadow-xl"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 id="sub-parent-picker-title" className="text-base font-bold">
                      Kategori
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Tutup daftar kategori"
                      onClick={() => setPickerOpen(false)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                  <div
                    className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto"
                    data-testid="sub-parent-picker"
                  >
                    {mainCategories.map((option) => {
                      const current = activeParentUid === option.uid
                      return (
                        <button
                          key={option.uid}
                          type="button"
                          aria-label={`Pilih kategori ${option.NAME}`}
                          aria-pressed={current}
                          onClick={() => {
                            setTargetParentUid(option.uid === parent.uid ? null : option.uid)
                            setPickerOpen(false)
                          }}
                          className={cn(
                            'flex items-center justify-between gap-1 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                            current
                              ? 'border-primary bg-accent text-accent-foreground'
                              : 'bg-card hover:bg-secondary',
                          )}
                        >
                          <span className="truncate">{option.NAME}</span>
                          {current && <Check className="size-4 shrink-0 text-primary" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Hapus sub kategori?"
        description={`${selectedCount} sub kategori akan dihapus dari ${parent.NAME}. Anda dapat menambahkannya kembali nanti.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <ConfirmDialog
        open={confirmPromote}
        title="Jadikan kategori utama?"
        description="Sub kategori akan diubah ke kategori utama. Apakah anda yakin untuk mengubahnya?"
        confirmLabel="Ya"
        cancelLabel="Tidak"
        destructive={false}
        onConfirm={handlePromote}
        onCancel={() => setConfirmPromote(false)}
      />
    </div>
  )
}
