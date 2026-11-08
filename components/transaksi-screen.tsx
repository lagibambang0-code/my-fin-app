'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Filter, Plus, Search, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MonthNavigator, shiftMonth, type MonthValue } from '@/components/month-navigator'
import { BookmarkScreen } from '@/components/bookmark-screen'
import { TransactionCalendar } from '@/components/transaction-calendar'
import { TransactionCloseBook } from '@/components/transaction-closebook'
import { TransactionFilterSheet } from '@/components/transaction-filter-sheet'
import { TransactionForm, type TransactionDraft } from '@/components/transaction-form'
import { DailyTransactionList, type Lookups } from '@/components/transaction-list'
import { TransactionMonthly } from '@/components/transaction-monthly'
import { TransactionSearchScreen } from '@/components/transaction-search-screen'
import { useTranslation } from '@/components/language-provider'
import { cn } from '@/lib/utils'
import {
  db,
  type Asset,
  type Category,
  type Currency,
  type Transaction,
  getAllAssets,
  getAllCategories,
  getAllTransactions,
  getAssetGroups,
  getMainCurrency,
  getSettingByKey,
  getTransactionTagMap,
  initDB,
  setTransactionBookmark,
  softDeleteTransaction,
} from '@/lib/db'
import { isCardGroup } from '@/lib/asset-utils'
import { fromIso, formatCurrency, monthBounds, toIso, todayIso } from '@/lib/format'
import {
  EMPTY_FILTER,
  applyFilter,
  isFilterActive,
  summarize,
  type TransactionFilter,
} from '@/lib/transaction-utils'

type ViewId = 'daily' | 'calendar' | 'monthly' | 'closebook'

type ViewItem = { id: ViewId; label: string }

const SWIPE_THRESHOLD = 50

