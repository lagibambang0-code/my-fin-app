'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FolderCog,
  ListChecks,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getSettingByKey } from '@/lib/db'

const ITEMS = [
  {
    label: 'Grup aset',
    href: '/lainnya/kelola-aset/grup',
    icon: FolderCog,
    testId: 'aset-menu-grup',
  },
  {
    label: 'Pengaturan aset',
    href: '/lainnya/kelola-aset/aset',
    icon: ListChecks,
    testId: 'aset-menu-aset',
  },
  {
    label: 'Grup aset yang dihapus',
    href: '/lainnya/kelola-aset/grup-dihapus',
    icon: RotateCcw,
    testId: 'aset-menu-grup-dihapus',
  },
  {
    label: 'Aset yang dihapus',
    href: '/lainnya/kelola-aset/aset-dihapus',
    icon: Trash2,
    testId: 'aset-menu-aset-dihapus',
  },
  {
    label: 'Pengaturan pengeluaran transfer',
    href: '/lainnya/kelola-aset/pengeluaran-transfer',
    icon: ArrowLeftRight,
    testId: 'aset-menu-transfer',
  },
] as const

export function AssetSettingsScreen() {
  const router = useRouter()
  const [cardTiming, setCardTiming] = useState('Lump sum')

  useEffect(() => {
    ;(async () => {
      const setting = await getSettingByKey('card_accounting_type')
      setCardTiming(setting?.ZDATA === '1' ? 'Waktu penggunaan' : 'Lump sum')
    })()
  }, [])

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
              Lainnya
            </p>
            <h1 className="truncate text-lg font-bold tracking-tight">Kelola aset</h1>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col px-4 md:px-10">
        <div className="space-y-1">
          {ITEMS.map((item) => (
            <button
              key={item.href}
              type="button"
              data-testid={item.testId}
              onClick={() => router.push(item.href)}
              className="flex w-full items-center justify-between gap-2 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <item.icon className="size-4" aria-hidden="true" />
                </span>
                <span className="truncate text-sm">{item.label}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          ))}

          <button
            type="button"
            data-testid="aset-menu-card-timing"
            onClick={() => router.push('/lainnya/kelola-aset/cara-catat-kartu')}
            className="flex w-full items-center justify-between gap-2 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <CreditCard className="size-4" aria-hidden="true" />
              </span>
              <span className="truncate text-sm">Cara catat pengeluaran kartu</span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span
                className="text-xs text-muted-foreground"
                data-testid="aset-menu-card-timing-value"
              >
                {cardTiming}
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
