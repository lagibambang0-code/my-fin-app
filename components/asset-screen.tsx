'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowUpDown,
  BarChart3,
  ChevronRight,
  Eye,
  EyeOff,
  MoreVertical,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react'
import { useTranslation } from '@/components/language-provider'
import { Button } from '@/components/ui/button'
import { Overlay } from '@/components/ui/overlay'
import { AssetForm } from '@/components/asset-form'
import { AssetDetail } from '@/components/asset-detail'
import { AssetVisibilityScreen } from '@/components/asset-visibility-screen'
import { AssetDeleteScreen } from '@/components/asset-delete-screen'
import { AssetReorderScreen } from '@/components/asset-reorder-screen'
import { cn } from '@/lib/utils'
import {
  type Asset,
  type AssetGroup,
  type AssetSummary,
  type Currency,
  getAllAssets,
  getAssetBalances,
  getAssetGroups,
  getAssetSummary,
  getCurrencyByUid,
  getMainCurrency,
  initDB,
  softDeleteAsset,
} from '@/lib/db'
import { computeCardCycles, isCardGroup } from '@/lib/asset-utils'
import { formatCurrency, formatDayMonth } from '@/lib/format'

const GROUP_NAMES_EN_TO_ID: Record<string, string> = {
  Cash: 'Tunai',
  Accounts: 'Bank',
  Card: 'Kartu',
  'Debit Card': 'Kartu debit',
  Savings: 'Tabungan',
  'Top-Up/Prepaid': 'Top-up / Prabayar',
  Investments: 'Investasi',
  Overdrafts: 'Cerukan',
  Loan: 'Pinjaman',
  Insurance: 'Asuransi',
  Others: 'Lainnya',
}

const GROUP_NAMES_ID_TO_EN: Record<string, string> = {
  Tunai: 'Cash',
  Bank: 'Accounts',
  Kartu: 'Card',
  'Kartu debit': 'Debit Card',
  Tabungan: 'Savings',
  'Top-up / Prabayar': 'Top-Up/Prepaid',
  Investasi: 'Investments',
  Cerukan: 'Overdrafts',
  Pinjaman: 'Loan',
  Asuransi: 'Insurance',
  Lainnya: 'Others',
}

