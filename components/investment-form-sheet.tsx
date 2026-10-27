'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronLeft, Link as LinkIcon, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FullScreenSheet } from '@/components/ui/overlay'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useTranslation } from '@/components/language-provider'
import {
  type Asset,
  type InvestmentAsset,
  createInvestment,
  getAllAssets,
  getMainCurrency,
  softDeleteInvestment,
  updateInvestment,
} from '@/lib/db'

type InvestmentFormSheetProps = {
  open: boolean
  investment: InvestmentAsset | null
  onClose: () => void
  onSaved: () => void
  onDeleted?: () => void
}

const inputClass =
  'w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function InvestmentFormSheet({
  open,
  investment,
  onClose,
  onSaved,
  onDeleted,
}: InvestmentFormSheetProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [linkedAssetUid, setLinkedAssetUid] = useState<string | null>(null)
  const [currencyUid, setCurrencyUid] = useState('IDR_IDR')
  const [notes, setNotes] = useState('')
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(investment?.name ?? '')
    setLinkedAssetUid(investment?.linkedAssetUid ?? null)
    setNotes(investment?.notes ?? '')
    setError(null)

    // Muat daftar aset untuk opsi penautan
    getAllAssets().then((rows) => {
      setAvailableAssets(rows.filter((a) => a.IS_DEL === 0))
    }).catch(() => {})

    getMainCurrency().then((cur) => {
      if (cur) setCurrencyUid(cur.uid)
    }).catch(() => {})
  }, [open, investment])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError(t.investments.assetNamePlaceholder)
      return
    }

    setSaving(true)
    try {
      if (investment?.uid) {
        await updateInvestment(investment.uid, {
          name: trimmed,
          linkedAssetUid: linkedAssetUid || null,
          notes: notes.trim() || undefined,
        })
      } else {
        await createInvestment({
          name: trimmed,
          linkedAssetUid: linkedAssetUid || null,
          currencyUid,
          notes: notes.trim() || undefined,
        })
      }
      onSaved()
      onClose()
    } catch {
      setError('Gagal menyimpan investasi. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!investment?.uid) return
    setSaving(true)
    try {
      await softDeleteInvestment(investment.uid)
      setConfirmDelete(false)
      onDeleted?.()
      onClose()
    } catch {
      /* ignore */
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <FullScreenSheet open={open} onClose={onClose} testId="investment-form-sheet" variant="drawer">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-card/95 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:pt-3 backdrop-blur-md">
        <Button variant="ghost" size="icon-sm" aria-label="Tutup" onClick={onClose}>
          <ChevronLeft className="size-5" />
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-base font-bold tracking-tight">
          {investment ? t.investments.editAsset : t.investments.addAsset}
        </h1>
        {investment?.uid && onDeleted && (
          <Button
            variant="destructive"
            size="icon-sm"
            aria-label="Hapus aset investasi"
            data-testid="investment-delete-button"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </header>

      <form onSubmit={handleSave} className="flex flex-1 flex-col overflow-y-auto px-4 py-4 md:px-10">
        <div className="mx-auto w-full max-w-lg space-y-4">
          {/* Nama Investasi */}
          <div>
            <label htmlFor="inv-name-input" className="mb-1 block text-xs font-semibold text-muted-foreground uppercase">
              {t.investments.assetName}
            </label>
            <input
              id="inv-name-input"
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.investments.assetNamePlaceholder}
              data-testid="investment-name-input"
              className={inputClass}
            />
          </div>

          {/* Opsi Tautkan ke Akun Terdaftar */}
          <div>
            <label htmlFor="inv-link-select" className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
              <LinkIcon className="size-3.5" />
              <span>{t.investments.linkExistingAsset}</span>
            </label>
            <p className="mb-2 text-xs text-muted-foreground">
              {t.investments.linkExistingDesc}
            </p>
            <select
              id="inv-link-select"
              value={linkedAssetUid ?? ''}
              onChange={(e) => setLinkedAssetUid(e.target.value || null)}
              data-testid="investment-link-select"
              className={inputClass}
            >
              <option value="">{t.investments.noLink}</option>
              {availableAssets.map((asset) => (
                <option key={asset.uid} value={asset.uid}>
                  {asset.NIC_NAME}
                </option>
              ))}
            </select>
          </div>

          {/* Catatan Tambahan */}
          <div>
            <label htmlFor="inv-notes-input" className="mb-1 block text-xs font-semibold text-muted-foreground uppercase">
              {t.investments.recordNote}
            </label>
            <textarea
              id="inv-notes-input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Mis. Akun RDN, target jangka panjang, dsb."
              className={inputClass}
            />
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </p>
          )}

          <div className="pt-4">
            <Button
              type="submit"
              disabled={saving}
              className="h-11 w-full gap-2 text-sm font-semibold shadow-md"
              data-testid="investment-save-button"
            >
              <Check className="size-4" />
              {t.common.save}
            </Button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDelete}
        title={t.investments.deleteConfirmTitle}
        description={t.investments.deleteConfirmDesc}
        confirmLabel={t.common.yes}
        cancelLabel={t.common.no}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </FullScreenSheet>
  )
}
