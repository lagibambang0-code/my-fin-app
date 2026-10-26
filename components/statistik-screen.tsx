'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Overlay } from '@/components/ui/overlay'
import { DatePickerSheet } from '@/components/ui/date-picker-sheet'
import { PickerSheet } from '@/components/ui/picker-sheet'
import { MonthNavigator } from '@/components/month-navigator'
import { CategoryBarChart, StatistikLineChart } from '@/components/statistik-chart'
import { StatistikDetail } from '@/components/statistik-detail'
import { BookmarkScreen } from '@/components/bookmark-screen'
import { TransactionForm, type TransactionDraft } from '@/components/transaction-form'
import { TransactionsEmpty, type Lookups } from '@/components/transaction-list'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/components/language-provider'
import { formatCurrency, formatShortDate } from '@/lib/format'
import { summarize } from '@/lib/transaction-utils'
import {
  STATS_MODES,
  STATS_MODE_LABEL,
  STATS_MODE_NOUN,
  calculateAverages,
  categoryBreakdown,
  categoryTrend,
  getLineChartPoints,
  initialStatsState,
  reportingCategoryUid,
  shiftStatsState,
  statsRange,
  subCategoryBreakdown,
  trendMonths,
  type StatsMode,
  type StatsState,
} from '@/lib/statistics-utils'
import {
  getAllAssets,
  getAllCategories,
  getAllTransactions,
  getMainCurrency,
  getSettingByKey,
  initDB,
  setTransactionBookmark,
  softDeleteTransaction,
  type Asset,
  type Category,
  type Currency,
  type Transaction,
} from '@/lib/db'

type ReportType = 'income' | 'expense'

const SWIPE_THRESHOLD = 50

