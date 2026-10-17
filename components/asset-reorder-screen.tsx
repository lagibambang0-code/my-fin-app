'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FullScreenSheet } from '@/components/ui/overlay'
import {
  type Asset,
  type AssetGroup,
  getAllAssets,
  getAssetGroups,
  reorderAssets,
} from '@/lib/db'

type ReorderScreenProps = {
  open: boolean
  onClose: () => void
  onChanged: () => void
}

type Bucket = { group: AssetGroup; items: Asset[] }

/** "Ubah urutan" — drag handle plus up/down buttons (WCAG alternative). */
export function AssetReorderScreen({ open, onClose, onChanged }: ReorderScreenProps) {
  const [buckets, setBuckets] = useState<Bucket[]>([])
  const [drag, setDrag] = useState<{ group: string; index: number } | null>(null)

  const load = useCallback(async () => {
    const [groups, assets] = await Promise.all([getAssetGroups(), getAllAssets()])
    setBuckets(
      groups
        .map((group) => ({ group, items: assets.filter((a) => a.groupUid === group.uid) }))
        .filter((b) => b.items.length > 0),
    )
  }, [])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  const persist = useCallback(
    async (next: Bucket[]) => {
      setBuckets(next)
      await reorderAssets(next.flatMap((b) => b.items.map((a) => a.id!)))
      onChanged()
    },
    [onChanged],
  )

  async function move(groupUid: string, index: number, direction: -1 | 1) {
    const next = buckets.map((b) => ({ ...b, items: [...b.items] }))
    const bucket = next.find((b) => b.group.uid === groupUid)
    if (!bucket) return
    const target = index + direction
    if (target < 0 || target >= bucket.items.length) return
    const [moved] = bucket.items.splice(index, 1)
    bucket.items.splice(target, 0, moved)
    await persist(next)
  }

  async function dropOn(groupUid: string, index: number) {
    if (!drag || drag.group !== groupUid || drag.index === index) {
      setDrag(null)
      return
    }
    const next = buckets.map((b) => ({ ...b, items: [...b.items] }))
    const bucket = next.find((b) => b.group.uid === groupUid)
    if (!bucket) return
    const [moved] = bucket.items.splice(drag.index, 1)
    bucket.items.splice(index, 0, moved)
    setDrag(null)
    await persist(next)
  }

  return (
    <FullScreenSheet open={open} testId="asset-reorder">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/80 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl">
        <Button variant="ghost" size="icon-sm" aria-label="Kembali" onClick={onClose}>
          <ChevronLeft className="size-5" />
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight">
          Ubah urutan aset
        </h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-lg px-4 py-4">
          {buckets.map(({ group, items }) => (
            <section key={group.uid} className="mb-4">
              <h2 className="mb-1 px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {group.ACC_GROUP_NAME}
              </h2>
              <ul className="space-y-1">
                {items.map((asset, index) => (
                  <li
                    key={asset.uid}
                    data-testid={`reorder-row-${asset.NIC_NAME}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => dropOn(group.uid, index)}
                    className="flex items-center gap-2 rounded-xl border bg-card p-2 pl-3"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">{asset.NIC_NAME}</span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Naikkan ${asset.NIC_NAME}`}
                      disabled={index === 0}
                      onClick={() => move(group.uid, index, -1)}
                      className="text-muted-foreground"
                    >
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Turunkan ${asset.NIC_NAME}`}
                      disabled={index === items.length - 1}
                      onClick={() => move(group.uid, index, 1)}
                      className="text-muted-foreground"
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>
                    <span
                      draggable
                      onDragStart={() => setDrag({ group: group.uid, index })}
                      aria-hidden="true"
                      className="cursor-grab p-1 text-muted-foreground active:cursor-grabbing"
                    >
                      <GripVertical className="size-4" />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {buckets.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">Tidak ada data</p>
          )}
        </div>
      </div>
    </FullScreenSheet>
  )
}
