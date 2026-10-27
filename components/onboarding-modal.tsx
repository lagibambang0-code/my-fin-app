'use client'

import { useEffect, useState } from 'react'
import {
  Check,
  Coins,
  Globe,
  Moon,
  Palette,
  Sparkles,
  Sun,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Overlay } from '@/components/ui/overlay'
import { useTranslation } from '@/components/language-provider'
import {
  type ThemeMode,
  type ThemePalette,
  applyTheme,
  readStoredTheme,
  MODE_STORAGE_KEY,
  PALETTE_STORAGE_KEY,
} from '@/components/theme-settings'
import { getMainCurrency, setMainCurrency } from '@/lib/db'
import { cn } from '@/lib/utils'

export const ONBOARDING_STORAGE_KEY = 'dompetku:onboarded'

const CURRENCY_OPTIONS = [
  { uid: 'USD_USD', code: 'USD', symbol: '$', label: 'USD – USA (US$)' },
  { uid: 'IDR_IDR', code: 'IDR', symbol: 'Rp', label: 'IDR – Indonesia (Rp)' },
  { uid: 'EUR_EUR', code: 'EUR', symbol: '€', label: 'EUR – Euro (€)' },
  { uid: 'SGD_SGD', code: 'SGD', symbol: '$', label: 'SGD – Singapore ($)' },
  { uid: 'JPY_JPY', code: 'JPY', symbol: '¥', label: 'JPY – Japan (¥)' },
  { uid: 'GBP_GBP', code: 'GBP', symbol: '£', label: 'GBP – UK (£)' },
  { uid: 'AUD_AUD', code: 'AUD', symbol: 'A$', label: 'AUD – Australia (A$)' },
  { uid: 'MYR_MYR', code: 'MYR', symbol: 'RM', label: 'MYR – Malaysia (RM)' },
]

const PALETTE_OPTIONS: { id: ThemePalette; color: string; label: string }[] = [
  { id: 'teal', color: '#0f766e', label: 'Teal' },
  { id: 'ocean', color: '#0284c7', label: 'Ocean' },
  { id: 'lavender', color: '#9333ea', label: 'Lavender' },
]

