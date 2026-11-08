import assert from 'node:assert/strict'
import { summarize, groupByDate } from '../lib/transaction-utils.ts'
import { categoryBreakdown, calculateAverages, matchesStatsType } from '../lib/statistics-utils.ts'

console.log('Testing Transfer Fee in Expense Totals, Statistics, and Breakdown...')

const mockCategories = new Map([
  ['cat_food', { uid: 'cat_food', NAME: 'Makanan', TYPE: 1, STATUS: 0, pUid: null }],
  ['cat_transfer_fee', { uid: 'cat_transfer_fee', NAME: 'Biaya transfer', TYPE: 1, STATUS: 0, pUid: null }],
])

// 1. Test legacy transfer (FEE field on transfer row)
const legacyTransfer = {
  uid: 'tx_leg',
  DO_TYPE: 'transfer',
  assetUid: 'ast_cash',
  toAssetUid: 'ast_bank',
  ZMONEY: '100000',
  AMOUNT_ACCOUNT: 100000,
  FEE: 2500,
  ZDATE: '2026-11-07',
}
const legacySummary = summarize([legacyTransfer])
assert.equal(legacySummary.income, 0)
assert.equal(legacySummary.expense, 2500, 'Legacy transfer fee MUST be counted in summary.expense')
assert.equal(legacySummary.total, -2500)
console.log('✓ 1. Legacy transfer fee counted in summarize()!')

// 2. Test modern transfer with paired fee transaction (Money Manager APK parity)
const modernTransfer = {
  uid: 'tx_transfer_1',
  DO_TYPE: 'transfer',
  assetUid: 'ast_cash',
  toAssetUid: 'ast_bank',
  ZMONEY: '100000',
  AMOUNT_ACCOUNT: 100000,
  FEE: 2500,
  txUidFee: 'tx_fee_1',
  ZDATE: '2026-11-07',
}

const modernFee = {
  uid: 'tx_fee_1',
  DO_TYPE: '1', // Expense
  ctgUid: 'cat_transfer_fee',
  CATEGORY_NAME: 'Biaya transfer',
  ZCONTENT: 'Biaya transfer',
  assetUid: 'ast_cash',
  toAssetUid: null,
  ZMONEY: '2500',
  AMOUNT_ACCOUNT: 2500,
  txUidFee: 'tx_transfer_1',
  ZDATE: '2026-11-07',
  IS_DEL: 0,
}

const foodTx = {
  uid: 'tx_food_1',
  DO_TYPE: '1',
  ctgUid: 'cat_food',
  CATEGORY_NAME: 'Makanan',
  assetUid: 'ast_cash',
  ZMONEY: '50000',
  AMOUNT_ACCOUNT: 50000,
  ZDATE: '2026-11-07',
  IS_DEL: 0,
}

const txList = [modernTransfer, modernFee, foodTx]

// Test summarize()
const modernSummary = summarize(txList)
assert.equal(modernSummary.income, 0)
assert.equal(modernSummary.expense, 52500, 'Total expense MUST be food (50.000) + transfer fee (2.500)')
assert.equal(modernSummary.total, -52500)
console.log('✓ 2. Modern transfer paired fee counted in summarize()!')

// Test Statistics Category Breakdown
const breakdown = categoryBreakdown(txList, 'expense', mockCategories)
assert.equal(breakdown.length, 2, 'Breakdown must have 2 categories: Makanan and Biaya transfer')
const feeRow = breakdown.find((r) => r.name === 'Biaya transfer' || r.uid === 'cat_transfer_fee')
assert.ok(feeRow, 'Biaya transfer category must exist in statistics breakdown')
assert.equal(feeRow.amount, 2500, 'Biaya transfer amount in stats must be 2.500')
console.log('✓ 3. Transfer fee appears in statistics category breakdown!')

// Test Statistics calculateAverages
const avg = calculateAverages(52500, txList, 'expense', { mode: 'weekly', weekStart: '2026-11-02' }, new Date('2026-11-08T00:00:00Z'))
assert.equal(avg.activeDays, 1, 'There was 1 active day with expense (2026-11-07)')
assert.equal(avg.activeDayAverage, 52500, 'Active day average must be 52.500')
console.log('✓ 4. Transfer fee included in statistics averages calculation!')
console.log('\n====================================')
console.log('ALL TRANSFER FEE STATS TESTS PASSED (100%)!')
console.log('====================================')
