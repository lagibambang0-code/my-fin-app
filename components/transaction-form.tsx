'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Camera,
  Calendar,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Star,
  Tag,
  Trash2,
  Wallet,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Numpad,
  NumpadBackspace,
  applyNumpadKey,
  type NumpadKey,
} from '@/components/ui/numpad'
import { FullScreenSheet, Overlay } from '@/components/ui/overlay'
import { PickerSheet, type PickerItem } from '@/components/ui/picker-sheet'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CategoryPicker } from '@/components/transaction-category-picker'
import { TransactionTagPicker } from '@/components/transaction-tag-picker'
import { RecurringSheet, type RecurringValue } from '@/components/recurring-sheet'
import { cn } from '@/lib/utils'
import {
  type Asset,
  type Category,
  type Currency,
  type Photo,
  type Tag as TagRecord,
  type Transaction,
  createPhoto,
  createTag,
  createTransaction,
  genUid,
  getAllAssets,
  getAssetBalances,
  getMainCurrency,
  getPhotosByTransaction,
  getTagUidsForTransaction,
  getTags,
  setTransactionTags,
  softDeletePhoto,
  syncRepeatSeries,
  updateTransaction,
} from '@/lib/db'
import {
  formatCurrency,
  formatShortDate,
  formatTypingAmount,
  fromIso,
  toIso,
  todayIso,
  WEEKDAYS_SHORT,
} from '@/lib/format'
import {
  RECUR_FREQUENCIES,
  TRX_TYPES,
  relativeDateLabel,
  type TrxType,
} from '@/lib/transaction-utils'

export type TransactionDraft = {
  type: TrxType
  date: string
  amount: number
  categoryUid: string | null
  categoryName: string | null
  assetUid: string | null
  assetName: string | null
  toAssetUid: string | null
  toAssetName: string | null
  fee: number
  note: string
  description: string
  mark: boolean
  /** Tag uids picked on the form (TX_TAG). */
  tagUids: string[]
} & RecurringValue

type TransactionFormProps = {
  open: boolean
  /** Existing row — edit mode. */
  transaction?: Transaction | null
  /** Prefilled values used by "Salin" (always a new transaction). */
  initial?: Partial<TransactionDraft> | null
  onClose: () => void
  onSaved: (keepOpen: boolean, date: string) => void
  onDeleted: () => void
  onOpenBookmarks: () => void
  /** "Salin" → the screen opens a fresh form prefilled with this draft. */
  onCopy: (draft: TransactionDraft) => void
}

const EMPTY_RECUR: RecurringValue = {
  recurType: null,
  recurFreq: null,
  installmentMonths: null,
}

