'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/components/language-provider'
import { cn } from '@/lib/utils'
import { getSettingByKey, setSetting } from '@/lib/db'


/** "Cara catat pengeluaran kartu" (PRD-08 §3.2.10). Default: Lump sum. */
export function CardTimingSettings() {
  const router = useRouter()
  const { t } = useTranslation()
  const [value, setValue] = useState('0')

  useEffect(() => {
    ;(async () => {
      const setting = await getSettingByKey('card_accounting_type')
      setValue(setting?.ZDATA ?? '0')
    })()
  }, [])

  async function select(next: string) {
    setValue(next)
    await setSetting('card_accounting_type', next)
  }

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
              {t.asset.cardAccounting}
            </h1>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col px-4 md:px-10">
        <div role="radiogroup" aria-label={t.asset.cardAccounting} className="space-y-2">
          {[
            {
              value: '1',
              label: t.asset.cardTimingUse,
              description: t.asset.cardTimingUseDesc,
            },
            {
              value: '0',
              label: t.asset.cardTimingLump,
              description: t.asset.cardTimingLumpDesc,
            },
          ].map((opt) => {
            const selected = value === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                data-testid={`card-timing-${opt.value}`}
                onClick={() => select(opt.value)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected ? 'border-primary bg-primary/5' : 'bg-card hover:bg-secondary',
                )}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{opt.label}</span>
                  <span className="block text-xs text-muted-foreground">{opt.description}</span>
                </span>
                {selected && <Check className="size-4 shrink-0 text-primary" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
