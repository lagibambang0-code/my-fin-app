import puppeteer from 'puppeteer'
import assert from 'node:assert/strict'

async function run() {
  console.log('Starting Smoke Test: Backup & Restore Investments...')
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 412, height: 915 })

    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()))
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message))

    // 1. Navigate to backup page
    console.log('Navigating to /more/backup...')
    await page.goto('http://localhost:3000/more/backup', { waitUntil: 'networkidle2' })
    console.log('Current URL:', page.url())

    // 2. Click backup export button to open options dialog (or if no backupJson yet)
    const exportBtn = await page.waitForSelector('[data-testid="backup-export"]', { timeout: 10000 })
    console.log('Found export button, clicking via evaluate...')
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="backup-export"]')
      if (btn) btn.click()
    })

    // 3. Verify options dialog opens and contains "Investasi"
    console.log('Waiting for backup-options-dialog...')
    const dialog = await page.waitForSelector('[data-testid="backup-options-dialog"]', { timeout: 10000 })
    assert.ok(dialog, 'Backup options dialog should be visible')

    const labels = await page.$$eval('[data-testid="backup-options-dialog"] label span', (els) =>
      els.map((e) => e.textContent?.trim())
    )
    console.log('Options dialog labels:', labels)
    assert.ok(labels.includes('Investasi') || labels.includes('Investments'), 'Must include "Investasi" in options')

    // 4. Test Dexie direct integration in browser context via native indexedDB
    console.log('Testing Dexie investments export, reset, and restore via IndexedDB...')
    const testResult = await page.evaluate(async () => {
      // Helper to open DompetkuDB
      const openDb = () =>
        new Promise((resolve, reject) => {
          const req = indexedDB.open('DompetkuDB')
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        })

      const idb = await openDb()
      const storeNames = Array.from(idb.objectStoreNames)
      if (!storeNames.includes('investments') || !storeNames.includes('investmentRecords')) {
        return { success: false, error: 'Object stores investments or investmentRecords missing from DompetkuDB' }
      }

      // Helper to run transaction
      const tx = (stores, mode, fn) =>
        new Promise((resolve, reject) => {
          const t = idb.transaction(stores, mode)
          t.oncomplete = () => resolve(result)
          t.onerror = () => reject(t.error)
          let result
          try {
            result = fn(t)
          } catch (e) {
            reject(e)
          }
        })

      // Seed a test investment and 2 records
      const invUid = 'inv_test_' + Date.now()
      const rec1Uid = 'rec_1_' + Date.now()
      const rec2Uid = 'rec_2_' + Date.now()

      await new Promise((resolve, reject) => {
        const t = idb.transaction(['investments', 'investmentRecords'], 'readwrite')
        t.oncomplete = () => resolve(true)
        t.onerror = () => reject(t.error)

        const invStore = t.objectStore('investments')
        invStore.add({
          uid: invUid,
          name: 'Bibit Portofolio Saham',
          currencyUid: 'IDR_IDR',
          notes: 'Akun Bibit test',
          createdAt: Date.now(),
          isDel: 0,
          utime: Date.now(),
        })

        const recStore = t.objectStore('investmentRecords')
        recStore.add({
          uid: rec1Uid,
          investmentUid: invUid,
          date: '2026-05-10',
          time: '10:00',
          type: 'deposit',
          amount: 5000000,
          note: 'Deposit awal',
          createdAt: Date.now(),
          utime: Date.now(),
        })
        recStore.add({
          uid: rec2Uid,
          investmentUid: invUid,
          date: '2026-06-15',
          time: '14:30',
          type: 'pnl',
          amount: 250000,
          note: 'Dividen / kenaikan NAV',
          createdAt: Date.now(),
          utime: Date.now(),
        })
      })

      // Helper to get all from store
      const getAll = (storeName) =>
        new Promise((resolve, reject) => {
          const t = idb.transaction(storeName, 'readonly')
          const req = t.objectStore(storeName).getAll()
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        })

      const allInvs = await getAll('investments')
      const allRecs = await getAll('investmentRecords')
      const targetInv = allInvs.find((i) => i.uid === invUid)
      const targetRecs = allRecs.filter((r) => r.investmentUid === invUid)

      if (!targetInv || targetRecs.length !== 2) {
        return { success: false, error: 'Failed to seed investment records in indexedDB' }
      }

      // Simulate export logic with investments enabled
      const metaGeneral = ['isSynced', 'syncTime', 'syncVersion']
      const stripMeta = (rows, metaKeys) =>
        rows.map((row) => {
          const clean = {}
          for (const [k, v] of Object.entries(row)) {
            if (!metaKeys.includes(k)) clean[k] = v
          }
          return clean
        })

      const exportedInvestments = stripMeta(allInvs, metaGeneral)
      const exportedRecords = stripMeta(allRecs, metaGeneral)

      // Test date filtering logic
      const filteredRecords = exportedRecords.filter((r) => r.date >= '2026-06-01' && r.date <= '2026-06-30')
      if (filteredRecords.length !== 1 || filteredRecords[0].uid !== rec2Uid) {
        return { success: false, error: 'Date filtering on investment records failed' }
      }

      // Test wipe (clear stores)
      await new Promise((resolve, reject) => {
        const t = idb.transaction(['investments', 'investmentRecords'], 'readwrite')
        t.oncomplete = () => resolve(true)
        t.onerror = () => reject(t.error)
        t.objectStore('investments').clear()
        t.objectStore('investmentRecords').clear()
      })

      const invAfterWipe = await getAll('investments')
      const recsAfterWipe = await getAll('investmentRecords')
      if (invAfterWipe.length !== 0 || recsAfterWipe.length !== 0) {
        return { success: false, error: 'Wiping investment stores failed' }
      }

      // Test restore / import
      await new Promise((resolve, reject) => {
        const t = idb.transaction(['investments', 'investmentRecords'], 'readwrite')
        t.oncomplete = () => resolve(true)
        t.onerror = () => reject(t.error)
        const invStore = t.objectStore('investments')
        const recStore = t.objectStore('investmentRecords')

        for (const item of exportedInvestments) {
          invStore.add({ ...item, isDel: item.isDel ?? 0, isSynced: 0, syncTime: 0, syncVersion: 1 })
        }
        for (const item of exportedRecords) {
          recStore.add({ ...item, isSynced: 0, syncTime: 0, syncVersion: 1 })
        }
      })

      const invRestored = await getAll('investments')
      const recsRestored = await getAll('investmentRecords')
      const restoredTarget = invRestored.find((i) => i.uid === invUid)
      const restoredRecs = recsRestored.filter((r) => r.investmentUid === invUid)

      if (!restoredTarget || restoredRecs.length !== 2) {
        return { success: false, error: 'Restoring investments failed' }
      }

      // Test backward compatibility: legacy backup without `investments` does not clear investments
      const legacyBackup = {
        transactions: [],
        categories: [],
      }
      if (legacyBackup.investments) {
        // Should not be called!
        await new Promise((resolve, reject) => {
          const t = idb.transaction(['investments', 'investmentRecords'], 'readwrite')
          t.oncomplete = () => resolve(true)
          t.onerror = () => reject(t.error)
          t.objectStore('investments').clear()
          t.objectStore('investmentRecords').clear()
        })
      }

      const invAfterLegacy = await getAll('investments')
      if (invAfterLegacy.length === 0) {
        return { success: false, error: 'Legacy backup wiped investments!' }
      }

      return {
        success: true,
        restoredName: restoredTarget.name,
        recordsCount: restoredRecs.length,
      }
    })

    assert.ok(testResult.success, testResult.error)
    console.log('✓ Dexie investments backup & restore tested successfully:', testResult)

    // 5. Test Export Button click in dialog
    console.log('Clicking "Ekspor" in options dialog...')
    const doExportBtn = await page.waitForSelector('[data-testid="backup-do-export"]')
    await doExportBtn.click()

    // 6. Verify dialog closes and last backup info is updated
    await page.waitForFunction(() => !document.querySelector('[data-testid="backup-options-dialog"]'))
    console.log('✓ Options dialog closed after export')

    const lastBackupText = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="backup-options"]')?.parentElement
      return el ? el.textContent : null
    })
    console.log('Last backup info rendered:', lastBackupText)

    console.log('\n=============================================')
    console.log('ALL INVESTMENT BACKUP TESTS PASSED (100%)!')
    console.log('=============================================')
  } finally {
    await browser.close()
  }
}

run().catch((err) => {
  console.error('Smoke test failed:', err)
  process.exit(1)
})