export function AssetScreen() {
  const router = useRouter()
  const { t, language } = useTranslation()
  const [groups, setGroups] = useState<AssetGroup[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [summary, setSummary] = useState<AssetSummary>({
    assets: 0,
    liabilities: 0,
    total: 0,
  })
  const [mainCurrency, setMainCurrency] = useState<Currency | null>(null)
  const [currencyMap, setCurrencyMap] = useState<Record<string, Currency>>({})
  const [balances, setBalances] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)

  const [menuOpen, setMenuOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Asset | null>(null)
  const [formGroupUid, setFormGroupUid] = useState<string | null>(null)
  const [visibilityOpen, setVisibilityOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [reorderOpen, setReorderOpen] = useState(false)
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null)

  const load = useCallback(async () => {
    await initDB()
    const [g, a, s, main, balanceMap] = await Promise.all([
      getAssetGroups(),
      getAllAssets(),
      getAssetSummary(),
      getMainCurrency(),
      getAssetBalances(),
    ])
    setGroups(g)
    setAssets(a)
    setSummary(s)
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
    setLoading(false)
  }, [])

  useEffect(() => {
    load()

    const onCurrencyChanged = (e: Event) => {
      const cur = (e as CustomEvent<Currency>).detail
      if (cur) setMainCurrency(cur)
      void load()
    }
    window.addEventListener('dompetku:currency-changed', onCurrencyChanged)
    return () => window.removeEventListener('dompetku:currency-changed', onCurrencyChanged)
  }, [load])

  const currencyFor = (asset: Asset) => currencyMap[asset.currencyUid] ?? mainCurrency
  const balanceFor = (asset: Asset) => balances.get(asset.uid) ?? asset.BALANCE ?? 0

  const openAdd = () => {
    setEditing(null)
    setFormGroupUid(null)
    setMenuOpen(false)
    setFormOpen(true)
  }

  const openEdit = (asset: Asset) => {
    setEditing(asset)
    setFormGroupUid(null)
    setMenuOpen(false)
    setFormOpen(true)
  }

  const visibleByGroup = (groupUid: string) =>
    assets.filter((a) => a.groupUid === groupUid && a.IS_SHOW === 1)

  const visibleGroups = groups.filter((group) =>
    assets.some((a) => a.groupUid === group.uid),
  )

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 bg-background/80 px-4 pt-[calc(0.875rem+env(safe-area-inset-top))] pb-4 backdrop-blur-xl md:px-10 md:pt-6 md:pb-8">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground md:text-sm">
              {t.asset.subtitle}
            </p>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">{t.asset.title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Total statistik"
              data-testid="asset-stats-button"
              onClick={() => router.push('/accounts/stats')}
            >
              <BarChart3 className="size-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Menu aset"
              data-testid="asset-edit-button"
              onClick={() => setMenuOpen(true)}
            >
              <MoreVertical className="size-4.5" />
            </Button>
          </div>
        </div>
      </header>

      <section className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-4 px-4 md:px-10">
        {/* Ringkasan saldo */}
        <dl
          className="grid grid-cols-3 gap-2 rounded-2xl border bg-card p-4"
          data-testid="asset-summary"
        >
          <SummaryItem
            label={t.asset.assets}
            value={formatCurrency(summary.assets, mainCurrency)}
            testId="asset-summary-assets"
          />
          <SummaryItem
            label={t.asset.liabilities}
            value={formatCurrency(summary.liabilities, mainCurrency)}
            testId="asset-summary-liabilities"
          />
          <SummaryItem
            label={t.asset.total}
            value={formatCurrency(summary.total, mainCurrency)}
            testId="asset-summary-total"
            emphasis
          />
        </dl>

        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Memuat…</p>
        ) : visibleGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex size-16 items-center justify-center rounded-full bg-secondary/40">
              <Wallet className="size-7 text-primary" />
            </div>
            <h2 className="text-base font-semibold">{t.asset.emptyAccounts}</h2>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              {t.asset.emptyAccountsHint}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleGroups.map((group) => {
              const groupAssets = visibleByGroup(group.uid)
              const groupTotal = groupAssets.reduce((sum, a) => sum + balanceFor(a), 0)
              const card = isCardGroup(group)
              const cardAsset = assets.find((a) => a.groupUid === group.uid && isCardGroup(group))
              const cycles =
                card && cardAsset
                  ? computeCardCycles(cardAsset.CARD_DAY_FIN, cardAsset.CARD_DAY_PAY)
                  : null
              return (
                <section key={group.uid} data-testid={`asset-group-${group.ACC_GROUP_NAME}`}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 px-1">
                    <h2 className="text-sm font-semibold tracking-wide">
                      {language === 'en'
                        ? (GROUP_NAMES_ID_TO_EN[group.ACC_GROUP_NAME] ?? group.ACC_GROUP_NAME)
                        : (GROUP_NAMES_EN_TO_ID[group.ACC_GROUP_NAME] ?? group.ACC_GROUP_NAME)}
                    </h2>
                    <span
                      className="text-xs font-medium text-muted-foreground tabular-nums"
                      data-testid={`asset-group-total-${group.ACC_GROUP_NAME}`}
                    >
                      {formatCurrency(groupTotal, mainCurrency)}
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-xl border bg-card">
                    {cycles && (
                      <>
                        <CardCycleRow
                          label={t.asset.mustPay}
                          cycle={cycles.payable}
                          currency={currencyFor(cardAsset!)}
                          testId={`card-payable-${group.ACC_GROUP_NAME}`}
                        />
                        <CardCycleRow
                          label={t.asset.willPay}
                          cycle={cycles.upcoming}
                          currency={currencyFor(cardAsset!)}
                          testId={`card-upcoming-${group.ACC_GROUP_NAME}`}
                        />
                      </>
                    )}
                    {groupAssets.map((asset) => (
                      <button
                        key={asset.uid}
                        type="button"
                        data-testid={`asset-row-${asset.NIC_NAME}`}
                        onClick={() => setDetailAsset(asset)}
                        className={cn(
                          'flex w-full items-center gap-2 border-t px-3 py-3 text-left transition-colors first:border-t-0',
                          'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                        )}
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="truncate text-sm">{asset.NIC_NAME}</span>
                          {asset.IS_SHOW === 0 && (
                            <EyeOff
                              aria-label="Disembunyikan"
                              className="size-3.5 shrink-0 text-muted-foreground"
                            />
                          )}
                        </span>
                        <span className="shrink-0 text-sm font-medium tabular-nums">
                          {formatCurrency(balanceFor(asset), currencyFor(asset))}
                        </span>
                        <ChevronRight
                          aria-hidden="true"
                          className="size-4 shrink-0 text-muted-foreground"
                        />
                      </button>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>

      {/* Menu Aset */}
      <Overlay
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        align="bottom"
        label="Menu aset"
        testId="asset-menu"
      >
        <div className="mx-auto flex max-h-[85vh] w-full max-w-full flex-col overflow-hidden rounded-t-[1.75rem] border-t bg-card pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl md:max-w-md md:rounded-2xl md:border md:pb-0">
          <MenuItem
            icon={<Plus className="size-4" />}
            label={t.asset.menuAdd}
            testId="asset-menu-add"
            onClick={openAdd}
          />
          <MenuItem
            icon={<Eye className="size-4" />}
            label={t.asset.menuVisibility}
            testId="asset-menu-visibility"
            onClick={() => {
              setMenuOpen(false)
              setVisibilityOpen(true)
            }}
          />
          <MenuItem
            icon={<Trash2 className="size-4" />}
            label={t.asset.menuDelete}
            testId="asset-menu-delete"
            onClick={() => {
              setMenuOpen(false)
              setDeleteOpen(true)
            }}
          />
          <MenuItem
            icon={<ArrowUpDown className="size-4" />}
            label={t.asset.menuReorder}
            testId="asset-menu-reorder"
            onClick={() => {
              setMenuOpen(false)
              setReorderOpen(true)
            }}
          />
        </div>
      </Overlay>

      {formOpen && (
        <AssetForm
          open
          asset={editing}
          initialBalance={editing ? (balances.get(editing.uid) ?? editing.BALANCE) : 0}
          groups={groups}
          initialGroupUid={formGroupUid}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false)
            setDetailAsset(null)
            load()
          }}
          onDeleted={async () => {
            if (editing?.id) await softDeleteAsset(editing.id)
            setFormOpen(false)
            setDetailAsset(null)
            load()
          }}
        />
      )}

      <AssetDetail
        open={detailAsset !== null}
        asset={detailAsset}
        onClose={() => setDetailAsset(null)}
        onEdit={(asset) => {
          setDetailAsset(null)
          openEdit(asset)
        }}
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

      <AssetDeleteScreen
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onChanged={load}
      />

      <AssetReorderScreen
        open={reorderOpen}
        onClose={() => setReorderOpen(false)}
        onChanged={load}
      />
      </section>
    </div>
  )
}

function SummaryItem({
  label,
  value,
  testId,
  emphasis,
}: {
  label: string
  value: string
  testId: string
  emphasis?: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        data-testid={testId}
        className={cn(
          'mt-1 truncate text-sm font-semibold tabular-nums md:text-base',
          emphasis && 'text-primary',
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function CardCycleRow({
  label,
  cycle,
  currency,
  testId,
}: {
  label: string
  cycle: { start: Date; end: Date; pay: Date }
  currency?: Currency | null
  testId: string
}) {
  return (
    <div
      data-testid={testId}
      className="flex items-center justify-between gap-2 border-b bg-secondary/30 px-3 py-2 text-xs"
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2 tabular-nums">
        <span className="text-muted-foreground">
          {formatDayMonth(cycle.start)} ~ {formatDayMonth(cycle.end)} (Bayar:{' '}
          {formatDayMonth(cycle.pay)})
        </span>
        <span className="font-medium">{formatCurrency(0, currency)}</span>
      </span>
    </div>
  )
}

function MenuItem({
  icon,
  label,
  onClick,
  testId,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  testId: string
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b px-4 py-3.5 text-left text-sm transition-colors last:border-b-0 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </span>
      {label}
    </button>
  )
}
