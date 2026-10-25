'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  GripVertical,
  Landmark,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Overlay } from '@/components/ui/overlay'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useTranslation } from '@/components/language-provider'
import { cn } from '@/lib/utils'
import {
  ASSET_GROUP_TRANSLATIONS,
  ASSET_GROUP_TYPE,
  type AssetGroup,
  CORE_ASSET_GROUP_NAMES,
  createAssetGroup,
  getAssetGroups,
  getMaxAssetGroupOrderSeq,
  reorderAssetGroups,
  softDeleteAssetGroup,
  updateAssetGroup,
} from '@/lib/db'

const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

const TYPE_OPTIONS: { value: number; label: string }[] = [
  { value: ASSET_GROUP_TYPE.general, label: 'Umum' },
  { value: ASSET_GROUP_TYPE.creditCard, label: 'Grup aset kartu kredit' },
  { value: ASSET_GROUP_TYPE.debitCard, label: 'Grup aset kartu debit' },
]

const isCoreGroup = (name: string) => CORE_ASSET_GROUP_NAMES.includes(name)

export function AssetGroupManager() {
  const router = useRouter()
  const { t } = useTranslation()
  const [groups, setGroups] = useState<AssetGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<number>(ASSET_GROUP_TYPE.general)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<AssetGroup | null>(null)

  const load = useCallback(async () => {
    setGroups(await getAssetGroups())
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openAdd = () => {
    setFormMode('add')
    setEditingId(null)
    setFormName('')
    setFormType(ASSET_GROUP_TYPE.general)
    setError(null)
  }

  const openEdit = (group: AssetGroup) => {
    setFormMode('edit')
    setEditingId(group.id!)
    setFormName(group.ACC_GROUP_NAME)
    setFormType(group.TYPE)
    setError(null)
  }

  const closeForm = () => {
    setFormMode(null)
    setEditingId(null)
    setError(null)
  }

  async function handleSave() {
    const trimmed = formName.trim()
    if (!trimmed) {
      setError(t.asset.nameCannotBeEmpty)
      return
    }
    try {
      if (formMode === 'add') {
        const max = await getMaxAssetGroupOrderSeq()
        await createAssetGroup({
          uid: `ag_${Date.now()}`,
          IS_DEL: 0,
          USETIME: Date.now(),
          ACC_GROUP_NAME: trimmed,
          TYPE: formType,
          ORDERSEQ: max + 1,
          IS_DEFAULT: 0,
          isSynced: 0,
          syncTime: 0,
          syncVersion: 1,
        })
      } else if (editingId !== null) {
        await updateAssetGroup(editingId, { ACC_GROUP_NAME: trimmed, TYPE: formType })
      }
      closeForm()
      await load()
    } catch {
      setError(t.asset.saveGroupError)
    }
  }

  function toggle(uid: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid)
      else next.add(uid)
      return next
    })
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= groups.length) return
    const next = [...groups]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    setGroups(next)
    await reorderAssetGroups(next.map((g) => g.id!))
    await load()
  }

  async function confirmRemove() {
    if (!pendingDelete?.id) return
    await softDeleteAssetGroup(pendingDelete.id)
    setPendingDelete(null)
    setSelected(new Set())
    await load()
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 bg-background/80 px-4 pt-[calc(0.875rem+env(safe-area-inset-top))] pb-4 backdrop-blur-xl md:px-10 md:pt-6 md:pb-8">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" aria-label="Kembali" onClick={() => router.back()}>
            <ChevronLeft className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              {t.settings.manageAsset}
            </p>
            <h1 className="truncate text-lg font-bold tracking-tight">{t.asset.groups}</h1>
          </div>
          <Button aria-label={t.asset.addGroup} data-testid="add-group" onClick={openAdd}>
            <Plus className="size-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col px-4 md:px-10">
        <p className="mb-3 text-xs text-muted-foreground">
          {t.asset.emptyGroupDesc}
        </p>

        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Memuat…</p>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="mb-3 size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t.asset.noGroups}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {groups.map((group, index) => {
              const core = isCoreGroup(group.ACC_GROUP_NAME)
              const isSelected = selected.has(group.id!)
              const translation = ASSET_GROUP_TRANSLATIONS[group.ACC_GROUP_NAME]
              return (
                <div
                  key={group.uid}
                  data-testid={`group-row-${group.ACC_GROUP_NAME}`}
                  onDragOver={(e) => e.preventDefault()}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border p-2 pl-3 transition-colors',
                    isSelected ? 'border-primary/50 bg-accent' : 'bg-card',
                  )}
                >
                  {core ? (
                    <span
                      aria-hidden="true"
                      data-testid={`group-icon-${group.ACC_GROUP_NAME}`}
                      className="flex size-6 shrink-0 items-center justify-center text-muted-foreground"
                    >
                      {group.TYPE === ASSET_GROUP_TYPE.creditCard ? (
                        <Wallet className="size-4" />
                      ) : (
                        <Landmark className="size-4" />
                      )}
                    </span>
                  ) : (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(group.id!)}
                      aria-label={`Pilih grup ${group.ACC_GROUP_NAME}`}
                      data-testid={`group-check-${group.ACC_GROUP_NAME}`}
                      className="size-4 shrink-0 rounded text-primary focus:ring-primary"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => openEdit(group)}
                    className="min-w-0 flex-1 text-left focus-visible:outline-none"
                    aria-label={`Ubah grup ${group.ACC_GROUP_NAME}`}
                  >
                    <span className="block truncate text-sm">{group.ACC_GROUP_NAME}</span>
                    {translation && (
                      <span className="block text-xs text-muted-foreground">{translation}</span>
                    )}
                  </button>

                  {isSelected && (
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      aria-label={`Hapus grup ${group.ACC_GROUP_NAME}`}
                      data-testid={`group-trash-${group.ACC_GROUP_NAME}`}
                      onClick={() => setPendingDelete(group)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Naikkan ${group.ACC_GROUP_NAME}`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    className="text-muted-foreground"
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Turunkan ${group.ACC_GROUP_NAME}`}
                    disabled={index === groups.length - 1}
                    onClick={() => move(index, 1)}
                    className="text-muted-foreground"
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Ubah grup ${group.ACC_GROUP_NAME}`}
                    onClick={() => openEdit(group)}
                    className="text-muted-foreground"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <span
                    draggable
                    aria-hidden="true"
                    className="cursor-grab p-1 text-muted-foreground active:cursor-grabbing"
                  >
                    <GripVertical className="size-4" />
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Overlay
        open={formMode !== null}
        onClose={closeForm}
        label="Form grup aset"
        testId="group-form"
      >
        <div className="mx-auto w-full max-w-md rounded-2xl border bg-card p-5 shadow-xl">
          <h2 className="mb-4 text-lg font-bold">
            {formMode === 'add' ? t.asset.addGroup : t.asset.editGroup}
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSave()
            }}
            className="space-y-3"
          >
            <div>
              <label
                htmlFor="group-name-input"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                {t.asset.group}
              </label>
              <input
                id="group-name-input"
                type="text"
                autoFocus
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className={inputClass}
                placeholder={t.asset.groupNamePlaceholder}
              />
            </div>

            <fieldset>
              <legend className="mb-1 block text-xs font-medium text-muted-foreground">
                {t.asset.groupType}
              </legend>
              <div className="space-y-1">
                {[
                  { value: ASSET_GROUP_TYPE.general, label: t.asset.groupTypeGeneral },
                  { value: ASSET_GROUP_TYPE.creditCard, label: t.asset.groupTypeCredit },
                  { value: ASSET_GROUP_TYPE.debitCard, label: t.asset.groupTypeDebit },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm"
                  >
                    <input
                      name="group-type"
                      value={opt.value}
                      checked={formType === opt.value}
                      onChange={() => setFormType(opt.value)}
                      className="size-4 text-primary focus:ring-primary"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </fieldset>

            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive"
              >
                <AlertCircle className="size-4 shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeForm}>
                {t.common.cancel}
              </Button>
              <Button type="submit" data-testid="group-save">
                <Check className="size-4" />
                {t.common.save}
              </Button>
            </div>
          </form>
        </div>
      </Overlay>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t.asset.deleteGroupPrompt}
        description={t.asset.deleteGroupDesc}
        confirmLabel={t.common.yes}
        cancelLabel={t.common.no}
        onConfirm={confirmRemove}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
