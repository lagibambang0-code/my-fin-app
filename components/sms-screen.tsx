'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, HelpCircle, MessageSquare, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { BookmarkScreen } from '@/components/bookmark-screen'
import { TransactionForm, type TransactionDraft } from '@/components/transaction-form'
import {
  type Asset,
  type Category,
  type Currency,
  type SmsMacro,
  type SmsMessage,
  type Transaction,
  createSmsMessage,
  getAllAssets,
  getAllCategories,
  getBookmarkedTransactions,
  getMainCurrency,
  getSmsMacros,
  getSmsMessages,
  initDB,
  setTransactionBookmark,
  softDeleteSmsMessage,
  softDeleteTransaction,
} from '@/lib/db'
import { formatCurrency, formatShortDate, toIso, todayIso } from '@/lib/format'
import { type SmsParse, parseSms, smsKindLabel } from '@/lib/sms-utils'
import { genUid } from '@/lib/db'

/**
 * "Masukkan SMS" — versi web dari SMS auto-catat (SMS_RAW_READ +
 * MESSAGEMACRO2). Browser tidak bisa membaca SMS dari perangkat, jadi SMS
 * ditempel manual lalu diurai dengan aturan yang sama; hasilnya dipakai untuk
 * mengisi form transaksi.
 */
