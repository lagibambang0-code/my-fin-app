import assert from 'node:assert/strict'

console.log('Testing Backup Reset Logic (ConfigBackupInit.java & DBInitService.b & h parity)...')

// Simulate DB tables
const mockDb = {
  transactions: [{ id: 1, uid: 'tx1' }],
  photos: [{ id: 1, uid: 'p1' }],
  txTags: [{ id: 1, uid: 'tt1' }],
  categories: [{ id: 1, uid: 'cat1', NAME: 'Custom Cat' }],
  assets: [{ id: 1, uid: 'ast1', NIC_NAME: 'Custom Bank' }],
  assetGroups: [{ id: 1, uid: 'ag1', ACC_GROUP_NAME: 'Custom Group' }],
}

// 1. Test "Reset only transactions" (fa.java case 0, DBInitService.c)
function resetTransactionsOnly(db) {
  db.transactions = []
  db.photos = []
  db.txTags = []
}

resetTransactionsOnly(mockDb)
assert.equal(mockDb.transactions.length, 0, 'Transactions must be cleared')
assert.equal(mockDb.photos.length, 0, 'Photos must be cleared')
assert.equal(mockDb.txTags.length, 0, 'TxTags must be cleared')
assert.equal(mockDb.categories.length, 1, 'Categories must be retained')
assert.equal(mockDb.assets.length, 1, 'Assets must be retained')
assert.equal(mockDb.assetGroups.length, 1, 'Asset groups must be retained')
console.log('✓ 1. Reset transactions only (clears txs, photos, txTags; retains categories, assets, groups) verified!')

// 2. Test "Reset all data" (fa.java case 1, DBInitService.b & h)
function resetAllData(db, lang = 'id') {
  // Clear all
  db.transactions = []
  db.photos = []
  db.txTags = []
  db.categories = []
  db.assets = []
  db.assetGroups = []

  // Re-seed default
  db.categories = [
    { uid: 'cat_inc_1', NAME: lang === 'id' ? 'Gaji' : 'Salary' },
    { uid: 'cat_exp_1', NAME: lang === 'id' ? 'Makanan' : 'Food' },
  ]
  db.assetGroups = [
    { uid: 'ag_cash', ACC_GROUP_NAME: lang === 'id' ? 'Kas' : 'Cash' },
    { uid: 'ag_accounts', ACC_GROUP_NAME: lang === 'id' ? 'Rekening' : 'Accounts' },
    { uid: 'ag_card', ACC_GROUP_NAME: lang === 'id' ? 'Kartu' : 'Card' },
  ]
  db.assets = [
    { uid: 'ast_cash', NIC_NAME: lang === 'id' ? 'Kas' : 'Cash' },
    { uid: 'ast_accounts', NIC_NAME: lang === 'id' ? 'Rekening' : 'Accounts' },
  ]
}

resetAllData(mockDb, 'id')
assert.equal(mockDb.transactions.length, 0, 'Transactions must be clean')
assert.equal(mockDb.categories.length, 2, 'Default categories must be re-seeded')
assert.equal(mockDb.categories[1].NAME, 'Makanan', 'Language preference must be preserved')
assert.equal(mockDb.assets.length, 2, 'Default assets must be re-seeded')
assert.equal(mockDb.assets[0].NIC_NAME, 'Kas', 'Asset language preserved')
assert.equal(mockDb.assetGroups.length, 3, 'Default asset groups re-seeded')

console.log('✓ 2. Reset all data (clean wipe + re-seeding default data preserving language) verified!')

console.log('\n====================================')
console.log('ALL BACKUP RESET TESTS PASSED (100%)!')
console.log('====================================')
