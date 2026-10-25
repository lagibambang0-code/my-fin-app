'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useTranslation } from '@/components/language-provider'
import { getAllAssets, getAssetGroups, updateAsset, type Asset, type AssetGroup } from '@/lib/db'

/** Group types considered "hard to liquidate" (PRD-08 §3.2.9). */
const ILLIQUID_TYPES = new Set([4, 5, 8, 10])

export function TransferSettings() {
  const router = useRouter()
  const { t } = useTranslation()
  const [groups, setGroups] = useState<AssetGroup[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const load = useCallback(async () => {
    setGroups(await getAssetGroups())
    setAssets(await getAllAssets())
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function toggle(asset: Asset) {
    const next = asset.IS_TRANS_EXPENSE === 1 ? 0 : 1
    // Update locally first so the switch reacts immediately.
    setAssets((prev) =>
      prev.map((a) => (a.id === asset.id ? { ...a, IS_TRANS_EXPENSE: next } : a)),
    )
    await updateAsset(asset.id!, { IS_TRANS_EXPENSE: next })
  }

  const eligible = groups.filter((g) => ILLIQUID_TYPES.has(g.TYPE))
  const eligibleAssets = eligible.flatMap((g) => assets.filter((a) => a.groupUid === g.uid))

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 bg-background/80 px-4 pt-[calc(0.875rem+env(safe-area-inset-top))] pb-4 backdrop-blur-xl md:px-10 md:pt-6 md:pb-8">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Kembali"
            onClick={() => router.back()}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              {t.settings.manageAsset}
            </p>
            <h1 className="truncate text-lg font-bold tracking-tight">
              {t.asset.transferExpense}
            </h1>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col px-4 md:px-10">
        <p className="mb-4 text-xs text-muted-foreground">
          {t.asset.transferExpenseDesc}
        </p>

        {eligibleAssets.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground" data-testid="transfer-empty">
            {t.common.noData}
          </p>
        ) : (
          eligible.map((group) => {
            const rows = assets.filter((a) => a.groupUid === group.uid)
            if (rows.length === 0) return null
            return (
              <section key={group.uid} className="mb-4">
                <h2 className="mb-1 px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {group.ACC_GROUP_NAME}
                </h2>
                <ul className="space-y-1">
                  {rows.map((asset) => (
                    <li
                      key={asset.uid}
                      className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3"
                    >
                      <span className="min-w-0 truncate text-sm">{asset.NIC_NAME}</span>
                      <Switch
                        checked={asset.IS_TRANS_EXPENSE === 1}
                        onChange={() => toggle(asset)}
                        label={`Pengaruhi beban ${asset.NIC_NAME}`}
                        testId={`transfer-toggle-${asset.NIC_NAME}`}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )
          })
        )}
      </div>
    </div>
  )
}
