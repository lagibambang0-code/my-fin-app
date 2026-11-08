import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'

const BASE_URL = 'http://localhost:3000'

async function run() {
  console.log('Testing Investment Record Sheet: Deposit & PnL toggles and dedicated inputs...')
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
      console.log('Creating initial investment asset (Reksa Dana Bibit)...')
      await addBtn.click()
      await page.waitForSelector('[data-testid="investment-form-sheet"]')
      const nameInput = await page.waitForSelector('[data-testid="investment-name-input"]')
      await nameInput.type('Bibit Reksadana')
      const saveAsset = await page.waitForSelector('[data-testid="investment-save-button"]')
      await saveAsset.click()
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
  // Click on the investment card to open detail screen
  console.log('Opening investment detail screen...')
  const invCard = await page.waitForSelector('[data-testid^="investment-card-"]')
  await invCard.click()
  await page.waitForSelector('[data-testid="investment-detail-screen"]')
  await new Promise((r) => setTimeout(r, 500))

  // 1. Click "Catat Nilai"
  console.log('1. Opening Catat Nilai sheet...')
  const recordValBtn = await page.waitForSelector('[data-testid="investment-record-value-button"]')
  await recordValBtn.click()
  await page.waitForSelector('[data-testid="investment-record-sheet"]')
  await new Promise((r) => setTimeout(r, 300))
  // Verify Date and Time Picker buttons
  console.log('Testing Date and Time Picker buttons...')
  const dateBtn = await page.waitForSelector('[data-testid="inv-record-date-button"]')
  await dateBtn.click()
  await page.waitForSelector('[data-testid="date-picker-close"]')
  const dateClose = await page.waitForSelector('[data-testid="date-picker-close"]')
  await dateClose.click()
  await new Promise((r) => setTimeout(r, 300))
  console.log('✓ DatePickerSheet verified!')

  const timeBtn = await page.waitForSelector('[data-testid="inv-record-time-button"]')
  await timeBtn.click()
  await page.waitForSelector('[data-testid="time-picker-confirm"]')
  const timeConfirm = await page.waitForSelector('[data-testid="time-picker-confirm"]')
  await timeConfirm.click()
  await new Promise((r) => setTimeout(r, 300))
  console.log('✓ TimePickerSheet verified!')

  // Verify Toggle Labels
  const depositToggle = await page.waitForSelector('[data-testid="inv-mode-deposit"]')
  const pnlToggle = await page.waitForSelector('[data-testid="inv-mode-pnl"]')
  const depositLabel = await depositToggle.evaluate((el) => el.textContent.trim())
  const pnlLabel = await pnlToggle.evaluate((el) => el.textContent.trim())

  console.log('Toggle 1 label:', depositLabel)
  console.log('Toggle 2 label:', pnlLabel)
  assert.equal(depositLabel, 'Deposit', 'Toggle label must be exactly "Deposit"')
  assert.equal(pnlLabel, 'PnL', 'Toggle label must be exactly "PnL"')
  console.log('✓ Toggle labels verified: "Deposit" and "PnL"!')

  // 2. Verify Toggle "Deposit" ONLY contains deposit input
  const depositInput = await page.$('[data-testid="inv-record-deposit-input"]')
  const pnlInputInDeposit = await page.$('[data-testid="inv-record-pnl-input"]')
  const amountInputInDeposit = await page.$('[data-testid="inv-record-amount-input"]')

  assert.ok(depositInput != null, 'Deposit input must exist in Deposit toggle')
  assert.ok(pnlInputInDeposit == null, 'PnL input must NOT exist in Deposit toggle')
  assert.ok(amountInputInDeposit == null, 'Old amount input must NOT exist in Deposit toggle')
  console.log('✓ Toggle "Deposit" contains ONLY deposit input!')

  // Input initial deposit 10.000.000
  console.log('Entering initial deposit 10.000.000...')
  await depositInput.type('10000000')
  const saveRecordBtn1 = await page.waitForSelector('[data-testid="inv-record-save-button"]')
  await saveRecordBtn1.click()
  await new Promise((r) => setTimeout(r, 1000))

  // Check detail metrics: Total Deposit 10.000.000, Value 10.000.000, PnL 0
  const val1 = await page.$eval('[data-testid="investment-current-value"]', (el) => el.textContent.trim())
  const dep1 = await page.$eval('[data-testid="investment-total-deposit"]', (el) => el.textContent.trim())
  console.log(`Current value: ${val1}, Total deposit: ${dep1}`)
  assert.ok(val1.includes('10.000.000'), 'Current value must be 10.000.000')
  assert.ok(dep1.includes('10.000.000'), 'Total deposit must be 10.000.000')

  // 3. Click "Catat Nilai" again, switch to PnL toggle
  console.log('3. Opening Catat Nilai and switching to PnL toggle...')
  const recordValBtn2 = await page.waitForSelector('[data-testid="investment-record-value-button"]')
  await recordValBtn2.click()
  await page.waitForSelector('[data-testid="investment-record-sheet"]')
  await new Promise((r) => setTimeout(r, 300))

  const pnlToggle2 = await page.waitForSelector('[data-testid="inv-mode-pnl"]')
  await pnlToggle2.click()
  await new Promise((r) => setTimeout(r, 300))
  // Verify Toggle "PnL" ONLY contains PnL input
  const depositInputInPnl = await page.$('[data-testid="inv-record-deposit-input"]')
  const pnlInput = await page.$('[data-testid="inv-record-pnl-input"]')
  const amountInputInPnl = await page.$('[data-testid="inv-record-amount-input"]')

  assert.ok(pnlInput != null, 'PnL input must exist in PnL toggle')
  assert.ok(depositInputInPnl == null, 'Deposit input must NOT exist in PnL toggle')
  assert.ok(amountInputInPnl == null, 'Old amount input must NOT exist in PnL toggle')
  console.log('✓ Toggle "PnL" contains ONLY PnL input!')

  // Enter PnL: 500000
  console.log('Entering PnL +500.000...')
  await pnlInput.type('500000')
  const saveRecordBtn2 = await page.waitForSelector('[data-testid="inv-record-save-button"]')
  await saveRecordBtn2.click()
  await new Promise((r) => setTimeout(r, 1000))

  // Check detail metrics: Total Deposit 10.000.000, Value 10.500.000, PnL +500.000
  const val2 = await page.$eval('[data-testid="investment-current-value"]', (el) => el.textContent.trim())
  const dep2 = await page.$eval('[data-testid="investment-total-deposit"]', (el) => el.textContent.trim())
  const pnl2 = await page.$eval('[data-testid="investment-pnl-value"]', (el) => el.textContent.trim())
  console.log(`Current value: ${val2}, Total deposit: ${dep2}, PnL: ${pnl2}`)
  assert.ok(val2.includes('10.500.000'), 'Current value must be 10.500.000')
  assert.ok(dep2.includes('10.000.000'), 'Total deposit must remain 10.000.000')
  assert.ok(pnl2.includes('500.000'), 'PnL must be +500.000')
  // 3b. Add second PnL entry: 550000 (delta should be +50.000)
  console.log('3b. Adding second PnL entry (+550.000)...')
  const recordValBtn2b = await page.waitForSelector('[data-testid="investment-record-value-button"]')
  await recordValBtn2b.click()
  await page.waitForSelector('[data-testid="investment-record-sheet"]')
  await new Promise((r) => setTimeout(r, 300))
  const pnlToggle2b = await page.waitForSelector('[data-testid="inv-mode-pnl"]')
  await pnlToggle2b.click()
  await new Promise((r) => setTimeout(r, 300))
  const pnlInput2b = await page.waitForSelector('[data-testid="inv-record-pnl-input"]')
  await pnlInput2b.type('550000')
  const saveRecordBtn2b = await page.waitForSelector('[data-testid="inv-record-save-button"]')
  await saveRecordBtn2b.click()
  await new Promise((r) => setTimeout(r, 1000))

  // 4. Click "Catat Nilai" again, add deposit 2.000.000
  console.log('4. Adding top-up deposit 2.000.000...')
  const recordValBtn3 = await page.waitForSelector('[data-testid="investment-record-value-button"]')
  await recordValBtn3.click()
  await page.waitForSelector('[data-testid="investment-record-sheet"]')
  await new Promise((r) => setTimeout(r, 300))
  const depositInput3 = await page.waitForSelector('[data-testid="inv-record-deposit-input"]')
  await depositInput3.type('2000000')
  const saveRecordBtn3 = await page.waitForSelector('[data-testid="inv-record-save-button"]')
  await saveRecordBtn3.click()
  await new Promise((r) => setTimeout(r, 1000))

  // Check detail metrics: Total Deposit 12.000.000, Value 12.550.000, PnL +550.000
  const val3 = await page.$eval('[data-testid="investment-current-value"]', (el) => el.textContent.trim())
  const dep3 = await page.$eval('[data-testid="investment-total-deposit"]', (el) => el.textContent.trim())
  const pnl3 = await page.$eval('[data-testid="investment-pnl-value"]', (el) => el.textContent.trim())
  console.log(`Current value: ${val3}, Total deposit: ${dep3}, PnL: ${pnl3}`)
  assert.ok(val3.includes('12.550.000'), 'Current value must be 12.550.000')
  assert.ok(dep3.includes('12.000.000'), 'Total deposit must be 12.000.000')
  assert.ok(pnl3.includes('550.000'), 'PnL must be +550.000')
  console.log('✓ Top-up deposit calculation verified: Value 12.550.000, Deposit 12.000.000!')

  // 5. Test History Filter Segments: All, Deposit, PnL
  console.log('5. Testing history filter segments...')
  const filterDepositBtn = await page.waitForSelector('[data-testid="investment-filter-deposit"]')
  await filterDepositBtn.click()
  await new Promise((r) => setTimeout(r, 300))

  let visibleRows = await page.$$eval('[data-testid^="investment-record-row-"]', (els) =>
    els.map((el) => el.textContent.trim().replace(/\s+/g, ' ')),
  )
  console.log('Rows in Deposit tab:', visibleRows)
  assert.equal(visibleRows.length, 2, 'Deposit filter should show exactly 2 deposit entries')
  assert.ok(visibleRows.every((r) => r.includes('Deposit')), 'All entries in Deposit tab must have Deposit badge')
  console.log('✓ Deposit filter verified (2 deposit entries)!')

  const filterPnlBtn = await page.waitForSelector('[data-testid="investment-filter-pnl"]')
  await filterPnlBtn.click()
  await new Promise((r) => setTimeout(r, 300))

  visibleRows = await page.$$eval('[data-testid^="investment-record-row-"]', (els) =>
    els.map((el) => el.textContent.trim().replace(/\s+/g, ' ')),
  )
  console.log('Rows in PnL tab:', visibleRows)
  assert.equal(visibleRows.length, 2, 'PnL filter should show exactly 2 PnL entries')
  assert.ok(visibleRows.every((r) => r.includes('PnL')), 'All entries in PnL tab must have PnL badge')
  assert.ok(visibleRows.some((r) => r.includes('50.000')), 'Must display delta PnL +50.000')
  console.log('✓ PnL filter verified with delta change (+50.000)!')
  const filterAllBtn = await page.waitForSelector('[data-testid="investment-filter-all"]')
  await filterAllBtn.click()
  await new Promise((r) => setTimeout(r, 300))

  visibleRows = await page.$$eval('[data-testid^="investment-record-row-"]', (els) =>
    els.map((el) => el.textContent.trim().replace(/\s+/g, ' ')),
  )
  console.log('Rows in All tab:', visibleRows)
  assert.equal(visibleRows.length, 4, 'All filter should show all 4 entries')
  console.log('✓ All filter verified (4 entries)!')

  // 6. Test clicking a PnL entry to edit
  console.log('6. Testing editing a PnL entry from history...')
  await filterPnlBtn.click()
  await new Promise((r) => setTimeout(r, 300))
  const pnlRow = await page.waitForSelector('[data-testid^="investment-record-row-"]')
  await pnlRow.click()
  await page.waitForSelector('[data-testid="investment-record-sheet"]')

  // Verify that PnL mode is selected
  const isPnlSelected = await page.$eval('[data-testid="inv-mode-pnl"]', (el) => el.className.includes('bg-background'))
  assert.ok(isPnlSelected, 'PnL mode should be active when editing a PnL entry')
  const closeSheetBtn = await page.waitForSelector('[aria-label="Tutup"]')
  await closeSheetBtn.click()
  await new Promise((r) => setTimeout(r, 300))
  console.log('✓ Editing PnL entry opens sheet in PnL mode!')

  await browser.close()
  console.log('\n=============================================')
  console.log('ALL INVESTMENT RECORD TESTS PASSED (100%)!')
  console.log('=============================================')
}

run().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
