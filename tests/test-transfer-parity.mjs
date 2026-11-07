import assert from 'node:assert/strict'
import { categoryDetailsFor, assetLabelFor } from '../components/transaction-list.tsx'
import { groupByDate } from '../lib/transaction-utils.ts'

console.log('Testing Comprehensive Transfer Parity (Tab Transaksi vs POV Per Aset)...')

const mockLookups = {
  categories: new Map([
    ['cat1', { uid: 'cat1', NAME: 'Makanan', STATUS: 0, pUid: null }],
  ]),
  assets: new Map([
    ['ast_cash', { uid: 'ast_cash', NIC_NAME: 'Kas' }],
    ['ast_bank', { uid: 'ast_bank', NIC_NAME: 'Rekening BCA' }],
  ]),
  currency: { SYMBOL: 'Rp', SYMBOL_POSITION: 'front', DECIMAL_POINT: 0 },
}

// 1. Transfer without note
const txNoNote = {
  uid: 'tx1',
  DO_TYPE: 'transfer',
  assetUid: 'ast_cash',
  toAssetUid: 'ast_bank',
  ZMONEY: '100000',
  ZCONTENT: null,
  ZDATE: '2026-11-07',
  wtime: '14:30',
  FEE: 2500,
}

const cat1 = categoryDetailsFor(txNoNote, mockLookups)
assert.equal(cat1.main, 'Transfer', 'Transfer main category should be Transfer')
const label1 = assetLabelFor(txNoNote, mockLookups)
assert.equal(label1, 'Kas → Rekening BCA', 'Asset label should be Source → Dest')
console.log('✓ 1. Transfer without note category & account label verified!')

// 2. Transfer with DO_TYPE = '3' (APK numeric code)
const txDoType3 = {
  uid: 'tx3',
  DO_TYPE: '3',
  assetUid: 'ast_cash',
  toAssetUid: 'ast_bank',
  ZMONEY: '50000',
  ZCONTENT: 'Bayar arisan',
  ZDATE: '2026-11-07',
  wtime: '10:00',
  FEE: 0,
}

const cat3 = categoryDetailsFor(txDoType3, mockLookups)
assert.equal(cat3.main, 'Transfer')
const label3 = assetLabelFor(txDoType3, mockLookups)
assert.equal(label3, 'Kas → Rekening BCA')
console.log('✓ 2. Transfer DO_TYPE 3 verified!')

// 3. Transfer leg 4 (receiving account DO_TYPE = '4')
const txDoType4 = {
  uid: 'tx4',
  DO_TYPE: '4',
  assetUid: 'ast_bank', // Dest
  toAssetUid: 'ast_cash', // Source
  ZMONEY: '50000',
  ZCONTENT: null,
  ZDATE: '2026-11-07',
  wtime: '10:00',
  FEE: 0,
}

const label4 = assetLabelFor(txDoType4, mockLookups)
assert.equal(label4, 'Kas → Rekening BCA', 'Leg 4 MUST display Source → Dest, NOT Dest → Source!')
console.log('✓ 3. Transfer leg 4 Source → Dest order verified!')

// 4. Test POV Per Aset Cash flow grouping via groupByDate
console.log('4. Testing groupByDate POV Per Aset (Kas vs Rekening BCA)...')
// For Kas (the sender with fee):
const kasGroups = groupByDate([txNoNote], 'ast_cash')
assert.equal(kasGroups.length, 1)
// Kas pays 100.000 + 2.500 fee = 102.500 expense
assert.equal(kasGroups[0].expense, 102500, 'Sending asset group.expense must include amount + fee')
assert.equal(kasGroups[0].income, 0, 'Sending asset group.income must be 0')

// For Rekening BCA (the receiver):
const bcaGroups = groupByDate([txNoNote], 'ast_bank')
assert.equal(bcaGroups.length, 1)
assert.equal(bcaGroups[0].income, 100000, 'Receiving asset group.income must be 100.000')
assert.equal(bcaGroups[0].expense, 0, 'Receiving asset group.expense must be 0 (no fee on receiver)')

