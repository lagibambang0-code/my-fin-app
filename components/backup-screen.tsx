'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/components/language-provider'
import {
  ChevronLeft,
  Ellipsis,
  FileDown,
  FileSpreadsheet,
  FileUp,
  HardDrive,
  HelpCircle,
  RotateCcw,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Overlay } from '@/components/ui/overlay'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { TabPage } from '@/components/tab-page'
import {
  db,
  getAllAssets,
  getAllCategories,
  getAllTransactions,
  initDB,
} from '@/lib/db'
import { formatDotRange, fromIso, monthBounds } from '@/lib/format'
import { buildExcelHtml, downloadFile } from '@/lib/export'
import { cn } from '@/lib/utils'

export type BackupData = {
  transactions: boolean
  assets: boolean
  categories: boolean
  settings: boolean
  tags: boolean
  photos: boolean
  dateFrom?: string
  dateTo?: string
}

const DATA_TYPES: Array<{ key: keyof BackupData; label: string }> = [
  { key: 'transactions', label: 'Transaksi' },
  { key: 'assets', label: 'Aset' },
  { key: 'categories', label: 'Kategori' },
  { key: 'settings', label: 'Pengaturan' },
  { key: 'tags', label: 'Tag' },
  { key: 'photos', label: 'Foto' },
]

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size >= 100 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`
}

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
    tags: true,
    photos: false,
  })
  const [backupJson, setBackupJson] = useState<string | null>(null)
  const [lastBackupInfo, setLastBackupInfo] = useState<{ timestamp: string; size: number } | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState<'all' | 'transactions' | null>(null)
  const [isExcelOpen, setIsExcelOpen] = useState(false)
  const [storageInfo, setStorageInfo] = useState<{
    usage: number
    quota: number
  } | null>(null)

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      navigator.storage
        .estimate()
        .then((est) => {
          if (est.usage !== undefined && est.quota !== undefined) {
            setStorageInfo({ usage: est.usage, quota: est.quota })
          }
        })
        .catch(() => {})
    }
  }, [])
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
      const metaTag = ['isSynced', 'syncTime', 'syncVersion']
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


      if (backupData.tags) {
        const tags = await db.tags.toArray()
        backup.tags = stripMeta(tags, metaTag)
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
      await db.tags.clear()
      await db.photos.clear()
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
      if (backupData.tags && data.tags) await bulkAdd(db.tags, data.tags, 'isDel')
      if (backupData.photos && data.photos) await bulkAddCIsDel(db.photos, data.photos)
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
  const excelPeriods = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    const curMonthBounds = monthBounds(currentYear, currentMonth)
    const prevMonthBounds = monthBounds(
      currentMonth === 0 ? currentYear - 1 : currentYear,
      currentMonth === 0 ? 11 : currentMonth - 1,
    )
    const curYearBounds = { start: new Date(currentYear, 0, 1), end: new Date(currentYear, 11, 31) }
    const prevYearBounds = { start: new Date(currentYear - 1, 0, 1), end: new Date(currentYear - 1, 11, 31) }

    return [
      {
        id: 'monthly',
        title: `Bulanan (${formatDotRange(curMonthBounds.start, curMonthBounds.end)})`,
        range: curMonthBounds,
        filename: `dompetku-transaksi-${currentYear}-${String(currentMonth + 1).padStart(2, '0')}.xls`,
      },
      {
        id: 'prev-month',
        title: `Bulan lalu (${formatDotRange(prevMonthBounds.start, prevMonthBounds.end)})`,
        range: prevMonthBounds,
        filename: `dompetku-transaksi-${prevMonthBounds.start.getFullYear()}-${String(prevMonthBounds.start.getMonth() + 1).padStart(2, '0')}.xls`,
      },
      {
        id: 'yearly',
        title: `Tahunan (${formatDotRange(curYearBounds.start, curYearBounds.end)})`,
        range: curYearBounds,
        filename: `dompetku-transaksi-${currentYear}.xls`,
      },
      {
        id: 'prev-year',
        title: `Tahun lalu (${formatDotRange(prevYearBounds.start, prevYearBounds.end)})`,
        range: prevYearBounds,
        filename: `dompetku-transaksi-${currentYear - 1}.xls`,
      },
      {
        id: 'all',
        title: 'Semua',
        range: null,
        filename: 'dompetku-transaksi-semua.xls',
      },
    ]
  }, [])

  const handleExportExcel = async (period: (typeof excelPeriods)[number]) => {
    try {
      const [txs, cats, asts] = await Promise.all([
        getAllTransactions(),
        getAllCategories(),
        getAllAssets(),
      ])

      const catMap = new Map(cats.map((c) => [c.uid, c]))
      const assetMap = new Map(asts.map((a) => [a.uid, a]))

      const filtered = txs.filter((tx) => {
        if (!period.range) return true
        const d = fromIso(tx.ZDATE)
        return d >= period.range.start && d <= period.range.end
      })

      const heading = [
        'Tanggal',
        'Akun',
        'Jenis',
        'Kategori',
        'Sub-kategori',
        'Catatan',
        'Jumlah',
        'Memo',
      ]

      const rows = filtered.map((tx) => {
        const cat = tx.ctgUid ? catMap.get(tx.ctgUid) : null
        const isSub = cat?.STATUS === 2 && cat.pUid
        const mainCatName = isSub ? catMap.get(cat.pUid!)?.NAME ?? cat.NAME : cat?.NAME ?? '—'
        const subCatName = isSub ? cat.NAME : ''

        let jenis = 'Pengeluaran'
        if (tx.DO_TYPE === 'income') jenis = 'Pendapatan'
        else if (tx.DO_TYPE === 'transfer') jenis = 'Transfer'

        const assetName = tx.assetUid ? assetMap.get(tx.assetUid)?.NIC_NAME ?? '—' : '—'
        const amount = Number(tx.AMOUNT_ACCOUNT ?? tx.ZMONEY) || 0
        const signedAmount = tx.DO_TYPE === 'expense' ? -Math.abs(amount) : Math.abs(amount)

        return [
          tx.ZDATE,
          assetName,
          jenis,
          mainCatName,
          subCatName,
          tx.ZCONTENT ?? '',
          signedAmount,
          tx.ZDATA ?? '',
        ]
      })

      const html = buildExcelHtml([
        {
          title: `Pengelola Keuangan - ${period.title}`,
          rows: [heading, ...rows],
        },
      ])

      downloadFile(period.filename, 'application/vnd.ms-excel', html)
      setIsExcelOpen(false)
      toast.success(`File Excel (${period.title.split(' ')[0]}) berhasil diunduh!`)
    } catch (err) {
      console.error('Excel export failed:', err)
      toast.error('Gagal mengekspor file Excel')
    }
  }
  const router = useRouter()
  const { t } = useTranslation()

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 bg-background/80 px-4 pt-[calc(0.875rem+env(safe-area-inset-top))] pb-4 backdrop-blur-xl md:px-10 md:pt-6 md:pb-8">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Kembali"
            data-testid="backup-back"
            onClick={() => router.back()}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              {t.nav.more}
            </p>
            <h1 className="truncate text-lg font-bold tracking-tight">{t.settings.backup}</h1>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6 md:px-10 md:pb-8">
        <div className="rounded-xl border border-dashed px-3 py-3 text-xs text-pretty text-muted-foreground">
          <div className="flex items-start gap-2">
            <HelpCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>
              {t.backup.helpText}
            </p>
          </div>
        </div>

        {storageInfo && (
          <div
            className="rounded-2xl border bg-card p-4 shadow-xs"
            data-testid="backup-storage-card"
          >
            <div className="flex items-center justify-between gap-2 pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <HardDrive className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold tracking-tight">
                    {t.backup.storageTitle}
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    {formatBytes(Math.max(0, storageInfo.quota - storageInfo.usage))} {t.backup.storageAvailable.toLowerCase()}
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                {((storageInfo.usage / storageInfo.quota) * 100).toFixed(1)}% {t.backup.storagePercent}
              </span>
            </div>

            <div
              role="progressbar"
              aria-label={t.backup.storageTitle}
              aria-valuenow={Math.round((storageInfo.usage / storageInfo.quota) * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2 w-full overflow-hidden rounded-full bg-secondary"
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{
                  width: `${Math.max(1, Math.min(100, (storageInfo.usage / storageInfo.quota) * 100))}%`,
                }}
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-2.5 text-xs">
              <div>
                <span className="block text-muted-foreground">{t.backup.storageUsed}</span>
                <span className="font-semibold tabular-nums text-foreground" data-testid="backup-storage-used">
                  {formatBytes(storageInfo.usage)}
                </span>
              </div>
              <div>
                <span className="block text-muted-foreground">{t.backup.storageAvailable}</span>
                <span className="font-semibold tabular-nums text-foreground" data-testid="backup-storage-available">
                  {formatBytes(Math.max(0, storageInfo.quota - storageInfo.usage))}
                </span>
              </div>
            </div>
          </div>
        )}

        {lastBackupInfo ? (
          <div className="rounded-xl border bg-muted/50 px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t.backup.lastBackup}</p>
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
          <p className="text-center py-6 text-sm text-muted-foreground">{t.backup.noBackupYet}</p>
        )}

        {exportError && (
          <p role="alert" data-testid="backup-error" className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {exportError}
          </p>
        )}

        <div className="flex flex-col gap-3 pt-2">
          <Button className="h-12 gap-2 text-base" data-testid="backup-export" onClick={backupJson ? downloadJson : () => setIsOptionsOpen(true)}>
            <FileDown className="size-5" />
            {t.backup.backupJson}
          </Button>
          <div className="relative">
            <input type="file" accept=".json,application/json" onChange={handleImport} className="absolute inset-0 cursor-pointer opacity-0" id="import-file" data-testid="backup-import-input" />
            <label htmlFor="import-file" className={cn('flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background text-sm font-medium transition-colors hover:bg-muted')} data-testid="backup-import">
              <FileUp className="size-5" />
              {t.backup.restoreJson}
            </label>
          </div>

          <Button
            variant="outline"
            className="h-12 w-full gap-2 text-sm font-medium"
            data-testid="backup-export-excel"
            onClick={() => setIsExcelOpen(true)}
          >
            <FileSpreadsheet className="size-5 text-emerald-600 dark:text-emerald-400" />
            {t.backup.exportExcel}
          </Button>
        </div>

        {/* Seksi Mulai ulang (T-45 / PRD-P-39) */}
        <div className="flex flex-col gap-2 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            {t.backup.restartSection}
          </h3>
          <div className="rounded-2xl border bg-card divide-y">
            <button
              type="button"
              data-testid="backup-reset-transactions"
              onClick={() => setConfirmReset('transactions')}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-destructive/10 text-destructive"
            >
              <div>
                <span className="block text-sm font-medium">{t.backup.resetTransactionsOnly}</span>
                <span className="block text-xs text-muted-foreground">
                  {t.backup.resetTransactionsOnlyDesc}
                </span>
              </div>
              <RotateCcw className="size-4 shrink-0 text-destructive" />
            </button>
            <button
              type="button"
              data-testid="backup-reset-all"
              onClick={() => setConfirmReset('all')}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-destructive/10 text-destructive"
            >
              <div>
                <span className="block text-sm font-medium">{t.backup.resetAll}</span>
                <span className="block text-xs text-muted-foreground">
                  {t.backup.resetAllDesc}
                </span>
              </div>
              <RotateCcw className="size-4 shrink-0 text-destructive" />
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset !== null}
        title={t.common.confirm}
        description={
          confirmReset === 'transactions'
            ? t.backup.confirmResetTransactions
            : t.backup.confirmResetAll
        }
        confirmLabel={t.common.yes}
        cancelLabel={t.common.no}
        destructive
        onConfirm={async () => {
          const mode = confirmReset
          setConfirmReset(null)
          if (mode === 'transactions') {
            await db.transactions.clear()
            toast.success(t.backup.resetSuccess)
          } else if (mode === 'all') {
            await db.delete()
            try {
              localStorage.removeItem('dompetku:onboarded')
              localStorage.removeItem('dompetku:language')
              localStorage.removeItem('dompetku:mode')
              localStorage.removeItem('dompetku:palette')
            } catch {}
            await initDB()
            window.location.href = '/transactions'
          }
        }}
        onCancel={() => setConfirmReset(null)}
      />

      <Overlay open={isOptionsOpen} onClose={() => setIsOptionsOpen(false)} align="center" testId="backup-options-dialog">
        <div className="w-full max-w-sm rounded-2xl border bg-card p-5 shadow-xl">
          <h2 className="text-lg font-bold">{t.backup.selectDataToExport}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t.backup.selectDataToExportDesc}</p>

          <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
            {DATA_TYPES.map(({ key }) => (
              <label key={key} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                <span>{key in t.backup.types ? t.backup.types[key as keyof typeof t.backup.types] : key}</span>
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

      {/* Dialog Pilihan Periode Ekspor Excel (T-44 / PRD-P-38) */}
      <Overlay
        open={isExcelOpen}
        onClose={() => setIsExcelOpen(false)}
        align="center"
        testId="backup-excel-dialog"
      >
        <div className="w-full max-w-sm rounded-2xl border bg-card p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b">
            <h2 className="text-base font-bold">{t.backup.excelDialogTitle}</h2>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Tutup"
              onClick={() => setIsExcelOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="mt-3 divide-y">
            {excelPeriods.map((period) => (
              <button
                key={period.id}
                type="button"
                data-testid={`backup-excel-option-${period.id}`}
                onClick={() => handleExportExcel(period)}
              >
                <span className="font-medium text-foreground">
                  {period.id === 'this-month'
                    ? `${t.backup.periods.thisMonth} (${formatDotRange(period.range!.start, period.range!.end)})`
                    : period.id === 'prev-month'
                    ? `${t.backup.periods.prevMonth} (${formatDotRange(period.range!.start, period.range!.end)})`
                    : period.id === 'yearly'
                    ? `${t.backup.periods.yearly} (${formatDotRange(period.range!.start, period.range!.end)})`
                    : period.id === 'prev-year'
                    ? `${t.backup.periods.prevYear} (${formatDotRange(period.range!.start, period.range!.end)})`
                    : t.backup.periods.all}
                </span>
                <FileSpreadsheet className="size-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      </Overlay>
    </div>
  )
}