/** Tab "Statistik" (PRD-13): laporan per kategori + drill-down per kategori. */
export function StatistikScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const [today] = useState(() => new Date())
  const [state, setState] = useState<StatsState>(() => initialStatsState())
  const [type, setType] = useState<ReportType>('expense')

  const [modeOpen, setModeOpen] = useState(false)
  const [periodOpen, setPeriodOpen] = useState(false)
  const [periodField, setPeriodField] = useState<'from' | 'to' | null>(null)
  const [detailUid, setDetailUid] = useState<string | null>(null)

  const [bookmarkOpen, setBookmarkOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [copyDraft, setCopyDraft] = useState<TransactionDraft | null>(null)

  const [all, setAll] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [currency, setCurrency] = useState<Currency | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [swipeGesture, setSwipeGesture] = useState<'change_date' | 'change_tab' | 'none'>('change_date')

  const swipeStart = useRef<{ x: number; y: number } | null>(null)

  const todayValue = useMemo(
    () => ({ year: today.getFullYear(), month: today.getMonth() }),
    [today],
  )

  const load = useCallback(async () => {
    try {
      await initDB()
      const [transactions, categoryList, assetList, main, swipeSetting] = await Promise.all([
        getAllTransactions(),
        getAllCategories(),
        getAllAssets(),
        getMainCurrency(),
        getSettingByKey('swipe_gesture'),
      ])
      setAll(transactions)
      setCategories(categoryList)
      setAssets(assetList)
      setCurrency(main ?? null)
      setSwipeGesture((swipeSetting?.ZDATA as 'change_date' | 'change_tab' | 'none') ?? 'change_date')
      setLoadError(false)
    } catch (error) {
      console.error('Gagal memuat statistik', error)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.uid, category])),
    [categories],
  )

  const lookups: Lookups = useMemo(
    () => ({
      categories: categoryMap,
      assets: new Map(assets.map((asset) => [asset.uid, asset])),
      currency,
    }),
    [categoryMap, assets, currency],
  )

  const range = useMemo(() => statsRange(state), [state])

  const rangeRows = useMemo(
    () => all.filter((tx) => tx.ZDATE >= range.from && tx.ZDATE <= range.to),
    [all, range.from, range.to],
  )

  const totals = useMemo(() => summarize(rangeRows), [rangeRows])
  const currentTotal = type === 'income' ? totals.income : totals.expense

  const averages = useMemo(
    () => calculateAverages(currentTotal, rangeRows, type, state, today),
    [currentTotal, rangeRows, type, state, today],
  )

  const lineChartPoints = useMemo(
    () => getLineChartPoints(state.mode === 'yearly' ? all : rangeRows, type, state),
    [all, rangeRows, type, state],
  )

  const stats = useMemo(
    () => categoryBreakdown(rangeRows, type, categoryMap),
    [rangeRows, type, categoryMap],
  )
  const selected = useMemo(
    () => stats.find((stat) => stat.uid === detailUid) ?? null,
    [stats, detailUid],
  )

  const detailRows = useMemo(
    () =>
      detailUid
        ? rangeRows.filter(
            (tx) => tx.DO_TYPE === type && reportingCategoryUid(tx, categoryMap) === detailUid,
          )
        : [],
    [rangeRows, detailUid, type, categoryMap],
  )
  const categoryLinePoints = useMemo(() => {
    if (!detailUid) return null
    return getLineChartPoints(
      state.mode === 'yearly' ? all : rangeRows,
      type,
      state,
      detailUid,
      categoryMap,
    )
  }, [all, rangeRows, type, state, detailUid, categoryMap])

  const detailSubs = useMemo(
    () => (detailUid ? subCategoryBreakdown(detailRows, detailUid, categoryMap) : []),
    [detailRows, detailUid, categoryMap],
  )
  const detailTrend = useMemo(() => {
    if (!detailUid) return []
    const rows = all.filter(
      (tx) => tx.DO_TYPE === type && reportingCategoryUid(tx, categoryMap) === detailUid,
    )
    return categoryTrend(rows, trendMonths(state))
  }, [all, detailUid, type, categoryMap, state])

  const bookmarks = useMemo(() => all.filter((tx) => tx.MARK === 1), [all])

  const openEdit = (tx: Transaction) => {
    setEditing(tx)
    setCopyDraft(null)
    setFormKey((key) => key + 1)
    setFormOpen(true)
  }

  const step = (delta: number) => {
    setState((current) => shiftStatsState(current, delta))
  }

  const handleSwipeDown = (event: React.PointerEvent<HTMLElement>) => {
    swipeStart.current = { x: event.clientX, y: event.clientY }
  }

  const handleSwipeUp = (event: React.PointerEvent<HTMLElement>) => {
    if (!swipeStart.current) return
    const dx = event.clientX - swipeStart.current.x
    const dy = event.clientY - swipeStart.current.y
    swipeStart.current = null
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.5) return
    // Same "Geser → Ubah tanggal" behaviour as the Transaksi tab (PRD-06 §2.7):
    // swipe right→left steps forward, swipe left→right steps back.
    // Respect the user's swipe_gesture setting ('none' disables the gesture).
    if (swipeGesture === 'none') return
    step(dx < 0 ? 1 : -1)
  }

  const prevButton = (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Periode sebelumnya"
      data-testid="stats-prev"
      onClick={() => step(-1)}
    >
      <ChevronLeft className="size-4" />
    </Button>
  )
  const nextButton = (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Periode selanjutnya"
      data-testid="stats-next"
      onClick={() => step(1)}
    >
      <ChevronRight className="size-4" />
    </Button>
  )

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 bg-background/85 px-4 pt-[calc(0.875rem+env(safe-area-inset-top))] pb-3 backdrop-blur-xl md:px-10 md:pt-6">
        <h1 className="sr-only">Statistik</h1>
        <div className="flex items-center justify-between gap-2">
          {state.mode === 'monthly' ? (
            <MonthNavigator
              value={state.anchor}
              today={todayValue}
              onChange={(anchor) => setState((current) => ({ ...current, anchor }))}
            />
          ) : state.mode === 'yearly' ? (
            <MonthNavigator
              variant="year"
              value={state.anchor}
              today={todayValue}
              onChange={(anchor) => setState((current) => ({ ...current, anchor }))}
            />
          ) : state.mode === 'weekly' ? (
            <div className="flex min-w-0 items-center gap-0.5">
              {prevButton}
              <span
                data-testid="stats-period-label"
                className="truncate px-1 text-[13px] font-semibold tabular-nums sm:text-sm md:text-base"
              >
                {range.label}
              </span>
              {nextButton}
            </div>
          ) : (
            <button
              type="button"
              data-testid="stats-period-button"
              onClick={() => setPeriodOpen(true)}
              className="flex min-w-0 items-center gap-1.5 rounded-xl px-2 py-1.5 text-[13px] font-semibold tabular-nums transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
            >
              <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {range.label}
              </span>
            </button>
          )}

          <Button
            variant="ghost"
            size="sm"
            data-testid="stats-mode-button"
            aria-haspopup="dialog"
            onClick={() => setModeOpen(true)}
            className="shrink-0 gap-1 text-xs font-semibold md:text-sm"
          >
            {t.stats.modes[state.mode]}
            <ChevronDown aria-hidden="true" className="size-3.5 text-muted-foreground" />
          </Button>
        </div>
      </header>

      <section
        data-testid="stats-content"
        className="flex flex-1 touch-pan-y flex-col gap-3 px-4 pt-3 pb-4 md:px-10"
        onPointerDown={handleSwipeDown}
        onPointerUp={handleSwipeUp}
        onPointerCancel={() => {
          swipeStart.current = null
        }}
      >
        <div className="grid grid-cols-2 gap-1 rounded-2xl border bg-card p-1">
          {(['income', 'expense'] as const).map((id) => {
            const active = type === id
            const total = id === 'income' ? totals.income : totals.expense
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                data-testid={`stats-type-${id}`}
                onClick={() => setType(id)}
                className={cn(
                  'flex flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-left transition-colors duration-200',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary',
                )}
              >
                <span className="text-xs font-medium">
                  {id === 'income' ? t.stats.income : t.stats.expense}
                </span>
                <span
                  data-testid={`stats-total-${id}`}
                  className="text-sm font-semibold tabular-nums"
                >
                  {formatCurrency(total, currency)}
                </span>
              </button>
            )
          })}
        </div>

        {/* 1. Metrik Rata-rata Harian & Rata-rata Asli */}
        <div
          data-testid="stats-averages-card"
          className="grid grid-cols-2 gap-2 rounded-2xl border bg-card p-3 shadow-xs"
        >
          <div className="flex flex-col gap-0.5 border-r pr-2">
            <span className="text-[11px] font-medium text-muted-foreground">
              {t.stats.dailyAverage}
            </span>
            <span
              data-testid="stats-daily-average-value"
              className="text-sm font-bold tabular-nums text-foreground"
            >
              {formatCurrency(averages.dailyAverage, currency)}
            </span>
            <span className="text-[10px] text-muted-foreground/80">
              {averages.elapsedDays} {t.stats.elapsedDaysLabel}
            </span>
          </div>

          <div className="flex flex-col gap-0.5 pl-2">
            <span className="text-[11px] font-medium text-muted-foreground">
              {t.stats.activeAverage}
            </span>
            <span
              data-testid="stats-active-average-value"
              className="text-sm font-bold tabular-nums text-foreground"
            >
              {formatCurrency(averages.activeDayAverage, currency)}
            </span>
            <span className="text-[10px] text-muted-foreground/80">
              {averages.activeDays} {t.stats.activeDaysLabel}
            </span>
          </div>
        </div>
        {loadError ? (
          <TransactionsEmpty
            testId="stats-error"
            hint="Data statistik gagal dimuat. Coba muat ulang halaman."
          />
        ) : loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Memuat…</p>
        ) : stats.length === 0 ? (
          <TransactionsEmpty
            testId="stats-empty"
            hint={t.stats.noData}
          />
        ) : (
          <>
            {/* 1. Grafik Garis (Line Chart) — tepat di bawah metrik rata-rata & tepat di atas grafik donat */}
            <StatistikLineChart
              points={lineChartPoints}
              currency={currency}
              mode={state.mode}
            />

            {/* 2. Grafik Donat Proporsi */}
            <CategoryBarChart stats={stats} />

            <div className="overflow-hidden rounded-2xl border bg-card">
              {stats.map((stat) => (
                <button
                  key={stat.uid}
                  type="button"
                  data-testid={`stats-row-${stat.uid}`}
                  onClick={() => setDetailUid(stat.uid)}
                  className="flex w-full items-center gap-3 border-t px-3 py-2.5 text-left transition-colors first:border-t-0 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <span
                    data-testid={`stats-percent-${stat.uid}`}
                    className="w-11 shrink-0 text-right text-xs font-semibold tabular-nums text-muted-foreground"
                  >
                    {Math.round(stat.percent)}%
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: stat.color }}
                    />
                    <span className="truncate text-sm font-medium">{stat.name}</span>
                  </span>
                  <span
                    data-testid={`stats-amount-${stat.uid}`}
                    className="shrink-0 text-sm font-semibold tabular-nums"
                  >
                    {formatCurrency(stat.amount, currency)}
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <PickerSheet
        open={modeOpen}
        title={t.stats.rangeMode}
        testId="stats-mode-picker"
        searchable={false}
        selected={state.mode}
        items={STATS_MODES.map((mode) => ({ value: mode.id, label: t.stats.modes[mode.id] }))}
        onSelect={(value) => {
          setState((current) => ({ ...current, mode: value as StatsMode }))
          setModeOpen(false)
        }}
        onClose={() => setModeOpen(false)}
      />

      <Overlay
        open={periodOpen}
        onClose={() => setPeriodOpen(false)}
        align="bottom"
        label={t.stats.periodSheet.title}
        testId="stats-period-sheet"
      >
        <div className="mx-auto flex max-h-[85vh] w-full max-w-full flex-col overflow-hidden rounded-t-[1.75rem] border-t bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl md:max-w-md md:rounded-2xl md:border md:pb-4">
          <h2 className="text-base font-bold">{t.stats.periodSheet.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t.stats.periodSheet.desc}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t.stats.periodSheet.from}
              <button
                type="button"
                data-testid="stats-period-from"
                aria-label="Tanggal awal"
                aria-haspopup="dialog"
                onClick={() => setPeriodField('from')}
                className="flex items-center justify-between gap-2 rounded-xl border border-input bg-background px-3 py-2 text-sm font-semibold tabular-nums transition-colors hover:bg-secondary focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {formatShortDate(state.from)}
                <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </div>
            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t.stats.periodSheet.to}
              <button
                type="button"
                data-testid="stats-period-to"
                aria-label="Tanggal akhir"
                aria-haspopup="dialog"
                onClick={() => setPeriodField('to')}
                className="flex items-center justify-between gap-2 rounded-xl border border-input bg-background px-3 py-2 text-sm font-semibold tabular-nums transition-colors hover:bg-secondary focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {formatShortDate(state.to)}
                <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </div>
          </div>
          <Button
            type="button"
            className="mt-4 h-10 w-full"
            data-testid="stats-period-apply"
            onClick={() => setPeriodOpen(false)}
          >
            {t.stats.periodSheet.apply}
          </Button>
        </div>
      </Overlay>

      <DatePickerSheet
        open={periodField !== null}
        value={(periodField === 'to' ? state.to : state.from) || state.from}
        title={periodField === 'to' ? t.stats.periodSheet.endDate : t.stats.periodSheet.startDate}
        onSelect={(iso) =>
          setState((current) =>
            periodField === 'to' ? { ...current, to: iso } : { ...current, from: iso },
          )
        }
        onClose={() => setPeriodField(null)}
      />

      <StatistikDetail
        open={Boolean(detailUid)}
        stat={selected}
        rows={detailRows}
        subStats={detailSubs}
        trend={detailTrend}
        linePoints={categoryLinePoints}
        mode={state.mode}
        rangeLabel={range.label}
        modeNoun={STATS_MODE_NOUN[state.mode]}
        lookups={lookups}
        onClose={() => setDetailUid(null)}
        onOpenTransaction={openEdit}
      />

      <BookmarkScreen
        open={bookmarkOpen}
        transactions={bookmarks}
        lookups={lookups}
        onClose={() => setBookmarkOpen(false)}
        onOpen={(tx) => {
          setBookmarkOpen(false)
          openEdit(tx)
        }}
        onUnmark={async (uids) => {
          for (const uid of uids) {
            const row = all.find((tx) => tx.uid === uid)
            if (row?.id) await setTransactionBookmark(row.id, false)
          }
          await load()
        }}
      />

      <TransactionForm
        key={formKey}
        open={formOpen}
        transaction={editing}
        initial={copyDraft}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSaved={async (keepOpen) => {
          await load()
          if (!keepOpen) {
            setFormOpen(false)
            setEditing(null)
          }
        }}
        onDeleted={async () => {
          if (editing?.id) await softDeleteTransaction(editing.id)
          setFormOpen(false)
          setEditing(null)
          await load()
        }}
        onOpenBookmarks={() => {
          setFormOpen(false)
          setBookmarkOpen(true)
        }}
        onCopy={(draft) => {
          setFormOpen(false)
          setEditing(null)
          setCopyDraft(draft)
          setFormKey((key) => key + 1)
          setFormOpen(true)
        }}
      />
    </div>
  )
}
