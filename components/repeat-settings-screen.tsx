'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, HelpCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/components/language-provider'
import { Overlay } from '@/components/ui/overlay'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { BookmarkScreen } from '@/components/bookmark-screen'
import { RepeatTypeSheet } from '@/components/repeat-type-sheet'
import { TransactionForm, type TransactionDraft } from '@/components/transaction-form'
import type { Transaction } from '@/lib/db'
import {
  type Asset,
  type Category,
  type Currency,
  getMainCurrency,
  getAllAssets,
  getAllCategories,
  getAllTransactions,
  getRepeatReflectMode,
  initDB,
  setRepeatReflectMode,
  setTransactionBookmark,
  softDeleteTransaction,
} from '@/lib/db'
import { formatDayMonthShort } from '@/lib/repeat-utils'
import { monthBounds, toIso } from '@/lib/format'
import { cn } from '@/lib/utils'

type ReflectMode = 'actual_date' | 'first_of_month'

const REFLECT_OPTIONS: { value: ReflectMode; label: string }[] = [
  { value: 'actual_date', label: 'Tanggal yang bersangkutan' },
  { value: 'first_of_month', label: 'Hari pertama setiap bulan' },
]

/** "Kelola berulang" (ConfigRepeatList) — PRD-05 §3.1–3.4. */
export function RepeatSettingsScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const [mode, setMode] = useState<ReflectMode>('actual_date')
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [pendingMode, setPendingMode] = useState<ReflectMode | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [typesOpen, setTypesOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [formInitial, setFormInitial] = useState<Partial<TransactionDraft> | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [bookmarkOpen, setBookmarkOpen] = useState(false)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Map<string, Category>>(new Map())
  const [assets, setAssets] = useState<Map<string, Asset>>(new Map())
  const [currency, setCurrency] = useState<Currency | null>(null)

  const now = new Date()
  const monthEnd = toIso(monthBounds(now.getFullYear(), now.getMonth()).end)

  const load = useCallback(async () => {
    await initDB()
    const [stored, txs, cats, assetList, main] = await Promise.all([
      getRepeatReflectMode(),
      getAllTransactions(),
      getAllCategories(),
      getAllAssets(),
      getMainCurrency(),
    ])
    setMode(stored)
    setTransactions(txs)
    setCategories(new Map(cats.map((c) => [c.uid, c])))
    setAssets(new Map(assetList.map((a) => [a.uid, a])))
    setCurrency(main ?? null)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const applyMode = async (next: ReflectMode) => {
    setMode(next)
    setOptionsOpen(false)
    setConfirmOpen(false)
    setPendingMode(null)
    await setRepeatReflectMode(next)
  }

  const bookmarks = transactions.filter((tx) => tx.MARK === 1)
  const lookups = { categories, assets, currency }

  const openForm = (initial: Partial<TransactionDraft>) => {
    setEditing(null)
    setFormInitial(initial)
    setFormKey((key) => key + 1)
    setFormOpen(true)
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 bg-background/80 px-4 pt-[calc(0.875rem+env(safe-area-inset-top))] pb-4 backdrop-blur-xl md:px-10 md:pt-6 md:pb-8">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Kembali"
            data-testid="repeat-back"
            onClick={() => router.back()}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              {t.nav.more}
            </p>
            <h1 className="truncate text-lg font-bold tracking-tight">{t.repeat.title}</h1>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Tambah transaksi berulang"
            data-testid="repeat-add"
            onClick={() => setTypesOpen(true)}
          >
            <Plus className="size-5" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-3 px-4 md:px-10" data-testid="repeat-settings">
        <div className="flex items-start gap-2 rounded-xl border border-dashed px-3 py-3 text-xs text-muted-foreground">
          <HelpCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">{t.repeat.helpTitle}</p>
            <p>
              {t.repeat.helpDesc}
            </p>
          </div>
        </div>

        <button
          type="button"
          data-testid="repeat-review-row"
          onClick={() => setOptionsOpen(true)}
          className="flex w-full items-start justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="min-w-0">
            <span className="block text-sm">{t.repeat.reviewTime}</span>
            <span
              className="mt-0.5 block truncate text-xs text-muted-foreground"
              data-testid="repeat-review-value"
            >
              {mode === 'first_of_month' ? t.repeat.firstOfMonth : t.repeat.actualDate}
            </span>
          </span>
          <ChevronRight
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          />
        </button>
      </div>

      {/* Dialog opsi "Waktu peninjauan ulang" (§3.2). */}
      <Overlay
        open={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        align="bottom"
        label="Waktu peninjauan ulang"
        testId="repeat-review-sheet"
      >
        <div className="mx-auto flex max-h-[85vh] w-full max-w-full flex-col overflow-hidden rounded-t-[1.75rem] border-t bg-card p-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl md:max-w-md md:rounded-2xl md:border md:pb-3">
          <h2 className="px-3 py-2 text-base font-bold">{t.repeat.reviewTime}</h2>
          {REFLECT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              data-testid={`repeat-review-option-${option.value}`}
              onClick={() => {
                // BR-02: konfirmasi hanya saat beralih ke "Hari pertama".
                if (option.value === 'first_of_month') {
                  setPendingMode(option.value)
                  setConfirmOpen(true)
                } else {
                  void applyMode(option.value)
                }
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full border',
                  mode === option.value ? 'border-primary' : 'border-muted-foreground/50',
                )}
              >
                {mode === option.value && <span className="size-2.5 rounded-full bg-primary" />}
              </span>
              <span className="text-sm font-medium">{option.value === 'first_of_month' ? t.repeat.firstOfMonth : t.repeat.actualDate}</span>
            </button>
          ))}
        </div>
      </Overlay>

      <ConfirmDialog
        open={confirmOpen}
        title={t.repeat.reviewTime}
        description={t.repeat.confirmFirstOfMonth}
        confirmLabel={t.common.confirm}
        cancelLabel={t.common.refuse}
        onConfirm={() => {
          if (pendingMode) void applyMode(pendingMode)
        }}
        onCancel={() => {
          // TIDAK → batal, kembali ke dialog opsi tanpa perubahan (TC-REP-05).
          setConfirmOpen(false)
          setPendingMode(null)
        }}
      />

      <RepeatTypeSheet
        open={typesOpen}
        onSelect={(index) => {
          setTypesOpen(false)
          openForm({ recurType: 'repeat', recurFreq: index })
        }}
        onClose={() => setTypesOpen(false)}
      />

      {formOpen && (
        <TransactionForm
          key={formKey}
          open
          transaction={editing}
          initial={formInitial}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
            setFormInitial(null)
          }}
          onSaved={async () => {
            await load()
            setFormOpen(false)
            setEditing(null)
            setFormInitial(null)
          }}
          onDeleted={async () => {
            if (editing?.id) await softDeleteTransaction(editing.id)
            setFormOpen(false)
            setEditing(null)
            await load()
          }}
          onOpenBookmarks={() => setBookmarkOpen(true)}
          onCopy={(draft) => {
            setEditing(null)
            setFormInitial(draft)
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
          setEditing(tx)
          setFormInitial(null)
          setFormKey((key) => key + 1)
          setFormOpen(true)
        }}
        onUnmark={async (uids) => {
          for (const uid of uids) {
            const row = transactions.find((tx) => tx.uid === uid)
            if (row?.id) await setTransactionBookmark(row.id, false)
          }
          await load()
        }}
      />
    </div>
  )
}