export function TransaksiScreen() {
  const { t } = useTranslation()
  const [today] = useState<MonthValue>(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [period, setPeriod] = useState<MonthValue>(today)
  const [view, setView] = useState<ViewId>('daily')

  const views: ViewItem[] = [
    { id: 'daily', label: t.transaction.daily },
    { id: 'calendar', label: t.transaction.calendar },
    { id: 'monthly', label: t.transaction.monthly },
    { id: 'closebook', label: t.transaction.summary },
  ]

  const [all, setAll] = useState<Transaction[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [currency, setCurrency] = useState<Currency | null>(null)
  const [cardAssetUids, setCardAssetUids] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [filter, setFilter] = useState<TransactionFilter>({ ...EMPTY_FILTER })
  const [headerFilterOpen, setHeaderFilterOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [bookmarkOpen, setBookmarkOpen] = useState(false)
  const [swipeGesture, setSwipeGesture] = useState<'change_date' | 'change_tab' | 'none'>('change_date')

  const [formOpen, setFormOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [copyDraft, setCopyDraft] = useState<TransactionDraft | null>(null)

  const [bulkMode, setBulkMode] = useState(false)
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set())
  const [tagsMap, setTagsMap] = useState<Map<string, string[]>>(new Map())
  const [showTime, setShowTime] = useState<boolean>(false)
  const [weekStartDay, setWeekStartDay] = useState<number>(1)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)


  const load = useCallback(async () => {
    try {
      await initDB()
      const [
        transactions,
        allAssetsList,
        categoryList,
        main,
        groups,
        swipeSetting,
        weekSetting,
        timeSetting,
        tagMap,
      ] = await Promise.all([
        getAllTransactions(),
        db.assets.toArray() as Promise<Asset[]>,
        getAllCategories(),
        getMainCurrency(),
        getAssetGroups(),
        getSettingByKey('swipe_gesture'),
        getSettingByKey('week_start_day'),
        getSettingByKey('time_display_order'),
        getTransactionTagMap(),
      ])
      // Money Manager TxRepository.j: DO_TYPE in ('0', '1', '3') or 'income' / 'expense' / 'transfer'.
      // DO_TYPE '7' and '8' (balance adjustments) only show in asset detail ledger, not the main transaction feed.
      const operationalTxs = transactions.filter(
        (t) => t.DO_TYPE !== '7' && t.DO_TYPE !== '8' && t.DO_TYPE !== 'adjustment' && t.DO_TYPE !== '4',
      )
      setAll(operationalTxs)
      setAssets(allAssetsList)
      setCategories(categoryList)
      setCurrency(main ?? null)
      setTagsMap(tagMap)
      setShowTime(timeSetting?.ZDATA === '1' || timeSetting?.ZDATA === '3')
      setSwipeGesture((swipeSetting?.ZDATA as 'change_date' | 'change_tab' | 'none') ?? 'change_date')
      setWeekStartDay(weekSetting?.ZDATA !== undefined ? Number(weekSetting.ZDATA) : 1)
      const cardGroupUids = new Set(groups.filter(isCardGroup).map((group) => group.uid))
      setCardAssetUids(
        new Set(allAssetsList.filter((asset) => cardGroupUids.has(asset.groupUid)).map((a) => a.uid)),
      )
      setLoadError(false)
    } catch (error) {
      console.error('Gagal memuat transaksi', error)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()

    const onCurrencyChanged = (e: Event) => {
      const cur = (e as CustomEvent<Currency>).detail
      if (cur) setCurrency(cur)
      void load()
    }
    const onSettingsChanged = () => {
      void load()
    }
    window.addEventListener('dompetku:currency-changed', onCurrencyChanged)
    window.addEventListener('dompetku:settings-changed', onSettingsChanged)
    return () => {
      window.removeEventListener('dompetku:currency-changed', onCurrencyChanged)
      window.removeEventListener('dompetku:settings-changed', onSettingsChanged)
    }
  }, [load])
  const lookups: Lookups = useMemo(
    () => ({
      categories: new Map(categories.map((category) => [category.uid, category])),
      assets: new Map(assets.map((asset) => [asset.uid, asset])),
      currency,
      tags: tagsMap,
      showTime,
    }),
    [categories, assets, currency, tagsMap, showTime],
  )

  const periodRows = useMemo(() => {
    const { start, end } = monthBounds(period.year, period.month)
    const from = toIso(start)
    const to = toIso(end)
    return all.filter((tx) => tx.ZDATE >= from && tx.ZDATE <= to)
  }, [all, period])

  const yearRows = useMemo(
    () => all.filter((tx) => fromIso(tx.ZDATE).getFullYear() === period.year),
    [all, period.year],
  )

  const previousMonthRows = useMemo(() => {
    const prev: MonthValue =
      period.month === 0
        ? { year: period.year - 1, month: 11 }
        : { year: period.year, month: period.month - 1 }
    const { start, end } = monthBounds(prev.year, prev.month)
    const from = toIso(start)
    const to = toIso(end)
    return all.filter((tx) => tx.ZDATE >= from && tx.ZDATE <= to)
  }, [all, period])

  const summary = useMemo(() => summarize(periodRows), [periodRows])
  const filteredRows = useMemo(() => applyFilter(periodRows, filter), [periodRows, filter])
  const bookmarks = useMemo(() => all.filter((tx) => tx.MARK === 1), [all])
  const filterActive = isFilterActive(filter)

  const openAdd = (targetDate?: string) => {
    setEditing(null)
    if (targetDate) {
      const today = todayIso()
      const isPast = targetDate < today
      const now = new Date()
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      setCopyDraft({
        type: 'expense',
        date: targetDate,
        amount: 0,
        categoryUid: null,
        categoryName: null,
        assetUid: null,
        assetName: null,
        toAssetUid: null,
        toAssetName: null,
        fee: 0,
        note: '',
        description: '',
        mark: false,
        tagUids: [],
        recurType: null,
        recurFreq: null,
        installmentMonths: null,
        // Custom time field on draft: if past date use 20:55, otherwise current time
        time: isPast ? '20:55' : currentTime,
      } as unknown as TransactionDraft)
    } else {
      setCopyDraft(null)
    }
    setFormKey((key) => key + 1)
    setFormOpen(true)
  }
  const openEdit = (tx: Transaction) => {
    setEditing(tx)
    setCopyDraft(null)
    setFormKey((key) => key + 1)
    setFormOpen(true)
  }

  const handleSaved = async (keepOpen: boolean, date: string) => {
    await load()
    if (keepOpen) return
    setFormOpen(false)
    const saved = fromIso(date)
    if (saved.getFullYear() !== period.year || saved.getMonth() !== period.month) {
      setPeriod({ year: saved.getFullYear(), month: saved.getMonth() })
    }
  }

  const handleDeleted = async () => {
    if (editing?.id) await softDeleteTransaction(editing.id)
    setFormOpen(false)
    setEditing(null)
    await load()
  }

  const handleUnmark = async (uids: string[]) => {
    for (const uid of uids) {
      const row = all.find((tx) => tx.uid === uid)
      if (row?.id) await setTransactionBookmark(row.id, false)
    }
    await load()
  }
  const enterBulkMode = (tx: Transaction) => {
    setBulkMode(true)
    setBulkSelected(new Set([tx.uid]))
  }

  const exitBulkMode = () => {
    setBulkMode(false)
    setBulkSelected(new Set())
  }

  const toggleBulkSelect = (tx: Transaction) => {
    setBulkSelected((prev) => {
      const next = new Set(prev)
      if (next.has(tx.uid)) next.delete(tx.uid)
      else next.add(tx.uid)
      return next
    })
  }

  const handleBulkDelete = async () => {
    const toDelete = all.filter((tx) => bulkSelected.has(tx.uid))
    for (const tx of toDelete) {
      if (tx.id) await softDeleteTransaction(tx.id)
    }
    exitBulkMode()
    await load()
  }


  const handleSwipeDown = (event: React.PointerEvent<HTMLElement>) => {
    swipeStart.current = { x: event.clientX, y: event.clientY }
  }

  const handleSwipeUp = (event: React.PointerEvent<HTMLElement>) => {
    if (!swipeStart.current) return
    const dx = event.clientX - swipeStart.current.x
    const dy = event.clientY - swipeStart.current.y
    swipeStart.current = null
    // Horizontal intent only: ignore mostly-vertical drags (list scrolling).
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.5) return

    // "Geser" default per PRD-06 §2.7 is "Ubah tanggal": the gesture moves the
    // period. Bulanan shows whole years, so it steps a year at a time.
    // Direction follows the finger (list-paging): swipe right→left pulls the
    // next period in, swipe left→right goes back one period.
    // Respect the user's swipe_gesture setting: 'none' disables the gesture,
    // 'change_tab' would switch tabs (not yet wired at this level).
    if (swipeGesture === 'none') return
    const delta = dx < 0 ? 1 : -1
    setPeriod((value) =>
      view === 'monthly'
        ? { year: value.year + delta, month: value.month }
        : shiftMonth(value, delta),
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 bg-background/85 px-4 pt-[calc(0.875rem+env(safe-area-inset-top))] pb-3 backdrop-blur-xl md:px-10 md:pt-6">
        <div className="flex items-center justify-between gap-2">
          <MonthNavigator
            value={period}
            today={today}
            onChange={setPeriod}
            variant={view === 'monthly' ? 'year' : 'month'}
          />
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Bookmark"
              data-testid="trx-header-bookmark"
              onClick={() => setBookmarkOpen(true)}
            >
              <Star className="size-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Cari transaksi"
              data-testid="trx-header-search"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="size-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Filter transaksi"
              aria-pressed={filterActive}
              data-testid="trx-header-filter"
              onClick={() => setHeaderFilterOpen(true)}
              className={cn(filterActive && 'text-primary')}
            >
              <Filter className="size-4.5" />
            </Button>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Tampilan transaksi"
          className="-mx-1 mt-3 flex gap-0.5 overflow-x-auto px-1 pb-1 sm:gap-1"
        >
          {views.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={view === item.id}
              data-testid={`trx-view-${item.id}`}
              onClick={() => setView(item.id)}
              className={cn(
                'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3 sm:py-1.5 sm:text-sm',
                view === item.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <dl
          className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2 rounded-2xl border bg-card p-2.5 sm:p-3"
          data-testid="trx-summary"
        >
          <SummaryCell
            label={t.transaction.income}
            value={summary.income}
            currency={currency}
            testId="trx-summary-income"
          />
          <SummaryCell
            label={t.transaction.expense}
            value={summary.expense}
            currency={currency}
            testId="trx-summary-expense"
          />
          <SummaryCell
            label={t.transaction.total}
            value={summary.total}
            currency={currency}
            testId="trx-summary-total"
            emphasis
          />
        </dl>
      </header>

      <section
        data-testid="trx-content"
        className="flex flex-1 touch-pan-y flex-col px-4 pt-3 pb-4 md:px-10"
        onPointerDown={handleSwipeDown}
        onPointerUp={handleSwipeUp}
        onPointerCancel={() => {
          swipeStart.current = null
        }}
      >
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Memuat…</p>
        ) : loadError ? (
          <div
            role="alert"
            data-testid="trx-load-error"
            className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 px-6 py-10 text-center"
          >
            <p className="text-sm font-semibold text-destructive">Gagal memuat transaksi</p>
            <p className="text-xs text-muted-foreground">
              Periksa koneksi lalu coba muat ulang data.
            </p>
            <Button variant="outline" size="sm" onClick={() => load()}>
              Coba lagi
            </Button>
          </div>
        ) : view === 'daily' ? (
          <DailyTransactionList
            transactions={filteredRows}
            lookups={lookups}
            onOpen={openEdit}
            onAddDate={(dateIso) => openAdd(dateIso)}
            filterActive={filterActive}
            onClearFilter={() => setFilter({ ...EMPTY_FILTER })}
            bulkMode={bulkMode}
            selectedUids={bulkSelected}
            onToggleSelect={toggleBulkSelect}
            onLongPress={enterBulkMode}
          />
        ) : view === 'calendar' ? (
          <TransactionCalendar
            year={period.year}
            month={period.month}
            transactions={filteredRows}
            lookups={lookups}
            onOpen={openEdit}
            weekStartDay={weekStartDay}
          />
        ) : view === 'monthly' ? (
          <TransactionMonthly year={period.year} transactions={yearRows} lookups={lookups} />
        ) : (
          <TransactionCloseBook
            year={period.year}
            month={period.month}
            transactions={periodRows}
            previousTransactions={previousMonthRows}
            lookups={lookups}
            cardAssetUids={cardAssetUids}
          />
        )}
      </section>

      {/* FAB — parked just above the bottom navigation */}
      {bulkMode ? (
        <div className="fixed inset-x-0 bottom-[calc(var(--nav-offset)+0.75rem)] z-30 mx-auto w-full max-w-md px-4 md:max-w-3xl lg:max-w-5xl md:px-10">
          <div className="flex items-center justify-between rounded-2xl border border-destructive/30 bg-card p-3 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {bulkSelected.size} dipilih
              </span>
              <Button variant="ghost" size="xs" onClick={exitBulkMode}>
                Batal
              </Button>
            </div>
            <Button
              variant="destructive"
              size="sm"
              disabled={bulkSelected.size === 0}
              data-testid="trx-bulk-delete"
              onClick={handleBulkDelete}
            >
              Hapus ({bulkSelected.size})
            </Button>
          </div>
        </div>
      ) : (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--nav-offset)+0.75rem)] z-30 mx-auto w-full max-w-md px-4 md:max-w-3xl lg:max-w-5xl md:px-10">
          <div className="flex justify-end">
            <Button
              type="button"
              size="icon-lg"
              aria-label="Tambah transaksi"
              data-testid="trx-fab"
              onClick={() => openAdd()}
              className="pointer-events-auto size-14 rounded-full shadow-lg transition-transform duration-200 ease-out-quart hover:scale-[1.03] active:scale-95 [&_svg:not([class*='size-'])]:size-6"
            >
              <Plus aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {formOpen && (
        <TransactionForm
          key={formKey}
          open
          transaction={editing}
          initial={copyDraft}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
            setCopyDraft(null)
          }}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onOpenBookmarks={() => setBookmarkOpen(true)}
          onCopy={(draft) => {
            setEditing(null)
            setCopyDraft(draft)
            setFormKey((key) => key + 1)
            setFormOpen(true)
          }}
        />
      )}
      <BookmarkScreen
        open={bookmarkOpen}
        transactions={bookmarks}
        lookups={lookups}
        onClose={() => setBookmarkOpen(false)}
        onOpen={(tx) => {
          setBookmarkOpen(false)
          openEdit(tx)
        }}
        onUnmark={handleUnmark}
      />

      <TransactionSearchScreen
        open={searchOpen}
        transactions={all}
        lookups={lookups}
        assets={assets}
        onClose={() => setSearchOpen(false)}
        onOpen={openEdit}
      />

      <TransactionFilterSheet
        open={headerFilterOpen}
        filter={filter}
        assets={assets}
        pool={periodRows}
        onApply={setFilter}
        onClose={() => setHeaderFilterOpen(false)}
      />
    </div>
  )
}

function SummaryCell({
  label,
  value,
  currency,
  testId,
  emphasis,
}: {
  label: string
  value: number
  currency: Currency | null
  testId: string
  emphasis?: boolean
}) {
  const formatted = formatCurrency(value, currency)
  const isLong = formatted.length > 11
  const isVeryLong = formatted.length > 14

  return (
    <div className="min-w-0">
      <dt className="truncate text-[10px] sm:text-xs text-muted-foreground">{label}</dt>
      <dd
        data-testid={testId}
        title={formatted}
        className={cn(
          'mt-0.5 truncate font-semibold tabular-nums tracking-tight',
          isVeryLong
            ? 'text-[10px] sm:text-xs md:text-sm'
            : isLong
            ? 'text-[11px] sm:text-[12px] md:text-base'
            : 'text-xs sm:text-sm md:text-base',
          emphasis && 'text-primary',
          value < 0 && 'text-destructive',
        )}
      >
        {formatted}
      </dd>
    </div>
  )
}
