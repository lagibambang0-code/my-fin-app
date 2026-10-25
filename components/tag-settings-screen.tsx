'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronLeft, ChevronUp, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useTranslation } from '@/components/language-provider'
import { cn } from '@/lib/utils'
import {
  type Tag,
  createTag,
  getTags,
  initDB,
  reorderTags,
  softDeleteTag,
  updateTag,
} from '@/lib/db'

/**
 * "Kelola tag" — CRUD + urutan untuk tabel TAG (dipakai form transaksi lewat
 * TX_TAG). Tidak ada halaman ini di PRD-07 §2.1; ditambahkan sebagai pelengkap
 * modul Tag karena PRD-11 menyebut TX_TAG sebagai tabel terkait transaksi.
 */
export function TagSettingsScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const [tags, setTags] = useState<Tag[]>([])
  const [loaded, setLoaded] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [renamingUid, setRenamingUid] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Tag | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const touchDragIndex = useRef<number | null>(null)
  const load = useCallback(async () => {
    await initDB()
    setTags(await getTags())
    setLoaded(true)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const duplicate = (value: string, exceptUid?: string) =>
    tags.some(
      (tag) => tag.uid !== exceptUid && tag.name.trim().toLowerCase() === value.trim().toLowerCase(),
    )

  const add = async () => {
    const value = name.trim()
    if (!value) return
    if (duplicate(value)) {
      setError(`Tag "${value}" sudah ada.`)
      return
    }
    setError(null)
    await createTag(value)
    setName('')
    await load()
  }

  const rename = async (tag: Tag) => {
    const value = renameValue.trim()
    if (!value) return
    if (duplicate(value, tag.uid)) {
      setError(`Tag "${value}" sudah ada.`)
      return
    }
    setError(null)
    await updateTag(tag.uid, value)
    setRenamingUid(null)
    await load()
  }

  const move = async (index: number, delta: number) => {
    const next = [...tags]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setTags(next)
    await reorderTags(next.map((tag) => tag.uid))
    await load()
  }

  const handleDrop = async (fromIndex: number, targetIndex: number) => {
    if (
      fromIndex === targetIndex ||
      fromIndex < 0 ||
      targetIndex < 0 ||
      fromIndex >= tags.length ||
      targetIndex >= tags.length
    ) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }
    const next = [...tags]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(targetIndex, 0, moved)
    setDragIndex(null)
    setDragOverIndex(null)
    setTags(next)
    await reorderTags(next.map((tag) => tag.uid))
    await load()
  }
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 bg-background/80 px-4 pt-[calc(0.875rem+env(safe-area-inset-top))] pb-4 backdrop-blur-xl md:px-10 md:pt-6 md:pb-8">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Kembali"
            data-testid="tag-back"
            onClick={() => router.back()}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              {t.nav.more}
            </p>
            <h1 className="truncate text-lg font-bold tracking-tight">{t.tag.title}</h1>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-3 px-4 md:px-10" data-testid="tag-list">
        <div className="flex items-center gap-2">
          <input
            id="tag-new-input"
            type="text"
            data-testid="tag-new-input"
            value={name}
            placeholder={t.tag.placeholder}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void add()
            }}
            className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm transition-all focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button
            type="button"
            aria-label="Tambah tag"
            data-testid="tag-add"
            disabled={name.trim() === ''}
            onClick={() => void add()}
          >
            <Plus className="size-4" />
            {t.common.add}
          </Button>
        </div>

        {error && (
          <p
            role="alert"
            data-testid="tag-error"
            className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        {loaded && tags.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground" data-testid="tag-empty">
            {t.common.noData}
          </p>
        ) : (
          <div className="space-y-1">
            {tags.map((tag, index) => (
              <div
                key={tag.uid}
                data-testid={`tag-row-${tag.uid}`}
                data-tag-index={index}
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
                  'flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-2 shadow-xs transition-all',
                  dragIndex === index && 'opacity-40 scale-[0.98] border-dashed border-primary',
                  dragOverIndex === index &&
                    dragIndex !== index &&
                    'border-primary ring-2 ring-primary/30 bg-primary/5',
                )}
              >
                {renamingUid === tag.uid ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      ref={(el) => {
                        if (el) {
                          el.focus()
                          const len = el.value.length
                          el.setSelectionRange(len, len)
                        }
                      }}
                      autoFocus
                      type="text"
                      data-testid={`tag-rename-input-${tag.uid}`}
                      value={renameValue}
                      onChange={(e) => {
                        setRenameValue(e.target.value)
                        setError(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void rename(tag)
                      }}
                      className="min-w-0 flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <Button
                      type="button"
                      size="sm"
                      data-testid={`tag-rename-save-${tag.uid}`}
                      onClick={() => void rename(tag)}
                    >
                      Simpan
                    </Button>
                  </div>
                ) : (
                  <>
                    <span
                      data-testid={`tag-name-${tag.uid}`}
                      className="min-w-0 flex-1 truncate px-1 text-sm"
                    >
                      {tag.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Naikkan"
                      data-testid={`tag-up-${tag.uid}`}
                      disabled={index === 0}
                      onClick={() => void move(index, -1)}
                      className="sr-only"
                    >
                      <ChevronUp className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Turunkan"
                      data-testid={`tag-down-${tag.uid}`}
                      disabled={index === tags.length - 1}
                      onClick={() => void move(index, 1)}
                      className="sr-only"
                    >
                      <ChevronDown className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Ubah nama tag"
                      data-testid={`tag-edit-${tag.uid}`}
                      onClick={() => {
                        setRenamingUid(tag.uid)
                        setRenameValue(tag.name)
                        setError(null)
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Hapus tag"
                      data-testid={`tag-delete-${tag.uid}`}
                      onClick={() => setPendingDelete(tag)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                    <span
                      draggable
                      data-testid={`tag-drag-${tag.uid}`}
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
                        const row = target?.closest('[data-tag-index]')
                        if (row) {
                          const targetIdx = Number(row.getAttribute('data-tag-index'))
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
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t.tag.deleteConfirmTitle}
        description={t.tag.deleteConfirmDesc}
        confirmLabel={t.common.confirm}
        cancelLabel={t.common.refuse}
        onConfirm={async () => {
          const tag = pendingDelete
          setPendingDelete(null)
          if (tag) await softDeleteTag(tag.uid)
          await load()
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
