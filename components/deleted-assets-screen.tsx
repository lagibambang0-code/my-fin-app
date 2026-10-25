'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useTranslation } from '@/components/language-provider'
import { cn } from '@/lib/utils'
import {
  type Asset,
  type AssetGroup,
  countAssetsInGroup,
  getAssetGroups,
  getDeletedAssetGroups,
  getDeletedAssets,
  purgeAsset,
  purgeAssetGroup,
  restoreAsset,
  restoreAssetGroup,
} from '@/lib/db'

type DeletedScreenProps = {
  mode: 'groups' | 'assets'
}

/** Recovery lists for soft-deleted groups and assets (PRD-08 §3.2.8 / §3.2.12). */
export function DeletedAssetsScreen({ mode }: DeletedScreenProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const [groups, setGroups] = useState<AssetGroup[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [pendingRestore, setPendingRestore] = useState<AssetGroup | Asset | null>(null)

  const load = useCallback(async () => {
    const [activeGroups, deletedGroups, deletedAssets] = await Promise.all([
      getAssetGroups(),
      getDeletedAssetGroups(),
      getDeletedAssets(),
    ])
    setGroups(mode === 'groups' ? deletedGroups : activeGroups)
    setAssets(mode === 'assets' ? deletedAssets : [])

    if (mode === 'groups') {
      const next: Record<string, number> = {}
      for (const g of deletedGroups) next[g.uid] = await countAssetsInGroup(g.uid)
      setCounts(next)
    }
  }, [mode])

  useEffect(() => {
    setSelected(new Set())
    load()
  }, [load])

  const rows: (AssetGroup | Asset)[] = mode === 'groups' ? groups : assets
  const isEmpty = rows.length === 0

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function removePermanently(id: number) {
    if (mode === 'groups') await purgeAssetGroup(id)
    else await purgeAsset(id)
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    await load()
  }

  async function confirmRestore() {
    if (!pendingRestore?.id) return
    if (mode === 'groups') await restoreAssetGroup(pendingRestore.id)
    else await restoreAsset(pendingRestore.id)
    setPendingRestore(null)
    await load()
  }

  const groupName = (uid: string) =>
    groups.find((g) => g.uid === uid)?.ACC_GROUP_NAME ?? ''

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 bg-background/80 px-4 pt-[calc(0.875rem+env(safe-area-inset-top))] pb-4 backdrop-blur-xl md:px-10 md:pt-6 md:pb-8">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" aria-label="Kembali" onClick={() => router.back()}>
            <ChevronLeft className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              {t.settings.manageAsset}
            </p>
            <h1 className="truncate text-lg font-bold tracking-tight">
              {mode === 'groups' ? t.asset.deletedGroups : t.asset.deletedAccounts}
            </h1>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col px-4 md:px-10">
        {isEmpty ? (
          <p
            className="py-16 text-center text-sm text-muted-foreground"
            data-testid="deleted-empty"
          >
            {t.common.noData}
          </p>
        ) : (
          <div className="space-y-1" data-testid={`deleted-list-${mode}`}>
            {rows.map((row) => {
              const label =
                'ACC_GROUP_NAME' in row
                  ? `${row.ACC_GROUP_NAME} (${counts[row.uid] ?? 0})`
                  : row.NIC_NAME
              const isSelected = selected.has(row.id!)
              return (
                <div
                  key={row.uid}
                  data-testid={`deleted-row-${label}`}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border p-2 pl-3',
                    isSelected ? 'border-primary/50 bg-accent' : 'bg-card',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(row.id!)}
                    aria-label={`Pilih ${label}`}
                    className="size-4 shrink-0 rounded text-primary focus:ring-primary"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{label}</span>
                    {'NIC_NAME' in row && (
                      <span className="block text-xs text-muted-foreground">
                        {groupName(row.groupUid)}
                      </span>
                    )}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`Pulihkan ${label}`}
                    data-testid={`restore-${label}`}
                    onClick={() => setPendingRestore(row)}
                  >
                    <RotateCcw className="size-3.5" />
                    {t.common.restore}
                  </Button>

                  {isSelected && (
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      aria-label={`Hapus permanen ${label}`}
                      data-testid={`purge-${label}`}
                      onClick={() => removePermanently(row.id!)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pendingRestore !== null}
        title={t.asset.restoreData}
        description={t.asset.restoreDataDesc}
        confirmLabel={t.common.yes}
        cancelLabel={t.common.no}
        destructive={false}
        onConfirm={confirmRestore}
        onCancel={() => setPendingRestore(null)}
      />
    </div>
  )
}
