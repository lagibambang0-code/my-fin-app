'use client'

import { useCallback, useState } from 'react'
import { Ellipsis, FileDown, FileUp, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Overlay } from '@/components/ui/overlay'
import { TabPage } from '@/components/tab-page'
import { db } from '@/lib/db'
import { initDB } from '@/lib/db'
import { cn } from '@/lib/utils'

export type BackupData = {
  transactions: boolean
  assets: boolean
  categories: boolean
  settings: boolean
  memos: boolean
  tags: boolean
  sms: boolean
  photos: boolean
  dateFrom?: string
  dateTo?: string
}

const DATA_TYPES: Array<{ key: keyof BackupData; label: string }> = [
  { key: 'transactions', label: 'Transaksi' },
  { key: 'assets', label: 'Aset' },
  { key: 'categories', label: 'Kategori' },
  { key: 'settings', label: 'Pengaturan' },
  { key: 'memos', label: 'Memo' },
  { key: 'tags', label: 'Tag' },
  { key: 'sms', label: 'SMS' },
  { key: 'photos', label: 'Foto' },
]

/**
 * "Cadangan" — backup/export/import screen.
 *
 * Exports the full DompetkuDB as a JSON file that can be re-imported later
 * or used to transfer data to another device. Users can select which data
 * types to include and optionally filter by date range.
 */