export function SmsScreen() {
  const router = useRouter()
  const [messages, setMessages] = useState<SmsMessage[]>([])
  const [macros, setMacros] = useState<SmsMacro[]>([])
  const [currency, setCurrency] = useState<Currency | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<SmsParse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<SmsMessage | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [formInitial, setFormInitial] = useState<Partial<TransactionDraft> | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [bookmarkOpen, setBookmarkOpen] = useState(false)

  const load = useCallback(async () => {
    await initDB()
    const [rows, macroRows, main, txs, cats, assetList] = await Promise.all([
      getSmsMessages(),
      getSmsMacros(),
      getMainCurrency(),
      getBookmarkedTransactions(),
      getAllCategories(),
      getAllAssets(),
    ])
    setMessages(rows)
    setMacros(macroRows)
    setCurrency(main ?? null)
    setTransactions(txs)
    setCategories(cats)
    setAssets(assetList)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const lookups = {
    categories: new Map(categories.map((category) => [category.uid, category])),
    assets: new Map(assets.map((asset) => [asset.uid, asset])),
    currency,
  }

  const openForm = (parsed: SmsParse) => {
    setFormInitial({
      type: parsed.kind,
      date: parsed.date,
      amount: parsed.amount,
      assetUid: parsed.assetUid,
      note: `SMS ${parsed.sender}`.trim(),
      description: '',
    })
    setEditing(null)
    setFormKey((key) => key + 1)
    setFormOpen(true)
  }

  const store = async (raw: string, parsed: SmsParse) => {
    const now = new Date()
    await createSmsMessage({
      uid: genUid('sms'),
      RDATE: `${todayIso()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`,
      ZDATE: new Date(`${parsed.date}T00:00:00`).getTime(),
      TEL: parsed.sender,
      ZDATA: raw,
      MACROTYPE: 0,
      assetUid: parsed.assetUid,
      toAssetUid: null,
      NOTIFY_TYPE: 0,
      AMOUNT: String(parsed.amount),
      TEXT_PARSING_TIME: Date.now(),
      ASSETNAME: parsed.assetName ?? '',
      TYPE: parsed.kind,
      MMSID: 0,
      APP_PACKAGE: 'com.dompetku.sms',
      APP_NAME: 'Dompetku',
      SENDER_NAME: parsed.sender,
      IS_DEL: 0,
      utime: Date.now(),
      isSynced: 0,
      syncTime: 0,
      syncVersion: 1,
    })
    await load()
  }

  const process = async () => {
    const raw = text.trim()
    if (!raw) return
    const parsed = parseSms(raw, macros)
    if (!parsed) {
      setPreview(null)
      setError('Nominal tidak ditemukan pada SMS. Pastikan ada nilai seperti "Rp 50.000".')
      return
    }
    setError(null)
    setPreview(parsed)
    await store(raw, parsed)
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 bg-background/80 px-4 pt-[calc(0.875rem+env(safe-area-inset-top))] pb-4 backdrop-blur-xl md:px-10 md:pt-6 md:pb-8">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Kembali"
            data-testid="sms-back"
            onClick={() => router.back()}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Lainnya
            </p>
            <h1 className="truncate text-lg font-bold tracking-tight">Masukkan SMS</h1>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-3 px-4 md:px-10" data-testid="sms-screen">
        <div className="flex items-start gap-2 rounded-xl border border-dashed px-3 py-3 text-xs text-muted-foreground">
          <HelpCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>
            Versi web tidak dapat membaca SMS dari perangkat: tempel isi SMS notifikasi bank/e-wallet
            di bawah, lalu nilainya dipakai untuk mengisi form transaksi.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-3">
          <label htmlFor="sms-input" className="text-sm text-muted-foreground">
            Isi SMS
          </label>
          <textarea
            id="sms-input"
            data-testid="sms-input"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setError(null)
            }}
            rows={4}
            placeholder={'Contoh: BCA: Transaksi DEBIT Rp 50.000 pada 17/10/2026'}
            className="mt-1.5 w-full resize-none rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button
            type="button"
            className="mt-3 h-11 w-full"
            data-testid="sms-process"
            disabled={text.trim() === ''}
            onClick={() => void process()}
          >
            <MessageSquare className="size-4" />
            Proses SMS
          </Button>
        </div>

        {error && (
          <p
            role="alert"
            data-testid="sms-error"
            className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        {preview && (
          <div className="rounded-2xl border bg-card" data-testid="sms-preview">
            <p className="border-b px-4 py-2.5 text-sm font-semibold">Hasil pembacaan</p>
            <dl className="divide-y text-sm">
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <dt className="text-muted-foreground">Jenis</dt>
                <dd data-testid="sms-preview-type">{smsKindLabel(preview.kind)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <dt className="text-muted-foreground">Nominal</dt>
                <dd data-testid="sms-preview-amount" className="font-semibold tabular-nums">
                  {formatCurrency(preview.amount, currency)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <dt className="text-muted-foreground">Tanggal</dt>
                <dd data-testid="sms-preview-date" className="tabular-nums">
                  {preview.date}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <dt className="text-muted-foreground">Pengirim</dt>
                <dd data-testid="sms-preview-sender">{preview.sender}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <dt className="text-muted-foreground">Aset</dt>
                <dd data-testid="sms-preview-asset">
                  {preview.assetName ?? 'Pilih di form transaksi'}
                </dd>
              </div>
            </dl>
            <div className="flex gap-2 border-t p-3">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1"
                data-testid="sms-reset"
                onClick={() => {
                  setPreview(null)
                  setText('')
                }}
              >
                Ulangi
              </Button>
              <Button
                type="button"
                className="h-11 flex-1"
                data-testid="sms-create"
                onClick={() => openForm(preview)}
              >
                Catat transaksi
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 pb-6">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Riwayat SMS
          </h2>
          {messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground" data-testid="sms-empty">
              Tidak ada data
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-card" data-testid="sms-list">
              {messages.map((message) => (
                <div
                  key={message.uid}
                  data-testid={`sms-row-${message.uid}`}
                  className="flex items-center gap-2 border-t px-3 py-2.5 first:border-t-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" data-testid={`sms-sender-${message.uid}`}>
                      {message.SENDER_NAME || message.TEL}{' '}
                      <span className="font-normal text-muted-foreground">
                        · {message.TYPE === 'income' ? 'Pendapatan' : 'Pengeluaran'}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      <span data-testid={`sms-amount-${message.uid}`} className="tabular-nums">
                        {formatCurrency(Number(message.AMOUNT) || 0, currency)}
                      </span>
                      {' · '}
                      <span data-testid={`sms-date-${message.uid}`}>
                        {formatShortDate(toIso(new Date(message.ZDATE)))}
                      </span>
                      {message.ASSETNAME ? ` · ${message.ASSETNAME}` : ''}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid={`sms-reuse-${message.uid}`}
                    onClick={() => {
                      const parsed = parseSms(message.ZDATA, macros)
                      if (parsed) {
                        setText(message.ZDATA)
                        setPreview(parsed)
                        openForm(parsed)
                      }
                    }}
                  >
                    Catat
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Hapus SMS"
                    data-testid={`sms-delete-${message.uid}`}
                    onClick={() => setPendingDelete(message)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
        transactions={transactions}
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

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Hapus SMS?"
        description="Apakah anda yakin ingin menghapusnya?"
        confirmLabel="YA"
        cancelLabel="TIDAK"
        onConfirm={async () => {
          const message = pendingDelete
          setPendingDelete(null)
          if (message) await softDeleteSmsMessage(message.uid)
          await load()
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
