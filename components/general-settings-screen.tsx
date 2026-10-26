'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Overlay } from '@/components/ui/overlay'
import { useTranslation } from '@/components/language-provider'
import {
  db,
  initDB,
  getMainCurrency,
  setMainCurrency,
  getSettingByKey,
  setSetting,
  type Currency,
} from '@/lib/db'
import { cn } from '@/lib/utils'

/* ── constants ─────────────────────────────────────────────────────────────── */

const CURRENCIES: Array<{ uid: string; label: string; iso: string }> = [
  { uid: 'IDR_IDR', label: 'IDR – Indonesia (Rp)', iso: 'IDR' },
  { uid: 'USD_USD', label: 'USD – USA (US$)', iso: 'USD' },
  { uid: 'EUR_EUR', label: 'EUR – Euro (€)', iso: 'EUR' },
  { uid: 'SGD_SGD', label: 'SGD – Singapore ($)', iso: 'SGD' },
  { uid: 'MYR_MYR', label: 'MYR – Malaysia (RM)', iso: 'MYR' },
  { uid: 'JPY_JPY', label: 'JPY – Japan (¥)', iso: 'JPY' },
  { uid: 'GBP_GBP', label: 'GBP – UK (£)', iso: 'GBP' },
  { uid: 'AUD_AUD', label: 'AUD – Australia (A$)', iso: 'AUD' },
]

const WEEK_DAYS = [
  { value: '1', label: 'Senin' },
  { value: '2', label: 'Selasa' },
  { value: '3', label: 'Rabu' },
  { value: '4', label: 'Kamis' },
  { value: '5', label: 'Jumat' },
  { value: '6', label: 'Sabtu' },
  { value: '0', label: 'Minggu' },
]

const MONTH_DAYS = Array.from({ length: 28 }, (_, i) => ({
  value: String(i + 1),
  label: `Tanggal ${i + 1}`,
}))

/* ── RowButton ─────────────────────────────────────────────────────────────── */

function RowButton({
  label,
  value,
  onClick,
  testId,
}: {
  label: string
  value: string
  onClick: () => void
  testId?: string
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <span className="text-sm font-medium">{label}</span>
      <span
        className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"
        data-testid={testId ? `${testId}-value` : undefined}
      >
        {value}
        <ChevronRight className="size-3.5" />
      </span>
    </button>
  )
}

/* ── PickerOverlay ─────────────────────────────────────────────────────────── */

