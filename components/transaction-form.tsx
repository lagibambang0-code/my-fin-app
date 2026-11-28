'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  AlignLeft,
  ArrowUpDown,
  Camera,
  Calendar,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
  Copy,
  Image as ImageIcon,
  PencilLine,
  Star,
  Tag,
  Tags,
  Trash2,
  Wallet,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Numpad,
  applyNumpadKey,
  type NumpadKey,
} from '@/components/ui/numpad'
import { FullScreenSheet, Overlay } from '@/components/ui/overlay'
import { DatePickerSheet } from '@/components/ui/date-picker-sheet'
import { TimePickerSheet } from '@/components/ui/time-picker-sheet'
import { PickerView, type PickerItem } from '@/components/ui/picker-sheet'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CategoryPickerView } from '@/components/transaction-category-picker'
import { TransactionTagPicker } from '@/components/transaction-tag-picker'
import { RecurringSheet, type RecurringValue } from '@/components/recurring-sheet'
import { useTranslation } from '@/components/language-provider'
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
  db,
  genUid,
  getAssetsInTabOrder,
  getAssetBalances,
  getMainCategoriesByType,
  getMainCurrency,
  getPhotosByTransaction,
  getTagUidsForTransaction,
  getTags,
  setTransactionTags,
  softDeletePhoto,
  softDeleteTransaction,
  syncRepeatSeries,
  updateTransaction,
} from '@/lib/db'
import {
  formatCurrency,
  formatShortDate,
  formatTypingAmount,
  fromIso,
  parseAmount,
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
  time?: string | null
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

type ActiveDrawer = 'numpad' | 'fee' | 'category' | 'asset_from' | 'asset_to' | null

/** Tappable picker row shared by the Kategori / Aset / Berulang fields. */
function FieldRow({
  testId,
  valueTestId,
  icon,
  label,
  value,
  placeholder,
  onAction,
  divided = true,
  rightAction,
}: {
  testId: string
  valueTestId?: string
  icon: ReactNode
  label: string
  value: string | null | undefined
  placeholder: string
  onAction: () => void
  divided?: boolean
  rightAction?: ReactNode
}) {
  return (
    <div className={cn('relative flex items-center', divided && 'border-t')}>
      <button
        type="button"
        data-testid={testId}
        onClick={onAction}
        className="flex min-h-12 flex-1 items-center justify-between gap-3 px-3.5 py-2 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary/60 text-secondary-foreground">
            {icon}
          </span>
          {label}
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            data-testid={valueTestId}
            className={cn(
              'truncate text-xs sm:text-sm',
              value ? 'font-semibold text-foreground' : 'text-muted-foreground',
            )}
          >
            {value ?? placeholder}
          </span>
          {!rightAction && <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />}
        </span>
      </button>
      {rightAction && <div className="pr-3.5 shrink-0">{rightAction}</div>}
    </div>
  )
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
  const { t, language } = useTranslation()
  const isEdit = Boolean(transaction?.id)
  const [type, setType] = useState<TrxType>('expense')
  const [date, setDate] = useState(todayIso())
  const [time, setTime] = useState(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [timePickerOpen, setTimePickerOpen] = useState(false)
  const [raw, setRaw] = useState('')
  const [negative, setNegative] = useState(false)
  const [activeSheet, setActiveSheet] = useState<ActiveDrawer>(null)
  const [fee, setFee] = useState(0)
  const [feeRaw, setFeeRaw] = useState('')
  const [showFee, setShowFee] = useState(false)
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
  const [origTagUids, setOrigTagUids] = useState<string[]>([])
  const [photoDeleted, setPhotoDeleted] = useState(false)

  const [assets, setAssets] = useState<Asset[]>([])
  const [balances, setBalances] = useState<Map<string, number>>(new Map())
  const [currency, setCurrency] = useState<Currency | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [newPhotos, setNewPhotos] = useState<{ uid: string; dataUrl: string; name: string }[]>([])

  const [tagPickerOpen, setTagPickerOpen] = useState(false)
  const [recurringOpen, setRecurringOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copyOpen, setCopyOpen] = useState(false)
  const [copyDate, setCopyDate] = useState<'today' | 'entry'>('today')
  const [viewerPhoto, setViewerPhoto] = useState<{ uid: string; dataUrl: string } | null>(null)



  const fileRef = useRef<HTMLInputElement>(null)
  const noteInputRef = useRef<HTMLInputElement>(null)
  const formScrollRef = useRef<HTMLDivElement>(null)
  const actionButtonsRef = useRef<HTMLDivElement>(null)
  // Stable uid per form session so photos can attach before the first save.
  const uidRef = useRef(transaction?.uid ?? genUid('trx'))

  const [keyboardInset, setKeyboardInset] = useState(0)

  const scrollToButtons = useCallback(() => {
    setTimeout(() => {
      if (actionButtonsRef.current) {
        actionButtonsRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        })
      } else if (formScrollRef.current) {
        formScrollRef.current.scrollTo({
          top: formScrollRef.current.scrollHeight,
          behavior: 'smooth',
        })
      }
    }, 150)
  }, [])

  const focusNoteAndScrollDown = useCallback(() => {
    setTimeout(() => {
      noteInputRef.current?.focus()
      scrollToButtons()
    }, 150)
  }, [scrollToButtons])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return

    const handleViewportChange = () => {
      const vv = window.visualViewport
      if (!vv) return
      const diff = Math.round(window.innerHeight - vv.height)
      const inset = diff > 120 ? diff : 0
      setKeyboardInset(inset)

      const activeEl = document.activeElement
      if (
        activeEl &&
        (activeEl.id === 'trx-note-input' || activeEl.id === 'trx-description-input')
      ) {
        scrollToButtons()
      }
    }

    const vv = window.visualViewport
    vv.addEventListener('resize', handleViewportChange)
    vv.addEventListener('scroll', handleViewportChange)
    return () => {
      vv.removeEventListener('resize', handleViewportChange)
      vv.removeEventListener('scroll', handleViewportChange)
    }
  }, [scrollToButtons])

  useEffect(() => {
    if (keyboardInset > 0) {
      const activeEl = document.activeElement
      if (
        activeEl &&
        (activeEl.id === 'trx-note-input' || activeEl.id === 'trx-description-input')
      ) {
        scrollToButtons()
      }
    }
  }, [keyboardInset, scrollToButtons])

  // Auto-scroll ke tombol simpan/lanjut saat input aset aktif
  useEffect(() => {
    if (activeSheet === 'asset_from' || activeSheet === 'asset_to') {
      scrollToButtons()
    }
  }, [activeSheet, scrollToButtons])

  const handleSwapAssets = () => {
    const prevFrom = assetUid
    const prevTo = toAssetUid
    setAssetUid(prevTo)
    setToAssetUid(prevFrom)
  }

  useEffect(() => {
    if (!open) return
    let active = true
    const source = transaction ?? null
    const rawDoType = source?.DO_TYPE
    const resolvedType: TrxType =
      rawDoType === '0' || rawDoType === 'income'
        ? 'income'
        : rawDoType === '3' || rawDoType === '4' || rawDoType === 'transfer'
        ? 'transfer'
        : rawDoType === '1' || rawDoType === 'expense'
        ? 'expense'
        : (rawDoType as TrxType) ?? initial?.type ?? 'expense'
    setType(resolvedType)
    const targetDate = source?.ZDATE ?? initial?.date ?? todayIso()
    setDate(targetDate)
    const today = todayIso()
    const now = new Date()
    const currentRealTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setTime(
      source?.wtime
        ? source.wtime.slice(0, 5)
        : ((initial as { time?: string })?.time ?? (targetDate < today ? '20:55' : currentRealTime)),
    )
    const startMoney = source ? Number(source.ZMONEY) || 0 : (initial?.amount ?? 0)
    setRaw(startMoney !== 0 ? String(Math.abs(startMoney)) : '')
    setNegative(startMoney < 0)
    const isNew = !source && !initial?.categoryUid && !initial?.amount
    setActiveSheet(isNew && !isEdit ? 'numpad' : null)
    const initFee = Number(source?.FEE || initial?.fee || 0) || 0
    setFee(initFee)
    setFeeRaw(initFee > 0 ? String(initFee) : '')
    setShowFee(initFee > 0)
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
    setPhotoDeleted(false)
    setOrigTagUids([])

    ;(async () => {
      const [assetList, balanceMap, main, photoList, tagList, attached] = await Promise.all([
        getAssetsInTabOrder(true),
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
      if (initFee === 0 && source?.txUidFee) {
        const feeRow = await db.transactions.where('uid').equals(source.txUidFee).first()
        if (feeRow && active) {
          setFee(Number(feeRow.AMOUNT_ACCOUNT ?? feeRow.ZMONEY) || 0)
        }
      }
      const initialTags = initial?.tagUids ?? attached
      setTagUids(initialTags)
      setOrigTagUids(initialTags)
    })()

    return () => {
      active = false
    }
  }, [open, transaction, initial])

  const decimals = currency?.DECIMAL_POINT ?? 0
  const amount = (negative && Number(raw) > 0 ? -1 : 1) * (raw ? Number(raw) : 0)

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
      assets
        .filter((asset) => asset.IS_SHOW === 1 || asset.uid === assetUid || asset.uid === toAssetUid)
        .map((asset) => ({
          value: asset.uid,
          label: asset.NIC_NAME,
          trailing: formatCurrency(balances.get(asset.uid) ?? 0, currency),
        })),
    [assets, assetUid, toAssetUid, balances, currency],
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

  const tagsChanged = useMemo(() => {
    if (tagUids.length !== origTagUids.length) return true
    const s = new Set(origTagUids)
    return tagUids.some((uid) => !s.has(uid))
  }, [tagUids, origTagUids])

  const isDirty = useMemo(() => {
    if (!isEdit || !transaction) return false
    const origMoney = Number(transaction.ZMONEY) || 0
    if (amount !== origMoney) return true
    if (date !== (transaction.ZDATE ?? '')) return true
    const origTime = transaction.wtime ? transaction.wtime.slice(0, 5) : ''
    if (time !== origTime) return true
    const rawDoType = transaction.DO_TYPE
    const origType =
      rawDoType === '0' || rawDoType === 'income'
        ? 'income'
        : rawDoType === '3' || rawDoType === '4' || rawDoType === 'transfer'
        ? 'transfer'
        : rawDoType === '1' || rawDoType === 'expense'
        ? 'expense'
        : 'expense'
    if (type !== origType) return true
    if ((categoryUid ?? '') !== (transaction.ctgUid ?? '')) return true
    if ((assetUid ?? '') !== (transaction.assetUid ?? '')) return true
    if ((toAssetUid ?? '') !== (transaction.toAssetUid ?? '')) return true
    const origFee = Number(transaction.FEE || 0)
    if (fee !== origFee) return true
    if (note !== (transaction.ZCONTENT ?? '')) return true
    if (description !== (transaction.ZDATA ?? '')) return true
    const origMark = (transaction.MARK ?? 0) === 1
    if (mark !== origMark) return true
    if (newPhotos.length > 0 || photoDeleted) return true
    if (tagsChanged) return true
    if ((recur.recurType ?? null) !== (transaction.RECUR_TYPE ?? null)) return true
    if ((recur.recurFreq ?? null) !== (transaction.RECUR_FREQ ?? null)) return true
    if ((recur.installmentMonths ?? null) !== (transaction.INSTALLMENT_MONTHS ?? null)) return true
    return false
  }, [
    isEdit,
    transaction,
    amount,
    date,
    time,
    type,
    categoryUid,
    assetUid,
    toAssetUid,
    fee,
    note,
    description,
    mark,
    newPhotos.length,
    photoDeleted,
    tagsChanged,
    recur,
  ])


  const handleNumpadDone = () => {
    if (!isEdit) {
      if (type !== 'transfer') {
        if (!categoryUid) {
          setActiveSheet('category')
        } else if (!assetUid) {
          setActiveSheet('asset_from')
        } else {
          setActiveSheet(null)
          if (!note) focusNoteAndScrollDown()
        }
      } else {
        if (showFee && fee === 0 && !feeRaw) {
          setActiveSheet('fee')
        } else if (!assetUid) {
          setActiveSheet('asset_from')
        } else if (!toAssetUid) {
          setActiveSheet('asset_to')
        } else {
          setActiveSheet(null)
          if (!note) focusNoteAndScrollDown()
        }
      }
    } else {
      setActiveSheet(null)
    }
  }

  const handleFeeDone = () => {
    const parsed = Number.isNaN(parseAmount(feeRaw)) ? 0 : parseAmount(feeRaw)
    setFee(parsed)
    if (!isEdit) {
      if (!assetUid) {
        setActiveSheet('asset_from')
      } else if (!toAssetUid) {
        setActiveSheet('asset_to')
      } else {
        const hasAmount = raw !== '' && Number(raw) > 0
        if (!hasAmount) {
          setActiveSheet('numpad')
        } else {
          setActiveSheet(null)
          if (!note) focusNoteAndScrollDown()
        }
      }
    } else {
      setActiveSheet(null)
    }
  }

  const handleCategorySelect = (category: Category, parent: Category | null) => {
    setCategoryUid(category.uid)
    setCategoryLabel(parent ? `${parent.NAME} › ${category.NAME}` : category.NAME)
    if (!isEdit) {
      const hasAmount = raw !== '' && Number(raw) > 0
      if (!hasAmount) {
        setActiveSheet('numpad')
      } else if (!assetUid) {
        setActiveSheet('asset_from')
      } else {
        setActiveSheet(null)
        if (!note) focusNoteAndScrollDown()
      }
    } else {
      setActiveSheet(null)
    }
  }

  const handleAssetSelect = (value: string) => {
    if (activeSheet === 'asset_to') {
      setToAssetUid(value)
      if (!isEdit) {
        const hasAmount = raw !== '' && Number(raw) > 0
        if (!assetUid) {
          setActiveSheet('asset_from')
        } else if (!hasAmount) {
          setActiveSheet('numpad')
        } else if (showFee && fee === 0 && !feeRaw) {
          setActiveSheet('fee')
        } else {
          setActiveSheet(null)
          if (!note) focusNoteAndScrollDown()
        }
      } else {
        setActiveSheet(null)
      }
    } else {
      setAssetUid(value)
      if (!isEdit) {
        const hasAmount = raw !== '' && Number(raw) > 0
        if (type === 'transfer') {
          if (!toAssetUid) {
            setActiveSheet('asset_to')
          } else if (!hasAmount) {
            setActiveSheet('numpad')
          } else if (showFee && fee === 0 && !feeRaw) {
            setActiveSheet('fee')
          } else {
            setActiveSheet(null)
            if (!note) focusNoteAndScrollDown()
          }
        } else {
          if (!hasAmount) {
            setActiveSheet('numpad')
          } else if (!categoryUid) {
            setActiveSheet('category')
          } else {
            setActiveSheet(null)
            if (!note) focusNoteAndScrollDown()
          }
        }
      } else {
        setActiveSheet(null)
      }
    }
  }

  const save = async (keepOpen: boolean) => {
    const hasAmount = raw !== '' && Number(raw) > 0
    if (!hasAmount) {
      setActiveSheet('numpad')
      return
    }

    if (type === 'transfer') {
      if (!assetUid) {
        setActiveSheet('asset_from')
        return
      }
      if (!toAssetUid) {
        setActiveSheet('asset_to')
        return
      }
      if (assetUid === toAssetUid) {
        toast.error('Aset sumber dan tujuan tidak boleh sama.')
        setActiveSheet('asset_to')
        return
      }
    } else {
      if (!categoryUid) {
        setActiveSheet('category')
        return
      }
      if (!assetUid) {
        setActiveSheet('asset_from')
        return
      }
    }

    const uid = transaction?.uid ?? uidRef.current
    const timeFormatted = `${time || '12:00'}:00`

    let linkedFeeUid = transaction?.txUidFee ?? null
    const feeLabel = language === 'en' ? 'Transfer fee' : 'Biaya transfer'

    if (type === 'transfer') {
      if (fee > 0) {
        // Money Manager parity (InputRoot.java:1817-1824 & InputUtil.java:89-146):
        // When a transfer has a fee, Money Manager generates a real expense transaction (DO_TYPE = '1')
        // on the source asset, bound via txUidFee!
        const feeTxUid = linkedFeeUid || genUid('tx_fee')
        linkedFeeUid = feeTxUid
        const existingFeeTx = await db.transactions.where('uid').equals(feeTxUid).first()

        if (existingFeeTx?.id) {
          await updateTransaction(existingFeeTx.id, {
            DO_TYPE: '1',
            ZDATE: date,
            WDATE: `${date} ${timeFormatted}`,
            wtime: timeFormatted,
            ZMONEY: String(fee),
            AMOUNT_ACCOUNT: Math.abs(fee),
            ctgUid: 'cat_transfer_fee',
            assetUid: assetUid ?? '',
            toAssetUid: null,
            ZCONTENT: feeLabel,
            CATEGORY_NAME: feeLabel,
            txUidFee: uid,
            IS_DEL: 0,
            UTIME: Date.now(),
          })
        } else {
          await createTransaction({
            uid: feeTxUid,
            assetUid: assetUid ?? '',
            CARDDIVIDMONTH: null,
            ctgUid: 'cat_transfer_fee',
            toAssetUid: null,
            ZCONTENT: feeLabel,
            ZDATE: date,
            WDATE: `${date} ${timeFormatted}`,
            wtime: timeFormatted,
            paid: null,
            DO_TYPE: '1',
            ZMONEY: String(fee),
            txUidTrans: null,
            ZDATA: null,
            SMS_RDATE: null,
            IN_ZMONEY: null,
            ASSET_NIC: assetName,
            CATEGORY_NAME: feeLabel,
            cardDivideUid: null,
            CARD_DIVIDE_MONTH_STR: null,
            MARK: 0,
            txUidFee: uid,
            SMS_ORIGIN: null,
            SMS_PARSE_CONTENT: null,
            IS_DEL: 0,
            UTIME: Date.now(),
            currencyUid: currency?.uid ?? 'IDR_IDR',
            AMOUNT_ACCOUNT: Math.abs(fee),
            lat: null,
            lng: null,
            gstd: null,
            FEE: 0,
            RECUR_TYPE: null,
            RECUR_FREQ: null,
            INSTALLMENT_MONTHS: null,
            RECUR_UID: null,
            isSynced: 0,
            syncTime: 0,
            syncVersion: 1,
          })
        }
      } else if (transaction?.txUidFee) {
        // If fee was removed on edit from this transfer, soft-delete the existing fee transaction
        const oldFee = await db.transactions.where('uid').equals(transaction.txUidFee).first()
        if (oldFee?.id) {
          await db.transactions.update(oldFee.id, { IS_DEL: 1, UTIME: Date.now() })
        }
        linkedFeeUid = null
      }
    } else if (transaction?.txUidFee) {
      // Editing an expense transaction that was created as a fee linked to a transfer:
      // Keep parent transfer's FEE in sync with this amount!
      const parentTransfer = await db.transactions.where('uid').equals(transaction.txUidFee).first()
      if (parentTransfer?.id) {
        await db.transactions.update(parentTransfer.id, {
          FEE: Math.abs(amount),
          UTIME: Date.now(),
        })
      }
      linkedFeeUid = transaction.txUidFee
    }
    if (transaction?.id) {
      await updateTransaction(transaction.id, {
        DO_TYPE: type,
        ZDATE: date,
        WDATE: `${date} ${timeFormatted}`,
        wtime: timeFormatted,
        ZMONEY: String(amount),
        IN_ZMONEY: type === 'transfer' ? String(amount) : null,
        AMOUNT_ACCOUNT: Math.abs(amount),
        FEE: type === 'transfer' ? fee : 0,
        ctgUid: type === 'transfer' ? '' : (categoryUid ?? ''),
        assetUid: assetUid ?? '',
        toAssetUid: type === 'transfer' ? toAssetUid : null,
        ZCONTENT: note || null,
        ZDATA: description || null,
        MARK: mark ? 1 : 0,
        ASSET_NIC: assetName,
        CATEGORY_NAME: type === 'transfer' ? 'Transfer' : categoryLabel,
        txUidFee: linkedFeeUid,
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
        WDATE: `${date} ${timeFormatted}`,
        wtime: timeFormatted,
        paid: null,
        DO_TYPE: type,
        ZMONEY: String(amount),
        txUidTrans: null,
        ZDATA: description || null,
        SMS_RDATE: null,
        IN_ZMONEY: type === 'transfer' ? String(amount) : null,
        ASSET_NIC: assetName,
        CATEGORY_NAME: type === 'transfer' ? 'Transfer' : categoryLabel,
        cardDivideUid: null,
        CARD_DIVIDE_MONTH_STR: null,
        MARK: mark ? 1 : 0,
        txUidFee: linkedFeeUid,
        SMS_ORIGIN: null,
        SMS_PARSE_CONTENT: null,
        IS_DEL: 0,
        UTIME: Date.now(),
        currencyUid: currency?.uid ?? 'IDR_IDR',
        AMOUNT_ACCOUNT: Math.abs(amount),
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
      AMOUNT_ACCOUNT: Math.abs(amount),
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
      // Simpan & Lanjut:
      // Update time to current time for the next transaction, while resetting all input fields
      const now = new Date()
      setTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)

      setRaw('')
      setNegative(false)
      setActiveSheet('numpad')
      setFee(0)
      setFeeRaw('')
      setShowFee(false)
      setCategoryUid(null)
      setCategoryLabel(null)
      setAssetUid(null)
      setToAssetUid(null)
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
    setPhotoDeleted(true)
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
    type === 'income' ? t.transaction.income : type === 'transfer' ? t.transaction.transfer : t.transaction.expense
  const dateValue = fromIso(date)
  const weekday = WEEKDAYS_SHORT[dateValue.getDay()]
  const relative = relativeDateLabel(date)
  const showsCategory = type !== 'transfer'
  const currencySymbol = currency?.SYMBOL ?? 'Rp'
  const allPhotos = [
    ...photos.map((p) => ({ uid: p.uid, dataUrl: p.FILE_PATH, pending: false as const })),
    ...newPhotos.map((p) => ({ uid: p.uid, dataUrl: p.dataUrl, pending: true as const })),
  ]

  return (
    <FullScreenSheet open={open} testId="transaction-form" variant="plain">
      <header className="z-30 flex items-center gap-2 border-b px-3 py-2.5">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Kembali"
          data-testid="trx-form-back"
          onClick={onClose}
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-base font-bold tracking-tight sm:text-lg">
          {title}
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

      <div
        ref={formScrollRef}
        style={{
          paddingBottom: keyboardInset > 0 ? `${keyboardInset + 16}px` : undefined,
        }}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain transition-[padding] duration-200"
      >
        <div className="mx-auto w-full max-w-lg space-y-3 px-3.5 py-3">
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
                  if (option === 'transfer') {
                    setNegative(false)
                    if (activeSheet === 'category') {
                      setActiveSheet('numpad')
                    }
                  }
                }}
                className={cn(
                  'rounded-lg px-2 py-1.5 text-xs sm:text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  type === option
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-secondary',
                )}
              >
                {option === 'income' ? t.transaction.income : option === 'expense' ? t.transaction.expense : t.transaction.transfer}
              </button>
            ))}
          </div>

          {/* Tanggal & pengulangan */}
          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="flex min-h-12 items-center justify-between gap-2 px-3.5 py-2">
              <span className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary/60 text-secondary-foreground">
                  <Calendar aria-hidden="true" className="size-3.5" />
                </span>
                {t.transaction.date}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-testid="trx-date-input"
                  aria-haspopup="dialog"
                  aria-expanded={datePickerOpen}
                  onClick={() => setDatePickerOpen(true)}
                  className="flex items-center gap-1 rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors hover:bg-secondary focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {formatShortDate(date)}
                  <span className="text-[10px] font-normal text-muted-foreground">
                    ({relative || weekday})
                  </span>
                  <ChevronRight aria-hidden="true" className="size-3.5 text-muted-foreground" />
                </button>
                <button
                  type="button"
                  data-testid="trx-time-input"
                  aria-haspopup="dialog"
                  aria-label="Waktu transaksi"
                  onClick={() => setTimePickerOpen(true)}
                  className="flex items-center gap-1 rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors hover:bg-secondary focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {time}
                  <ChevronRight aria-hidden="true" className="size-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>

            <FieldRow
              testId="trx-recurring-button"
              valueTestId="trx-recurring-value"
              icon={<CalendarClock aria-hidden="true" className="size-4" />}
              label={t.transaction.repeat}
              value={recurLabel}
              placeholder={t.repeat.frequencies.none}
              onAction={() => setRecurringOpen(true)}
            />
          </div>

          <DatePickerSheet
            open={datePickerOpen}
            value={date}
            onSelect={setDate}
            onClose={() => setDatePickerOpen(false)}
            title="Tanggal transaksi"
          />
          <TimePickerSheet
            open={timePickerOpen}
            value={time}
            onSelect={setTime}
            onClose={() => setTimePickerOpen(false)}
          />

          {/* Nominal + pembayaran */}
          {showsCategory ? (
            <div className="overflow-hidden rounded-2xl border bg-card">
              <FieldRow
                testId="trx-total-button"
                valueTestId="trx-amount-display"
                icon={<Coins aria-hidden="true" className="size-4 text-primary" />}
                label="Total"
                value={
                  raw
                    ? (negative && Number(raw) > 0 ? `-${currencySymbol} ` : `${currencySymbol} `) +
                      formatTypingAmount(raw, currency)
                    : null
                }
                placeholder={`${currencySymbol} 0`}
                divided={false}
                onAction={() => setActiveSheet(activeSheet === 'numpad' ? null : 'numpad')}
              />
              <FieldRow
                testId="trx-category-button"
                valueTestId="trx-category-value"
                icon={<Tag aria-hidden="true" className="size-4" />}
                label={t.transaction.category}
                value={categoryLabel}
                placeholder={t.budget.selectCategory}
                divided={true}
                onAction={() => setActiveSheet('category')}
              />
              <FieldRow
                testId="trx-asset-button"
                valueTestId="trx-asset-value"
                icon={<Wallet aria-hidden="true" className="size-4" />}
                label={t.transaction.account}
                value={assetName}
                placeholder={t.transaction.selectAccount}
                divided={true}
                onAction={() => setActiveSheet('asset_from')}
              />
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-card">
              <FieldRow
                testId="trx-total-button"
                valueTestId="trx-amount-display"
                icon={<Coins aria-hidden="true" className="size-4 text-primary" />}
                label="Total"
                value={raw ? `${currencySymbol} ${formatTypingAmount(raw, currency)}` : null}
                placeholder={`${currencySymbol} 0`}
                divided={false}
                onAction={() => setActiveSheet(activeSheet === 'numpad' ? null : 'numpad')}
                rightAction={
                  !showFee ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-testid="trx-fee-button"
                      onClick={() => {
                        setShowFee(true)
                        setActiveSheet('fee')
                      }}
                      className="h-7 gap-1 px-2 text-xs font-medium"
                    >
                      <Coins className="size-3 text-muted-foreground" />
                      <span data-testid="trx-quick-fee-btn">+ Biaya</span>
                      <span data-testid="trx-fee-value" className="sr-only">
                        {formatCurrency(0, currency)}
                      </span>
                    </Button>
                  ) : undefined
                }
              />

              {showFee && (
                <FieldRow
                  testId="trx-fee-button"
                  valueTestId="trx-fee-value"
                  icon={<Coins aria-hidden="true" className="size-4" />}
                  label={t.transaction.fee}
                  value={fee > 0 || feeRaw ? formatCurrency(fee, currency) : formatCurrency(0, currency)}
                  placeholder={formatCurrency(0, currency)}
                  divided={true}
                  onAction={() => setActiveSheet(activeSheet === 'fee' ? null : 'fee')}
                  rightAction={
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setFee(0)
                        setFeeRaw('')
                        setShowFee(false)
                        if (activeSheet === 'fee') setActiveSheet(null)
                      }}
                      aria-label="Hapus biaya"
                      className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  }
                />
              )}

              <div className="relative">
                <FieldRow
                  testId="trx-from-asset-button"
                  valueTestId="trx-from-asset-value"
                  icon={<Wallet aria-hidden="true" className="size-4" />}
                  label={t.transaction.fromAccount}
                  value={assetName}
                  placeholder={t.transaction.selectAccount}
                  divided={true}
                  onAction={() => setActiveSheet('asset_from')}
                />
                <FieldRow
                  testId="trx-to-asset-button"
                  valueTestId="trx-to-asset-value"
                  icon={<Wallet aria-hidden="true" className="size-4" />}
                  label={t.transaction.toAccount}
                  value={toAssetName}
                  placeholder={t.transaction.selectAccount}
                  divided={true}
                  onAction={() => setActiveSheet('asset_to')}
                />
                <button
                  type="button"
                  data-testid="trx-swap-assets-button"
                  aria-label="Tukar akun asal dan tujuan"
                  onClick={handleSwapAssets}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 z-10 flex size-8 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-xs transition-transform duration-150 hover:bg-secondary hover:text-foreground active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ArrowUpDown className="size-4" />
                </button>
              </div>
            </div>
          )}
          {/* Catatan, deskripsi, tag & foto */}
          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="flex min-h-12 items-center gap-2.5 px-3.5 py-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary/60 text-secondary-foreground">
                <PencilLine aria-hidden="true" className="size-3.5" />
              </span>
              <label htmlFor="trx-note-input" className="shrink-0 text-xs sm:text-sm text-muted-foreground">
                {t.transaction.note}
              </label>
              <input
                ref={noteInputRef}
                id="trx-note-input"
                type="text"
                data-testid="trx-note-input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onFocus={() => {
                  setActiveSheet(null)
                  scrollToButtons()
                }}
                placeholder={t.transaction.note}
                className="min-w-0 flex-1 rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs sm:text-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex items-start gap-2.5 border-t px-3.5 py-2">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary/60 text-secondary-foreground">
                <AlignLeft aria-hidden="true" className="size-3.5" />
              </span>
              <label
                htmlFor="trx-description-input"
                className="shrink-0 pt-1 text-sm text-muted-foreground"
              >
                {t.transaction.description}
              </label>
              <textarea
                id="trx-description-input"
                data-testid="trx-description-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onFocus={() => {
                  setActiveSheet(null)
                  scrollToButtons()
                }}
                rows={2}
                placeholder={t.transaction.description}
                className="min-w-0 flex-1 resize-none rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex min-h-12 items-center gap-2.5 border-t px-3.5 py-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary/60 text-secondary-foreground">
                <Tags aria-hidden="true" className="size-3.5" />
              </span>
              <span className="shrink-0 text-sm text-muted-foreground">Tag</span>
              <button
                type="button"
                data-testid="trx-tag-button"
                onClick={() => setTagPickerOpen(true)}
                className="flex min-w-0 flex-1 items-center justify-end gap-1.5 rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs transition-colors hover:bg-secondary focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  data-testid="trx-tag-value"
                  className={cn(
                    'truncate',
                    tagLabel ? 'font-semibold text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {tagLabel ?? t.transaction.selectTag}
                </span>
                <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
              </button>
            </div>
            <div className="flex min-h-12 items-center gap-2.5 border-t px-3.5 py-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary/60 text-secondary-foreground">
                <ImageIcon aria-hidden="true" className="size-3.5" />
              </span>
              <span className="shrink-0 text-sm text-muted-foreground">Foto</span>
              <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
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
                  className="flex size-14 items-center justify-center rounded-xl border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Camera aria-hidden="true" className="size-5" />
                  <span className="sr-only">Tambah foto</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tombol aksi form */}
          <div ref={actionButtonsRef}>
            {isEdit ? (
              <div className="space-y-2 pt-1 pb-4">
                <div className="grid grid-cols-2 gap-2">
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

                {isDirty ? (
                  <Button
                    type="button"
                    className="h-11 w-full font-semibold"
                    data-testid="trx-save"
                    onClick={() => save(false)}
                  >
                    <Check className="size-4" />
                    {t.common.save}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="destructive"
                    className="h-11 w-full font-semibold"
                    data-testid="trx-delete-button"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="size-4" />
                    Hapus
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex gap-2 pt-1 pb-4">
                <Button
                  type="button"
                  className="h-11 flex-[7] font-semibold"
                  data-testid="trx-save"
                  onClick={() => save(false)}
                >
                  {t.common.save}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-[3] font-semibold"
                  data-testid="trx-save-next"
                  onClick={() => save(true)}
                >
                  {t.common.continue}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Docked Input Panel (Numpad, Kategori & Aset) */}
      {activeSheet !== null && (
        <div
          data-testid="trx-unified-drawer"
          className="z-40 shrink-0 border-t border-border/80 bg-card shadow-2xl transition-all duration-200"
        >
          <div className="mx-auto flex w-full max-w-lg flex-col overflow-hidden pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {activeSheet === 'numpad' && (
              <div data-testid="trx-numpad-drawer" className="flex flex-col animate-in fade-in duration-150">
                <div className="flex items-center justify-between border-b px-4 py-2.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Total
                    </span>
                    <span className="text-base font-bold text-foreground">
                      {raw
                        ? (negative && Number(raw) > 0 ? `-${currencySymbol} ` : `${currencySymbol} `) +
                          formatTypingAmount(raw, currency)
                        : `${currencySymbol} 0`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {type === 'transfer' && !showFee && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        data-testid="trx-fee-button"
                        onClick={() => {
                          setShowFee(true)
                          setActiveSheet('fee')
                        }}
                        className="h-7 gap-1 px-2 text-xs font-medium"
                      >
                        <Coins className="size-3 text-muted-foreground" />
                        <span data-testid="trx-quick-fee-btn">+ Biaya</span>
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveSheet(null)}
                      aria-label="Tutup"
                      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
                <div className="p-3">
                  <Numpad
                    decimals={decimals}
                    showBackspace={false}
                    onKey={(key: NumpadKey) => setRaw((current) => applyNumpadKey(current, key, decimals))}
                    showMinus={type !== 'transfer'}
                    negative={negative}
                    onMinus={() => setNegative((n) => !n)}
                    showDone={true}
                    onDone={handleNumpadDone}
                  />
                </div>
              </div>
            )}

            {activeSheet === 'fee' && (
              <div data-testid="trx-fee-sheet" className="flex flex-col animate-in fade-in duration-150">
                <div className="flex items-center justify-between border-b px-4 py-2.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t.transaction.fee || 'Biaya Transfer'}
                    </span>
                    <span data-testid="trx-fee-sheet-value" className="text-base font-bold text-foreground">
                      {feeRaw
                        ? `${currencySymbol} ${formatTypingAmount(feeRaw, currency)}`
                        : `${currencySymbol} 0`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSheet(null)}
                    aria-label="Tutup"
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="p-3">
                  <Numpad
                    decimals={decimals}
                    showBackspace={false}
                    onKey={(key: NumpadKey) => setFeeRaw((current) => applyNumpadKey(current, key, decimals))}
                    testIdPrefix="fee-numpad-"
                    showMinus={false}
                    showDone={true}
                    doneTestId="trx-fee-sheet-done"
                    onDone={handleFeeDone}
                  />
                </div>
              </div>
            )}

            {activeSheet === 'category' && (
              <div className="flex flex-col max-h-[46vh] sm:max-h-[380px] min-h-[280px] animate-in fade-in duration-150">
                <CategoryPickerView
                  type={type === 'income' ? 'income' : 'expense'}
                  selectedUid={categoryUid}
                  onSelect={handleCategorySelect}
                  onClose={() => setActiveSheet(null)}
                />
              </div>
            )}

            {(activeSheet === 'asset_from' || activeSheet === 'asset_to') && (
              <div className="flex flex-col max-h-[46vh] sm:max-h-[380px] min-h-[280px] animate-in fade-in duration-150">
                <PickerView
                  title={
                    activeSheet === 'asset_to'
                      ? 'Uang masuk'
                      : type === 'transfer'
                      ? 'Uang keluar'
                      : 'Aset'
                  }
                  items={assetItems}
                  selected={activeSheet === 'asset_to' ? toAssetUid : assetUid}
                  onSelect={handleAssetSelect}
                  onClose={() => setActiveSheet(null)}
                  emptyLabel="Belum ada aset. Tambahkan dari tab Aset."
                  testId="asset-picker"
                  layout="grid"
                />
              </div>
            )}
          </div>
        </div>
      )}

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
        <div className="mx-auto flex max-h-[85vh] w-full max-w-full flex-col overflow-hidden rounded-t-[1.75rem] border-t bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl md:max-w-md md:rounded-2xl md:border md:pb-4">
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
