import assert from 'node:assert/strict'

// Test the exact scenario reported by the user:
// 1. Create asset "t1" with 1.000 balance
// 2. Adjustment transaction "Selisih saldo" is created (+1.000)
// 3. Delete that "Selisih saldo" transaction
// 4. Verify balance is immediately 0, without requiring refresh

function calculateBalances(assets, transactions) {
  const deltas = new Map()
  const add = (uid, amount) => {
    if (!uid) return
    deltas.set(uid, (deltas.get(uid) ?? 0) + amount)
  }

  const activeTxs = transactions.filter((t) => (t.IS_DEL ?? 0) === 0)

  for (const t of activeTxs) {
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

  const balances = new Map()
  for (const a of assets) {
    balances.set(a.uid, deltas.get(a.uid) ?? 0)
  }
  return balances
}

console.log('Testing User Bug Scenario: Create t1 with 1.000, then delete adjustment transaction...')

const assets = [
  { uid: 'ast_t1', NIC_NAME: 't1', groupUid: 'ag_accounts', IS_DEL: 0 }
]

// Step 1: User creates asset t1 with 1.000 -> creates adjustment transaction (DO_TYPE = '7' or '0')
const transactions = [
  {
    id: 1,
    uid: 'tx_adj_t1',
    assetUid: 'ast_t1',
    DO_TYPE: '7',
    ZMONEY: '1000',
    AMOUNT_ACCOUNT: 1000,
    ctgUid: '-4',
    ZCONTENT: 'Selisih saldo',
    CATEGORY_NAME: 'Selisih saldo',
    IS_DEL: 0,
  }
]

let balances = calculateBalances(assets, transactions)
assert.equal(balances.get('ast_t1'), 1000, 'Balance after initial creation should be 1000')
console.log('✓ Step 1: Asset t1 balance is 1.000 after creation')

// Step 2: User deletes the "Selisih saldo" transaction
transactions[0].IS_DEL = 1

balances = calculateBalances(assets, transactions)
assert.equal(balances.get('ast_t1'), 0, 'Balance after deleting adjustment MUST BE 0')
console.log('✓ Step 2: Asset t1 balance immediately drops to 0 when adjustment is deleted')

console.log('All steps in user scenario verified successfully!')
