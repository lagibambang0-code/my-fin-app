'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronLeft, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
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
  const [tags, setTags] = useState<Tag[]>([])
  const [loaded, setLoaded] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [renamingUid, setRenamingUid] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Tag | null>(null)

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
              Lainnya
            </p>
            <h1 className="truncate text-lg font-bold tracking-tight">Kelola tag</h1>
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
            placeholder="Nama tag baru"
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void add()
            }}
            className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button
            type="button"
            aria-label="Tambah tag"
            data-testid="tag-add"
            disabled={name.trim() === ''}
            onClick={() => void add()}
          >
            <Plus className="size-4" />
            Tambah
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
            Tidak ada data
          </p>
        ) : (
          <div className="space-y-1">
            {tags.map((tag, index) => (
              <div
                key={tag.uid}
                data-testid={`tag-row-${tag.uid}`}
                className="flex items-center gap-1 rounded-xl border bg-card px-3 py-1.5"
              >
                {renamingUid === tag.uid ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
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
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Hapus tag?"
        description="Apakah anda yakin ingin menghapusnya? Tag akan dilepas dari semua transaksi."
        confirmLabel="YA"
        cancelLabel="TIDAK"
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
