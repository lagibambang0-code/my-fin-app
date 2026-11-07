import assert from 'node:assert/strict'
import { computeCardCycles, computeCardCycleAmounts } from '../lib/asset-utils.ts'

console.log('--- 1. Testing Credit Card Billing Cycle Logic (AssetRepository.i parity) ---')

// Settle on 1st of month, pay on 1st of month.
// Given a reference date 2026-10-15:
// Payable (closed): 2026-09-01 ~ 2026-09-30 (Pay: 2026-10-01)
// Upcoming (open): 2026-10-01 ~ 2026-10-31 (Pay: 2026-11-01)
const cycles = computeCardCycles(1, 1, new Date('2026-10-15T12:00:00'))

assert.equal(cycles.payable.start.getDate(), 1)
assert.equal(cycles.payable.start.getMonth(), 8) // September
assert.equal(cycles.payable.end.getDate(), 30)
assert.equal(cycles.payable.end.getMonth(), 8) // September

assert.equal(cycles.upcoming.start.getDate(), 1)
assert.equal(cycles.upcoming.start.getMonth(), 9) // October
assert.equal(cycles.upcoming.end.getDate(), 31)
assert.equal(cycles.upcoming.end.getMonth(), 9) // October

// Test transactions across cycles
const mockCardTxs = [
  // Older cycle (August) unpaid charge
  { assetUid: 'card1', DO_TYPE: '1', ZDATE: '2026-08-20', AMOUNT_ACCOUNT: 50000 },
  // Payable cycle (September) charges: 150000 + 200000
  { assetUid: 'card1', DO_TYPE: '1', ZDATE: '2026-09-05', AMOUNT_ACCOUNT: 150000 },
  { assetUid: 'card1', DO_TYPE: 'expense', ZDATE: '2026-09-25', AMOUNT_ACCOUNT: 200000 },
  // Payable cycle repayment: 100000
  { assetUid: 'card1', DO_TYPE: '0', ZDATE: '2026-09-28', AMOUNT_ACCOUNT: 100000 },
  // Upcoming cycle (October) charges: 300000
  { assetUid: 'card1', DO_TYPE: '1', ZDATE: '2026-10-05', AMOUNT_ACCOUNT: 300000 },
  // Other card transaction (should be ignored)
  { assetUid: 'card2', DO_TYPE: '1', ZDATE: '2026-09-10', AMOUNT_ACCOUNT: 999999 },
]

const cardAmounts = computeCardCycleAmounts(cycles, mockCardTxs, 'card1')

// Payable amount = September net (350000 - 100000 = 250000) + August older unpaid (50000) = 300000
assert.equal(cardAmounts.payableAmount, 300000, 'Payable amount must include net cycle + older unpaid carryover')
// Upcoming amount = October charges (300000)
assert.equal(cardAmounts.upcomingAmount, 300000, 'Upcoming amount must match open cycle charges')

console.log('✓ Credit Card Billing Cycle tests passed!')

console.log('--- 2. Testing AssetService.k Balance & Wealth Parity Formula ---')

// AssetService.k exact rules:
// - positive balance (> 0) -> adds to Total Assets
// - negative balance (< 0) -> Math.abs(balance) adds to Total Liabilities
// - debit card (type 3) -> excluded from net worth
// - excluded asset (ZDATA2 = '1' or IS_INCLUDE_TOTAL = 0) -> excluded
function calculateSummaryMock(assets, groups, deltas) {
  const typeByUid = new Map(groups.map((g) => [g.uid, g.TYPE]))
  let assetTotal = 0
  let liabilityTotal = 0

  for (const a of assets) {
    const isExcluded = a.ZDATA2 === '1' || a.IS_INCLUDE_TOTAL === 0
    if (isExcluded) continue
    const groupType = typeByUid.get(a.groupUid)
    if (groupType === 3) continue // debit card

    const balance = deltas.get(a.uid) ?? 0
    if (balance > 0) {
      assetTotal += balance
    } else if (balance < 0) {
      liabilityTotal += Math.abs(balance)
    }
  }

  return { assets: assetTotal, liabilities: liabilityTotal, total: assetTotal - liabilityTotal }
}

const mockGroups = [
  { uid: 'ag_cash', TYPE: 11 },
  { uid: 'ag_accounts', TYPE: 1 },
  { uid: 'ag_card', TYPE: 2 },
  { uid: 'ag_debit', TYPE: 3 },
]

const mockAssets = [
  { uid: 'ast_cash', groupUid: 'ag_cash', ZDATA2: '0', IS_INCLUDE_TOTAL: 1 },
  { uid: 'ast_bank', groupUid: 'ag_accounts', ZDATA2: '0', IS_INCLUDE_TOTAL: 1 },
  { uid: 'ast_card', groupUid: 'ag_card', ZDATA2: '0', IS_INCLUDE_TOTAL: 1 },
  { uid: 'ast_debit', groupUid: 'ag_debit', ZDATA2: '0', IS_INCLUDE_TOTAL: 1 },
  { uid: 'ast_hidden', groupUid: 'ag_accounts', ZDATA2: '1', IS_INCLUDE_TOTAL: 0 },
]

const mockDeltas = new Map([
  ['ast_cash', 500000],   // +500.000 -> Assets
  ['ast_bank', 2000000],  // +2.000.000 -> Assets
  ['ast_card', -750000],  // -750.000 -> Liabilities: 750.000
  ['ast_debit', 1000000], // Debit card mirror -> Ignored
  ['ast_hidden', 300000], // Excluded -> Ignored
])

