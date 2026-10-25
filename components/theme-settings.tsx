'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Check, ChevronLeft, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/components/language-provider'
import { cn } from '@/lib/utils'

export const MODE_STORAGE_KEY = 'dompetku:mode'
export const PALETTE_STORAGE_KEY = 'dompetku:palette'
/** Kunci lama (mode + warna dalam satu nilai); dibaca sekali untuk migrasi. */
export const LEGACY_THEME_STORAGE_KEY = 'dompetku:theme'

/** Mode tampilan menentukan permukaan terang/gelap. Default: Terang. */
const modes = [
  { id: 'light', label: 'Terang', description: 'Tampilan cerah & bersih', icon: Sun },
  { id: 'dark', label: 'Gelap', description: 'Nyaman untuk malam hari', icon: Moon },
] as const

/**
 * Warna tema hanya menggeser hue aksen (lihat [data-palette] di globals.css),
 * jadi tiap palet tetap enak dilihat di mode Terang maupun Gelap.
 */
const palettes = [
  {
    id: 'teal',
    label: 'Teal',
    description: 'Aksen hijau toska',
    swatches: ['oklch(0.52 0.12 168)', 'oklch(0.72 0.13 168)', 'oklch(0.935 0.03 168)'],
  },
  {
    id: 'ocean',
    label: 'Samudra',
    description: 'Aksen biru yang tenang',
    swatches: ['oklch(0.52 0.14 235)', 'oklch(0.72 0.14 235)', 'oklch(0.935 0.03 235)'],
  },
  {
    id: 'lavender',
    label: 'Lavender',
    description: 'Aksen ungu yang lembut',
    swatches: ['oklch(0.52 0.14 300)', 'oklch(0.72 0.14 300)', 'oklch(0.935 0.03 300)'],
  },
] as const

export type ThemeMode = (typeof modes)[number]['id']
export type ThemePalette = (typeof palettes)[number]['id']

/**
 * Terapkan mode + palet ke document root. Hanya mode `dark` yang memberi
 * kelas `.dark`; mode lain memberi `.light` agar preferensi OS tidak
 * menimpanya.
 */
export function applyTheme(mode: ThemeMode, palette: ThemePalette) {
  const root = document.documentElement
  root.dataset.mode = mode
  root.dataset.palette = palette
  root.classList.toggle('dark', mode === 'dark')
  root.classList.toggle('light', mode !== 'dark')
}

/**
 * Baca preferensi tersimpan, sekaligus memigrasi nilai lama
 * `dompetku:theme` (light/dark/ocean/lavender) ke mode + palet.
 */
export function readStoredTheme(): { mode: ThemeMode; palette: ThemePalette } {
  let mode: string | null = null
  let palette: string | null = null
  try {
    mode = localStorage.getItem(MODE_STORAGE_KEY)
    palette = localStorage.getItem(PALETTE_STORAGE_KEY)
    const legacy = localStorage.getItem(LEGACY_THEME_STORAGE_KEY)
    if (!mode && legacy) {
      mode = legacy === 'dark' ? 'dark' : 'light'
      if (!palette && (legacy === 'ocean' || legacy === 'lavender')) palette = legacy
      localStorage.setItem(MODE_STORAGE_KEY, mode)
      localStorage.setItem(PALETTE_STORAGE_KEY, palette ?? 'teal')
      localStorage.removeItem(LEGACY_THEME_STORAGE_KEY)
    }
  } catch {
    /* localStorage tidak tersedia */
  }
  return {
    mode: mode === 'dark' ? 'dark' : 'light',
    palette: palette === 'ocean' || palette === 'lavender' ? palette : 'teal',
  }
}

export function ThemeSettings() {
  const router = useRouter()
  const { t } = useTranslation()
  const [mode, setMode] = useState<ThemeMode>('light')
  const [palette, setPalette] = useState<ThemePalette>('teal')
  useEffect(() => {
    const stored = readStoredTheme()
    setMode(stored.mode)
    setPalette(stored.palette)
  }, [])

  function select(nextMode: ThemeMode, nextPalette: ThemePalette) {
    setMode(nextMode)
    setPalette(nextPalette)
    applyTheme(nextMode, nextPalette)
    try {
      localStorage.setItem(MODE_STORAGE_KEY, nextMode)
      localStorage.setItem(PALETTE_STORAGE_KEY, nextPalette)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex flex-1 flex-col" data-testid="theme-settings-screen">
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
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t.nav.more}
            </p>
            <h1 className="truncate text-lg font-bold tracking-tight">{t.theme.title}</h1>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 px-4 pb-6 md:px-10">
        <p className="text-sm text-muted-foreground">
          {t.theme.subtitle}
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.theme.mode}
          </h2>
          <div
            className="grid grid-cols-2 gap-3"
            role="radiogroup"
            aria-label="Mode tampilan"
          >
            {modes.map(({ id, label, description, icon: Icon }) => {
              const selected = mode === id
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  data-testid={`theme-mode-${id}`}
                  onClick={() => select(id, palette)}
                  className={cn(
                    'relative flex flex-col items-start gap-2.5 rounded-2xl border border-border p-4 text-left transition-all duration-300 ease-out-quart',
                    'hover:border-primary/60 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm' : '',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors duration-300',
                      selected && 'bg-primary text-primary-foreground',
                    )}
                  >
                    <Icon aria-hidden="true" className="size-4.5" />
                  </span>
                  <span className="text-sm font-semibold">{id === 'light' ? t.theme.light : t.theme.dark}</span>
                  <span className="text-[11px] leading-tight text-muted-foreground">
                    {id === 'light' ? t.theme.lightDesc : t.theme.darkDesc}
                  </span>
                  {selected && (
                    <Check
                      aria-hidden="true"
                      className="absolute right-4 top-4 size-4.5 text-primary"
                    />
                  )}
                </button>
              )
            })}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.theme.palette}
          </h2>
          <p className="px-1 text-[11px] leading-tight text-muted-foreground">
            {t.theme.paletteNote}
          </p>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Warna tema">
            {palettes.map(({ id, label, description, swatches }) => {
              const selected = palette === id
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  data-testid={`theme-palette-${id}`}
                  onClick={() => select(mode, id)}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border border-border p-3 text-left transition-all duration-300 ease-out-quart',
                    'hover:border-primary/60 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm' : '',
                  )}
                >
                  <span aria-hidden="true" className="flex items-center -space-x-1.5">
                    {swatches.map((color) => (
                      <span
                        key={color}
                        className="size-5 rounded-full ring-1 ring-inset ring-black/10"
                        style={{ background: color }}
                      />
                    ))}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-semibold">
                      {id === 'teal' ? t.theme.palettes.tealName : id === 'ocean' ? t.theme.palettes.oceanName : t.theme.palettes.lavenderName}
                    </span>
                    <span className="text-[11px] leading-tight text-muted-foreground">
                      {id === 'teal' ? t.theme.palettes.tealDesc : id === 'ocean' ? t.theme.palettes.oceanDesc : t.theme.palettes.lavenderDesc}
                    </span>
                  </span>
                  {selected && (
                    <Check aria-hidden="true" className="size-4.5 shrink-0 text-primary" />
                  )}
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
