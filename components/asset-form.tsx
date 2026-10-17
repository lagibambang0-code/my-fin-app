'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Check, ChevronDown, ChevronLeft, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { FullScreenSheet } from '@/components/ui/overlay'
import { PickerSheet, type PickerItem } from '@/components/ui/picker-sheet'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { cn } from '@/lib/utils'
import {
  type Asset,
  type AssetGroup,
  type Currency,
  createAsset,
  db,
  getMaxAssetOrderSeq,
  getMainCurrency,
  updateAsset,
} from '@/lib/db'
import { formatCurrency, formatDayMonth, formatTypingAmount, parseAmount } from '@/lib/format'
import { computeCardCycles, isCardGroup } from '@/lib/asset-utils'
import { ISO_CURRENCIES, findIsoCurrency } from '@/lib/currencies'

type AssetFormProps = {
  open: boolean
  asset: Asset | null
  groups: AssetGroup[]
  initialGroupUid?: string | null
  onClose: () => void
  onSaved: () => void
  onDeleted?: () => void
}

const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function AssetForm({
  open,
  asset,
  groups,
  initialGroupUid,
  onClose,
  onSaved,
  onDeleted,
}: AssetFormProps) {
  // State is initialised synchronously on mount. Callers mount this component
  // only while the form is open, so each open starts from a clean slate and no
  // async reset race can clobber user edits.
  const [groupUid, setGroupUid] = useState(
    () => asset?.groupUid ?? initialGroupUid ?? groups[0]?.uid ?? '',
  )
  const [name, setName] = useState(() => asset?.NIC_NAME ?? '')
  const [balanceText, setBalanceText] = useState(() => String(asset?.BALANCE ?? 0))
  const [description, setDescription] = useState(() => asset?.DESCRIPTION ?? '')
  const [currencyUid, setCurrencyUid] = useState(() => asset?.currencyUid ?? 'IDR_IDR')
  const [includeTotal, setIncludeTotal] = useState(() => (asset?.IS_INCLUDE_TOTAL ?? 1) === 1)
  const [isShow, setIsShow] = useState(() => (asset?.IS_SHOW ?? 1) === 1)
  const [payUid, setPayUid] = useState<string | null>(() => asset?.cardAssetUid ?? null)
  const [settleDay, setSettleDay] = useState(() => String(asset?.CARD_DAY_FIN ?? 1))
  const [paymentDay, setPaymentDay] = useState(() => String(asset?.CARD_DAY_PAY ?? 1))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [picker, setPicker] = useState<'group' | 'currency' | 'pay' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [mainCurrency, setMainCurrency] = useState<Currency | null>(null)
  const [allAssets, setAllAssets] = useState<Asset[]>([])

  // Only load the reference data the pickers need; user-editable fields are
  // already initialised above and must never be overwritten here.
  useEffect(() => {
    if (!open) return
    let active = true
    ;(async () => {
      const [rows, main, assets] = await Promise.all([
        db.currencies.toArray().then((rows) => rows.sort((a, b) => a.ORDER_SEQ - b.ORDER_SEQ)),
        getMainCurrency(),
        db.assets.where('IS_DEL').equals(0).toArray(),
      ])
      if (!active) return
      setCurrencies(rows)
      setMainCurrency(main ?? null)
      setAllAssets(assets)
    })()
    return () => {
      active = false
    }
  }, [open])

  const selectedGroup = groups.find((g) => g.uid === groupUid) ?? null
  const card = selectedGroup ? isCardGroup(selectedGroup) : false

  const currency = useMemo(() => {
    const row = currencies.find((c) => c.uid === currencyUid)
    if (row) return row
    const iso = findIsoCurrency(currencyUid.split('_')[0])
    if (iso) {
      return {
        SYMBOL: iso.symbol,
        SYMBOL_POSITION: 'front',
        DECIMAL_POINT: iso.code === 'IDR' || iso.code === 'JPY' ? 0 : 2,
      }
    }
    return mainCurrency
  }, [currencies, currencyUid, mainCurrency])

  const cycles = useMemo(
    () => computeCardCycles(Number(settleDay) || 1, Number(paymentDay) || 1),
    [settleDay, paymentDay],
  )

  const groupItems: PickerItem[] = groups.map((g) => ({
    value: g.uid,
    label: g.ACC_GROUP_NAME,
    sublabel:
      g.TYPE === 2 ? 'Kartu kredit' : g.TYPE === 3 ? 'Kartu debit' : undefined,
  }))

  const currencyItems: PickerItem[] = useMemo(() => {
    const dbUids = new Set(currencies.map((c) => c.ISO))
    const dbItems: PickerItem[] = currencies.map((c) => ({
      value: c.uid,
      label: c.NAME,
      trailing: c.SYMBOL,
      group: c.ISO[0],
    }))
    const isoItems: PickerItem[] = ISO_CURRENCIES.filter((c) => !dbUids.has(c.code)).map(
      (c) => ({
        value: `${c.code}_${c.code}`,
        label: `${c.code} — ${c.name}`,
        trailing: c.symbol,
        group: c.code[0],
      }),
    )
    return [...dbItems, ...isoItems]
  }, [currencies])

  const payItems: PickerItem[] = allAssets
    .filter((a) => a.uid !== asset?.uid && !isCardGroup(groups.find((g) => g.uid === a.groupUid)))
    .map((a) => ({
      value: a.uid,
      label: a.NIC_NAME,
      sublabel: groups.find((g) => g.uid === a.groupUid)?.ACC_GROUP_NAME,
    }))

  const payAsset = allAssets.find((a) => a.uid === payUid) ?? null

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Nama aset tidak boleh kosong')
      return
    }
    const parsed = balanceText.trim() === '' ? 0 : parseAmount(balanceText)
    if (Number.isNaN(parsed)) {
      setError('Total harus berupa angka')
      return
    }
    if (!groupUid) {
      setError('Pilih grup aset terlebih dahulu')
      return
    }

    setSaving(true)
    try {
      const cardFields = card
        ? {
            cardAssetUid: payUid,
            CARD_DAY_FIN: Number(settleDay) || 1,
            CARD_DAY_PAY: Number(paymentDay) || 1,
          }
        : {}

      if (asset?.id) {
        await updateAsset(asset.id, {
          NIC_NAME: trimmed,
          BALANCE: parsed,
          DESCRIPTION: description.trim(),
          currencyUid,
          IS_INCLUDE_TOTAL: includeTotal ? 1 : 0,
          IS_SHOW: isShow ? 1 : 0,
          groupUid,
          ...cardFields,
          A_UTIME: Date.now(),
        })
      } else {
        const maxOrder = await getMaxAssetOrderSeq()
        await createAsset({
          uid: `ast_${Date.now()}`,
          NIC_NAME: trimmed,
          ORDERSEQ: maxOrder + 1,
          BALANCE: parsed,
          DESCRIPTION: description.trim(),
          ZDATA: '',
          ZDATA1: '',
          ZDATA2: '',
          IS_TRANS_EXPENSE: 0,
          IS_CARD_AUTO_PAY: 0,
          APP_PACKAGE: null,
          APP_NAME: null,
          SMS_TEL: null,
          SMS_STRING: null,
          A_UTIME: Date.now(),
          CARD_DAY_FIN: card ? Number(settleDay) || 1 : null,
          CARD_DAY_PAY: card ? Number(paymentDay) || 1 : null,
          CARD_USAGE_HURDLE_TYPE: null,
          CARD_USAGE_HURDLE_START_DATE: null,
          CARD_USAGE_HURDLE_AMOUNT: null,
          IS_SHOW: isShow ? 1 : 0,
          IS_INCLUDE_TOTAL: includeTotal ? 1 : 0,
          IS_DEL: 0,
          currencyUid,
          cardAssetUid: card ? payUid : null,
          groupUid,
          IS_DEFAULT: 0,
          isSynced: 0,
          syncTime: 0,
          syncVersion: 1,
        })
      }
      onSaved()
    } catch {
      setError('Gagal menyimpan aset. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  const title = asset ? 'Informasi aset' : 'Tambah aset'

  return (
    <FullScreenSheet open={open} testId="asset-form">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/80 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl">
        <Button variant="ghost" size="icon-sm" aria-label="Tutup" onClick={onClose}>
          <ChevronLeft className="size-5" />
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight">{title}</h1>
        {asset?.id && onDeleted && (
          <Button
            variant="destructive"
            size="icon-sm"
            aria-label="Hapus aset"
            data-testid="asset-delete"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSave()
          }}
          className="mx-auto w-full max-w-lg space-y-4 px-4 py-4 pb-28"
        >
          <Field label="Grup" htmlFor="asset-group">
            <button
              id="asset-group"
              type="button"
              data-testid="asset-group-field"
              onClick={() => setPicker('group')}
              className={cn(
                'flex w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2.5 text-left text-sm',
                'focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
            >
              <span className="truncate">{selectedGroup?.ACC_GROUP_NAME ?? 'Pilih grup'}</span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </Field>

          <Field label="Nama" htmlFor="asset-name-input">
            <input
              id="asset-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mis. Dompet, BCA, Kartu Kredit"
              className={inputClass}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'asset-form-error' : undefined}
            />
          </Field>

          <Field label="Total" htmlFor="asset-total-input">
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="asset-currency-button"
                aria-label="Pilih mata uang"
                onClick={() => setPicker('currency')}
                className="shrink-0 rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-medium tabular-nums focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {currency?.SYMBOL ?? 'Rp'}
              </button>
              <input
                id="asset-total-input"
                type="text"
                inputMode="decimal"
                aria-describedby="asset-total-hint"
                value={balanceText}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d.,-]/g, '')
                  setBalanceText(formatTypingAmount(raw, currency))
                }}
                className={cn(inputClass, 'tabular-nums')}
              />
            </div>
            <p id="asset-total-hint" className="mt-1 text-xs text-muted-foreground">
              Saldo awal aset, sebelum transaksi dihitung.
            </p>
          </Field>

          <Field label="Deskripsi" htmlFor="asset-description-input">
            <input
              id="asset-description-input"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opsional"
              className={inputClass}
            />
          </Field>

          {card && (
            <div className="space-y-4 rounded-xl border bg-secondary/30 p-3">
              <Field label="Bayar" htmlFor="asset-pay-field">
                <button
                  id="asset-pay-field"
                  type="button"
                  data-testid="asset-pay-field"
                  onClick={() => setPicker('pay')}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2.5 text-left text-sm',
                    'focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                >
                  <span className="truncate">{payAsset?.NIC_NAME ?? 'Pilih aset'}</span>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Tanggal pelunasan" htmlFor="asset-settle-input">
                  <input
                    id="asset-settle-input"
                    type="number"
                    min={1}
                    max={31}
                    value={settleDay}
                    onChange={(e) => setSettleDay(e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Tanggal pembayaran" htmlFor="asset-payment-input">
                  <input
                    id="asset-payment-input"
                    type="number"
                    min={1}
                    max={31}
                    value={paymentDay}
                    onChange={(e) => setPaymentDay(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>

              <dl className="space-y-1 text-sm">
                <div className="flex items-center justify-between gap-3" data-testid="card-payable">
                  <dt className="text-muted-foreground">Harus dibayar</dt>
                  <dd className="text-right tabular-nums">
                    {formatDayMonth(cycles.payable.start)} ~ {formatDayMonth(cycles.payable.end)}{' '}
                    <span className="text-muted-foreground">
                      (Bayar: {formatDayMonth(cycles.payable.pay)})
                    </span>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3" data-testid="card-upcoming">
                  <dt className="text-muted-foreground">Belum dibayar</dt>
                  <dd className="text-right tabular-nums">
                    {formatDayMonth(cycles.upcoming.start)} ~ {formatDayMonth(cycles.upcoming.end)}{' '}
                    <span className="text-muted-foreground">
                      (Bayar: {formatDayMonth(cycles.upcoming.pay)})
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          )}

          <div className="divide-y rounded-xl border">
            <ToggleRow
              label="Sertakan dalam total"
              description="Saldo aset ikut dihitung pada ringkasan Total"
              checked={includeTotal}
              onChange={setIncludeTotal}
              testId="asset-include-total"
            />
            <ToggleRow
              label="Pengaturan Tampil/Sembunyi"
              description="Sembunyikan aset dari daftar"
              checked={isShow}
              onChange={setIsShow}
              testId="asset-show-toggle"
            />
          </div>

          {error && (
            <div
              id="asset-form-error"
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive"
            >
              <AlertCircle className="size-4 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </form>
      </div>

      <div className="border-t bg-background/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto flex w-full max-w-lg justify-end">
          <Button
            type="button"
            data-testid="asset-save"
            disabled={saving}
            onClick={handleSave}
            className="min-w-32"
          >
            <Check className="size-4" />
            {saving ? 'Menyimpan…' : 'Menyimpan'}
          </Button>
        </div>
      </div>

      <PickerSheet
        open={picker === 'group'}
        title="Grup aset"
        searchable={false}
        items={groupItems}
        selected={groupUid}
        onClose={() => setPicker(null)}
        onSelect={(value) => {
          setGroupUid(value)
          setPicker(null)
        }}
      />

      <PickerSheet
        open={picker === 'currency'}
        title="Mata uang"
        items={currencyItems}
        selected={currencyUid}
        onClose={() => setPicker(null)}
        onSelect={(value) => {
          setCurrencyUid(value)
          setPicker(null)
        }}
      />

      <PickerSheet
        open={picker === 'pay'}
        title="Aset"
        items={payItems}
        selected={payUid}
        onClose={() => setPicker(null)}
        onSelect={(value) => {
          setPayUid(value)
          setPicker(null)
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Hapus aset?"
        description="Aset dipindahkan ke 'Aset yang dihapus' dan dapat dipulihkan kembali."
        onConfirm={() => {
          setConfirmDelete(false)
          onDeleted?.()
        }}
        onCancel={() => setConfirmDelete(false)}
      />

      <p className="sr-only">{formatCurrency(parseAmount(balanceText) || 0, currency)}</p>
    </FullScreenSheet>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-xs font-medium tracking-wide text-muted-foreground"
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  testId,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  testId: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={label} testId={testId} />
    </div>
  )
}
