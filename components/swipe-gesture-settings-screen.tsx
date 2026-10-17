'use client'

import { useCallback, useEffect, useState } from 'react'
import { Settings2, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TabPage } from '@/components/tab-page'
import { initDB, getSettingByKey, setSetting } from '@/lib/db'
import { cn } from '@/lib/utils'

type SwipeMode = 'change_date' | 'change_tab' | 'none'

const SWIPE_OPTIONS: Array<{ value: SwipeMode; label: string; description: string }> = [
  {
    value: 'change_date',
    label: 'Ubah periode',
    description: 'Geser mengganti periode (Bulan/Tahun) di layar Transaksi & Statistik',
  },
  {
    value: 'change_tab',
    label: 'Ubah tab',
    description: 'Geser berpindah di antara tab Transaksi, Statistik, Aset, Lainnya',
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
  const [mode, setMode] = useState<SwipeMode>('change_date')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    await initDB()
    const setting = await getSettingByKey('swipe_gesture')
    if (setting?.ZDATA) {
      setMode(setting.ZDATA as SwipeMode)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async () => {
    try {
      setSaving(true)
      await setSetting('swipe_gesture', mode)
    } finally {
      setSaving(false)
    }
  }

  return (
    <TabPage title="Pengaturan geser" subtitle="Atur perilaku geser horizontal" icon={SlidersHorizontal}>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6 md:px-10 md:pb-8">
        <div className="rounded-xl border border-dashed px-3 py-3 text-xs text-pretty text-muted-foreground">
          <p>
            Pilih apa yang terjadi saat Anda menggeser secara horizontal di layar
            utama. Geser ke kiri/kanan di Transaksi dan Statistik akan mengikuti
            pilihan ini.
          </p>
        </div>

        <div className="space-y-3">
          {SWIPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setMode(option.value)}
              className={cn(
                'w-full text-left rounded-xl border p-4 transition-colors',
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
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {option.description}
                  </p>
                </div>
                {mode === option.value && (
                  <span className="size-2 rounded-full bg-primary" />
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t">
          <Button className="h-12 w-full" onClick={handleSave} disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </div>
    </TabPage>
  )
}