export function TransactionForm({
  open,
  transaction,
  initial,
  onClose,
  onSaved,
  onDeleted,
  onOpenBookmarks,
  onCopy,
}: TransactionFormProps) {
  const isEdit = Boolean(transaction?.id)
  const [type, setType] = useState<TrxType>('expense')
  const [date, setDate] = useState(todayIso())
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [datePickerCursor, setDatePickerCursor] = useState(() => new Date())
  const [raw, setRaw] = useState('')
  const [feeRaw, setFeeRaw] = useState('')
  const [categoryUid, setCategoryUid] = useState<string | null>(null)
  const [categoryLabel, setCategoryLabel] = useState<string | null>(null)
  const [assetUid, setAssetUid] = useState<string | null>(null)
  const [toAssetUid, setToAssetUid] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [description, setDescription] = useState('')
  const [mark, setMark] = useState(false)
  const [recur, setRecur] = useState<RecurringValue>(EMPTY_RECUR)
  const [allTags, setAllTags] = useState<TagRecord[]>([])
  const [tagUids, setTagUids] = useState<string[]>([])

  const [assets, setAssets] = useState<Asset[]>([])
  const [balances, setBalances] = useState<Map<string, number>>(new Map())
  const [currency, setCurrency] = useState<Currency | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [newPhotos, setNewPhotos] = useState<{ uid: string; dataUrl: string; name: string }[]>([])

  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false)
  const [tagPickerOpen, setTagPickerOpen] = useState(false)
  const [assetPicker, setAssetPicker] = useState<'from' | 'to' | null>(null)
  const [recurringOpen, setRecurringOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copyOpen, setCopyOpen] = useState(false)
  const [copyDate, setCopyDate] = useState<'today' | 'entry'>('today')
  const [viewerPhoto, setViewerPhoto] = useState<{ uid: string; dataUrl: string } | null>(null)



  const fileRef = useRef<HTMLInputElement>(null)
  // Stable uid per form session so photos can attach before the first save.
  const uidRef = useRef(transaction?.uid ?? genUid('trx'))

  useEffect(() => {
    if (!open) return
    let active = true
    const source = transaction ?? null

    setType((source?.DO_TYPE as TrxType) ?? initial?.type ?? 'expense')
    setDate(source?.ZDATE ?? initial?.date ?? todayIso())
    setRaw(source ? String(Number(source.ZMONEY) || '') : initial?.amount ? String(initial.amount) : '')
    setFeeRaw(source?.FEE ? String(source.FEE) : initial?.fee ? String(initial.fee) : '')
    setCategoryUid(source?.ctgUid ?? initial?.categoryUid ?? null)
    setCategoryLabel(source?.CATEGORY_NAME ?? initial?.categoryName ?? null)
    setAssetUid(source?.assetUid ?? initial?.assetUid ?? null)
    setToAssetUid(source?.toAssetUid ?? initial?.toAssetUid ?? null)
    setNote(source?.ZCONTENT ?? initial?.note ?? '')
    setDescription(source?.ZDATA ?? initial?.description ?? '')
    setMark((source?.MARK ?? (initial?.mark ? 1 : 0)) === 1)
    setRecur({
      recurType: source?.RECUR_TYPE ?? initial?.recurType ?? null,
      recurFreq: source?.RECUR_FREQ ?? initial?.recurFreq ?? null,
      installmentMonths: source?.INSTALLMENT_MONTHS ?? initial?.installmentMonths ?? null,
    })
    setNewPhotos([])

    ;(async () => {
      const [assetList, balanceMap, main, photoList, tagList, attached] = await Promise.all([
        getAllAssets(),
        getAssetBalances(),
        getMainCurrency(),
        source?.uid ? getPhotosByTransaction(source.uid) : Promise.resolve([] as Photo[]),
        getTags(),
        source?.uid ? getTagUidsForTransaction(source.uid) : Promise.resolve([] as string[]),
      ])
      if (!active) return
      setAssets(assetList)
      setBalances(balanceMap)
      setCurrency(main ?? null)
      setPhotos(photoList)
      setAllTags(tagList)
      setTagUids(initial?.tagUids ?? attached)
    })()

    return () => {
      active = false
    }
  }, [open, transaction, initial])

  const decimals = currency?.DECIMAL_POINT ?? 0
  const amount = raw ? Number(raw) : 0
  const fee = feeRaw ? Number(feeRaw) : 0

  const assetName = useMemo(
    () => assets.find((a) => a.uid === assetUid)?.NIC_NAME ?? null,
    [assets, assetUid],
  )
  const toAssetName = useMemo(
    () => assets.find((a) => a.uid === toAssetUid)?.NIC_NAME ?? null,
    [assets, toAssetUid],
  )

  const tagLabel = useMemo(() => {
    const names = allTags.filter((tag) => tagUids.includes(tag.uid)).map((tag) => tag.name)
    return names.length > 0 ? names.join(', ') : null
  }, [allTags, tagUids])

  const assetItems: PickerItem[] = useMemo(
    () =>
      assets.map((asset) => ({
        value: asset.uid,
        label: asset.NIC_NAME,
        trailing: formatCurrency(balances.get(asset.uid) ?? asset.BALANCE, currency),
      })),
    [assets, balances, currency],
  )

  const recurLabel = useMemo(() => {
    if (recur.recurType === 'repeat' && recur.recurFreq !== null) {
      return RECUR_FREQUENCIES[recur.recurFreq]
    }
    if (recur.recurType === 'installment' && recur.installmentMonths) {
      return `Cicilan ${recur.installmentMonths} bulan`
    }
    return null
  }, [recur])

  const validate = (): string[] => {
    const list: string[] = []
    if (type === 'transfer') {
      if (!assetUid || !toAssetUid) list.push('Pilih aset sumber (Uang keluar) dan aset tujuan (Uang masuk).')
      else if (assetUid === toAssetUid) list.push('Aset sumber dan tujuan tidak boleh sama.')
    } else {
      if (!categoryUid) list.push('Kategori belum dipilih.')
      if (!assetUid) list.push('Aset belum dipilih.')
    }
    return list
  }

  const save = async (keepOpen: boolean) => {
    const found = validate()
    if (found.length > 0) {
      for (const message of found) toast.error(message)
      return
    }

    const uid = uidRef.current
    const now = new Date()
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`

    if (transaction?.id) {
      await updateTransaction(transaction.id, {
        DO_TYPE: type,
        ZDATE: date,
        WDATE: `${date} ${time}`,
        wtime: time,
        ZMONEY: String(amount),
        IN_ZMONEY: type === 'transfer' ? String(amount) : null,
        AMOUNT_ACCOUNT: amount,
        FEE: type === 'transfer' ? fee : 0,
        ctgUid: type === 'transfer' ? '' : (categoryUid ?? ''),
        assetUid: assetUid ?? '',
        toAssetUid: type === 'transfer' ? toAssetUid : null,
        ZCONTENT: note || null,
        ZDATA: description || null,
        MARK: mark ? 1 : 0,
        ASSET_NIC: assetName,
        CATEGORY_NAME: type === 'transfer' ? null : categoryLabel,
        RECUR_TYPE: recur.recurType,
        RECUR_FREQ: recur.recurFreq,
        INSTALLMENT_MONTHS: recur.installmentMonths,
        UTIME: Date.now(),
      })
    } else {
      await createTransaction({
        uid,
        assetUid: assetUid ?? '',
        CARDDIVIDMONTH: null,
        ctgUid: type === 'transfer' ? '' : (categoryUid ?? ''),
        toAssetUid: type === 'transfer' ? toAssetUid : null,
        ZCONTENT: note || null,
        ZDATE: date,
        WDATE: `${date} ${time}`,
        wtime: time,
        paid: null,
        DO_TYPE: type,
        ZMONEY: String(amount),
        txUidTrans: null,
        ZDATA: description || null,
        SMS_RDATE: null,
        IN_ZMONEY: type === 'transfer' ? String(amount) : null,
        ASSET_NIC: assetName,
        CATEGORY_NAME: type === 'transfer' ? null : categoryLabel,
        cardDivideUid: null,
        CARD_DIVIDE_MONTH_STR: null,
        MARK: mark ? 1 : 0,
        txUidFee: null,
        SMS_ORIGIN: null,
        SMS_PARSE_CONTENT: null,
        IS_DEL: 0,
        UTIME: Date.now(),
        currencyUid: currency?.uid ?? 'IDR_IDR',
        AMOUNT_ACCOUNT: amount,
        lat: null,
        lng: null,
        gstd: null,
        FEE: type === 'transfer' ? fee : 0,
        RECUR_TYPE: recur.recurType,
        RECUR_FREQ: recur.recurFreq,
        INSTALLMENT_MONTHS: recur.installmentMonths,
        RECUR_UID: null,
        isSynced: 0,
        syncTime: 0,
        syncVersion: 1,
      })
    }

    // Keep the recurring series in sync with the frequency picked above
    // (PRD-05 §8.1): saving with a frequency starts/updates it, clearing it stops.
    await syncRepeatSeries({
      uid,
      DO_TYPE: type,
      ZDATE: date,
      ctgUid: type === 'transfer' ? '' : (categoryUid ?? ''),
      assetUid: assetUid ?? '',
      toAssetUid: type === 'transfer' ? toAssetUid : null,
      currencyUid: currency?.uid ?? 'IDR_IDR',
      AMOUNT_ACCOUNT: amount,
      FEE: type === 'transfer' ? fee : 0,
      ZCONTENT: note || null,
      ZDATA: description || null,
      CATEGORY_NAME: type === 'transfer' ? null : categoryLabel,
      ASSET_NIC: assetName,
      MARK: mark ? 1 : 0,
      RECUR_TYPE: recur.recurType,
      RECUR_FREQ: recur.recurFreq,
    })

    for (const photo of newPhotos) {
      await createPhoto({ txUid: uid, dataUrl: photo.dataUrl, fileName: photo.name })
    }

    await setTransactionTags(uid, tagUids)

    if (keepOpen) {
      // Simpan & Lanjut: keep type + date + asset, clear the entry itself.
      setRaw('')
      setFeeRaw('')
      setCategoryUid(null)
      setCategoryLabel(null)
      setNote('')
      setDescription('')
      setMark(false)
      setRecur(EMPTY_RECUR)
      setTagUids([])
      setPhotos([])
      setNewPhotos([])

      uidRef.current = genUid('trx')
    }
    onSaved(keepOpen, date)
  }

  const removePhoto = async (photo: Photo) => {
    if (photo.uid) await softDeletePhoto(photo.uid)
    setPhotos((list) => list.filter((p) => p.uid !== photo.uid))
  }

  const handleFile = (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '')
      if (!dataUrl) return
      setNewPhotos((list) => [...list, { uid: genUid('photo'), dataUrl, name: file.name }])
    }
    reader.readAsDataURL(file)
  }

  const title =
    type === 'income' ? 'Pendapatan' : type === 'transfer' ? 'Transfer' : 'Pengeluaran'
  const dateValue = fromIso(date)
  const weekday = WEEKDAYS_SHORT[dateValue.getDay()]
  const relative = relativeDateLabel(date)
  const showsCategory = type !== 'transfer'
  const allPhotos = [
    ...photos.map((p) => ({ uid: p.uid, dataUrl: p.FILE_PATH, pending: false as const })),
    ...newPhotos.map((p) => ({ uid: p.uid, dataUrl: p.dataUrl, pending: true as const })),
  ]

  return (
    <FullScreenSheet open={open} testId="transaction-form">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/85 px-3 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Kembali"
          data-testid="trx-form-back"
          onClick={onClose}
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight">
          {isEdit ? `Ubah ${title}` : title}
        </h1>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Daftar Bookmark"
          aria-pressed={mark}
          data-testid="trx-form-bookmark-list"
          onClick={onOpenBookmarks}
        >
          <Star
            aria-hidden="true"
            className={cn('size-5', mark && 'fill-primary text-primary')}
          />
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-4">
          <div
            role="tablist"
            aria-label="Tipe transaksi"
            className="grid grid-cols-3 gap-1 rounded-xl border bg-secondary/40 p-1"
          >
            {TRX_TYPES.map((option) => (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={type === option}
                data-testid={`trx-type-${option}`}
                onClick={() => {
                  setType(option)
            
                }}
                className={cn(
                  'rounded-lg px-2 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  type === option
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-secondary',
                )}
              >
                {option === 'income' ? 'Pendapatan' : option === 'expense' ? 'Pengeluaran' : 'Transfer'}
              </button>
            ))}
          </div>

          {/* Tanggal */}
          <div className="rounded-2xl border bg-card">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <label className="text-sm text-muted-foreground">Tanggal</label>
              <div className="flex items-center gap-2">
                {relative && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                    {relative}
                  </span>
                )}
                <button
                  type="button"
                  data-testid="trx-date-input"
                  onClick={() => setDatePickerOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium tabular-nums transition-colors hover:bg-secondary focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Calendar aria-hidden="true" className="size-4 text-muted-foreground" />
                  {formatShortDate(date)}
                  <span className="text-xs text-muted-foreground">({weekday})</span>
                </button>
              </div>
            </div>

            {datePickerOpen && (
              <div className="border-t p-4">
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    aria-label="Bulan sebelumnya"
                    onClick={() =>
                      setDatePickerCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))
                    }
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <span className="text-sm font-medium" data-testid="date-picker-month-label">
                    {datePickerCursor.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    type="button"
                    aria-label="Bulan selanjutnya"
                    onClick={() =>
                      setDatePickerCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))
                    }
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
                <div className="mb-2 grid grid-cols-7 gap-1">
                  {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
                    <span
                      key={day}
                      className="py-1 text-center text-xs font-medium text-muted-foreground"
                    >
                      {day}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const year = datePickerCursor.getFullYear()
                    const month = datePickerCursor.getMonth()
                    const firstDay = new Date(year, month, 1).getDay()
                    const daysInMonth = new Date(year, month + 1, 0).getDate()
                    const today = todayIso()
                    const cells: React.ReactNode[] = []
                    for (let i = 0; i < firstDay; i++) cells.push(<span key={`empty-${i}`} />)
                    for (let d = 1; d <= daysInMonth; d++) {
                      const iso = toIso(new Date(year, month, d))
                      const isToday = iso === today
                      const isSelected = iso === date
                      cells.push(
                        <button
                          key={iso}
                          type="button"
                          onClick={() => {
                            setDate(iso)
                            setDatePickerOpen(false)
                          }}
                          className={cn(
                            'flex size-8 items-center justify-center rounded-full text-sm transition-colors',
                            isSelected
                              ? 'bg-primary font-semibold text-primary-foreground'
                              : isToday
                                ? 'border border-primary font-medium text-primary'
                                : 'hover:bg-secondary',
                          )}
                        >
                          {d}
                        </button>,
                      )
                    }
                    return cells
                  })()}
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDate(todayIso())
                      setDatePickerOpen(false)
                    }}
                  >
                    Hari ini
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDatePickerOpen(false)}
                  >
                    Tutup
                  </Button>
                </div>
              </div>
            )}

            {/* Berulang/cicil */}
            <button
              type="button"
              data-testid="trx-recurring-button"
              onClick={() => setRecurringOpen(true)}
              className="flex w-full items-center justify-between gap-3 border-t px-4 py-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarClock aria-hidden="true" className="size-4" />
                Berulang/cicil
              </span>
              <span
                className={cn('truncate text-sm', recurLabel ? 'font-medium' : 'text-muted-foreground')}
                data-testid="trx-recurring-value"
              >
                {recurLabel ?? 'Tidak ada'}
              </span>
            </button>
          </div>

          {/* Nominal + pembayaran */}
          {showsCategory ? (
            <div className="rounded-2xl border bg-card">
              <button
                type="button"
                data-testid="trx-category-button"
                
                onClick={() => setCategoryPickerOpen(true)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Tag aria-hidden="true" className="size-4" />
                  Kategori
                </span>
                <span
                  data-testid="trx-category-value"
                  className={cn(
                    'truncate text-sm',
                    categoryLabel ? 'font-medium' : 'text-muted-foreground',
                  )}
                >
                  {categoryLabel ?? 'Pilih kategori'}
                </span>
              </button>

              <button
                type="button"
                data-testid="trx-asset-button"
                
                onClick={() => setAssetPicker('from')}
                className="flex w-full items-center justify-between gap-3 border-t px-4 py-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Wallet aria-hidden="true" className="size-4" />
                  Aset
                </span>
                <span
                  data-testid="trx-asset-value"
                  className={cn('truncate text-sm', assetName ? 'font-medium' : 'text-muted-foreground')}
                >
                  {assetName ?? 'Pilih aset'}
                </span>
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border bg-card">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <label htmlFor="trx-fee-input" className="text-sm text-muted-foreground">
                  Biaya
                </label>
                <input
                  id="trx-fee-input"
                  inputMode="decimal"
                  data-testid="trx-fee-input"
                  value={feeRaw}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d.,-]/g, '')
                    setFeeRaw(formatTypingAmount(raw, currency))
                  }}
                  placeholder="0"
                  className="w-28 rounded-lg border border-input bg-background px-2 py-1.5 text-right text-sm tabular-nums focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <button
                type="button"
                data-testid="trx-from-asset-button"
                
                onClick={() => setAssetPicker('from')}
                className="flex w-full items-center justify-between gap-3 border-t px-4 py-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <span className="text-sm text-muted-foreground">Uang keluar</span>
                <span
                  data-testid="trx-from-asset-value"
                  className={cn('truncate text-sm', assetName ? 'font-medium' : 'text-muted-foreground')}
                >
                  {assetName ?? 'Pilih aset'}
                </span>
              </button>

              <button
                type="button"
                data-testid="trx-to-asset-button"
                
                onClick={() => setAssetPicker('to')}
                className="flex w-full items-center justify-between gap-3 border-t px-4 py-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <span className="text-sm text-muted-foreground">Uang masuk</span>
                <span
                  data-testid="trx-to-asset-value"
                  className={cn('truncate text-sm', toAssetName ? 'font-medium' : 'text-muted-foreground')}
                >
                  {toAssetName ?? 'Pilih aset'}
                </span>
              </button>
            </div>
          )}

          {/* Catatan & deskripsi */}
          <div className="rounded-2xl border bg-card">
            <div className="flex items-center gap-3 px-4 py-3">
              <label htmlFor="trx-note-input" className="w-20 shrink-0 text-sm text-muted-foreground">
                Catatan
              </label>
              <input
                id="trx-note-input"
                type="text"
                data-testid="trx-note-input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Catatan singkat"
                className="min-w-0 flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex items-start gap-3 border-t px-4 py-3">
              <label
                htmlFor="trx-description-input"
                className="w-20 shrink-0 pt-1.5 text-sm text-muted-foreground"
              >
                Deskripsi
              </label>
              <textarea
                id="trx-description-input"
                data-testid="trx-description-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Deskripsi"
                className="min-w-0 flex-1 resize-none rounded-lg border border-input bg-background px-2 py-1.5 text-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex items-center gap-3 border-t px-4 py-3">
              <span className="w-20 shrink-0 text-sm text-muted-foreground">Tag</span>
              <button
                type="button"
                data-testid="trx-tag-button"
                onClick={() => setTagPickerOpen(true)}
                className="flex min-w-0 flex-1 items-center justify-end gap-1 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  data-testid="trx-tag-value"
                  className={cn('truncate', tagLabel ? 'font-medium' : 'text-muted-foreground')}
                >
                  {tagLabel ?? 'Pilih tag'}
                </span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </div>
            <div className="flex items-center gap-3 border-t px-4 py-3">
              <span className="w-20 shrink-0 text-sm text-muted-foreground">Foto</span>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                {allPhotos.map((photo) => (
                  <span key={photo.uid} className="relative">
                    <button
                      type="button"
                      aria-label="Lihat foto"
                      data-testid={`trx-photo-thumb-${photo.uid}`}
                      onClick={() => setViewerPhoto({ uid: photo.uid, dataUrl: photo.dataUrl })}
                      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.dataUrl}
                        alt="Lampiran transaksi"
                        className="size-14 rounded-lg border object-cover"
                      />
                    </button>
                    <button
                      type="button"
                      aria-label="Hapus foto"
                      onClick={() => {
                        if (photo.pending) {
                          setNewPhotos((list) => list.filter((p) => p.uid !== photo.uid))
                        } else {
                          const found = photos.find((p) => p.uid === photo.uid)
                          if (found) removePhoto(found)
                        }
                      }}
                      className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <X aria-hidden="true" className="size-3" />
                    </button>
                  </span>
                ))}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  data-testid="trx-photo-input"
                  className="hidden"
                  onChange={(e) => {
                    handleFile(e.target.files)
                    e.target.value = ''
                  }}
                />
                <button
                  type="button"
                  data-testid="trx-photo-button"
                  onClick={() => fileRef.current?.click()}
                  className="flex size-14 items-center justify-center rounded-lg border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Camera aria-hidden="true" className="size-5" />
                  <span className="sr-only">Tambah foto</span>
                </button>
              </div>
            </div>
          </div>

          {/* Aksi khusus mode edit */}
          {isEdit && (
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="destructive"
                className="h-11"
                data-testid="trx-delete-button"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-4" />
                Hapus
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11"
                data-testid="trx-copy-button"
                onClick={() => {
                  setCopyDate('today')
                  setCopyOpen(true)
                }}
              >
                <Copy className="size-4" />
                Salin
              </Button>
              <Button
                type="button"
                variant={mark ? 'secondary' : 'outline'}
                className="h-11"
                aria-pressed={mark}
                data-testid="trx-mark-button"
                onClick={() => setMark((value) => !value)}
              >
                <Star className={cn('size-4', mark && 'fill-primary text-primary')} />
                Bookmark
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Numpad */}
      <div className="border-t bg-card/75 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl">
        <div className="mx-auto w-full max-w-lg">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Total</p>
              <p
                className="truncate text-xl font-bold tabular-nums md:text-2xl"
                data-testid="trx-amount-display"
              >
                {formatTypingAmount(raw, currency)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className="rounded-lg border bg-secondary/60 px-3 py-1.5 text-sm font-semibold tabular-nums"
                data-testid="trx-currency-label"
                title={`Mata uang utama: ${currency?.ISO ?? 'IDR'}`}
              >
                {currency?.SYMBOL ?? 'Rp'}
              </span>
              <NumpadBackspace
                onKey={() => setRaw((current) => applyNumpadKey(current, 'back', decimals))}
              />
            </div>
          </div>

          <Numpad
            decimals={decimals}
            showBackspace={false}
            onKey={(key: NumpadKey) => setRaw((current) => applyNumpadKey(current, key, decimals))}
          />

          <div className="mt-3 flex gap-2">
            {!isEdit && (
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1"
                data-testid="trx-save-next"
                onClick={() => save(true)}
              >
                Lanjut
              </Button>
            )}
            <Button
              type="button"
              className="h-11 flex-1"
              data-testid="trx-save"
              onClick={() => save(false)}
            >
              Menyimpan
            </Button>
          </div>
        </div>
      </div>

      <CategoryPicker
        open={categoryPickerOpen}
        type={type === 'income' ? 'income' : 'expense'}
        selectedUid={categoryUid}
        onSelect={(category: Category, parent: Category | null) => {
          setCategoryUid(category.uid)
          setCategoryLabel(parent ? `${parent.NAME} › ${category.NAME}` : category.NAME)

        }}
        onClose={() => setCategoryPickerOpen(false)}
      />

      <TransactionTagPicker
        open={tagPickerOpen}
        tags={allTags}
        selected={tagUids}
        onToggle={(uid) =>
          setTagUids((list) => (list.includes(uid) ? list.filter((v) => v !== uid) : [...list, uid]))
        }
        onCreate={async (name) => {
          const id = await createTag(name)
          const list = await getTags()
          setAllTags(list)
          const created = list.find((tag) => tag.id === id)
          if (created) {
            setTagUids((current) =>
              current.includes(created.uid) ? current : [...current, created.uid],
            )
          }
        }}
        onClose={() => setTagPickerOpen(false)}
      />

      <PickerSheet
        open={assetPicker !== null}
        title={assetPicker === 'to' ? 'Uang masuk' : assetPicker === 'from' && type === 'transfer' ? 'Uang keluar' : 'Aset'}
        items={assetItems}
        selected={assetPicker === 'to' ? toAssetUid : assetUid}
        onSelect={(value) => {
          if (assetPicker === 'to') {
            setToAssetUid(value)

          } else {
            setAssetUid(value)

          }
          setAssetPicker(null)
        }}
        onClose={() => setAssetPicker(null)}
        emptyLabel="Belum ada aset. Tambahkan dari tab Aset."
        testId="asset-picker"
      />

      <RecurringSheet
        open={recurringOpen}
        value={recur}
        onChange={setRecur}
        onClose={() => setRecurringOpen(false)}
      />

      {/* Photo viewer — tap a thumbnail to inspect it full-size. */}
      <Overlay
        open={viewerPhoto !== null}
        onClose={() => setViewerPhoto(null)}
        testId="trx-photo-viewer"
        label="Lampiran foto"
      >
        <div className="mx-auto w-full max-w-md rounded-2xl border bg-card p-3 shadow-xl">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold">Lampiran foto</h2>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Tutup"
              data-testid="trx-photo-viewer-close"
              onClick={() => setViewerPhoto(null)}
            >
              <X className="size-4.5" />
            </Button>
          </div>
          {viewerPhoto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              data-testid="trx-photo-viewer-image"
              src={viewerPhoto.dataUrl}
              alt="Lampiran transaksi"
              className="mt-3 max-h-[60vh] w-full rounded-xl border object-contain"
            />
          )}
        </div>
      </Overlay>

      <ConfirmDialog
        open={confirmDelete}
        title="Hapus transaksi"
        description="Apakah anda yakin ingin menghapusnya?"
        confirmLabel="Ya"
        cancelLabel="Tidak"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false)
          onDeleted()
        }}
      />

      <Overlay
        open={copyOpen}
        onClose={() => setCopyOpen(false)}
        align="bottom"
        label="Salin transaksi"
        testId="trx-copy-dialog"
      >
        <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border bg-card p-4 shadow-xl">
          <h2 className="text-base font-bold">Salin transaksi</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pilih tanggal untuk transaksi salinan.
          </p>
          <div className="mt-3 space-y-1">
            {(
              [
                { id: 'today', label: 'Salin dengan tanggal hari ini' },
                { id: 'entry', label: 'Salin dengan tanggal entri' },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                data-testid={`trx-copy-${option.id}`}
                aria-pressed={copyDate === option.id}
                onClick={() => setCopyDate(option.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                  'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  copyDate === option.id && 'bg-accent text-accent-foreground',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded-full border',
                    copyDate === option.id && 'border-primary bg-primary text-primary-foreground',
                  )}
                >
                  {copyDate === option.id && <Check className="size-3" />}
                </span>
                {option.label}
              </button>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setCopyOpen(false)}>
              Tidak
            </Button>
            <Button
              type="button"
              data-testid="trx-copy-confirm"
              onClick={() => {
                const draft: TransactionDraft = {
                  type,
                  date: copyDate === 'today' ? todayIso() : date,
                  amount,
                  categoryUid,
                  categoryName: categoryLabel,
                  assetUid,
                  assetName,
                  toAssetUid,
                  toAssetName,
                  fee,
                  note,
                  description,
                  mark,
                  tagUids,
                  ...recur,
                }
                setCopyOpen(false)
                // Close first, then hand the draft over: the screen reopens the
                // form prefilled, so the close must not win the state update.
                onClose()
                onCopy(draft)
              }}
            >
              YA
            </Button>
          </div>
        </div>
      </Overlay>
    </FullScreenSheet>
  )
}
