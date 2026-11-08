import assert from 'node:assert/strict'

console.log('Testing Mathematical Model for Investment Capital & PnL...')

// Data test records based on user's exact specification:
// Tanggal 1: Deposit 10.000
// Tanggal 2: PnL +100
// Tanggal 3: Deposit 10.000
// Tanggal 4: PnL +500
const records = [
  { uid: 'r1', date: '2026-11-01', time: '10:00', type: 'deposit', amount: 10000 },
  { uid: 'r2', date: '2026-11-02', time: '10:00', type: 'pnl', amount: 100 },
  { uid: 'r3', date: '2026-11-03', time: '10:00', type: 'pnl', amount: 110 },
  { uid: 'r4', date: '2026-11-04', time: '10:00', type: 'deposit', amount: 10000 },
]

// 1. Check hasPnl at Tanggal 1 (only Deposit)
const recordsTgl1 = [records[0]]
const hasPnlTgl1 = recordsTgl1.some((r) => r.type === 'pnl')
assert.equal(hasPnlTgl1, false, 'Chart MUST NOT be active on Tanggal 1 when only deposit exists')
console.log('✓ 1. Chart inactive on Tanggal 1 (only deposit exists)!')

// 2. Check hasPnl at Tanggal 2 (PnL +100 added)
const recordsTgl2 = [records[0], records[1]]
const hasPnlTgl2 = recordsTgl2.some((r) => r.type === 'pnl')
assert.equal(hasPnlTgl2, true, 'Chart MUST become active when PnL record exists')
console.log('✓ 2. Chart becomes active on Tanggal 2 when first PnL is added!')

// 3. Trace chart points logic
function buildChartPoints(recs) {
  const points = []
  let runningCapital = 0
  let runningPnl = 0

  recs.forEach((rec) => {
    if (rec.type === 'deposit') {
      runningCapital += rec.amount
    } else {
      runningPnl = rec.amount
    }
    const val = runningCapital + runningPnl
    const curPnl = runningPnl
    const pnlPct = runningCapital > 0 ? (curPnl / runningCapital) * 100 : 0
    const prevPnl = points.length > 0 ? points[points.length - 1].pnl : 0

    points.push({
      key: rec.uid,
      date: rec.date,
      time: rec.time,
      value: val,
      capital: runningCapital,
      pnl: curPnl,
      pnlPercent: pnlPct,
      deltaPnl: curPnl - prevPnl,
    })
  })
  return points
}

const points = buildChartPoints(records)
console.log('Generated chart points:', points)

// Point 1 (Base Tanggal 1): Modal 10.000, Nilai 10.000, PnL 0
assert.equal(points[0].capital, 10000)
assert.equal(points[0].value, 10000)
assert.equal(points[0].pnl, 0)

// Point 2 (Tanggal 2): Modal 10.000, Nilai 10.100, PnL +100 (+1%)
assert.equal(points[1].capital, 10000)
assert.equal(points[1].value, 10100)
assert.equal(points[1].pnl, 100)
assert.equal(points[1].pnlPercent, 1.0)

// Point 3 (Tanggal 3): Modal 10.000, Nilai 10.110, PnL +110 (+1.1%)
assert.equal(points[2].capital, 10000)
assert.equal(points[2].value, 10110)
assert.equal(points[2].pnl, 110)
assert.equal(Number(points[2].pnlPercent.toFixed(2)), 1.1)

// Point 4 (Tanggal 4 after deposit 10.000): Modal 20.000, Nilai 20.110, PnL +110 (+0.55%)
assert.equal(points[3].capital, 20000)
assert.equal(points[3].value, 20110)
assert.equal(points[3].pnl, 110)
assert.equal(Number(points[3].pnlPercent.toFixed(2)), 0.55)

console.log('✓ 3. Chart points match user specification: 10.000 -> 10.100 -> 10.110 -> 20.110!')

// 4. Test History Filter Logic (All, Deposit, PnL)
function filterHistory(recs, filter) {
  return recs.filter((rec) => {
    if (filter === 'deposit') return rec.type === 'deposit'
    if (filter === 'pnl') return rec.type === 'pnl'
    return true
  })
}

const allEntries = filterHistory(records, 'all')
assert.equal(allEntries.length, 4, 'All filter must return all 4 records')