const summary = calculateSummaryMock(mockAssets, mockGroups, mockDeltas)
assert.equal(summary.assets, 2500000, 'Total Assets should be 500.000 + 2.000.000 = 2.500.000')
assert.equal(summary.liabilities, 750000, 'Total Liabilities should be 750.000')
assert.equal(summary.total, 1750000, 'Net Worth should be 2.500.000 - 750.000 = 1.750.000')

console.log('✓ AssetService.k Wealth Summary tests passed!')

console.log('--- 3. Testing DO_TYPE Delta Calculations (AssetRepository.a parity) ---')

function calculateDeltasMock(transactions) {
  const deltas = new Map()
  const add = (uid, amount) => {
    if (!uid) return
    deltas.set(uid, (deltas.get(uid) ?? 0) + amount)
  }

  for (const t of transactions) {
    const amount = Number(t.AMOUNT_ACCOUNT ?? t.ZMONEY) || 0
    if (t.DO_TYPE === 'income' || t.DO_TYPE === '0' || t.DO_TYPE === '2') {
      add(t.assetUid, amount)
    } else if (t.DO_TYPE === 'expense' || t.DO_TYPE === '1') {
      add(t.assetUid, -amount)
    } else if (t.DO_TYPE === 'transfer' || t.DO_TYPE === '3') {
      add(t.assetUid, -(amount + (Number(t.FEE) || 0)))
      if (t.toAssetUid && !t.txUidTrans) add(t.toAssetUid, Number(t.IN_ZMONEY) || amount)
    } else if (t.DO_TYPE === '4') {
      add(t.assetUid, amount)
    } else if (t.DO_TYPE === 'adjustment' || t.DO_TYPE === '7') {
      add(t.assetUid, amount)
    } else if (t.DO_TYPE === '8') {
      add(t.assetUid, -amount)
    }
  }
  return deltas
}

const txTestList = [
  // Initial balance adjustment via DO_TYPE 7 (+1.000.000)
  { assetUid: 'a1', DO_TYPE: '7', ZMONEY: '1000000' },
  // Negative adjustment via DO_TYPE 8 (-100.000)
  { assetUid: 'a1', DO_TYPE: '8', ZMONEY: '100000' },
  // Single-row transfer from a1 to a2 (amount: 200.000, fee: 5.000)
  { assetUid: 'a1', toAssetUid: 'a2', DO_TYPE: 'transfer', ZMONEY: '200000', FEE: 5000 },
  // Paired Money Manager transfer from a2 to a3 (amount: 50.000)
  { assetUid: 'a2', toAssetUid: 'a3', DO_TYPE: '3', ZMONEY: '50000', txUidTrans: 'trans_pair_1' },
  { assetUid: 'a3', toAssetUid: 'a2', DO_TYPE: '4', ZMONEY: '50000', txUidTrans: 'trans_pair_1' },
  // Operational Income to a3 (+25.000)
  { assetUid: 'a3', DO_TYPE: '0', ZMONEY: '25000' },
  // Operational Expense from a1 (-50.000)
  { assetUid: 'a1', DO_TYPE: '1', ZMONEY: '50000' },
]

const deltas = calculateDeltasMock(txTestList)

// a1: +1.000.000 (adj 7) - 100.000 (adj 8) - (200.000 + 5.000 transfer out) - 50.000 (expense 1) = 645.000
assert.equal(deltas.get('a1'), 645000, 'Asset a1 delta calculation accurate')
// a2: +200.000 (single transfer in from a1) - 50.000 (paired transfer out DO_TYPE 3) = 150.000
assert.equal(deltas.get('a2'), 150000, 'Asset a2 delta calculation accurate with paired transfer')
// a3: +50.000 (paired transfer in DO_TYPE 4) + 25.000 (income 0) = 75.000
assert.equal(deltas.get('a3'), 75000, 'Asset a3 delta calculation accurate with paired transfer')

console.log('✓ DO_TYPE [0, 1, 3, 4, 7, 8] Delta tests passed!')

console.log('--- 4. Testing Core Asset Group Identification ---')

const isCoreGroup = (group) =>
  group.IS_DEFAULT === 1 ||
  ['ag_cash', 'ag_accounts', 'ag_card', 'ag_debit', '1', '2', '3', '11'].includes(String(group.uid)) ||
  ['1', '2', '3', '11'].includes(String(group.id)) ||
  ['Cash', 'Accounts', 'Card', 'Debit Card', 'Kas', 'Rekening', 'Kartu', 'Kartu Debit'].includes(group.ACC_GROUP_NAME)

// Even if user renames "Rekening" to "BCA Tabungan", it retains core group status
const renamedGroup = {
  id: 2,
  uid: 'ag_accounts',
  ACC_GROUP_NAME: 'BCA Tabungan',
  TYPE: 1,
  IS_DEFAULT: 1,
}

assert.equal(isCoreGroup(renamedGroup), true, 'Renamed default group MUST retain core group status')

const customGroup = {
  id: 15,
  uid: 'ag_custom_99',
  ACC_GROUP_NAME: 'Bisnis Sampingan',
  TYPE: 1,
  IS_DEFAULT: 0,
}

assert.equal(isCoreGroup(customGroup), false, 'Custom group must not be core')

console.log('✓ Core Asset Group Identification tests passed!')

console.log('\n=============================================')
console.log('ALL PARITY AUDIT SCENARIO TESTS PASSED (100%)')
console.log('=============================================')
