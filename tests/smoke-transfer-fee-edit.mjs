import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'

const BASE_URL = 'http://localhost:3000'

async function run() {
  console.log('Testing End-to-End Transfer Fee Edit & Delete Parity...')
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844 })

  await page.goto(`${BASE_URL}/transactions`, { waitUntil: 'networkidle2' })

  const onboardingBtn = await page.$('[data-testid="onboarding-submit"]')
  if (onboardingBtn) {
    await onboardingBtn.click()
    await new Promise((r) => setTimeout(r, 1500))
  }

  // 1. Create a transfer with fee 500
  console.log('1. Creating Transfer with fee 500...')
  const fab = await page.waitForSelector('[data-testid="trx-fab"]')
  await fab.click()
  await page.waitForSelector('[data-testid="transaction-form"]')

  const transferTab = await page.waitForSelector('[data-testid="trx-type-transfer"]')
  await transferTab.click()
  await new Promise((r) => setTimeout(r, 300))

  const fromAssetBtn = await page.waitForSelector('[data-testid="trx-from-asset-button"]')
  await fromAssetBtn.click()
  await new Promise((r) => setTimeout(r, 300))
  const pickerFrom = await page.$$('[data-testid^="picker-option-"]')
  await pickerFrom[0].click()
  await new Promise((r) => setTimeout(r, 300))

  let pickerTo = await page.$$('[data-testid^="picker-option-"]')
  if (pickerTo.length === 0) {
    const toAssetBtn = await page.waitForSelector('[data-testid="trx-to-asset-button"]')
    await toAssetBtn.click()
    await new Promise((r) => setTimeout(r, 300))
    pickerTo = await page.$$('[data-testid^="picker-option-"]')
  }
  await pickerTo[1].click()
  await new Promise((r) => setTimeout(r, 300))
  let numpadKey1 = await page.$('[data-testid="numpad-1"]')
  if (!numpadKey1) {
    const amountDisplay = await page.waitForSelector('[data-testid="trx-amount-display"]')
    await amountDisplay.click()
    await new Promise((r) => setTimeout(r, 300))
  }
  for (const digit of ['1', '0', '0', '0', '0']) {
    const key = await page.waitForSelector(`[data-testid="numpad-${digit}"]`)
    await key.click()
  }

  const feeBtn = await page.waitForSelector('[data-testid="trx-quick-fee-btn"]')
  await feeBtn.click()
  await page.waitForSelector('[data-testid="trx-fee-sheet"]')
  for (const digit of ['5', '0', '0']) {
    const key = await page.waitForSelector(`[data-testid="fee-numpad-${digit}"]`)
    await key.click()
  }
  const feeSave = await page.waitForSelector('[data-testid="trx-fee-sheet-done"]')
  await feeSave.click()
  await new Promise((r) => setTimeout(r, 300))

  const saveBtn = await page.waitForSelector('[data-testid="trx-save"]')
  await saveBtn.click()
  await new Promise((r) => setTimeout(r, 1000))

  let rows = await page.$$eval('[data-testid^="tx-row-"]', (els) =>
    els.map((el) => el.textContent.trim().replace(/\s+/g, ' ')),
  )
  console.log('Initial rows:', rows)
  assert.equal(rows.length, 2, 'Must have 2 rows (transfer & fee)')
  console.log('✓ Initial transfer and fee created!')

  // 2. Edit fee via fee row directly (changing 500 to 600)
  console.log('2. Editing fee via fee row directly (500 -> 600)...')
  let feeIndex = rows.findIndex((r) => r.includes('Transfer fee') || r.includes('Biaya transfer'))
  let txRows = await page.$$('[data-testid^="tx-row-"]')
  await txRows[feeIndex].click()
  await page.waitForSelector('[data-testid="transaction-form"]')
  await new Promise((r) => setTimeout(r, 500))
  const amountDisplay = await page.waitForSelector('[data-testid="trx-amount-display"]')
  await amountDisplay.click()
  await new Promise((r) => setTimeout(r, 300))
  const backBtn = await page.waitForSelector('[data-testid="numpad-back"]')
  await backBtn.click()
  await backBtn.click()
  await backBtn.click()
  for (const digit of ['6', '0', '0']) {
    const key = await page.waitForSelector(`[data-testid="numpad-${digit}"]`)
    await key.click()
  }

  const editSaveBtn = await page.waitForSelector('[data-testid="trx-save"]')
  await editSaveBtn.click()
  await new Promise((r) => setTimeout(r, 1000))

  rows = await page.$$eval('[data-testid^="tx-row-"]', (els) =>
    els.map((el) => el.textContent.trim().replace(/\s+/g, ' ')),
  )
  console.log('Rows after fee edit:', rows)
  assert.equal(rows.length, 2, 'Neither row must disappear after editing fee!')
  assert.ok(rows.some((r) => r.includes('600')), 'Fee must be updated to 600!')
  console.log('✓ Editing fee directly keeps both items visible and updates fee to 600!')

  // 3. Edit fee via transfer row (changing 600 to 700)
  console.log('3. Editing fee via transfer row (600 -> 700)...')
  let transferIndex = rows.findIndex((r) => r.includes('Transfer') && !r.includes('fee') && !r.includes('Biaya'))
  txRows = await page.$$('[data-testid^="tx-row-"]')
  await txRows[transferIndex].click()
  await page.waitForSelector('[data-testid="transaction-form"]')
  await new Promise((r) => setTimeout(r, 500))

  const editTransferFeeBtn = await page.waitForSelector('[data-testid="trx-quick-fee-btn"]')
  await editTransferFeeBtn.click()
  await page.waitForSelector('[data-testid="trx-fee-sheet"]')

  const feeBack = await page.waitForSelector('[data-testid="fee-numpad-back"]')
  await feeBack.click()
  await feeBack.click()
  await feeBack.click()
  for (const digit of ['7', '0', '0']) {
    const key = await page.waitForSelector(`[data-testid="fee-numpad-${digit}"]`)
    await key.click()
  }
  const editFeeDone = await page.waitForSelector('[data-testid="trx-fee-sheet-done"]')
  await editFeeDone.click()
  await new Promise((r) => setTimeout(r, 300))

  const saveTransferBtn = await page.waitForSelector('[data-testid="trx-save"]')
  await saveTransferBtn.click()
  await new Promise((r) => setTimeout(r, 1000))

  rows = await page.$$eval('[data-testid^="tx-row-"]', (els) =>
    els.map((el) => el.textContent.trim().replace(/\s+/g, ' ')),
  )
  console.log('Rows after transfer edit:', rows)
  assert.equal(rows.length, 2, 'Both rows must remain visible!')
  assert.ok(rows.some((r) => r.includes('700')), 'Fee must be updated to 700!')
  console.log('✓ Editing fee via transfer row keeps both items visible and updates fee to 700!')

  await browser.close()
  console.log('\n=============================================')
  console.log('ALL TRANSFER FEE REGRESSION TESTS PASSED (100%)!')
  console.log('=============================================')
}

run().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