function PickerOverlay<T extends string>({
  open,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  open: boolean
  title: string
  options: Array<{ value: T; label: string }>
  selected: T
  onSelect: (v: T) => void
  onClose: () => void
}) {
  return (
    <Overlay open={open} onClose={onClose} align="bottom" label={title}>
      <div className="mx-auto flex max-h-[70vh] w-full max-w-full flex-col overflow-hidden rounded-t-[1.75rem] border border-b-0 border-border/80 bg-card pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl md:max-w-md md:rounded-2xl md:border">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-base font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Tutup"
          >
            <ChevronRight className="size-4 rotate-90" />
          </button>
        </div>
        <div className="overflow-y-auto">
          {options.map((opt) => {
            const active = opt.value === selected
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onSelect(opt.value)
                  onClose()
                }}
                className={cn(
                  'flex w-full items-center justify-between px-4 py-3 text-sm transition-colors',
                  active
                    ? 'bg-primary/10 font-semibold text-primary'
                    : 'hover:bg-muted/50',
                )}
              >
                <span>{opt.label}</span>
                {active && <Check className="size-4 shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>
    </Overlay>
  )
}

/* ── GeneralSettingsScreen ─────────────────────────────────────────────────── */

type Sheet = 'currency' | 'week' | 'month' | null


export function GeneralSettingsScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const [sheet, setSheet] = useState<Sheet>(null)
  const [currencyUid, setCurrencyUid] = useState<string>('IDR_IDR')
  const [weekStart, setWeekStart] = useState<string>('1')
  const [monthStart, setMonthStart] = useState<string>('1')

  /* ── load ── */
  const load = useCallback(async () => {
    await initDB()
    const [main, weekRow, monthRow] = await Promise.all([
      getMainCurrency(),
      getSettingByKey('week_start_day'),
      getSettingByKey('start_day'),
    ])
    if (main) setCurrencyUid(main.uid)
    if (weekRow?.ZDATA) setWeekStart(weekRow.ZDATA)
    if (monthRow?.ZDATA) setMonthStart(monthRow.ZDATA)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  /* ── save handlers ── */
  const saveCurrency = useCallback(async (uid: string) => {
    setCurrencyUid(uid)
    await setMainCurrency(uid)
  }, [])

  const saveWeek = useCallback(async (v: string) => {
    setWeekStart(v)
    await setSetting('week_start_day', v)
  }, [])

  const saveMonth = useCallback(async (v: string) => {
    setMonthStart(v)
    await setSetting('start_day', v)
  }, [])

  /* ── derived display values ── */
  const weekDays = [
    { value: '1', label: t.general.days.mon },
    { value: '2', label: t.general.days.tue },
    { value: '3', label: t.general.days.wed },
    { value: '4', label: t.general.days.thu },
    { value: '5', label: t.general.days.fri },
    { value: '6', label: t.general.days.sat },
    { value: '0', label: t.general.days.sun },
  ]

  const monthDays = Array.from({ length: 28 }, (_, i) => ({
    value: String(i + 1),
    label: `${t.general.dayPrefix}${i + 1}`,
  }))

  const currencyLabel =
    CURRENCIES.find((c) => c.uid === currencyUid)?.iso ?? currencyUid
  const weekLabel =
    weekDays.find((d) => d.value === weekStart)?.label ?? weekStart
  const monthLabel =
    monthDays.find((d) => d.value === monthStart)?.label ?? `${t.general.dayPrefix}${monthStart}`
  return (
    <div className="flex flex-1 flex-col" data-testid="general-settings-screen">
      <header className="sticky top-0 z-30 bg-background/80 px-4 pt-[calc(0.875rem+env(safe-area-inset-top))] pb-4 backdrop-blur-xl md:px-10 md:pt-6 md:pb-8">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Kembali"
            data-testid="general-settings-back"
            onClick={() => router.back()}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              {t.nav.more}
            </p>
            <h1 className="truncate text-lg font-bold tracking-tight">{t.general.title}</h1>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-3 px-4 md:px-10">
        <div className="divide-y overflow-hidden rounded-2xl border bg-card">
          <RowButton
            label={t.general.mainCurrency}
            value={currencyLabel}
            testId="setting-currency"
            onClick={() => setSheet('currency')}
          />
          <RowButton
            label={t.general.weekStart}
            value={weekLabel}
            testId="setting-week-start"
            onClick={() => setSheet('week')}
          />
          <RowButton
            label={t.general.monthStart}
            value={monthLabel}
            testId="setting-month-start"
            onClick={() => setSheet('month')}
          />
        </div>
      </div>
      <PickerOverlay
        open={sheet === 'currency'}
        title={t.general.mainCurrency}
        options={CURRENCIES.map((c) => ({ value: c.uid, label: c.label }))}
        selected={currencyUid}
        onSelect={saveCurrency}
        onClose={() => setSheet(null)}
      />

      <PickerOverlay
        open={sheet === 'week'}
        title={t.general.weekStart}
        options={weekDays}
        selected={weekStart}
        onSelect={saveWeek}
        onClose={() => setSheet(null)}
      />

      <PickerOverlay
        open={sheet === 'month'}
        title={t.general.monthStart}
        options={monthDays}
        selected={monthStart}
        onSelect={saveMonth}
        onClose={() => setSheet(null)}
      />
    </div>
  )
}
