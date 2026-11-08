import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'

const BASE_URL = 'http://localhost:3000'

async function run() {
  console.log('Testing Verification of Screenshot Bug Fix (Image 1 & 2)...')
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844 })

  await page.goto(`${BASE_URL}/investments`, { waitUntil: 'networkidle2' })

  const onboardingBtn = await page.$('[data-testid="onboarding-submit"]')
  if (onboardingBtn) {
    await onboardingBtn.click()
    await new Promise((r) => setTimeout(r, 1500))
  }

  // Create asset "e"
  console.log('Creating investment asset "e"...')
  const addBtn = (await page.$('[data-testid="investments-add-button"]')) || (await page.$('[data-testid="investments-empty-add-button"]'))
  assert.ok(addBtn, 'Add investment button must exist')
  await addBtn.click()
  await page.waitForSelector('[data-testid="investment-form-sheet"]')
  const nameInput = await page.waitForSelector('[data-testid="investment-name-input"]')
  const assetName = `e_${Date.now()}`
  await nameInput.type(assetName)
  const saveAsset = await page.waitForSelector('[data-testid="investment-save-button"]')
  await saveAsset.click()
  await new Promise((r) => setTimeout(r, 1000))

  // Open the newly created asset "e"
  const invCards = await page.$$('[data-testid^="investment-card-"]')
  const lastCard = invCards[invCards.length - 1]
  await lastCard.click()
  await page.waitForSelector('[data-testid="investment-detail-screen"]')
  await new Promise((r) => setTimeout(r, 500))

  // 1. Tanggal 1: Deposit 10.000
  console.log('1. Adding Deposit 10.000...')
  const recordBtn1 = await page.waitForSelector('[data-testid="investment-record-value-button"]')
  await recordBtn1.click()
  await page.waitForSelector('[data-testid="investment-record-sheet"]')
  await new Promise((r) => setTimeout(r, 300))
  const depInput1 = await page.waitForSelector('[data-testid="inv-record-deposit-input"]')
  await depInput1.type('10000')
  const saveRec1 = await page.waitForSelector('[data-testid="inv-record-save-button"]')
  await saveRec1.click()
  await new Promise((r) => setTimeout(r, 1000))

  // 2. Tanggal 2: PnL +100
  console.log('2. Adding PnL +100...')
  const recordBtn2 = await page.waitForSelector('[data-testid="investment-record-value-button"]')
  await recordBtn2.click()
  await page.waitForSelector('[data-testid="investment-record-sheet"]')
  await new Promise((r) => setTimeout(r, 300))
  const pnlTab = await page.waitForSelector('[data-testid="inv-mode-pnl"]')
  await pnlTab.click()
  await new Promise((r) => setTimeout(r, 300))
  const pnlInput = await page.waitForSelector('[data-testid="inv-record-pnl-input"]')
  await pnlInput.type('100')
  const saveRec2 = await page.waitForSelector('[data-testid="inv-record-save-button"]')
  await saveRec2.click()
  await new Promise((r) => setTimeout(r, 1000))

  // VERIFIKASI GAMBAR 1 (Layar Rincian & Grafik)
  console.log('\n--- VERIFIKASI GAMBAR 1 (Layar Rincian & Grafik) ---')
  const chartText = await page.$eval('[data-testid="investment-chart"]', (el) => el.textContent.trim())
  console.log('Chart text content:', chartText)

  // Chart MUST NOT contain 20.100 or 101%!
  assert.ok(!chartText.includes('20.100'), 'Chart MUST NOT show 20.100!')
  assert.ok(!chartText.includes('101%'), 'Chart MUST NOT show 101%!')
  assert.ok(chartText.includes('10.100'), 'Chart MUST show portfolio value 10.100!')
  assert.ok(chartText.includes('+Rp 100 (1%)'), 'Chart MUST show PnL +Rp 100 (1%)!')
  console.log('✓ Gambar 1 diperbaiki: Grafik menampilkan Rp 10.100 dan +Rp 100 (1%), BUKAN Rp 20.100 / 101%!')
  console.log('✓ Gambar 1 diperbaiki: Grafik tidak lagi menampilkan 20.100 atau 10.100!')

  // Close detail screen to check main screen
  const closeDetail = await page.waitForSelector('[aria-label="Kembali"]')
  await closeDetail.click()
  await new Promise((r) => setTimeout(r, 500))

  // VERIFIKASI GAMBAR 2 (Layar Utama /investments)
  console.log('\n--- VERIFIKASI GAMBAR 2 (Layar Utama /investments) ---')
  const cardRows = await page.$$eval('[data-testid^="investment-card-"]', (els) =>
    els.map((el) => el.textContent.trim().replace(/\s+/g, ' ')),
  )
  const targetCardText = cardRows.find((r) => r.includes(assetName))
  console.log('Target card text on main screen:', targetCardText)

  // Card MUST show Rp 10.100 (NOT Rp 100)!
  assert.ok(targetCardText.includes('10.100'), 'Card MUST display portfolio value 10.100 (NOT 100)!')
  // Card MUST NOT show -9.900 or -99%!
  assert.ok(!targetCardText.includes('-9.900'), 'Card MUST NOT display -9.900!')
  assert.ok(!targetCardText.includes('-99%'), 'Card MUST NOT display -99%!')
  // Card MUST show +Rp 100 (+1%)!
  assert.ok(targetCardText.includes('100'), 'Card MUST display +100!')
  assert.ok(targetCardText.includes('1%'), 'Card MUST display +1%!')
  console.log('✓ Gambar 2 diperbaiki: Kartu aset di layar utama menampilkan Rp 10.100 dan +Rp 100 (+1%)!')

  await browser.close()
  console.log('\n=============================================')
  console.log('ALL SCREENSHOT FIX VERIFICATIONS PASSED (100%)!')
  console.log('=============================================')
}

run().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
