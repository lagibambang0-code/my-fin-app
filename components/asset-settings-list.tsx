'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, MoreVertical, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Overlay } from '@/components/ui/overlay'
import { AssetForm } from '@/components/asset-form'
import { AssetReorderScreen } from '@/components/asset-reorder-screen'
import { AssetVisibilityScreen } from '@/components/asset-visibility-screen'
import {
  type Asset,
  type AssetGroup,
  type Currency,
  getAllAssets,
  getAssetBalances,
  getAssetGroups,
  getCurrencyByUid,
  getMainCurrency,
} from '@/lib/db'
import { formatCurrency } from '@/lib/format'

/** "Pengaturan aset" — assets grouped per group, tap to edit (PRD-08 §3.2.7). */
export function AssetSettingsList() {
  const router = useRouter()
  const [groups, setGroups] = useState<AssetGroup[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [mainCurrency, setMainCurrency] = useState<Currency | null>(null)
  const [currencyMap, setCurrencyMap] = useState<Record<string, Currency>>({})
  const [balances, setBalances] = useState<Map<string, number>>(new Map())
  const [menuOpen, setMenuOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Asset | null>(null)
  const [formGroupUid, setFormGroupUid] = useState<string | null>(null)
  const [reorderOpen, setReorderOpen] = useState(false)
  const [visibilityOpen, setVisibilityOpen] = useState(false)

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
    load()
  }, [load])

  const openAdd = (groupUid?: string) => {
    setEditing(null)
    setFormGroupUid(groupUid ?? null)
    setMenuOpen(false)
    setFormOpen(true)
  }

  const openEdit = (asset: Asset) => {
    setEditing(asset)
    setFormGroupUid(null)
    setFormOpen(true)
  }

  const groupsWithAssets = groups.filter((g) => assets.some((a) => a.groupUid === g.uid))

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
              Kelola aset
            </p>
            <h1 className="truncate text-lg font-bold tracking-tight">Pengaturan aset</h1>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Menu lainnya"
            data-testid="asset-settings-menu"
            onClick={() => setMenuOpen(true)}
          >
            <MoreVertical className="size-4" />
          </Button>
          <Button aria-label="Tambah aset" data-testid="asset-settings-add" onClick={() => openAdd()}>
            <Plus className="size-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col px-4 md:px-10">
        {groupsWithAssets.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground" data-testid="asset-settings-empty">
            Tidak ada data
          </p>
        ) : (
          groupsWithAssets.map((group) => (
            <section key={group.uid} className="mb-4">
              <h2 className="mb-1 px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {group.ACC_GROUP_NAME}
              </h2>
              <div className="overflow-hidden rounded-xl border bg-card">
                {assets
                  .filter((a) => a.groupUid === group.uid)
                  .map((asset) => (
                    <button
                      key={asset.uid}
                      type="button"
                      data-testid={`settings-asset-${asset.NIC_NAME}`}
                      onClick={() => openEdit(asset)}
                      className="flex w-full items-center gap-2 border-t px-3 py-3 text-left transition-colors first:border-t-0 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm">{asset.NIC_NAME}</span>
                      <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                        {formatCurrency(
                          balances.get(asset.uid) ?? asset.BALANCE ?? 0,
                          currencyMap[asset.currencyUid] ?? mainCurrency,
                        )}
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
              </div>
            </section>
          ))
        )}
      </div>

      <Overlay
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        align="bottom"
        label="Menu pengaturan aset"
        testId="asset-settings-menu-sheet"
      >
        <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-xl">
          <button
            type="button"
            data-testid="asset-settings-menu-add"
            onClick={() => openAdd()}
            className="flex w-full items-center gap-3 border-b px-4 py-3.5 text-left text-sm hover:bg-secondary"
          >
            <Plus className="size-4" />
            Tambah aset
          </button>
          <button
            type="button"
            data-testid="asset-settings-menu-visibility"
            onClick={() => {
              setMenuOpen(false)
              setVisibilityOpen(true)
            }}
            className="flex w-full items-center gap-3 border-b px-4 py-3.5 text-left text-sm hover:bg-secondary"
          >
            <MoreVertical className="size-4" />
            Tampilkan / Sembunyikan
          </button>
          <button
            type="button"
            data-testid="asset-settings-menu-reorder"
            onClick={() => {
              setMenuOpen(false)
              setReorderOpen(true)
            }}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm hover:bg-secondary"
          >
            <MoreVertical className="size-4" />
            Ubah urutan
          </button>
        </div>
      </Overlay>

      {formOpen && (
        <AssetForm
          open
          asset={editing}
          groups={groups}
          initialGroupUid={formGroupUid}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false)
            load()
          }}
        />
      )}

      <AssetReorderScreen
        open={reorderOpen}
        onClose={() => setReorderOpen(false)}
        onChanged={load}
      />

      <AssetVisibilityScreen
        open={visibilityOpen}
        onClose={() => setVisibilityOpen(false)}
        onChanged={load}
        onEdit={(asset) => {
          setVisibilityOpen(false)
          openEdit(asset)
        }}
      />
    </div>
  )
}
