'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FullScreenSheet } from '@/components/ui/overlay'
import { cn } from '@/lib/utils'
import {
  type Asset,
  type AssetGroup,
  type Currency,
  getAllAssets,
  getAssetBalances,
  getAssetGroups,
  getCurrencyByUid,
  getMainCurrency,
  restoreAsset,
  softDeleteAsset,
} from '@/lib/db'
import { formatCurrency } from '@/lib/format'

type DeleteScreenProps = {
  open: boolean
  onClose: () => void
  onChanged: () => void
}

/**
 * "Hapus" screen from the Aset menu: tap the checkbox on a row to reveal the
 * trash button; tapping it soft-deletes the asset immediately (PRD-08 §3.2.12).
 */
export function AssetDeleteScreen({ open, onClose, onChanged }: DeleteScreenProps) {
  const [groups, setGroups] = useState<AssetGroup[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [mainCurrency, setMainCurrency] = useState<Currency | null>(null)
  const [currencyMap, setCurrencyMap] = useState<Record<string, Currency>>({})
  const [balances, setBalances] = useState<Map<string, number>>(new Map())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [lastDeleted, setLastDeleted] = useState<number[]>([])

  const load = useCallback(async () => {
    const [g, a, main, balanceMap] = await Promise.all([
      getAssetGroups(),
      getAllAssets(),
      getMainCurrency(),
      getAssetBalances(),
    ])
    setGroups(g)
    setAssets(a)
    setMainCurrency(main ?? null)
    setBalances(balanceMap)
    const map: Record<string, Currency> = {}
    for (const asset of a) {
      if (!map[asset.currencyUid]) {
        const cur = await getCurrencyByUid(asset.currencyUid)
        if (cur) map[asset.currencyUid] = cur
      }
    }
    setCurrencyMap(map)
  }, [])

  useEffect(() => {
    if (open) {
      setSelected(new Set())
      setLastDeleted([])
      load()
    }
  }, [open, load])

  function toggle(uid: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid)
      else next.add(uid)
      return next
    })
  }

  async function remove(asset: Asset) {
    await softDeleteAsset(asset.id!)
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(asset.uid)
      return next
    })
    setLastDeleted((prev) => [...prev, asset.id!])
    await load()
    onChanged()
  }

  async function restoreAll() {
    for (const id of lastDeleted) await restoreAsset(id)
    setLastDeleted([])
    await load()
    onChanged()
  }

  return (
    <FullScreenSheet open={open} testId="asset-delete-screen">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/80 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl">
        <Button variant="ghost" size="icon-sm" aria-label="Kembali" onClick={onClose}>
          <ChevronLeft className="size-5" />
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight">Hapus aset</h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-lg px-4 py-4">
          {lastDeleted.length > 0 && (
            <div
              role="status"
              className="mb-3 flex items-center justify-between gap-2 rounded-lg border bg-secondary/50 p-3"
            >
              <span className="text-sm text-muted-foreground">
                {lastDeleted.length} aset dihapus
              </span>
              <Button variant="outline" size="sm" onClick={restoreAll}>
                <RotateCcw className="size-3.5" />
                Pulihkan
              </Button>
            </div>
          )}

          {groups.map((group) => {
            const rows = assets.filter((a) => a.groupUid === group.uid)
            if (rows.length === 0) return null
            return (
              <section key={group.uid} className="mb-4">
                <h2 className="mb-1 px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {group.ACC_GROUP_NAME}
                </h2>
                <ul className="space-y-1">
                  {rows.map((asset) => {
                    const isChecked = selected.has(asset.uid)
                    const currency = currencyMap[asset.currencyUid] ?? mainCurrency
                    return (
                      <li
                        key={asset.uid}
                        data-testid={`delete-row-${asset.NIC_NAME}`}
                        className={cn(
                          'flex items-center gap-3 rounded-xl border p-2 pl-3 transition-colors',
                          isChecked ? 'border-primary/50 bg-accent' : 'bg-card',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggle(asset.uid)}
                          aria-label={`Pilih aset ${asset.NIC_NAME}`}
                          data-testid={`delete-check-${asset.NIC_NAME}`}
                          className="size-4 shrink-0 rounded text-primary focus:ring-primary"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{asset.NIC_NAME}</span>
                          <span className="block text-xs text-muted-foreground tabular-nums">
                            {formatCurrency(balances.get(asset.uid) ?? asset.BALANCE ?? 0, currency)}
                          </span>
                        </span>
                        {isChecked && (
                          <Button
                            variant="destructive"
                            size="icon-sm"
                            aria-label={`Hapus aset ${asset.NIC_NAME}`}
                            data-testid={`delete-trash-${asset.NIC_NAME}`}
                            onClick={() => remove(asset)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
          {assets.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">Tidak ada data</p>
          )}
        </div>
      </div>
    </FullScreenSheet>
  )
}
