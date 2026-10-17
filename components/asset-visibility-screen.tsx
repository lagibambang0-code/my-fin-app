'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { FullScreenSheet } from '@/components/ui/overlay'
import { type Asset, type AssetGroup, type Currency, getAllAssets, getAssetBalances, getAssetGroups, getCurrencyByUid, getMainCurrency, updateAsset } from '@/lib/db'
import { formatCurrency } from '@/lib/format'

type VisibilityScreenProps = {
  open: boolean
  onClose: () => void
  onChanged: () => void
  onEdit: (asset: Asset) => void
}

/** "Pengaturan Tampil/Sembunyi" — toggle which assets show in the Aset tab. */
export function AssetVisibilityScreen({
  open,
  onClose,
  onChanged,
  onEdit,
}: VisibilityScreenProps) {
  const [groups, setGroups] = useState<AssetGroup[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [mainCurrency, setMainCurrency] = useState<Currency | null>(null)
  const [currencyMap, setCurrencyMap] = useState<Record<string, Currency>>({})
  const [balances, setBalances] = useState<Map<string, number>>(new Map())

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
    if (open) load()
  }, [open, load])

  async function toggle(asset: Asset) {
    const next = asset.IS_SHOW === 1 ? 0 : 1
    // Optimistic: flip the switch instantly, then persist.
    setAssets((prev) => prev.map((a) => (a.id === asset.id ? { ...a, IS_SHOW: next } : a)))
    await updateAsset(asset.id!, { IS_SHOW: next })
    onChanged()
  }

  return (
    <FullScreenSheet open={open} testId="asset-visibility">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/80 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl">
        <Button variant="ghost" size="icon-sm" aria-label="Kembali" onClick={onClose}>
          <ChevronLeft className="size-5" />
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight">
          Pengaturan Tampil/Sembunyi
        </h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-lg px-4 py-4">
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
                    const currency = currencyMap[asset.currencyUid] ?? mainCurrency
                    return (
                      <li
                        key={asset.uid}
                        data-testid={`visibility-row-${asset.NIC_NAME}`}
                        className="flex items-center gap-3 rounded-xl border bg-card p-2 pl-3"
                      >
                        <button
                          type="button"
                          onClick={() => onEdit(asset)}
                          className="min-w-0 flex-1 text-left focus-visible:outline-none"
                        >
                          <span className="block truncate text-sm">{asset.NIC_NAME}</span>
                          <span className="block text-xs text-muted-foreground tabular-nums">
                            {formatCurrency(balances.get(asset.uid) ?? asset.BALANCE ?? 0, currency)}
                          </span>
                        </button>
                        <span className="flex shrink-0 items-center gap-2">
                          <span
                            aria-hidden="true"
                            className="text-muted-foreground"
                            title={asset.IS_SHOW === 1 ? 'Tampil' : 'Sembunyi'}
                          >
                            {asset.IS_SHOW === 1 ? (
                              <Eye className="size-4" />
                            ) : (
                              <EyeOff className="size-4" />
                            )}
                          </span>
                          <Switch
                            checked={asset.IS_SHOW === 1}
                            onChange={() => toggle(asset)}
                            label={`Tampilkan ${asset.NIC_NAME}`}
                            testId={`visibility-toggle-${asset.NIC_NAME}`}
                          />
                        </span>
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
