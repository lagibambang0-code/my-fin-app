'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/components/language-provider'
import { initDB, getSettingByKey, setSetting } from '@/lib/db'
import { cn } from '@/lib/utils'

type SwipeMode = 'change_date' | 'none'

const SWIPE_OPTIONS: Array<{ value: SwipeMode; label: string; description: string }> = [
  {
    value: 'change_date',
    label: 'Ubah periode',
    description: 'Geser mengganti periode (Bulan/Tahun) di layar Transaksi & Statistik',
  },
  {
    value: 'none',
    label: 'Nonaktifkan',
    description: 'Tidak ada respons terhadap geser horizontal',
  },
]

/**
 * "Pengaturan geser" — allows the user to configure what a horizontal swipe
 * does in the app (PRD-06 §2.7).
 */
export function SwipeGestureSettingsScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const [mode, setMode] = useState<SwipeMode>('change_date')
  const load = useCallback(async () => {
    await initDB()
    const setting = await getSettingByKey('swipe_gesture')
    if (setting?.ZDATA && (setting.ZDATA === 'change_date' || setting.ZDATA === 'none')) {
      setMode(setting.ZDATA as SwipeMode)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleSelect = useCallback(async (value: SwipeMode) => {
    setMode(value)
    await setSetting('swipe_gesture', value)
  }, [])


  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 bg-background/80 px-4 pt-[calc(0.875rem+env(safe-area-inset-top))] pb-4 backdrop-blur-xl md:px-10 md:pt-6 md:pb-8">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Kembali"
            data-testid="swipe-back"
            onClick={() => router.back()}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              {t.nav.more}
            </p>
            <h1 className="truncate text-lg font-bold tracking-tight">{t.settings.swipe}</h1>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6 md:px-10 md:pb-8" data-testid="swipe-settings">
        <div className="rounded-xl border border-dashed px-3 py-3 text-xs text-pretty text-muted-foreground">
          <p>
            {t.swipe.helpText}
          </p>
        </div>

        <div className="space-y-3">
          {SWIPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              data-testid={`swipe-option-${option.value}`}
              onClick={() => void handleSelect(option.value)}
              className={cn(
                'w-full rounded-2xl border px-4 py-3.5 text-left transition-colors',
                mode === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/50',
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-lg',
                    mode === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Settings2 className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {option.value === 'change_date' ? t.swipe.changePeriod : t.swipe.disable}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {option.value === 'change_date' ? t.swipe.changePeriodDesc : t.swipe.disableDesc}
                  </p>
                </div>
                {mode === option.value && (
                  <span className="size-2 rounded-full bg-primary" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}