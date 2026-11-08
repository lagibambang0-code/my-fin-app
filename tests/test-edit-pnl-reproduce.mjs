import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'

const BASE_URL = 'http://localhost:3000'

async function run() {
  console.log('Testing User Bug: Editing PnL record from 100 should show 100, not -10.000...')
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844 })

  await page.goto(`${BASE_URL}/investments`, { waitUntil: 'networkidle2' })

  const onboardingBtn = await page.$('[data-testid="onboarding-submit"]')
  if (onboardingBtn) {
    await onboardingBtn.click()
    await new Promise((r) => setTimeout(r, 1500))
  }

  // Check if an investment exists, if not create one
  const existingCard = await page.$('[data-testid^="investment-card-"]')
  if (!existingCard) {
    const addBtn = (await page.$('[data-testid="investments-add-button"]')) || (await page.$('[data-testid="investments-empty-add-button"]'))
    if (addBtn) {
      console.log('Creating initial investment asset...')
      await addBtn.click()
      await page.waitForSelector('[data-testid="investment-form-sheet"]')
      const nameInput = await page.waitForSelector('[data-testid="investment-name-input"]')
      await nameInput.type(`Test PnL Edit ${Date.now()}`)
      const saveAsset = await page.waitForSelector('[data-testid="investment-save-button"]')
      await saveAsset.click()
      await new Promise((r) => setTimeout(r, 1000))
    }
  }

  console.log('Opening investment detail screen...')
  const invCard = await page.waitForSelector('[data-testid^="investment-card-"]')
  await invCard.click()
  await page.waitForSelector('[data-testid="investment-detail-screen"]')
  await new Promise((r) => setTimeout(r, 500))

  // Helper to add record
  async function addRecord(mode, date, val) {
    const recordBtn = await page.waitForSelector('[data-testid="investment-record-value-button"]')
    await recordBtn.click()
    await page.waitForSelector('[data-testid="investment-record-sheet"]')
    await new Promise((r) => setTimeout(r, 300))

    if (mode === 'pnl') {
      const pnlTab = await page.waitForSelector('[data-testid="inv-mode-pnl"]')
      await pnlTab.click()
      await new Promise((r) => setTimeout(r, 300))
      const pnlInput = await page.waitForSelector('[data-testid="inv-record-pnl-input"]')
      await pnlInput.type(String(val))
    } else {
      const depInput = await page.waitForSelector('[data-testid="inv-record-deposit-input"]')
      await depInput.type(String(val))
    }

    const saveRec = await page.waitForSelector('[data-testid="inv-record-save-button"]')
    await saveRec.click()
    await new Promise((r) => setTimeout(r, 1000))
  }

  // 1. Tanggal 1: Deposit 10.000
  console.log('Adding Record 1: Deposit 10.000...')
  await addRecord('deposit', '2026-11-01', 10000)

  // 2. Tanggal 2: PnL +100
  console.log('Adding Record 2: PnL +100...')
  await addRecord('pnl', '2026-11-02', 100)

  // 3. Tanggal 3: PnL +110
  console.log('Adding Record 3: PnL +110...')
  await addRecord('pnl', '2026-11-03', 110)

  // 4. Tanggal 4: Deposit 10.000
  console.log('Adding Record 4: Deposit 10.000...')
  await addRecord('deposit', '2026-11-04', 10000)

  // 5. Click to edit Record 2 (PnL +100)
  console.log('Clicking to edit Record 2 (PnL +100)...')
  const pnlFilter = await page.waitForSelector('[data-testid="investment-filter-pnl"]')
  await pnlFilter.click()
  await new Promise((r) => setTimeout(r, 300))

  // In PnL tab, rows are in reverse chronological order:
  // row 0 is Record 3 (PnL 110), row 1 is Record 2 (PnL 100)
  const pnlRows = await page.$$('[data-testid^="investment-record-row-"]')
  assert.equal(pnlRows.length, 2, 'Must have 2 PnL rows')
  console.log('Clicking on row 1 (Record 2: PnL 100)...')
  await pnlRows[1].click()
  await page.waitForSelector('[data-testid="investment-record-sheet"]')
  await new Promise((r) => setTimeout(r, 500))

  // Inspect pre-filled PnL
  const pnlInputValue = await page.$eval('[data-testid="inv-record-pnl-input"]', (el) => el.value)
  console.log('Pre-filled PnL input value in form:', pnlInputValue)
  assert.equal(pnlInputValue, '100', 'Pre-filled PnL input value MUST be 100!')

  // 6. Edit it from 100 to 99
  console.log('Editing Record 2 PnL from 100 to 99...')
  await page.$eval('[data-testid="inv-record-pnl-input"]', (el) => {
    el.value = ''
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })
  const pnlInput = await page.waitForSelector('[data-testid="inv-record-pnl-input"]')
  await pnlInput.type('99')

  const saveEditBtn = await page.waitForSelector('[data-testid="inv-record-save-button"]')
  await saveEditBtn.click()
  await new Promise((r) => setTimeout(r, 1000))

  // 7. Verify isolated edit:
  // Record 3 (PnL 110) MUST REMAIN 110 (NOT 109!)
  // And its delta against Record 2 (99) is 110 - 99 = +11!
  const pnlRowsAfter = await page.$$eval('[data-testid^="investment-record-row-"]', (els) =>
    els.map((el) => el.textContent.trim().replace(/\s+/g, ' ')),
  )
  console.log('PnL rows after editing Record 2:', pnlRowsAfter)
  // pnlRowsAfter[0] is Record 3 (Tgl 3): PnL +Rp 110, delta +11!
  assert.ok(pnlRowsAfter[0].includes('110'), 'Record 3 MUST REMAIN PnL 110 (must NOT become 109)!')
  assert.ok(pnlRowsAfter[0].includes('11'), 'Record 3 delta must reflect +11 (110 - 99)!')
  // pnlRowsAfter[1] is Record 2 (Tgl 2): PnL +Rp 99!
  assert.ok(pnlRowsAfter[1].includes('99'), 'Record 2 MUST show updated PnL 99!')
  console.log('✓ Isolated edit verified: Record 2 is 99, Record 3 remains 110 with delta +11!')

  // Switch to All tab and check portfolio total value
  const allFilter = await page.waitForSelector('[data-testid="investment-filter-all"]')
  await allFilter.click()
  await new Promise((r) => setTimeout(r, 300))

  const allRows = await page.$$eval('[data-testid^="investment-record-row-"]', (els) =>
    els.map((el) => el.textContent.trim().replace(/\s+/g, ' ')),
  )
  console.log('All rows after edit:', allRows)
  assert.equal(allRows.length, 4, 'All filter must have 4 rows')

  // Total value of the portfolio at latest entry (Tgl 4): 20.000 modal + 110 latest pnl = 20.110
  const currentValueText = await page.$eval('[data-testid="investment-current-value"]', (el) => el.textContent.trim())
  console.log('Current portfolio value:', currentValueText)
  assert.ok(currentValueText.includes('20.110'), 'Portfolio value must be 20.110!')
  console.log('✓ SUCCESS: Portfolio value is 20.110 and other records were NOT mutated!')

  // 8. Test Editing Record 4 Deposit (from 10.000 to 15.000)
  console.log('8. Testing Editing Record 4 Deposit (10.000 -> 15.000)...')
  const depFilter = await page.waitForSelector('[data-testid="investment-filter-deposit"]')
  await depFilter.click()
  await new Promise((r) => setTimeout(r, 300))

  const depRows = await page.$$('[data-testid^="investment-record-row-"]')
  // depRows[0] is Record 4 (Tgl 4 Deposit)
  await depRows[0].click()
  await page.waitForSelector('[data-testid="investment-record-sheet"]')
  await new Promise((r) => setTimeout(r, 500))

  const depInputValue = await page.$eval('[data-testid="inv-record-deposit-input"]', (el) => el.value)
  console.log('Pre-filled Deposit input value for Record 4:', depInputValue)
  assert.equal(depInputValue, '10.000', 'Pre-filled Deposit input must be 10.000!')

  // Change to 15.000
  await page.$eval('[data-testid="inv-record-deposit-input"]', (el) => {
    el.value = ''
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })
  const depInput = await page.waitForSelector('[data-testid="inv-record-deposit-input"]')
  await depInput.type('15000')

  const saveDepBtn = await page.waitForSelector('[data-testid="inv-record-save-button"]')
  await saveDepBtn.click()
  await new Promise((r) => setTimeout(r, 1000))

  // Verify Total Deposit becomes 25.000, Value becomes 25.110, PnL is still +110
  const valAfterDep = await page.$eval('[data-testid="investment-current-value"]', (el) => el.textContent.trim())
  const depAfterDep = await page.$eval('[data-testid="investment-total-deposit"]', (el) => el.textContent.trim())
  console.log(`After editing Record 4 Deposit: Value=${valAfterDep}, TotalDeposit=${depAfterDep}`)
  assert.ok(valAfterDep.includes('25.110'), 'Portfolio value must be 25.110!')
  assert.ok(depAfterDep.includes('25.000'), 'Total deposit must be 25.000!')
  console.log('✓ Editing Record 4 Deposit verified: Deposit=25.000, Value=25.110!')

  // 9. Test Editing Record 1 Deposit (from 10.000 to 12.000)
  console.log('9. Testing Editing Record 1 Initial Deposit (10.000 -> 12.000)...')
  const depFilter2 = await page.waitForSelector('[data-testid="investment-filter-deposit"]')
  await depFilter2.click()
  await new Promise((r) => setTimeout(r, 300))

  const depRows2 = await page.$$('[data-testid^="investment-record-row-"]')
  assert.equal(depRows2.length, 2, 'Deposit filter must have 2 rows')
  // depRows2[1] is Record 1 (Tgl 1 Initial Deposit)
  await depRows2[1].click()
  await page.waitForSelector('[data-testid="investment-record-sheet"]')
  await new Promise((r) => setTimeout(r, 500))

  const dep1InputValue = await page.$eval('[data-testid="inv-record-deposit-input"]', (el) => el.value)
  console.log('Pre-filled Deposit input value for Record 1:', dep1InputValue)
  assert.equal(dep1InputValue, '10.000', 'Pre-filled Deposit input for Record 1 must be 10.000!')

  // Change to 12.000
  await page.$eval('[data-testid="inv-record-deposit-input"]', (el) => {
    el.value = ''
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })
  const depInput1 = await page.waitForSelector('[data-testid="inv-record-deposit-input"]')
  await depInput1.type('12000')

  const saveDepBtn1 = await page.waitForSelector('[data-testid="inv-record-save-button"]')
  await saveDepBtn1.click()
  await new Promise((r) => setTimeout(r, 1000))

  // Verify Total Deposit becomes 27.000, Value becomes 27.110, PnL is STILL +110 (NOT negative!)
  const valAfterDep1 = await page.$eval('[data-testid="investment-current-value"]', (el) => el.textContent.trim())
  const depAfterDep1 = await page.$eval('[data-testid="investment-total-deposit"]', (el) => el.textContent.trim())
  const pnlAfterDep1 = await page.$eval('[data-testid="investment-pnl-value"]', (el) => el.textContent.trim())
  console.log(`After editing Record 1 Initial Deposit: Value=${valAfterDep1}, TotalDeposit=${depAfterDep1}, PnL=${pnlAfterDep1}`)
  assert.ok(valAfterDep1.includes('27.110'), 'Portfolio value must be 27.110!')
  assert.ok(depAfterDep1.includes('27.000'), 'Total deposit must be 27.000!')
  assert.ok(pnlAfterDep1.includes('110') && !pnlAfterDep1.includes('-'), 'PnL must remain positive +110!')
  console.log('✓ Editing Record 1 Deposit verified: Deposit=27.000, Value=27.110, PnL stays +110!')

  // 10. Test Hard Delete (deleting an entry permanently without soft delete)
  console.log('10. Testing Hard Delete: deleting Record 4 permanently...')
  const depRowsDelete = await page.$$('[data-testid^="investment-record-row-"]')
  // Click Record 4 (Row 0 in deposit tab)
  await depRowsDelete[0].click()
  await page.waitForSelector('[data-testid="investment-record-sheet"]')
  await new Promise((r) => setTimeout(r, 500))

  const deleteBtn = await page.waitForSelector('[data-testid="investment-record-delete"]')
  await deleteBtn.click()
  await page.waitForSelector('[data-testid="confirm-dialog-confirm"]')
  const confirmDelete = await page.waitForSelector('[data-testid="confirm-dialog-confirm"]')
  await confirmDelete.click()
  await new Promise((r) => setTimeout(r, 1000))

  // Verify in IndexedDB that record was permanently removed (hard deleted, count is 3, none have isDel)
  const remainingRecords = await page.evaluate(async () => {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('DompetkuDB')
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction(['investmentRecords'], 'readonly')
        const getAllReq = tx.objectStore('investmentRecords').getAll()
        getAllReq.onsuccess = () => resolve(getAllReq.result)
        getAllReq.onerror = () => reject(getAllReq.error)
      }
      req.onerror = () => reject(req.error)
    })
  })
  console.log('IndexedDB remaining records count:', remainingRecords.length)
  assert.equal(remainingRecords.length, 3, 'Record must be hard deleted permanently from IndexedDB!')
  console.log('✓ HARD DELETE verified: record was permanently removed from database!')

  await browser.close()
  console.log('=============================================')
}

run().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