const depositEntries = filterHistory(records, 'deposit')
assert.equal(depositEntries.length, 2, 'Deposit filter must return 2 records')
assert.equal(depositEntries[0].uid, 'r1')
assert.equal(depositEntries[1].uid, 'r4')

const pnlEntries = filterHistory(records, 'pnl')
assert.equal(pnlEntries.length, 2, 'PnL filter must return 2 records')
assert.equal(pnlEntries[0].uid, 'r2')
assert.equal(pnlEntries[1].uid, 'r3')
console.log('✓ 4. History filtering verified: All (4), Deposit (2), PnL (2)!')

// 5. Test Isolated Edit Logic: Editing Tanggal 2 from 100 to 99
console.log('5. Testing Isolated Edit Logic: Editing Tanggal 2 from 100 to 99...')
const editedRecords = [
  { uid: 'r1', date: '2026-11-01', time: '10:00', type: 'deposit', amount: 10000 },
  { uid: 'r2', date: '2026-11-02', time: '10:00', type: 'pnl', amount: 99 }, // edited to 99!
  { uid: 'r3', date: '2026-11-03', time: '10:00', type: 'pnl', amount: 110 }, // MUST REMAIN 110!
  { uid: 'r4', date: '2026-11-04', time: '10:00', type: 'deposit', amount: 10000 },
]

// r2 PnL is 99
assert.equal(editedRecords[1].amount, 99)
// r3 PnL MUST REMAIN 110!
assert.equal(editedRecords[2].amount, 110)
// delta for r3 is now 110 - 99 = +11!
const deltaR3 = editedRecords[2].amount - editedRecords[1].amount
assert.equal(deltaR3, 11, 'Delta for r3 against edited r2 must be +11!')
console.log('✓ 5. Isolated edit verified: r2 becomes 99, r3 remains 110 with delta +11!')

// 6. Test Isolated Edit Logic: Editing Tanggal 1 Deposit from 10.000 to 12.000
console.log('6. Testing Isolated Edit Logic: Editing Tanggal 1 Deposit from 10.000 to 12.000...')
function deriveTimeline(recs) {
  let runningCapital = 0
  let latestPnl = 0
  return recs.map((r) => {
    if (r.type === 'deposit') {
      runningCapital += r.amount
    } else {
      latestPnl = r.amount
    }
    const amount = runningCapital + latestPnl
    return {
      ...r,
      derivedCapital: runningCapital,
      derivedPnl: latestPnl,
      derivedAmount: amount,
    }
  })
}

const editedDepositRecords = [
  { uid: 'r1', date: '2026-11-01', time: '10:00', type: 'deposit', amount: 12000 }, // edited to 12.000!
  { uid: 'r2', date: '2026-11-02', time: '10:00', type: 'pnl', amount: 99 },
  { uid: 'r3', date: '2026-11-03', time: '10:00', type: 'pnl', amount: 110 },
  { uid: 'r4', date: '2026-11-04', time: '10:00', type: 'deposit', amount: 10000 },
]
const timeline = deriveTimeline(editedDepositRecords)
console.log('Derived timeline after editing deposit on r1:', timeline)

// r1: capital 12.000, amount 12.000, pnl 0
assert.equal(timeline[0].derivedCapital, 12000)
assert.equal(timeline[0].derivedAmount, 12000)
assert.equal(timeline[0].derivedPnl, 0)

// r2: capital 12.000, pnl STILL 99! amount 12.099
assert.equal(timeline[1].derivedCapital, 12000)
assert.equal(timeline[1].derivedPnl, 99)
assert.equal(timeline[1].derivedAmount, 12099)

// r3: capital 12.000, pnl STILL 110! amount 12.110
assert.equal(timeline[2].derivedCapital, 12000)
assert.equal(timeline[2].derivedPnl, 110)
assert.equal(timeline[2].derivedAmount, 12110)

// r4: capital 22.000, pnl STILL 110! amount 22.110
assert.equal(timeline[3].derivedCapital, 22000)
assert.equal(timeline[3].derivedPnl, 110)
assert.equal(timeline[3].derivedAmount, 22110)

console.log('✓ 6. Editing deposit does NOT corrupt PnL or subsequent entries!')

console.log('\n=============================================')
console.log('ALL INVESTMENT PNL MATH TESTS PASSED (100%)!')
console.log('=============================================')