export function BackupScreen() {
  const [isOptionsOpen, setIsOptionsOpen] = useState(false)
  const [backupData, setBackupData] = useState<BackupData>({
    transactions: true,
    assets: true,
    categories: true,
    settings: true,
    memos: true,
    tags: true,
    sms: true,
    photos: false,
  })
  const [backupJson, setBackupJson] = useState<string | null>(null)
  const [lastBackupInfo, setLastBackupInfo] = useState<{ timestamp: string; size: number } | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const toggleData = (key: keyof BackupData) => {
    setBackupData((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const stripMeta = <T extends Record<string, unknown>>(rows: T[], metaKeys: string[]): T[] =>
    rows.map((row) => {
      const clean: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(row)) {
        if (!metaKeys.includes(k)) clean[k] = v
      }
      return clean as T
    })

  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true)
      setExportError(null)
      await initDB()

      const backup: Record<string, unknown[]> = {}
      const metaTransaction = ['isSynced', 'syncTime', 'syncVersion']
      const metaAsset = ['isSynced', 'syncTime', 'syncVersion']
      const metaCategory = ['isSynced', 'syncTime', 'syncVersion']
      const metaSetting = ['isDel', 'isSynced', 'syncTime', 'syncVersion']
      const metaMemo = ['isSynced', 'syncTime', 'syncVersion']
      const metaTag = ['isSynced', 'syncTime', 'syncVersion']
      const metaSms = ['isSynced', 'syncTime', 'syncVersion']
      const metaPhoto = ['isSynced', 'syncTime', 'syncVersion']

      if (backupData.transactions) {
        let txs
        if (backupData.dateFrom || backupData.dateTo) {
          txs = await db.transactions
            .where('ZDATE')
            .between(
              backupData.dateFrom ?? '0000-00-00',
              backupData.dateTo ?? '9999-12-31',
              true, true,
            )
            .toArray()
        } else {
          txs = await db.transactions.toArray()
        }
        backup.transactions = stripMeta(txs, metaTransaction)
      }

      if (backupData.assets) {
        const assets = await db.assets.toArray()
        backup.assets = stripMeta(assets, metaAsset)
      }

      if (backupData.categories) {
        const categories = await db.categories.toArray()
        backup.categories = stripMeta(categories, metaCategory)
      }

      if (backupData.settings) {
        const settings = await db.settings.toArray()
        backup.settings = stripMeta(settings, metaSetting)
      }

      if (backupData.memos) {
        const memos = await db.memos.toArray()
        backup.memos = stripMeta(memos, metaMemo)
      }

      if (backupData.tags) {
        const tags = await db.tags.toArray()
        backup.tags = stripMeta(tags, metaTag)
      }

      if (backupData.sms) {
        let smsMessages
        if (backupData.dateFrom || backupData.dateTo) {
          smsMessages = await db.smsMessages
            .where('ZDATE')
            .between(
              backupData.dateFrom ? new Date(`${backupData.dateFrom}T00:00:00`).getTime() : 0,
              backupData.dateTo ? new Date(`${backupData.dateTo}T23:59:59`).getTime() : Number.MAX_SAFE_INTEGER,
              true, true,
            )
            .toArray()
        } else {
          smsMessages = await db.smsMessages.toArray()
        }
        backup.smsMessages = stripMeta(smsMessages, metaSms)
      }

      if (backupData.photos) {
        const photos = await db.photos.toArray()
        backup.photos = stripMeta(photos, metaPhoto)
      }

      const json = JSON.stringify(backup, null, 2)
      setBackupJson(json)
      setLastBackupInfo({ timestamp: new Date().toISOString(), size: json.length })
      setIsOptionsOpen(false)
    } catch (error) {
      console.error('Backup failed:', error)
      setExportError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsExporting(false)
    }
  }, [backupData])

  const downloadJson = () => {
    if (!backupJson) return
    const blob = new Blob([backupJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dompetku-cadangan-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setExportError(null)
      await initDB()
      const text = await file.text()
      const data = JSON.parse(text)

      await db.transactions.clear()
      await db.assets.clear()
      await db.categories.clear()
      await db.settings.clear()
      await db.memos.clear()
      await db.tags.clear()
      await db.smsMessages.clear()
      await db.photos.clear()
      await db.smsMacros.clear()
      await db.repeats.clear()
      await db.budgets.clear()
      await db.budgetAmounts.clear()
      await db.assetGroups.clear()
      await db.currencies.clear()

      const bulkAdd = async (table: any, rows: any[], delKey: string) => {
        if (!rows?.length) return
        await table.bulkAdd(rows.map((r) => ({ ...r, [delKey]: r[delKey] ?? 0, isSynced: 0, syncTime: 0, syncVersion: 1 })))
      }
      const bulkAddCIsDel = async (table: any, rows: any[]) => {
        if (!rows?.length) return
        await table.bulkAdd(rows.map((r) => ({ ...r, IS_DEL: r.IS_DEL ?? 0, isSynced: 0, syncTime: 0, syncVersion: 1 })))
      }

      if (backupData.transactions && data.transactions) await bulkAddCIsDel(db.transactions, data.transactions)
      if (backupData.assets && data.assets) await bulkAddCIsDel(db.assets, data.assets)
      if (backupData.categories && data.categories) await bulkAddCIsDel(db.categories, data.categories)
      if (backupData.settings && data.settings) await bulkAdd(db.settings, data.settings, 'isDel')
      if (backupData.memos && data.memos) await bulkAdd(db.memos, data.memos, 'isDel')
      if (backupData.tags && data.tags) await bulkAdd(db.tags, data.tags, 'isDel')
      if (backupData.sms && data.smsMessages) await bulkAddCIsDel(db.smsMessages, data.smsMessages)
      if (backupData.photos && data.photos) await bulkAddCIsDel(db.photos, data.photos)
      if (backupData.sms && data.smsMacros) await bulkAdd(db.smsMacros, data.smsMacros, 'isDel')
      if (data.repeats) await bulkAddCIsDel(db.repeats, data.repeats)
      if (data.budgets) await bulkAddCIsDel(db.budgets, data.budgets)
      if (data.budgetAmounts) await bulkAddCIsDel(db.budgetAmounts, data.budgetAmounts)
      if (data.assetGroups) await bulkAddCIsDel(db.assetGroups, data.assetGroups)
      if (data.currencies) await bulkAddCIsDel(db.currencies, data.currencies)

      alert('Cadangan berhasil diimpor!')
      e.target.value = ''
    } catch (error) {
      console.error('Import failed:', error)
      setExportError(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <TabPage title="Cadangan" subtitle="Cadangkan & pulihkan data" icon={Ellipsis}>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6 md:px-10 md:pb-8">
        <div className="rounded-xl border border-dashed px-3 py-3 text-xs text-pretty text-muted-foreground">
          <div className="flex items-start gap-2">
            <HelpCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>
              Cadangkan semua data aplikasi ke dalam berkas JSON. Berkas ini dapat
              diimpor kembali nanti atau digunakan untuk memindahkan data ke perangkat
              lain. Pastikan untuk mencadangkan data secara berkala!
            </p>
          </div>
        </div>

        {lastBackupInfo ? (
          <div className="rounded-xl border bg-muted/50 px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Cadangan terakhir</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(lastBackupInfo.timestamp).toLocaleString()} · {Math.round(lastBackupInfo.size / 1024)} KB
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsOptionsOpen(true)} data-testid="backup-options">
                <Ellipsis className="size-4" />
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-center py-6 text-sm text-muted-foreground">Belum pernah membuat cadangan</p>
        )}

        {exportError && (
          <p role="alert" data-testid="backup-error" className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {exportError}
          </p>
        )}

        <div className="flex flex-col gap-3 pt-2">
          <Button className="h-12 gap-2 text-base" data-testid="backup-export" onClick={backupJson ? downloadJson : () => setIsOptionsOpen(true)}>
            <FileDown className="size-5" />
            {backupJson ? 'Unduh Cadangan' : 'Ekspor Sekarang'}
          </Button>

          <div className="relative">
            <input type="file" accept=".json,application/json" onChange={handleImport} className="absolute inset-0 cursor-pointer opacity-0" id="import-file" data-testid="backup-import-input" />
            <label htmlFor="import-file" className={cn('flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background text-sm font-medium transition-colors hover:bg-muted')} data-testid="backup-import">
              <FileUp className="size-5" />
              Impor Cadangan
            </label>
          </div>
        </div>
      </div>

      <Overlay open={isOptionsOpen} onClose={() => setIsOptionsOpen(false)} align="center" testId="backup-options-dialog">
        <div className="w-full max-w-sm rounded-2xl border bg-card p-5 shadow-xl">
          <h2 className="text-lg font-bold">Pilih Data untuk Diekspor</h2>
          <p className="mt-1 text-xs text-muted-foreground">Pilih data yang akan disertakan dalam cadangan. Kosongkan rentang tanggal untuk mengekspor semua data.</p>

          <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
            {DATA_TYPES.map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                <span>{label}</span>
                <input type="checkbox" checked={!!backupData[key]} onChange={() => toggleData(key)} className="size-4 rounded border-primary accent-primary" />
              </label>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Rentang tanggal (opsional)</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="backup-date-from" className="text-xs text-muted-foreground">Dari</label>
                <input id="backup-date-from" type="date" value={backupData.dateFrom || ''} onChange={(e) => setBackupData((prev) => ({ ...prev, dateFrom: e.target.value || undefined }))} className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label htmlFor="backup-date-to" className="text-xs text-muted-foreground">Sampai</label>
                <input id="backup-date-to" type="date" value={backupData.dateTo || ''} onChange={(e) => setBackupData((prev) => ({ ...prev, dateTo: e.target.value || undefined }))} className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOptionsOpen(false)}>Batal</Button>
            <Button onClick={handleExport} disabled={isExporting || !Object.values(backupData).some((v) => v === true)} className="gap-2" data-testid="backup-do-export">
              <FileDown className="size-4" />
              {isExporting ? 'Menyiapkan...' : 'Ekspor'}
            </Button>
          </div>
        </div>
      </Overlay>
    </TabPage>
  )
}
