import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Ellipsis,
  MessageSquare,
  Palette,
  PiggyBank,
  Repeat,
  Tag,
  Wallet,
  ChevronRight,
  Settings2,
  FileDown,
} from 'lucide-react'
import { TabPage } from '@/components/tab-page'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Lainnya — Dompetku' }

const SETTINGS_SECTIONS = [
  {
    title: 'Kategori / Berulang',
    items: [
      {
        label: 'Kelola kategori pendapatan',
        href: '/lainnya/kategori-pendapatan',
        icon: Wallet,
      },
      {
        label: 'Kelola kategori pengeluaran',
        href: '/lainnya/kategori-pengeluaran',
        icon: Wallet,
      },
      {
        label: 'Pengaturan anggaran',
        href: '/lainnya/anggaran',
        icon: PiggyBank,
      },
      {
        label: 'Kelola berulang',
        href: '/lainnya/berulang',
        icon: Repeat,
      },
      {
        label: 'Kelola tag',
        href: '/lainnya/tag',
        icon: Tag,
      },
    ],
  },
  {
    title: 'Aset',
    items: [
      {
        label: 'Kelola aset',
        href: '/lainnya/kelola-aset',
        icon: Wallet,
      },
    ],
  },
  {
    title: 'Kelola pengaturan',
    items: [
      {
        label: 'Pengaturan umum',
        href: '/lainnya/pengaturan-umum',
        icon: Settings2,
      },
      {
        label: 'Pengaturan geser',
        href: '/lainnya/pengaturan-geser',
        icon: Settings2,
      },
      {
        label: 'Masukkan SMS',
        href: '/lainnya/sms',
        icon: MessageSquare,
      },
    ],
  },
  {
    title: 'Lainnya',
    items: [
      {
        label: 'Kata sandi',
        href: '/lainnya/kata-sandi',
        icon: ChevronRight,
      },
      {
        label: 'Pengaturan alarm',
        href: '/lainnya/pengaturan-alarm',
        icon: ChevronRight,
      },
      {
        label: 'Tema',
        href: '/lainnya/tema',
        icon: Palette,
      },
      {
        label: 'Pengaturan bahasa',
        href: '/lainnya/pengaturan-bahasa',
        icon: ChevronRight,
      },
      {
        label: 'Cadangan',
        href: '/lainnya/backup',
        icon: FileDown,
      },
    ],
  },
] as const

export default function LainnyaPage() {
  return (
    <TabPage title="Lainnya" subtitle="Pengaturan & fitur" icon={Ellipsis}>
      <section className="flex flex-col gap-4 px-4">
        {SETTINGS_SECTIONS.map((section) => (
          <div key={section.title} className="flex flex-col gap-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
              {section.title}
            </h3>
            <div className="grid grid-cols-1 gap-1">
              {section.items.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  data-testid={`settings-item-${item.href.split('/').pop()}`}
                  className={cn(
                    'flex items-center justify-between rounded-xl border p-3 text-left transition-colors hover:bg-secondary',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <item.icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </TabPage>
  )
}
