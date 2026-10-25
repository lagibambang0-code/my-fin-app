'use client'

import Link from 'next/link'
import {
  ChevronRight,
  Ellipsis,
  FileDown,
  Palette,
  PiggyBank,
  Repeat,
  Settings2,
  Tag,
  Wallet,
} from 'lucide-react'
import { TabPage } from '@/components/tab-page'
import { useTranslation } from '@/components/language-provider'
import { cn } from '@/lib/utils'

export function LainnyaContent() {
  const { t } = useTranslation()

  const sections = [
    {
      title: t.settings.sectionCategories,
      items: [
        {
          label: t.settings.incomeCategory,
          href: '/more/income-categories',
          icon: Wallet,
        },
        {
          label: t.settings.expenseCategory,
          href: '/more/expense-categories',
          icon: Wallet,
        },
        {
          label: t.settings.budget,
          href: '/more/budget',
          icon: PiggyBank,
        },
        {
          label: t.settings.repeat,
          href: '/more/repeat',
          icon: Repeat,
        },
        {
          label: t.settings.tag,
          href: '/more/tags',
          icon: Tag,
        },
      ],
    },
    {
      title: t.nav.asset,
      items: [
        {
          label: t.settings.manageAsset,
          href: '/more/manage-accounts',
          icon: Wallet,
        },
      ],
    },
    {
      title: t.settings.sectionSettings,
      items: [
        {
          label: t.settings.general,
          href: '/more/general-settings',
          icon: Settings2,
        },
        {
          label: t.settings.swipe,
          href: '/more/swipe-settings',
          icon: Settings2,
        },
      ],
    },
    {
      title: t.settings.sectionOther,
      items: [
        {
          label: t.settings.password,
          href: '/more/passcode',
          icon: ChevronRight,
        },
        {
          label: t.settings.theme,
          href: '/more/theme',
          icon: Palette,
        },
        {
          label: t.settings.language,
          href: '/more/language',
          icon: ChevronRight,
        },
        {
          label: t.settings.backup,
          href: '/more/backup',
          icon: FileDown,
        },
      ],
    },
  ]

  return (
    <TabPage title={t.nav.more} subtitle={t.settings.title} icon={Ellipsis}>
      <section className="flex flex-col gap-4 px-4">
        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-1">
            <h3 className="px-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {section.title}
            </h3>
            <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
              {section.items.map((item, index) => {
                const testIdKey = item.href.split('/').pop()
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-testid={`settings-item-${testIdKey}`}
                    className={cn(
                      'flex items-center justify-between rounded-xl border border-border/60 bg-card p-3 text-left transition-colors hover:bg-secondary',
                      index === 0 && 'focus-visible:ring-2 focus-visible:ring-primary',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <item.icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <ChevronRight
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </section>
    </TabPage>
  )
}