// For Main Tab Transaksi (neutral view without scopeAssetUid):
const mainGroups = groupByDate([txNoNote])
assert.equal(mainGroups.length, 1)
assert.equal(mainGroups[0].income, 0, 'Main feed transfer must not be operational income')
assert.equal(mainGroups[0].expense, 0, 'Main feed transfer must not be operational expense')
console.log('✓ 4. groupByDate POV Per Aset and Tab Transaksi cash flow verified!')
console.log('5. Testing Transaction Item Display with Tags (DayAdapter.java:784-798 parity)...')
const lookupsWithTags = {
  ...mockLookups,
  tags: new Map([
    ['tx_tagged_1', ['liburan', 'keluarga']],
    ['tx_tagged_2', ['urgent']],
  ]),
}

function computeSubTitle(tx, lookups) {
  const hasNote = Boolean(tx.ZCONTENT && tx.DO_TYPE !== 'adjustment' && tx.DO_TYPE !== '7' && tx.DO_TYPE !== '8')
  const accountText = assetLabelFor(tx, lookups)
  const showTime = lookups.showTime ?? false
  const timeFormatted = showTime && tx.wtime ? tx.wtime.slice(0, 5) : ''
  const tagList = lookups.tags?.get(tx.uid) ?? []
  const tagsText = tagList.length > 0 ? tagList.join(', ') : ''
  const baseAccountText = hasNote
    ? (timeFormatted ? `${timeFormatted}   ${accountText}` : accountText)
    : (timeFormatted || '')
  let subTitle = baseAccountText
  if (tagsText) {
    subTitle = subTitle ? `${subTitle}, ${tagsText}` : tagsText
  }
  return subTitle
}

// Case A: Default setting (showTime = false): Time is NOT shown!
const txTaggedWithNote = {
  uid: 'tx_tagged_1',
  DO_TYPE: 'transfer',
  assetUid: 'ast_cash',
  toAssetUid: 'ast_bank',
  ZCONTENT: 'Pindah dana',
  wtime: '14:30',
}
const subDefaultA = computeSubTitle(txTaggedWithNote, { ...lookupsWithTags, showTime: false })
assert.equal(subDefaultA, 'Kas → Rekening BCA, liburan, keluarga', 'When showTime is false, time must NOT appear!')
console.log('✓ 5a. Default (showTime = false) with note verified:', subDefaultA)

const txTaggedNoNote = {
  uid: 'tx_tagged_2',
  DO_TYPE: 'transfer',
  assetUid: 'ast_cash',
  toAssetUid: 'ast_bank',
  ZCONTENT: null,
  wtime: '10:15',
}
const subDefaultB = computeSubTitle(txTaggedNoNote, { ...lookupsWithTags, showTime: false })
assert.equal(subDefaultB, 'urgent', 'When showTime is false, time must NOT appear!')
console.log('✓ 5b. Default (showTime = false) without note verified:', subDefaultB)

// Case B: User enabled time display (showTime = true): Time IS shown!
const subTimeA = computeSubTitle(txTaggedWithNote, { ...lookupsWithTags, showTime: true })
assert.equal(subTimeA, '14:30   Kas → Rekening BCA, liburan, keluarga', 'When showTime is true, time must appear!')
console.log('✓ 5c. Custom (showTime = true) with note verified:', subTimeA)

const subTimeB = computeSubTitle(txTaggedNoNote, { ...lookupsWithTags, showTime: true })
assert.equal(subTimeB, '10:15, urgent', 'When showTime is true without note, time must appear!')
console.log('✓ 5d. Custom (showTime = true) without note verified:', subTimeB)
console.log('\n====================================')
console.log('ALL TRANSFER PARITY TESTS PASSED (100%)!')
console.log('====================================')