export function OnboardingModal() {
  const { t, language, setLanguage } = useTranslation()
  const [open, setOpen] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState('USD_USD')
  const [themeMode, setThemeMode] = useState<ThemeMode>('light')
  const [themePalette, setThemePalette] = useState<ThemePalette>('teal')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Cek apakah onboarding sudah pernah diselesaikan
    try {
      const onboarded = localStorage.getItem(ONBOARDING_STORAGE_KEY)
      if (onboarded !== 'true') {
        setOpen(true)
        const storedTheme = readStoredTheme()
        setThemeMode(storedTheme.mode)
        setThemePalette(storedTheme.palette)

        getMainCurrency().then((main) => {
          if (main?.uid) {
            setSelectedCurrency(main.uid)
          }
        }).catch(() => {})
      }
    } catch {
      /* ignore */
    }
  }, [])

  const handleCurrencySelect = async (uid: string) => {
    setSelectedCurrency(uid)
    try {
      // Terapkan mata uang langsung seketika
      await setMainCurrency(uid)
    } catch (err) {
      console.warn('Gagal mengubah mata uang utama:', err)
    }
  }

  const handleThemeChange = (nextMode: ThemeMode, nextPalette: ThemePalette) => {
    setThemeMode(nextMode)
    setThemePalette(nextPalette)
    applyTheme(nextMode, nextPalette)
    try {
      localStorage.setItem(MODE_STORAGE_KEY, nextMode)
      localStorage.setItem(PALETTE_STORAGE_KEY, nextPalette)
    } catch {}
  }

  const handleFinish = async () => {
    setSaving(true)
    try {
      await setMainCurrency(selectedCurrency)
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
      setOpen(false)
    } catch (err) {
      console.warn('Gagal menyimpan setelan onboarding:', err)
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <Overlay open={open} onClose={() => {}} align="center" testId="onboarding-modal">
      <div className="mx-auto w-full max-w-md max-h-[88vh] overflow-y-auto rounded-3xl border bg-card p-6 shadow-2xl">
        {/* Header Sambutan */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="size-6" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground" data-testid="onboarding-title">
            {t.onboarding.welcome}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground text-pretty max-w-xs">
            {t.onboarding.subtitle}
          </p>
        </div>

        <div className="mt-6 space-y-5">
          {/* 1. Pemilihan Bahasa */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Globe className="size-3.5" aria-hidden="true" />
              <span>{t.onboarding.selectLanguage}</span>
            </div>

            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t.onboarding.selectLanguage}>
              <button
                type="button"
                role="radio"
                aria-checked={language === 'en'}
                data-testid="onboarding-lang-en"
                onClick={() => setLanguage('en')}
                className={cn(
                  'flex items-center justify-between rounded-xl border p-3 text-left transition-all',
                  'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  language === 'en'
                    ? 'border-primary bg-primary/10 font-semibold text-primary shadow-xs'
                    : 'bg-card text-foreground',
                )}
              >
                <div>
                  <span className="block text-sm font-semibold">English</span>
                  <span className="block text-[10px] text-muted-foreground">Default</span>
                </div>
                {language === 'en' && <Check className="size-4 shrink-0 text-primary" />}
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={language === 'id'}
                data-testid="onboarding-lang-id"
                onClick={() => setLanguage('id')}
                className={cn(
                  'flex items-center justify-between rounded-xl border p-3 text-left transition-all',
                  'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  language === 'id'
                    ? 'border-primary bg-primary/10 font-semibold text-primary shadow-xs'
                    : 'bg-card text-foreground',
                )}
              >
                <div>
                  <span className="block text-sm font-semibold">Indonesia</span>
                  <span className="block text-[10px] text-muted-foreground">Bahasa</span>
                </div>
                {language === 'id' && <Check className="size-4 shrink-0 text-primary" />}
              </button>
            </div>
          </div>

          {/* 2. Pemilihan Mata Uang Utama (Berubah Otomatis Seketika) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Coins className="size-3.5" aria-hidden="true" />
                <span>{t.onboarding.selectCurrency}</span>
              </div>
              <span className="text-[11px] font-semibold text-primary tabular-nums" data-testid="onboarding-active-currency-badge">
                {CURRENCY_OPTIONS.find((c) => c.uid === selectedCurrency)?.code} ({CURRENCY_OPTIONS.find((c) => c.uid === selectedCurrency)?.symbol})
              </span>
            </div>

            <div
              className="grid max-h-44 grid-cols-2 gap-2 overflow-y-auto pr-1"
              role="radiogroup"
              aria-label={t.onboarding.selectCurrency}
            >
              {CURRENCY_OPTIONS.map((c) => {
                const selected = selectedCurrency === c.uid
                return (
                  <button
                    key={c.uid}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    data-testid={`onboarding-currency-${c.code}`}
                    onClick={() => handleCurrencySelect(c.uid)}
                    className={cn(
                      'flex items-center justify-between rounded-xl border p-2.5 text-left transition-all',
                      'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      selected
                        ? 'border-primary bg-primary/10 font-semibold text-primary shadow-xs'
                        : 'bg-card text-foreground',
                    )}
                  >
                    <div className="min-w-0">
                      <span className="block truncate text-xs font-medium">{c.code}</span>
                      <span className="block text-[10px] text-muted-foreground">{c.symbol}</span>
                    </div>
                    {selected && <Check className="size-3.5 shrink-0 text-primary" />}
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {t.onboarding.currencyDesc}
            </p>
          </div>

          {/* 3. Pemilihan Tema & Tampilan (Mode & Aksen Warna) */}
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Palette className="size-3.5" aria-hidden="true" />
              <span>{t.onboarding.selectTheme}</span>
            </div>

            {/* Mode Terang / Gelap */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="onboarding-theme-light"
                onClick={() => handleThemeChange('light', themePalette)}
                className={cn(
                  'flex items-center justify-between rounded-xl border p-2.5 text-left transition-all',
                  'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  themeMode === 'light'
                    ? 'border-primary bg-primary/10 font-semibold text-primary shadow-xs'
                    : 'bg-card text-foreground',
                )}
              >
                <div className="flex items-center gap-2">
                  <Sun className="size-4" />
                  <span className="text-xs font-semibold">{t.theme.light}</span>
                </div>
                {themeMode === 'light' && <Check className="size-3.5 text-primary" />}
              </button>

              <button
                type="button"
                data-testid="onboarding-theme-dark"
                onClick={() => handleThemeChange('dark', themePalette)}
                className={cn(
                  'flex items-center justify-between rounded-xl border p-2.5 text-left transition-all',
                  'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  themeMode === 'dark'
                    ? 'border-primary bg-primary/10 font-semibold text-primary shadow-xs'
                    : 'bg-card text-foreground',
                )}
              >
                <div className="flex items-center gap-2">
                  <Moon className="size-4" />
                  <span className="text-xs font-semibold">{t.theme.dark}</span>
                </div>
                {themeMode === 'dark' && <Check className="size-3.5 text-primary" />}
              </button>
            </div>

            {/* Warna Aksen Palet */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-[11px] text-muted-foreground">{t.onboarding.themePalette}:</span>
              <div className="flex items-center gap-2">
                {PALETTE_OPTIONS.map((pal) => {
                  const isSelected = themePalette === pal.id
                  return (
                    <button
                      key={pal.id}
                      type="button"
                      data-testid={`onboarding-palette-${pal.id}`}
                      onClick={() => handleThemeChange(themeMode, pal.id)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all',
                        isSelected
                          ? 'border-primary bg-primary/10 font-semibold text-primary ring-1 ring-primary'
                          : 'border-border bg-card text-muted-foreground hover:bg-secondary',
                      )}
                    >
                      <span
                        className="size-3 rounded-full"
                        style={{ backgroundColor: pal.color }}
                        aria-hidden="true"
                      />
                      <span>{pal.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Tombol Mulai */}
        <div className="mt-6 pt-2">
          <Button
            type="button"
            className="h-11 w-full text-sm font-semibold shadow-md"
            data-testid="onboarding-submit"
            disabled={saving}
            onClick={handleFinish}
          >
            {t.onboarding.getStarted}
          </Button>
        </div>
      </div>
    </Overlay>
  )
}
