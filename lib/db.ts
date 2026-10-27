import { Dexie, type Table } from 'dexie'
import { toIso, todayIso } from '@/lib/format'
import { ACTIVE_REPEAT_TYPES, nextRepeatDate, reflectDate } from '@/lib/repeat-utils'
import { findIsoCurrency } from '@/lib/currencies'
export type Currency = {
  id?: number
  uid: string
  NAME: string
  ISO: string
  MAIN_ISO: string
  IS_DEL: number
  ORDER_SEQ: number
  RATE: number
  SYMBOL: string
  INSERT_TYPE: string
  SYMBOL_POSITION: string
  IS_MAIN_CURRENCY: number
  IS_SHOW: number
  MODIFY_DATE: number
  DECIMAL_POINT: number
  isSynced: number
  syncTime: number
  syncVersion: number
}

export type Setting = {
  id?: number
  uid: string
  E_UTIME: number
  ZDATATYPE: number
  ZDATA: string
  ZZDATA: string
  ZZDATA1: string
  ZZDATA2: string
  dataTypeKey: string
  isDel: number
  isSynced: number
  syncTime: number
  syncVersion: number
}

export type Category = {
  id?: number
  C_IS_DEL: number
  C_UTIME: number
  uid: string
  NAME: string
  ORDERSEQ: number
  TYPE: number // 0 = income, 1 = expense, 2 = sub-category
  STATUS: number // 0 = main, 2 = sub
  pUid: string | null // parent uid for sub-category
  IS_DEFAULT: number // 1 = seeded default, 0 = user-created
  isSynced: number
  syncTime: number
  syncVersion: number
}

/**
 * Group types. 2 = credit card and 3 = debit card get the extra "card"
 * fields; every other value behaves as a general group. 5 (Loan) and
 * 9 (Overdrafts) are treated as liabilities in the summary.
 */
export const ASSET_GROUP_TYPE = {
  general: 1,
  creditCard: 2,
  debitCard: 3,
  savings: 4,
  loan: 5,
  topUp: 6,
  others: 7,
  investments: 8,
  overdraft: 9,
  insurance: 10,
  cash: 11,
} as const

/** Group types whose balance counts as a liability (debt) in the summary. */
export const LIABILITY_GROUP_TYPES = new Set<number>([
  ASSET_GROUP_TYPE.creditCard,
  ASSET_GROUP_TYPE.loan,
  ASSET_GROUP_TYPE.overdraft,
])

export type AssetGroup = {
  id?: number
  uid: string
  IS_DEL: number
  USETIME: number
  ACC_GROUP_NAME: string
  TYPE: number // 1 = general, 2 = credit card, 3 = debit card, ...
  ORDERSEQ: number
  IS_DEFAULT: number // 1 = seeded default, 0 = user-created
  isSynced: number
  syncTime: number
  syncVersion: number
}

export type Asset = {
  id?: number
  uid: string
  NIC_NAME: string
  ORDERSEQ: number
  BALANCE: number
  DESCRIPTION: string
  ZDATA: string
  ZDATA1: string
  ZDATA2: string
  IS_TRANS_EXPENSE: number
  IS_CARD_AUTO_PAY: number
  APP_PACKAGE: string | null
  APP_NAME: string | null
  SMS_TEL: string | null
  SMS_STRING: string | null
  A_UTIME: number
  CARD_DAY_FIN: number | null // tanggal pelunasan (1-31)
  CARD_DAY_PAY: number | null // tanggal pembayaran (1-31)
  CARD_USAGE_HURDLE_TYPE: number | null
  CARD_USAGE_HURDLE_START_DATE: number | null
  CARD_USAGE_HURDLE_AMOUNT: number | null
  IS_SHOW: number // 1 = shown in the Aset tab, 0 = hidden
  IS_INCLUDE_TOTAL: number // 1 = counted in the summary (default)
  IS_DEL: number // soft delete
  currencyUid: string
  cardAssetUid: string | null // field "Bayar" (payer asset for card bills)
  groupUid: string
  IS_DEFAULT: number
  isSynced: number
  syncTime: number
  syncVersion: number
}

export type Transaction = {
  id?: number
  uid: string
  assetUid: string
  CARDDIVIDMONTH: string | null
  ctgUid: string
  toAssetUid: string | null
  ZCONTENT: string | null
  ZDATE: string
  WDATE: string | null
  wtime: string | null
  paid: string | null
  DO_TYPE: string // income / expense / transfer
  ZMONEY: string
  txUidTrans: string | null
  ZDATA: string | null
  SMS_RDATE: string | null
  IN_ZMONEY: string | null
  ASSET_NIC: string | null
  CATEGORY_NAME: string | null
  cardDivideUid: string | null
  CARD_DIVIDE_MONTH_STR: string | null
  MARK: number | null
  txUidFee: string | null
  SMS_ORIGIN: string | null
  SMS_PARSE_CONTENT: string | null
  IS_DEL: number
  UTIME: number
  currencyUid: string
  AMOUNT_ACCOUNT: number
  lat: string | null
  lng: string | null
  gstd: string | null
  /** Transfer fee ("Biaya") — clone helper field. */
  FEE: number
  /** 'repeat' | 'installment' | null — clone helper field. */
  RECUR_TYPE: 'repeat' | 'installment' | null
  /** Index into RECUR_FREQUENCIES when RECUR_TYPE = 'repeat'. */
  RECUR_FREQ: number | null
  /** Number of monthly instalments when RECUR_TYPE = 'installment'. */
  INSTALLMENT_MONTHS: number | null
  /** Clone helper: uid of the REPEATTRANSACTION series this row was generated from. */
  RECUR_UID: string | null
  isSynced: number
  syncTime: number
  syncVersion: number
}

/**
 * Budget target (`BUDGET` table). One row per category plus one optional
 * row for "Semua" (`IS_TOTAL = 1`), which the list renders as "Total anggaran".
 */
export type Budget = {
  id?: number
  uid: string
  /** Category uid, or `''` for the all-categories budget. */
  targetUid: string
  DO_TYPE: number // 1 = expense (budgets only track spending)
  PERIOD_TYPE: number // 1 = monthly
  IS_TOTAL: number // 1 = "Semua" / "Total anggaran"
  TRANSFER_TYPE: number
  ORDER_SEQ: number
  IS_DEL: number
  MODIFY_DATE: number
  /** Clone helper: default value applied to months without an override. */
  BASE_AMOUNT: number
  isSynced: number
  syncTime: number
  syncVersion: number
}

/** Per-month budget value / override (`BUDGET_AMOUNT` table). */
export type BudgetAmount = {
  id?: number
  uid: string
  budgetUid: string
  IS_DEL: number
  AMOUNT: number
  /** `YYYYMM`, e.g. 202610. */
  BUDGET_PERIOD: number
  MODIFY_DATE: number
  isSynced: number
  syncTime: number
  syncVersion: number
}

/**
 * Recurring transaction series (`REPEATTRANSACTION`).
 *
 * Created from the transaction form whenever a transaction is saved with a
 * repeat frequency; `NEXT_DATE` is the next occurrence still to be written
 * (see `materializeDueRepeats`).
 */
export type RepeatTransaction = {
  id?: number
  uid: string
  IS_DEL: number
  USETIME: number
  MARK: number
  END_DATE: string | null
  NEXT_DATE: string
  DO_TYPE: string // income / expense / transfer
  /** Index into `RECUR_FREQUENCIES` (see lib/repeat-utils.ts). */
  REPEAT_TYPE: number
  assetUid: string
  toAssetUid: string | null
  ctgUid: string
  currencyUid: string
  AMOUNT_SUB: number
  MEMO: string | null
  PAYEE: string | null
  /** Clone helper: transfer fee copied onto generated rows. */
  FEE: number
  /** Clone helper: category label cached for generated rows. */
  CATEGORY_NAME: string | null
  /** Clone helper: asset name cached for generated rows. */
  ASSET_NIC: string | null
  /** Clone helper: transaction that owns the series (its editor stops it). */
  ORIGIN_TX_UID: string | null
  isSynced: number
  syncTime: number
  syncVersion: number
}

/**
 * Photo attachment row (`PHOTO` table). The web clone keeps the picture as a
 * data URL in `FILE_PATH` so exports stay self-contained.
 */
export type Photo = {
  id?: number
  uid: string
  IS_DEL: number
  USETIME: number
  txUid: string
  FILE_SIZE: number
  FILE_PATH: string
  FILE_NAME: string
  ORG_FILE_NAME: string
  ORG_FILE_PATH: string
  isSynced: number
  syncTime: number
  syncVersion: number
}

/**
 * Standalone note (`MEMO` table). Memos are attached to a date (`memoDate`)
 * and pinned entries float to the top of the list.
 */
export type Memo = {
  id?: number
  uid: string
  title: string
  content: string
  /** Epoch millis derived from `memoDate` + the picked time. */
  memoTime: number
  /** `YYYY-MM-DD` */
  memoDate: string
  pinned: number
  pinnedTime: number
  orderSeq: number
  /** Accent colour (hex) chosen in the memo form. */
  color: string
  isDel: number
  utime: number
  isSynced: number
  syncTime: number
  syncVersion: number
}

/**
 * Tag (`TAG` table) — labels a transaction can carry, e.g. the two seeded
 * system tags "Prepayment" and "Exception" (Skema-Database §5.5).
 */
export type Tag = {
  id?: number
  uid: string
  name: string
  orderSeq: number
  isDel: number
  utime: number
  isSynced: number
  syncTime: number
  syncVersion: number
}

/** Tag ↔ transaction link (`TX_TAG` table). */
export type TxTag = {
  id?: number
  uid: string
  txUid: string
  tagUid: string
  /** Money Manager stores the object name ('inoutcome' for transactions). */
  objName: string
  orderSeq: number
  isDel: number
  utime: number
  isSynced: number
  syncTime: number
  syncVersion: number
}

export type InvestmentAsset = {
  id?: number
  uid: string
  name: string
  linkedAssetUid?: string | null
  currencyUid: string
  notes?: string
  createdAt: number
  isDel: number
  utime: number
}

export type InvestmentRecord = {
  id?: number
  uid: string
  investmentUid: string
  date: string
  time: string
  amount: number
  note?: string
  createdAt: number
  isDel: number
  utime: number
}

export class DompetkuDB extends Dexie {
  currencies!: Table<Currency, number>
  settings!: Table<Setting, number>
  categories!: Table<Category, number>
  assetGroups!: Table<AssetGroup, number>
  assets!: Table<Asset, number>
  transactions!: Table<Transaction, number>
  photos!: Table<Photo, number>
  budgets!: Table<Budget, number>
  budgetAmounts!: Table<BudgetAmount, number>
  repeats!: Table<RepeatTransaction, number>
  memos!: Table<Memo, number>
  tags!: Table<Tag, number>
  txTags!: Table<TxTag, number>
  investments!: Table<InvestmentAsset, number>
  investmentRecords!: Table<InvestmentRecord, number>

  constructor() {
    super('DompetkuDB')
    this.version(2).stores({
      currencies: 'id++, uid, ISO, IS_MAIN_CURRENCY',
      settings: 'id++, uid, dataTypeKey',
      categories: 'id++, uid, TYPE, STATUS, pUid',
      assetGroups: 'id++, uid, TYPE, ORDERSEQ, ACC_GROUP_NAME',
      assets: 'id++, uid, groupUid, currencyUid',
      transactions: 'id++, uid, DO_TYPE, ZDATE, ctgUid, assetUid, IS_DEL, UTIME',
    })

    this.version(3)
      .stores({
        currencies: 'id++, uid, ISO, IS_MAIN_CURRENCY',
        settings: 'id++, uid, dataTypeKey',
        categories: 'id++, uid, TYPE, STATUS, pUid',
        assetGroups: 'id++, uid, TYPE, ORDERSEQ, ACC_GROUP_NAME, IS_DEL',
        assets: 'id++, uid, groupUid, currencyUid, IS_DEL, IS_SHOW',
        transactions: 'id++, uid, DO_TYPE, ZDATE, ctgUid, assetUid, IS_DEL, UTIME',
      })
      .upgrade(async (tx) => {
        // Backfill the asset fields added in v3 on existing installs.
        await tx
          .table('assets')
          .toCollection()
          .modify((a: Record<string, unknown>) => {
            if (a.BALANCE === undefined) a.BALANCE = 0
            if (a.DESCRIPTION === undefined) a.DESCRIPTION = ''
            if (a.IS_SHOW === undefined) a.IS_SHOW = 1
            if (a.IS_INCLUDE_TOTAL === undefined) a.IS_INCLUDE_TOTAL = 1
            if (a.IS_DEL === undefined) a.IS_DEL = 0
            if (a.CARD_DAY_FIN === undefined) a.CARD_DAY_FIN = null
            if (a.CARD_DAY_PAY === undefined) a.CARD_DAY_PAY = null
            if (a.IS_DEFAULT === undefined) a.IS_DEFAULT = 0
          })
        await tx
          .table('assetGroups')
          .toCollection()
          .modify((g: Record<string, unknown>) => {
            if (g.IS_DEFAULT === undefined) g.IS_DEFAULT = 0
          })
      })

    this.version(4)
      .stores({
        currencies: 'id++, uid, ISO, IS_MAIN_CURRENCY',
        settings: 'id++, uid, dataTypeKey',
        categories: 'id++, uid, TYPE, STATUS, pUid',
        assetGroups: 'id++, uid, TYPE, ORDERSEQ, ACC_GROUP_NAME, IS_DEL',
        assets: 'id++, uid, groupUid, currencyUid, IS_DEL, IS_SHOW',
        transactions: 'id++, uid, DO_TYPE, ZDATE, ctgUid, assetUid, IS_DEL, UTIME, MARK',
      })
      .upgrade(async (tx) => {
        // Backfill the clone helper fields added to transactions in v4.
        await tx
          .table('transactions')
          .toCollection()
          .modify((t: Record<string, unknown>) => {
            if (t.FEE === undefined) t.FEE = 0
            if (t.RECUR_TYPE === undefined) t.RECUR_TYPE = null
            if (t.RECUR_FREQ === undefined) t.RECUR_FREQ = null
            if (t.INSTALLMENT_MONTHS === undefined) t.INSTALLMENT_MONTHS = null
            if (t.MARK === undefined) t.MARK = 0
          })
      })

    this.version(5).stores({
      currencies: 'id++, uid, ISO, IS_MAIN_CURRENCY',
      settings: 'id++, uid, dataTypeKey',
      categories: 'id++, uid, TYPE, STATUS, pUid',
      assetGroups: 'id++, uid, TYPE, ORDERSEQ, ACC_GROUP_NAME, IS_DEL',
      assets: 'id++, uid, groupUid, currencyUid, IS_DEL, IS_SHOW',
      transactions: 'id++, uid, DO_TYPE, ZDATE, ctgUid, assetUid, IS_DEL, UTIME, MARK',
      photos: 'id++, uid, txUid, IS_DEL',
    })

    // v6 — Anggaran (BUDGET/BUDGET_AMOUNT) + transaksi berulang (REPEATTRANSACTION).
    this.version(6)
      .stores({
        currencies: 'id++, uid, ISO, IS_MAIN_CURRENCY',
        settings: 'id++, uid, dataTypeKey',
        categories: 'id++, uid, TYPE, STATUS, pUid',
        assetGroups: 'id++, uid, TYPE, ORDERSEQ, ACC_GROUP_NAME, IS_DEL',
        assets: 'id++, uid, groupUid, currencyUid, IS_DEL, IS_SHOW',
        transactions: 'id++, uid, DO_TYPE, ZDATE, ctgUid, assetUid, IS_DEL, UTIME, MARK, RECUR_UID',
        photos: 'id++, uid, txUid, IS_DEL',
        budgets: 'id++, uid, targetUid, IS_TOTAL, IS_DEL, ORDER_SEQ',
        budgetAmounts: 'id++, uid, budgetUid, BUDGET_PERIOD, IS_DEL',
        repeats: 'id++, uid, NEXT_DATE, IS_DEL, REPEAT_TYPE, ORIGIN_TX_UID',
      })
      .upgrade(async (tx) => {
        // Backfill the recurring-series link added to transactions in v6.
        await tx
          .table('transactions')
          .toCollection()
          .modify((t: Record<string, unknown>) => {
            if (t.RECUR_UID === undefined) t.RECUR_UID = null
          })
      })

    // v7 — Memo (MEMO): catatan lepas dari transaksi.
    this.version(7).stores({
      currencies: 'id++, uid, ISO, IS_MAIN_CURRENCY',
      settings: 'id++, uid, dataTypeKey',
      categories: 'id++, uid, TYPE, STATUS, pUid',
      assetGroups: 'id++, uid, TYPE, ORDERSEQ, ACC_GROUP_NAME, IS_DEL',
      assets: 'id++, uid, groupUid, currencyUid, IS_DEL, IS_SHOW',
      transactions:
        'id++, uid, DO_TYPE, ZDATE, ctgUid, assetUid, IS_DEL, UTIME, MARK, RECUR_UID',
      photos: 'id++, uid, txUid, IS_DEL',
      budgets: 'id++, uid, targetUid, IS_TOTAL, IS_DEL, ORDER_SEQ',
      budgetAmounts: 'id++, uid, budgetUid, BUDGET_PERIOD, IS_DEL',
      repeats: 'id++, uid, NEXT_DATE, IS_DEL, REPEAT_TYPE, ORIGIN_TX_UID',
      memos: 'id++, uid, isDel, pinned, memoDate',
    })

    // v8 — Tag (TAG) + relasi tag↔transaksi (TX_TAG).
    this.version(8).stores({
      currencies: 'id++, uid, ISO, IS_MAIN_CURRENCY',
      settings: 'id++, uid, dataTypeKey',
      categories: 'id++, uid, TYPE, STATUS, pUid',
      assetGroups: 'id++, uid, TYPE, ORDERSEQ, ACC_GROUP_NAME, IS_DEL',
      assets: 'id++, uid, groupUid, currencyUid, IS_DEL, IS_SHOW',
      transactions:
        'id++, uid, DO_TYPE, ZDATE, ctgUid, assetUid, IS_DEL, UTIME, MARK, RECUR_UID',
      photos: 'id++, uid, txUid, IS_DEL',
      budgets: 'id++, uid, targetUid, IS_TOTAL, IS_DEL, ORDER_SEQ',
      budgetAmounts: 'id++, uid, budgetUid, BUDGET_PERIOD, IS_DEL',
      repeats: 'id++, uid, NEXT_DATE, IS_DEL, REPEAT_TYPE, ORIGIN_TX_UID',
      memos: 'id++, uid, isDel, pinned, memoDate',
      tags: 'id++, uid, isDel, orderSeq',
      txTags: 'id++, uid, txUid, tagUid, isDel',
    })

    // v9 — SMS auto-catat (SMS_RAW_READ + MESSAGEMACRO2).
    this.version(9).stores({
      currencies: 'id++, uid, ISO, IS_MAIN_CURRENCY',
      settings: 'id++, uid, dataTypeKey',
      categories: 'id++, uid, TYPE, STATUS, pUid',
      assetGroups: 'id++, uid, TYPE, ORDERSEQ, ACC_GROUP_NAME, IS_DEL',
      assets: 'id++, uid, groupUid, currencyUid, IS_DEL, IS_SHOW',
      transactions:
        'id++, uid, DO_TYPE, ZDATE, ctgUid, assetUid, IS_DEL, UTIME, MARK, RECUR_UID',
      photos: 'id++, uid, txUid, IS_DEL',
      budgets: 'id++, uid, targetUid, IS_TOTAL, IS_DEL, ORDER_SEQ',
      budgetAmounts: 'id++, uid, budgetUid, BUDGET_PERIOD, IS_DEL',
      repeats: 'id++, uid, NEXT_DATE, IS_DEL, REPEAT_TYPE, ORIGIN_TX_UID',
      memos: 'id++, uid, isDel, pinned, memoDate',
      tags: 'id++, uid, isDel, orderSeq',
      txTags: 'id++, uid, txUid, tagUid, isDel',
    })

    // v10 — Investasi / Track Investasi (INVESTMENTS & INVESTMENT_RECORDS)
    this.version(10).stores({
      currencies: 'id++, uid, ISO, IS_MAIN_CURRENCY',
      settings: 'id++, uid, dataTypeKey',
      categories: 'id++, uid, TYPE, STATUS, pUid',
      assetGroups: 'id++, uid, TYPE, ORDERSEQ, ACC_GROUP_NAME, IS_DEL',
      assets: 'id++, uid, groupUid, currencyUid, IS_DEL, IS_SHOW',
      transactions:
        'id++, uid, DO_TYPE, ZDATE, ctgUid, assetUid, IS_DEL, UTIME, MARK, RECUR_UID',
      photos: 'id++, uid, txUid, IS_DEL',
      budgets: 'id++, uid, targetUid, IS_TOTAL, IS_DEL, ORDER_SEQ',
      budgetAmounts: 'id++, uid, budgetUid, BUDGET_PERIOD, IS_DEL',
      repeats: 'id++, uid, NEXT_DATE, IS_DEL, REPEAT_TYPE, ORIGIN_TX_UID',
      tags: 'id++, uid, isDel, orderSeq',
      txTags: 'id++, uid, txUid, tagUid, isDel',
      investments: 'id++, uid, isDel, createdAt',
      investmentRecords: 'id++, uid, investmentUid, date, isDel',
    })
  }
}

export const db = new DompetkuDB()

// ---------------------------------------------------------------------------
// Seed data (Money Manager clean install defaults)
// ---------------------------------------------------------------------------

const NOW = Date.now()

/** Helper to generate a simple unique id. */
export function genUid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 11)}`
}

/** Default currencies (USD as main, per user preference). */
export const SEED_CURRENCIES: Omit<Currency, 'id'>[] = [
  {
    uid: 'USD_USD',
    NAME: 'USD - USA (US$)',
    ISO: 'USD',
    MAIN_ISO: 'USD',
    IS_DEL: 0,
    ORDER_SEQ: 1,
    RATE: 1,
    SYMBOL: '$',
    INSERT_TYPE: 'manual',
    SYMBOL_POSITION: 'front',
    IS_MAIN_CURRENCY: 1,
    IS_SHOW: 1,
    MODIFY_DATE: NOW,
    DECIMAL_POINT: 2,
    isSynced: 0,
    syncTime: 0,
    syncVersion: 1,
  },
  {
    uid: 'IDR_IDR',
    NAME: 'IDR - Indonesia (Rp)',
    ISO: 'IDR',
    MAIN_ISO: 'IDR',
    IS_DEL: 0,
    ORDER_SEQ: 2,
    RATE: 15000,
    SYMBOL: 'Rp',
    INSERT_TYPE: 'manual',
    SYMBOL_POSITION: 'front',
    IS_MAIN_CURRENCY: 0,
    IS_SHOW: 1,
    MODIFY_DATE: NOW,
    DECIMAL_POINT: 0,
    isSynced: 0,
    syncTime: 0,
    syncVersion: 1,
  },
  {
    uid: 'EUR_EUR',
    NAME: 'EUR - Euro (€)',
    ISO: 'EUR',
    MAIN_ISO: 'EUR',
    IS_DEL: 0,
    ORDER_SEQ: 3,
    RATE: 1,
    SYMBOL: '€',
    INSERT_TYPE: 'manual',
    SYMBOL_POSITION: 'front',
    IS_MAIN_CURRENCY: 0,
    IS_SHOW: 1,
    MODIFY_DATE: NOW,
    DECIMAL_POINT: 2,
    isSynced: 0,
    syncTime: 0,
    syncVersion: 1,
  },
  {
    uid: 'SGD_SGD',
    NAME: 'SGD - Singapore ($)',
    ISO: 'SGD',
    MAIN_ISO: 'SGD',
    IS_DEL: 0,
    ORDER_SEQ: 4,
    RATE: 1,
    SYMBOL: '$',
    INSERT_TYPE: 'manual',
    SYMBOL_POSITION: 'front',
    IS_MAIN_CURRENCY: 0,
    IS_SHOW: 1,
    MODIFY_DATE: NOW,
    DECIMAL_POINT: 2,
    isSynced: 0,
    syncTime: 0,
    syncVersion: 1,
  },
  {
    uid: 'MYR_MYR',
    NAME: 'MYR - Malaysia (RM)',
    ISO: 'MYR',
    MAIN_ISO: 'MYR',
    IS_DEL: 0,
    ORDER_SEQ: 5,
    RATE: 1,
    SYMBOL: 'RM',
    INSERT_TYPE: 'manual',
    SYMBOL_POSITION: 'front',
    IS_MAIN_CURRENCY: 0,
    IS_SHOW: 1,
    MODIFY_DATE: NOW,
    DECIMAL_POINT: 2,
    isSynced: 0,
    syncTime: 0,
    syncVersion: 1,
  },
  {
    uid: 'JPY_JPY',
    NAME: 'JPY - Japan (¥)',
    ISO: 'JPY',
    MAIN_ISO: 'JPY',
    IS_DEL: 0,
    ORDER_SEQ: 6,
    RATE: 1,
    SYMBOL: '¥',
    INSERT_TYPE: 'manual',
    SYMBOL_POSITION: 'front',
    IS_MAIN_CURRENCY: 0,
    IS_SHOW: 1,
    MODIFY_DATE: NOW,
    DECIMAL_POINT: 0,
    isSynced: 0,
    syncTime: 0,
    syncVersion: 1,
  },
  {
    uid: 'GBP_GBP',
    NAME: 'GBP - UK (£)',
    ISO: 'GBP',
    MAIN_ISO: 'GBP',
    IS_DEL: 0,
    ORDER_SEQ: 7,
    RATE: 1,
    SYMBOL: '£',
    INSERT_TYPE: 'manual',
    SYMBOL_POSITION: 'front',
    IS_MAIN_CURRENCY: 0,
    IS_SHOW: 1,
    MODIFY_DATE: NOW,
    DECIMAL_POINT: 2,
    isSynced: 0,
    syncTime: 0,
    syncVersion: 1,
  },
  {
    uid: 'AUD_AUD',
    NAME: 'AUD - Australia (A$)',
    ISO: 'AUD',
    MAIN_ISO: 'AUD',
    IS_DEL: 0,
    ORDER_SEQ: 8,
    RATE: 1,
    SYMBOL: 'A$',
    INSERT_TYPE: 'manual',
    SYMBOL_POSITION: 'front',
    IS_MAIN_CURRENCY: 0,
    IS_SHOW: 1,
    MODIFY_DATE: NOW,
    DECIMAL_POINT: 2,
    isSynced: 0,
    syncTime: 0,
    syncVersion: 1,
  },
]
/** Default ZETC settings (verified keys from Money Manager .mmbak). */
export const SEED_SETTINGS: Omit<Setting, 'id'>[] = [
  { uid: genUid('zetc'), E_UTIME: NOW, ZDATATYPE: 0, ZDATA: '1', ZZDATA: '', ZZDATA1: '', ZZDATA2: '', dataTypeKey: 'start_day', isDel: 0, isSynced: 0, syncTime: 0, syncVersion: 1 },
  { uid: genUid('zetc'), E_UTIME: NOW, ZDATATYPE: 0, ZDATA: '4', ZZDATA: '', ZZDATA1: '', ZZDATA2: '', dataTypeKey: 'week_start_day', isDel: 0, isSynced: 0, syncTime: 0, syncVersion: 1 },
  { uid: genUid('zetc'), E_UTIME: NOW, ZDATATYPE: 0, ZDATA: '0', ZZDATA: '', ZZDATA1: '', ZZDATA2: '', dataTypeKey: 'money_color', isDel: 0, isSynced: 0, syncTime: 0, syncVersion: 1 },
  { uid: genUid('zetc'), E_UTIME: NOW, ZDATATYPE: 0, ZDATA: '0', ZZDATA: '', ZZDATA1: '', ZZDATA2: '', dataTypeKey: 'carry_over', isDel: 0, isSynced: 0, syncTime: 0, syncVersion: 1 },
  { uid: genUid('zetc'), E_UTIME: NOW, ZDATATYPE: 0, ZDATA: '0', ZZDATA: '', ZZDATA1: '', ZZDATA2: '', dataTypeKey: 'card_accounting_type', isDel: 0, isSynced: 0, syncTime: 0, syncVersion: 1 },
  { uid: genUid('zetc'), E_UTIME: NOW, ZDATATYPE: 0, ZDATA: '1', ZZDATA: '', ZZDATA1: '', ZZDATA2: '', dataTypeKey: 'use_sub_category', isDel: 0, isSynced: 0, syncTime: 0, syncVersion: 1 },
  { uid: genUid('zetc'), E_UTIME: NOW, ZDATATYPE: 0, ZDATA: '1', ZZDATA: '', ZZDATA1: '', ZZDATA2: '', dataTypeKey: 'use_auto_complete', isDel: 0, isSynced: 0, syncTime: 0, syncVersion: 1 },
  { uid: genUid('zetc'), E_UTIME: NOW, ZDATATYPE: 0, ZDATA: '0', ZZDATA: '', ZZDATA1: '', ZZDATA2: '', dataTypeKey: 'repeat_reflect_type', isDel: 0, isSynced: 0, syncTime: 0, syncVersion: 1 },
  { uid: genUid('zetc'), E_UTIME: NOW, ZDATATYPE: 0, ZDATA: '0', ZZDATA: '', ZZDATA1: '', ZZDATA2: '', dataTypeKey: 'main_tab_first_view', isDel: 0, isSynced: 0, syncTime: 0, syncVersion: 1 },
  { uid: genUid('zetc'), E_UTIME: NOW, ZDATATYPE: 0, ZDATA: '1', ZZDATA: '', ZZDATA1: '', ZZDATA2: '', dataTypeKey: 'main_tab_scroll_type', isDel: 0, isSynced: 0, syncTime: 0, syncVersion: 1 },
  { uid: genUid('zetc'), E_UTIME: NOW, ZDATATYPE: 0, ZDATA: '0', ZZDATA: '', ZZDATA1: '', ZZDATA2: '', dataTypeKey: 'input_form_order', isDel: 0, isSynced: 0, syncTime: 0, syncVersion: 1 },
  { uid: genUid('zetc'), E_UTIME: NOW, ZDATATYPE: 0, ZDATA: '5', ZZDATA: '', ZZDATA1: '', ZZDATA2: '', dataTypeKey: 'time_display_order', isDel: 0, isSynced: 0, syncTime: 0, syncVersion: 1 },
  { uid: genUid('zetc'), E_UTIME: NOW, ZDATATYPE: 0, ZDATA: 'change_date', ZZDATA: '', ZZDATA1: '', ZZDATA2: '', dataTypeKey: 'swipe_gesture', isDel: 0, isSynced: 0, syncTime: 0, syncVersion: 1 },
]

/** Default income categories (TYPE=0, STATUS=0) with stable uids. */
export const DEFAULT_INCOME_CATEGORIES = [
  { uid: 'cat_inc_1', NAME: '🤑 Allowance', ORDERSEQ: 1 },
  { uid: 'cat_inc_2', NAME: '💰 Salary', ORDERSEQ: 2 },
  { uid: 'cat_inc_3', NAME: '💵 Petty cash', ORDERSEQ: 3 },
  { uid: 'cat_inc_4', NAME: '🏅 Bonus', ORDERSEQ: 4 },
  { uid: 'cat_inc_5', NAME: 'Other', ORDERSEQ: 5 },
] as const

/** Default expense categories (TYPE=1, STATUS=0) with stable uids. */
export const DEFAULT_EXPENSE_CATEGORIES = [
  { uid: 'cat_exp_1', NAME: '🍜 Food', ORDERSEQ: 1 },
  { uid: 'cat_exp_2', NAME: '👬🏻 Social Life', ORDERSEQ: 2 },
  { uid: 'cat_exp_3', NAME: '🐶 Pets', ORDERSEQ: 3 },
  { uid: 'cat_exp_4', NAME: '🚖 Transport', ORDERSEQ: 4 },
  { uid: 'cat_exp_5', NAME: '🖼 Culture', ORDERSEQ: 5 },
  { uid: 'cat_exp_6', NAME: '🪑 Household', ORDERSEQ: 6 },
  { uid: 'cat_exp_7', NAME: '🧥 Apparel', ORDERSEQ: 7 },
  { uid: 'cat_exp_8', NAME: '💄 Beauty', ORDERSEQ: 8 },
  { uid: 'cat_exp_9', NAME: '🧘🏼 Health', ORDERSEQ: 9 },
  { uid: 'cat_exp_10', NAME: '📙 Education', ORDERSEQ: 10 },
  { uid: 'cat_exp_11', NAME: '🎁 Gift', ORDERSEQ: 11 },
  { uid: 'cat_exp_12', NAME: 'Other', ORDERSEQ: 12 },
] as const

/** Default sub-categories (TYPE=2, STATUS=2) grouped by parent NAME. 37 rows. */
export const DEFAULT_SUB_CATEGORIES: Record<string, string[]> = {
  '🍜 Food': ['Lunch', 'Dinner', 'Eating out', 'Beverages'],
  '👬🏻 Social Life': ['Friend', 'Fellowship', 'Alumni', 'Dues'],
  '🚖 Transport': ['Bus', 'Subway', 'Taxi', 'Car'],
  '🖼 Culture': ['Books', 'Movie', 'Music', 'Apps'],
  '🪑 Household': ['Appliances', 'Furniture', 'Kitchen', 'Toiletries', 'Chandlery'],
  '🧥 Apparel': ['Clothing', 'Fashion', 'Shoes', 'Laundry'],
  '💄 Beauty': ['Cosmetics', 'Makeup', 'Accessories', 'Beauty'],
  '🧘🏼 Health': ['Health', 'Yoga', 'Hospital', 'Medicine'],
  '📙 Education': ['Schooling', 'Textbooks', 'School supplies', 'Academy'],
}

export const SEED_CATEGORIES: Omit<Category, 'id'>[] = [
  ...DEFAULT_INCOME_CATEGORIES.map((c) => ({
    uid: c.uid,
    C_IS_DEL: 0,
    C_UTIME: NOW,
    NAME: c.NAME,
    ORDERSEQ: c.ORDERSEQ,
    TYPE: 0,
    STATUS: 0,
    pUid: null,
    IS_DEFAULT: 1,
    isSynced: 0,
    syncTime: 0,
    syncVersion: 1,
  })),
  ...DEFAULT_EXPENSE_CATEGORIES.map((c) => ({
    uid: c.uid,
    C_IS_DEL: 0,
    C_UTIME: NOW,
    NAME: c.NAME,
    ORDERSEQ: c.ORDERSEQ,
    TYPE: 1,
    STATUS: 0,
    pUid: null,
    IS_DEFAULT: 1,
    isSynced: 0,
    syncTime: 0,
    syncVersion: 1,
  })),
]

/** Default asset groups (11 groups, per Money Manager). */
export const SEED_ASSET_GROUPS: Omit<AssetGroup, 'id'>[] = [
  { uid: 'ag_cash', IS_DEL: 0, USETIME: NOW, ACC_GROUP_NAME: 'Cash', TYPE: 11, ORDERSEQ: 1, IS_DEFAULT: 1, isSynced: 0, syncTime: 0, syncVersion: 1 },
  { uid: 'ag_accounts', IS_DEL: 0, USETIME: NOW, ACC_GROUP_NAME: 'Accounts', TYPE: 1, ORDERSEQ: 2, IS_DEFAULT: 1, isSynced: 0, syncTime: 0, syncVersion: 1 },
  { uid: 'ag_card', IS_DEL: 0, USETIME: NOW, ACC_GROUP_NAME: 'Card', TYPE: 2, ORDERSEQ: 3, IS_DEFAULT: 1, isSynced: 0, syncTime: 0, syncVersion: 1 },
  { uid: 'ag_debit', IS_DEL: 0, USETIME: NOW, ACC_GROUP_NAME: 'Debit Card', TYPE: 3, ORDERSEQ: 4, IS_DEFAULT: 1, isSynced: 0, syncTime: 0, syncVersion: 1 },
  { uid: 'ag_savings', IS_DEL: 0, USETIME: NOW, ACC_GROUP_NAME: 'Savings', TYPE: 4, ORDERSEQ: 5, IS_DEFAULT: 1, isSynced: 0, syncTime: 0, syncVersion: 1 },
  { uid: 'ag_topup', IS_DEL: 0, USETIME: NOW, ACC_GROUP_NAME: 'Top-Up/Prepaid', TYPE: 6, ORDERSEQ: 6, IS_DEFAULT: 1, isSynced: 0, syncTime: 0, syncVersion: 1 },
  { uid: 'ag_invest', IS_DEL: 0, USETIME: NOW, ACC_GROUP_NAME: 'Investments', TYPE: 8, ORDERSEQ: 7, IS_DEFAULT: 1, isSynced: 0, syncTime: 0, syncVersion: 1 },
  { uid: 'ag_overdraft', IS_DEL: 0, USETIME: NOW, ACC_GROUP_NAME: 'Overdrafts', TYPE: 9, ORDERSEQ: 8, IS_DEFAULT: 1, isSynced: 0, syncTime: 0, syncVersion: 1 },
  { uid: 'ag_loan', IS_DEL: 0, USETIME: NOW, ACC_GROUP_NAME: 'Loan', TYPE: 5, ORDERSEQ: 9, IS_DEFAULT: 1, isSynced: 0, syncTime: 0, syncVersion: 1 },
  { uid: 'ag_insurance', IS_DEL: 0, USETIME: NOW, ACC_GROUP_NAME: 'Insurance', TYPE: 10, ORDERSEQ: 10, IS_DEFAULT: 1, isSynced: 0, syncTime: 0, syncVersion: 1 },
  { uid: 'ag_others', IS_DEL: 0, USETIME: NOW, ACC_GROUP_NAME: 'Others', TYPE: 7, ORDERSEQ: 11, IS_DEFAULT: 1, isSynced: 0, syncTime: 0, syncVersion: 1 },
]

/** Arabic-numeral translations shown as a second line for some groups. */
export const ASSET_GROUP_TRANSLATIONS: Record<string, string> = {
  Card: 'Kartu',
  'Debit Card': 'Kartu debit',
}

/** Core groups that show an asset icon instead of the delete checkbox. */
export const CORE_ASSET_GROUP_NAMES = ['Cash', 'Accounts', 'Card', 'Debit Card']

/** Fields shared by every seeded asset. */
function seedAssetBase(
  uid: string,
  NIC_NAME: string,
  ORDERSEQ: number,
  groupUid: string,
): Omit<Asset, 'id'> {
  return {
    uid,
    NIC_NAME,
    ORDERSEQ,
    BALANCE: 0,
    DESCRIPTION: '',
    ZDATA: '',
    ZDATA1: '',
    ZDATA2: '',
    IS_TRANS_EXPENSE: 0,
    IS_CARD_AUTO_PAY: 0,
    APP_PACKAGE: null,
    APP_NAME: null,
    SMS_TEL: null,
    SMS_STRING: null,
    A_UTIME: NOW,
    CARD_DAY_FIN: null,
    CARD_DAY_PAY: null,
    CARD_USAGE_HURDLE_TYPE: null,
    CARD_USAGE_HURDLE_START_DATE: null,
    CARD_USAGE_HURDLE_AMOUNT: null,
    IS_SHOW: 1,
    IS_INCLUDE_TOTAL: 1,
    IS_DEL: 0,
    currencyUid: 'USD_USD',
    cardAssetUid: null,
    groupUid,
    IS_DEFAULT: 1,
    isSynced: 0,
    syncTime: 0,
    syncVersion: 1,
  }
}

/** Default assets (Cash, Accounts, Card) — all balance 0. */
/** Initial tags seeded on install — empty per Money Manager parity (1B). */
export const SEED_TAGS: Omit<Tag, 'id'>[] = []

export const SEED_ASSETS: Omit<Asset, 'id'>[] = [
  seedAssetBase('ast_cash', 'Cash', 1, 'ag_cash'),
  seedAssetBase('ast_accounts', 'Accounts', 2, 'ag_accounts'),
  // Card's "Bayar" (payer) points at the seeded Accounts asset.
  { ...seedAssetBase('ast_card', 'Card', 3, 'ag_card'), cardAssetUid: 'ast_accounts' },
]

/**
 * Run seed once. Safe to call multiple times — checks if tables already
 * contain data before inserting.
 */
export async function seedDatabase(): Promise<void> {
  const [currCount, setCount, catCount, grpCount, astCount, tagCount] =
    await Promise.all([
      db.currencies.count(),
      db.settings.count(),
      db.categories.count(),
      db.assetGroups.count(),
      db.assets.count(),
      db.tags.count(),
    ])

  if (currCount === 0) {
    await db.currencies.bulkAdd(SEED_CURRENCIES)
  }
  if (setCount === 0) {
    await db.settings.bulkAdd(SEED_SETTINGS)
  }
  if (catCount === 0) {
    await db.categories.bulkAdd(SEED_CATEGORIES)
  }
  if (grpCount === 0) {
    await db.assetGroups.bulkAdd(SEED_ASSET_GROUPS)
  }
  if (astCount === 0) {
    await db.assets.bulkAdd(SEED_ASSETS)
  }
  if (tagCount === 0) {
    await db.tags.bulkAdd(SEED_TAGS)
  }
  // Ensure default currencies are all present in DB
  for (const seed of SEED_CURRENCIES) {
    const existing = await db.currencies.where('uid').equals(seed.uid).first()
    if (!existing) {
      await db.currencies.add({
        ...seed,
        IS_MAIN_CURRENCY: 0,
      })
    }
  }

  // Ensure main currency follows user setting if set, or defaults to USD
  const mainCurSetting = await db.settings.where('dataTypeKey').equals('main_currency').first()
  if (mainCurSetting?.ZDATA) {
    const targetUid = mainCurSetting.ZDATA
    const current = await db.currencies.where('IS_MAIN_CURRENCY').equals(1).first()
    if (!current || current.uid !== targetUid) {
      const all = await db.currencies.toArray()
      for (const c of all) {
        const shouldBeMain = c.uid === targetUid ? 1 : 0
        if (c.IS_MAIN_CURRENCY !== shouldBeMain && c.id != null) {
          await db.currencies.update(c.id, { IS_MAIN_CURRENCY: shouldBeMain })
        }
      }
    }
  } else {
    // If no main currency is set at all (fresh install), default to USD
    const hasMain = await db.currencies.where('IS_MAIN_CURRENCY').equals(1).count()
    if (hasMain === 0) {
      const usd = await db.currencies.where('uid').equals('USD_USD').first()
      if (usd?.id != null) {
        await db.currencies.update(usd.id, { IS_MAIN_CURRENCY: 1 })
      }
    }
  }
}

/**
 * Idempotent post-seed migration:
 * 1. Backfill `IS_DEFAULT` on categories created before the field existed.
 * 2. Insert the default sub-categories once (only when none exist yet),
 *    linking each sub to its parent by NAME (works for both stable and
 *    legacy random uids).
 */
export async function ensureCategoryDefaults(): Promise<void> {
  // 1. Backfill IS_DEFAULT
  const allCats = await db.categories.toArray()
  const missing = allCats.filter((c) => c.IS_DEFAULT === undefined)
  if (missing.length > 0) {
    const defaultKeys = new Set<string>()
    DEFAULT_INCOME_CATEGORIES.forEach((c) => defaultKeys.add(`0|${c.NAME}`))
    DEFAULT_EXPENSE_CATEGORIES.forEach((c) => defaultKeys.add(`1|${c.NAME}`))
    await db.transaction('rw', db.categories, async () => {
      for (const c of missing) {
        await db.categories.update(c.id!, {
          IS_DEFAULT: defaultKeys.has(`${c.TYPE}|${c.NAME}`) ? 1 : 0,
        })
      }
    })
  }

  // 2. Seed default sub-categories once
  const subCount = await db.categories.where('STATUS').equals(2).count()
  if (subCount === 0) {
    const parents = await db.categories
      .where('TYPE')
      .equals(1)
      .and((c) => c.STATUS === 0 && c.C_IS_DEL === 0)
      .toArray()
    const byName = new Map(parents.map((p) => [p.NAME, p]))
    const rows: Omit<Category, 'id'>[] = []
    for (const [parentName, names] of Object.entries(DEFAULT_SUB_CATEGORIES)) {
      const parent = byName.get(parentName)
      if (!parent) continue
      names.forEach((name, i) => {
        rows.push({
          uid: genUid('sub'),
          C_IS_DEL: 0,
          C_UTIME: NOW,
          NAME: name,
          ORDERSEQ: i + 1,
          TYPE: 2,
          STATUS: 2,
          pUid: parent.uid,
          IS_DEFAULT: 1,
          isSynced: 0,
          syncTime: 0,
          syncVersion: 1,
        })
      })
    }
    if (rows.length > 0) {
      await db.categories.bulkAdd(rows)
    }
  }
}

/**
 * Idempotent post-seed migration for assets & groups:
 * 1. Mark the 11 seeded groups as defaults (works for legacy random uids).
 * 2. Backfill the v3 asset fields on any legacy rows.
 * 3. Point the "Card" asset's payer at "Accounts" when unset.
 */
export async function ensureAssetDefaults(): Promise<void> {
  const defaultNames = new Set(SEED_ASSET_GROUPS.map((g) => g.ACC_GROUP_NAME))

  await db.transaction('rw', db.assetGroups, db.assets, async () => {
    const groups = await db.assetGroups.toArray()
    for (const g of groups) {
      if (g.IS_DEFAULT !== 1 && defaultNames.has(g.ACC_GROUP_NAME)) {
        await db.assetGroups.update(g.id!, { IS_DEFAULT: 1 })
      }
    }

    const assets = await db.assets.toArray()
    const accounts = assets.find((a) => a.NIC_NAME === 'Accounts' && a.IS_DEL === 0)
    for (const a of assets) {
      const patch: Partial<Asset> = {}
      if (a.BALANCE === undefined) patch.BALANCE = 0
      if (a.DESCRIPTION === undefined) patch.DESCRIPTION = ''
      if (a.IS_SHOW === undefined) patch.IS_SHOW = 1
      if (a.IS_INCLUDE_TOTAL === undefined) patch.IS_INCLUDE_TOTAL = 1
      if (a.IS_DEL === undefined) patch.IS_DEL = 0
      if (a.CARD_DAY_FIN === undefined) patch.CARD_DAY_FIN = null
      if (a.CARD_DAY_PAY === undefined) patch.CARD_DAY_PAY = null
      if (a.IS_DEFAULT === undefined) patch.IS_DEFAULT = 0
      if (a.NIC_NAME === 'Card' && !a.cardAssetUid && accounts) {
        patch.cardAssetUid = accounts.uid
      }
      if (Object.keys(patch).length > 0) {
        await db.assets.update(a.id!, patch)
      }
    }
  })
}

let initPromise: Promise<void> | null = null

/** Convenience: initialize DB and seed on first load (memoized). */
export function initDB(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await db.open()
      await seedDatabase()
      await ensureCategoryDefaults()
      await ensureAssetDefaults()
      // Catch up on recurring transactions that fell due since the last visit.
      await materializeDueRepeats()
    })().catch((err) => {
      initPromise = null
      throw err
    })
  }
  return initPromise
}

// ---------------------------------------------------------------------------
// Category helpers
// ---------------------------------------------------------------------------

/** Main categories (STATUS=0) of a given type, sorted by ORDERSEQ. */
export async function getMainCategoriesByType(type: number): Promise<Category[]> {
  const list = await db.categories
    .where('TYPE')
    .equals(type)
    .and((cat) => cat.C_IS_DEL === 0 && cat.STATUS === 0)
    .toArray()
  return list.sort((a, b) => a.ORDERSEQ - b.ORDERSEQ)
}

/** Sub-categories of a parent, sorted by ORDERSEQ. */
export async function getSubCategoriesByParent(parentUid: string): Promise<Category[]> {
  const list = await db.categories
    .where('pUid')
    .equals(parentUid)
    .and((cat) => cat.C_IS_DEL === 0 && cat.STATUS === 2)
    .toArray()
  return list.sort((a, b) => a.ORDERSEQ - b.ORDERSEQ)
}

/**
 * Every non-deleted category (main + sub), used to resolve names in lists.
 * `C_IS_DEL` is not indexed, so filter in JS after a full read.
 */
export async function getAllCategories(): Promise<Category[]> {
  const list = (await db.categories.toArray()).filter((cat) => cat.C_IS_DEL === 0)
  return list.sort((a, b) => a.ORDERSEQ - b.ORDERSEQ)
}

export async function getCategoryByUid(uid: string): Promise<Category | undefined> {
  return db.categories.where('uid').equals(uid).first()
}

/** Highest ORDERSEQ in the active set (optionally scoped to a parent's subs). */
export async function getMaxOrderSeq(
  type: number,
  status: number,
  parentUid?: string,
): Promise<number> {
  let items: Category[]
  if (status === 2 && parentUid) {
    items = await db.categories.where('pUid').equals(parentUid).toArray()
  } else {
    items = await db.categories.where('TYPE').equals(type).toArray()
  }
  return items
    .filter((i) => i.C_IS_DEL === 0 && i.STATUS === status)
    .reduce((max, i) => Math.max(max, i.ORDERSEQ), 0)
}

export async function getSettingByKey(dataTypeKey: string): Promise<Setting | undefined> {
  return db.settings.where('dataTypeKey').equals(dataTypeKey).first()
}

export async function setSetting(dataTypeKey: string, value: string): Promise<void> {
  const existing = await getSettingByKey(dataTypeKey)
  if (existing) {
    await db.settings.update(existing.id!, { ZDATA: value, E_UTIME: Date.now() })
  } else {
    await db.settings.add({
      uid: genUid('zetc'),
      E_UTIME: Date.now(),
      ZDATATYPE: 0,
      ZDATA: value,
      ZZDATA: '',
      ZZDATA1: '',
      ZZDATA2: '',
      dataTypeKey,
      isDel: 0,
      isSynced: 0,
      syncTime: 0,
      syncVersion: 1,
    })
  }
}

export async function createCategory(category: Omit<Category, 'id'>): Promise<number> {
  return db.categories.add(category)
}

export async function updateCategory(id: number, data: Partial<Category>): Promise<number> {
  return db.categories.update(id, data)
}

/** Soft-delete a category and (for a parent) cascade to its sub-categories. */
export async function deleteCategory(id: number): Promise<void> {
  await db.transaction('rw', db.categories, async () => {
    const cat = await db.categories.get(id)
    if (!cat) return
    const now = Date.now()
    await db.categories.update(id, { C_IS_DEL: 1, C_UTIME: now })
    const subs = await db.categories.where('pUid').equals(cat.uid).toArray()
    await Promise.all(
      subs
        .filter((s) => s.C_IS_DEL === 0)
        .map((s) => db.categories.update(s.id!, { C_IS_DEL: 1, C_UTIME: now })),
    )
  })
}

/** Restore a soft-deleted category (and its sub-categories). */
export async function restoreCategory(id: number): Promise<void> {
  await db.transaction('rw', db.categories, async () => {
    const cat = await db.categories.get(id)
    if (!cat) return
    const now = Date.now()
    await db.categories.update(id, { C_IS_DEL: 0, C_UTIME: now })
    const subs = await db.categories.where('pUid').equals(cat.uid).toArray()
    await Promise.all(
      subs
        .filter((s) => s.C_IS_DEL === 1)
        .map((s) => db.categories.update(s.id!, { C_IS_DEL: 0, C_UTIME: now })),
    )
  })
}

/** Persist a new order for a set of categories (ORDERSEQ = 1..n). */
export async function reorderCategories(orderedIds: number[]): Promise<void> {
  await db.transaction('rw', db.categories, async () => {
    const now = Date.now()
    for (let i = 0; i < orderedIds.length; i++) {
      await db.categories.update(orderedIds[i], { ORDERSEQ: i + 1, C_UTIME: now })
    }
  })
}

/** Promote a sub-category to a main category (placed at the end of the list). */
export async function promoteSubToMain(id: number, parentType: number): Promise<void> {
  const cat = await db.categories.get(id)
  if (!cat) return
  const max = await getMaxOrderSeq(parentType, 0)
  await db.categories.update(id, {
    STATUS: 0,
    TYPE: parentType,
    pUid: null,
    ORDERSEQ: max + 1,
    IS_DEFAULT: 0,
    C_UTIME: Date.now(),
  })
}

// ---------------------------------------------------------------------------
// Asset group helpers
// ---------------------------------------------------------------------------

function byOrderSeq<T extends { ORDERSEQ: number }>(list: T[]): T[] {
  return list.sort((a, b) => a.ORDERSEQ - b.ORDERSEQ)
}

/** Active asset groups, sorted by ORDERSEQ. */
export async function getAssetGroups(): Promise<AssetGroup[]> {
  const list = await db.assetGroups.where('IS_DEL').equals(0).toArray()
  return byOrderSeq(list)
}

/** Soft-deleted asset groups, sorted by ORDERSEQ. */
export async function getDeletedAssetGroups(): Promise<AssetGroup[]> {
  const list = await db.assetGroups.where('IS_DEL').equals(1).toArray()
  return byOrderSeq(list)
}

export async function getMaxAssetGroupOrderSeq(): Promise<number> {
  const list = await db.assetGroups.toArray()
  return list.filter((g) => g.IS_DEL === 0).reduce((max, g) => Math.max(max, g.ORDERSEQ), 0)
}

export async function createAssetGroup(group: Omit<AssetGroup, 'id'>): Promise<number> {
  return db.assetGroups.add(group)
}

export async function updateAssetGroup(
  id: number,
  data: Partial<AssetGroup>,
): Promise<number> {
  return db.assetGroups.update(id, data)
}

/** Soft-delete a group and cascade to every asset inside it. */
export async function softDeleteAssetGroup(id: number): Promise<void> {
  await db.transaction('rw', db.assetGroups, db.assets, async () => {
    const group = await db.assetGroups.get(id)
    if (!group) return
    const now = Date.now()
    await db.assetGroups.update(id, { IS_DEL: 1, USETIME: now })
    const assets = await db.assets.where('groupUid').equals(group.uid).toArray()
    await Promise.all(
      assets
        .filter((a) => a.IS_DEL === 0)
        .map((a) => db.assets.update(a.id!, { IS_DEL: 1, A_UTIME: now })),
    )
  })
}

/** Restore a soft-deleted group together with the assets it contained. */
export async function restoreAssetGroup(id: number): Promise<void> {
  await db.transaction('rw', db.assetGroups, db.assets, async () => {
    const group = await db.assetGroups.get(id)
    if (!group) return
    const now = Date.now()
    await db.assetGroups.update(id, { IS_DEL: 0, USETIME: now })
    const assets = await db.assets.where('groupUid').equals(group.uid).toArray()
    await Promise.all(
      assets
        .filter((a) => a.IS_DEL === 1)
        .map((a) => db.assets.update(a.id!, { IS_DEL: 0, A_UTIME: now })),
    )
  })
}

/** Permanently remove a group and every asset inside it. */
export async function purgeAssetGroup(id: number): Promise<void> {
  await db.transaction('rw', db.assetGroups, db.assets, async () => {
    const group = await db.assetGroups.get(id)
    if (group) {
      await db.assets.where('groupUid').equals(group.uid).delete()
    }
    await db.assetGroups.delete(id)
  })
}

export async function reorderAssetGroups(orderedIds: number[]): Promise<void> {
  await db.transaction('rw', db.assetGroups, async () => {
    const now = Date.now()
    for (let i = 0; i < orderedIds.length; i++) {
      await db.assetGroups.update(orderedIds[i], { ORDERSEQ: i + 1, USETIME: now })
    }
  })
}

/**
 * Count of assets still belonging to a group (soft-deleted included, since a
 * restored group brings them back). Used by "Grup aset yang dihapus".
 */
export async function countAssetsInGroup(groupUid: string): Promise<number> {
  const list = await db.assets.where('groupUid').equals(groupUid).toArray()
  return list.length
}

// ---------------------------------------------------------------------------
// Asset helpers
// ---------------------------------------------------------------------------

/** Every non-deleted asset (hidden included), sorted by ORDERSEQ. */
export async function getAllAssets(): Promise<Asset[]> {
  const list = await db.assets.where('IS_DEL').equals(0).toArray()
  return byOrderSeq(list)
}

export async function getAssetByUid(uid: string): Promise<Asset | undefined> {
  return db.assets.where('uid').equals(uid).first()
}

/** Non-deleted assets that are allowed to appear in lists. */
export async function getVisibleAssets(): Promise<Asset[]> {
  const list = await getAllAssets()
  return list.filter((a) => a.IS_SHOW === 1)
}

export async function getDeletedAssets(): Promise<Asset[]> {
  const list = await db.assets.where('IS_DEL').equals(1).toArray()
  return byOrderSeq(list)
}

export async function getAssetsByGroup(groupUid: string): Promise<Asset[]> {
  const list = await db.assets.where('groupUid').equals(groupUid).toArray()
  return byOrderSeq(list.filter((a) => a.IS_DEL === 0))
}

export async function getMaxAssetOrderSeq(): Promise<number> {
  const list = await db.assets.toArray()
  return list.filter((a) => a.IS_DEL === 0).reduce((max, a) => Math.max(max, a.ORDERSEQ), 0)
}

export async function createAsset(asset: Omit<Asset, 'id'>): Promise<number> {
  return db.assets.add(asset)
}

export async function updateAsset(id: number, data: Partial<Asset>): Promise<number> {
  return db.assets.update(id, data)
}

export async function softDeleteAsset(id: number): Promise<void> {
  await db.assets.update(id, { IS_DEL: 1, A_UTIME: Date.now() })
}

export async function restoreAsset(id: number): Promise<void> {
  await db.assets.update(id, { IS_DEL: 0, A_UTIME: Date.now() })
}

export async function purgeAsset(id: number): Promise<void> {
  await db.assets.delete(id)
}

export async function reorderAssets(orderedIds: number[]): Promise<void> {
  await db.transaction('rw', db.assets, async () => {
    const now = Date.now()
    for (let i = 0; i < orderedIds.length; i++) {
      await db.assets.update(orderedIds[i], { ORDERSEQ: i + 1, A_UTIME: now })
    }
  })
}

export type AssetSummary = {
  assets: number
  liabilities: number
  total: number
}

/**
 * Wealth summary. Liability groups (credit card, loan, overdraft) count as
 * debt; everything else counts as an asset. Assets with
 * `IS_INCLUDE_TOTAL = 0` are ignored.
 */
export async function getAssetSummary(): Promise<AssetSummary> {
  const [assets, groups, deltas] = await Promise.all([
    getAllAssets(),
    getAssetGroups(),
    getAssetBalanceDeltas(),
  ])
  const typeByUid = new Map(groups.map((g) => [g.uid, g.TYPE]))
  let assetTotal = 0
  let liabilityTotal = 0
  for (const a of assets) {
    if (a.IS_INCLUDE_TOTAL !== 1) continue
    const type = typeByUid.get(a.groupUid)
    const balance = (a.BALANCE || 0) + (deltas.get(a.uid) ?? 0)
    if (type !== undefined && LIABILITY_GROUP_TYPES.has(type)) {
      liabilityTotal += Math.abs(balance)
    } else {
      assetTotal += balance
    }
  }
  return { assets: assetTotal, liabilities: liabilityTotal, total: assetTotal - liabilityTotal }
}

/** The main currency row (falls back to the first currency). */
export async function getMainCurrency(): Promise<Currency | undefined> {
  const main = await db.currencies.where('IS_MAIN_CURRENCY').equals(1).first()
  if (main) return main
  const rows = await db.currencies.toArray()
  return rows.sort((a, b) => a.ORDER_SEQ - b.ORDER_SEQ)[0]
}

/** Set the main currency by uid. Updates IS_MAIN_CURRENCY flags and persists preference. */
export async function setMainCurrency(uid: string): Promise<void> {
  let target = await db.currencies.where('uid').equals(uid).first()
  if (!target) {
    const code = uid.split('_')[0]
    const iso = findIsoCurrency(code)
    const maxOrder = (await db.currencies.toArray()).reduce(
      (max, c) => Math.max(max, c.ORDER_SEQ || 0),
      0,
    )
    const newId = await db.currencies.add({
      uid,
      NAME: iso ? `${code} - ${iso.name}` : code,
      ISO: code,
      MAIN_ISO: code,
      IS_DEL: 0,
      ORDER_SEQ: maxOrder + 1,
      RATE: 1,
      SYMBOL: iso?.symbol ?? code,
      INSERT_TYPE: 'manual',
      SYMBOL_POSITION: 'front',
      IS_MAIN_CURRENCY: 1,
      IS_SHOW: 1,
      MODIFY_DATE: Date.now(),
      DECIMAL_POINT: code === 'IDR' || code === 'JPY' ? 0 : 2,
      isSynced: 0,
      syncTime: 0,
      syncVersion: 1,
    })
    target = await db.currencies.get(newId)
  }

  const all = await db.currencies.toArray()
  for (const c of all) {
    const shouldBeMain = c.uid === uid ? 1 : 0
    if (c.IS_MAIN_CURRENCY !== shouldBeMain && c.id != null) {
      await db.currencies.update(c.id, {
        IS_MAIN_CURRENCY: shouldBeMain,
        MODIFY_DATE: Date.now(),
      })
    }
  }
  await setSetting('main_currency', uid)
  if (typeof window !== 'undefined') {
    const updated = target ?? all.find((c) => c.uid === uid)
    window.dispatchEvent(new CustomEvent('dompetku:currency-changed', { detail: updated }))
  }
}
export async function getCurrencyByUid(uid: string): Promise<Currency | undefined> {
  return db.currencies.where('uid').equals(uid).first()
}

// ---------------------------------------------------------------------------
// Transaction helpers
// ---------------------------------------------------------------------------

/** Newest first: date descending, then insertion time descending. */
function sortTransactionsDesc(a: Transaction, b: Transaction): number {
  if (a.ZDATE !== b.ZDATE) return a.ZDATE < b.ZDATE ? 1 : -1
  return (b.UTIME || 0) - (a.UTIME || 0)
}

/** Every non-deleted transaction, newest first. */
export async function getAllTransactions(): Promise<Transaction[]> {
  const list = await db.transactions.where('IS_DEL').equals(0).toArray()
  return list.sort(sortTransactionsDesc)
}

/** Non-deleted transactions whose ZDATE falls in [start, end] (inclusive). */
export async function getTransactionsInRange(
  start: string,
  end: string,
): Promise<Transaction[]> {
  const list = await db.transactions
    .where('ZDATE')
    .between(start, end, true, true)
    .and((t) => t.IS_DEL === 0)
    .toArray()
  return list.sort(sortTransactionsDesc)
}

/** Non-deleted transactions inside a calendar month. */
export async function getTransactionsInMonth(
  year: number,
  month: number,
): Promise<Transaction[]> {
  return getTransactionsInRange(
    toIso(new Date(year, month, 1)),
    toIso(new Date(year, month + 1, 0)),
  )
}

/** Non-deleted transactions inside a calendar year. */
export async function getTransactionsInYear(year: number): Promise<Transaction[]> {
  return getTransactionsInRange(toIso(new Date(year, 0, 1)), toIso(new Date(year, 11, 31)))
}

/** Non-deleted transactions where the asset is either side of the entry. */
export async function getTransactionsTouchingAsset(assetUid: string): Promise<Transaction[]> {
  const list = await db.transactions.toArray()
  return list
    .filter((t) => t.IS_DEL === 0 && (t.assetUid === assetUid || t.toAssetUid === assetUid))
    .sort(sortTransactionsDesc)
}

export async function getBookmarkedTransactions(): Promise<Transaction[]> {
  const list = await db.transactions.where('MARK').equals(1).toArray()
  return list.filter((t) => t.IS_DEL === 0).sort(sortTransactionsDesc)
}

export async function getDeletedTransactions(): Promise<Transaction[]> {
  const list = await db.transactions.where('IS_DEL').equals(1).toArray()
  return list.sort(sortTransactionsDesc)
}

export async function createTransaction(entry: Omit<Transaction, 'id'>): Promise<number> {
  return db.transactions.add(entry)
}

export async function updateTransaction(
  id: number,
  data: Partial<Transaction>,
): Promise<number> {
  return db.transactions.update(id, data)
}

export async function softDeleteTransaction(id: number): Promise<void> {
  const row = await db.transactions.get(id)
  await db.transactions.update(id, { IS_DEL: 1, UTIME: Date.now() })
  // Removing the transaction that holds a repeat frequency also stops its
  // series, so no further occurrences are generated (PRD-05 §8.1).
  if (row?.uid) {
    const series = await db.repeats.where('ORIGIN_TX_UID').equals(row.uid).toArray()
    await Promise.all(
      series
        .filter((s) => s.IS_DEL === 0)
        .map((s) => db.repeats.update(s.id!, { IS_DEL: 1, USETIME: Date.now() })),
    )
  }
}

export async function restoreTransaction(id: number): Promise<void> {
  await db.transactions.update(id, { IS_DEL: 0, UTIME: Date.now() })
}

export async function purgeTransaction(id: number): Promise<void> {
  await db.transactions.delete(id)
}

export async function setTransactionBookmark(id: number, marked: boolean): Promise<void> {
  await db.transactions.update(id, { MARK: marked ? 1 : 0 })
}

/**
 * Signed balance delta per asset uid derived from every non-deleted
 * transaction. Income credits, expense debits, and a transfer debits the
 * source (amount + fee) while crediting the destination.
 */
export async function getAssetBalanceDeltas(): Promise<Map<string, number>> {
  const deltas = new Map<string, number>()
  const add = (uid: string | null | undefined, amount: number) => {
    if (!uid) return
    deltas.set(uid, (deltas.get(uid) ?? 0) + amount)
  }

  const rows = await db.transactions.where('IS_DEL').equals(0).toArray()
  for (const t of rows) {
    const amount = Number(t.AMOUNT_ACCOUNT ?? t.ZMONEY) || 0
    if (t.DO_TYPE === 'income') {
      add(t.assetUid, amount)
    } else if (t.DO_TYPE === 'expense') {
      add(t.assetUid, -amount)
    } else if (t.DO_TYPE === 'transfer') {
      add(t.assetUid, -(amount + (Number(t.FEE) || 0)))
      add(t.toAssetUid, Number(t.IN_ZMONEY) || amount)
    }
  }
  return deltas
}

/** Current balance per asset uid = opening BALANCE + transaction deltas. */
export async function getAssetBalances(): Promise<Map<string, number>> {
  const [assets, deltas] = await Promise.all([getAllAssets(), getAssetBalanceDeltas()])
  const balances = new Map<string, number>()
  for (const a of assets) {
    balances.set(a.uid, (a.BALANCE || 0) + (deltas.get(a.uid) ?? 0))
  }
  return balances
}

// ---------------------------------------------------------------------------
// Photo (attachment) helpers
// ---------------------------------------------------------------------------

/** Attach a picture (data URL) to a transaction. */
export async function createPhoto(input: {
  txUid: string
  dataUrl: string
  fileName: string
}): Promise<number> {
  return db.photos.add({
    uid: genUid('photo'),
    IS_DEL: 0,
    USETIME: Date.now(),
    txUid: input.txUid,
    FILE_SIZE: input.dataUrl.length,
    FILE_PATH: input.dataUrl,
    FILE_NAME: input.fileName,
    ORG_FILE_NAME: input.fileName,
    ORG_FILE_PATH: input.dataUrl,
    isSynced: 0,
    syncTime: 0,
    syncVersion: 1,
  })
}

export async function getPhotosByTransaction(txUid: string): Promise<Photo[]> {
  const list = await db.photos.where('txUid').equals(txUid).toArray()
  return list.filter((p) => p.IS_DEL === 0).sort((a, b) => a.USETIME - b.USETIME)
}

export async function softDeletePhoto(uid: string): Promise<void> {
  const rows = await db.photos.where('uid').equals(uid).toArray()
  await Promise.all(rows.map((p) => db.photos.update(p.id!, { IS_DEL: 1 })))
}

// ---------------------------------------------------------------------------
// Tag helpers — TAG / TX_TAG
// ---------------------------------------------------------------------------

/** Active tags ordered by `orderSeq` (system tags first on a clean install). */
export async function getTags(): Promise<Tag[]> {
  const rows = await db.tags.where('isDel').equals(0).toArray()
  return rows.sort((a, b) => a.orderSeq - b.orderSeq)
}

export async function getTagByUid(uid: string): Promise<Tag | undefined> {
  const rows = await db.tags.where('uid').equals(uid).toArray()
  return rows.find((t) => t.isDel === 0)
}

export async function getMaxTagOrderSeq(): Promise<number> {
  const rows = await db.tags.toArray()
  return rows.reduce((max, t) => Math.max(max, t.orderSeq ?? 0), 0)
}

export async function createTag(name: string): Promise<number> {
  const orderSeq = (await getMaxTagOrderSeq()) + 1
  return db.tags.add({
    uid: genUid('tag'),
    name,
    orderSeq,
    isDel: 0,
    utime: Date.now(),
    isSynced: 0,
    syncTime: 0,
    syncVersion: 1,
  })
}

export async function updateTag(uid: string, name: string): Promise<void> {
  const rows = await db.tags.where('uid').equals(uid).toArray()
  await Promise.all(rows.map((t) => db.tags.update(t.id!, { name, utime: Date.now() })))
}

/** Soft-delete a tag and drop every transaction link pointing at it. */
export async function softDeleteTag(uid: string): Promise<void> {
  const rows = await db.tags.where('uid').equals(uid).toArray()
  await Promise.all(rows.map((t) => db.tags.update(t.id!, { isDel: 1, utime: Date.now() })))
  const links = await db.txTags.where('tagUid').equals(uid).toArray()
  await Promise.all(links.map((l) => db.txTags.delete(l.id!)))
}

export async function reorderTags(orderedUids: string[]): Promise<void> {
  const rows = await db.tags.toArray()
  const byUid = new Map(rows.map((t) => [t.uid, t]))
  await db.transaction('rw', db.tags, async () => {
    for (const [index, uid] of orderedUids.entries()) {
      const tag = byUid.get(uid)
      if (tag) await db.tags.update(tag.id!, { orderSeq: index + 1 })
    }
  })
}

/** Tag uids attached to a transaction, in the tag list order. */
export async function getTagUidsForTransaction(txUid: string): Promise<string[]> {
  const [links, tags] = await Promise.all([
    db.txTags.where('txUid').equals(txUid).toArray(),
    getTags(),
  ])
  const attached = new Set(links.map((l) => l.tagUid))
  return tags.filter((t) => attached.has(t.uid)).map((t) => t.uid)
}

/** Tags attached to a transaction, ordered like the tag list. */
export async function getTagsForTransaction(txUid: string): Promise<Tag[]> {
  const uids = new Set(await getTagUidsForTransaction(txUid))
  const tags = await getTags()
  return tags.filter((t) => uids.has(t.uid))
}

/**
 * Replace the tag links of a transaction. Join rows carry no UI recovery, so
 * they are replaced (deleted then re-created) instead of soft-deleted.
 */
export async function setTransactionTags(txUid: string, tagUids: string[]): Promise<void> {
  const existing = await db.txTags.where('txUid').equals(txUid).toArray()
  await db.transaction('rw', db.txTags, async () => {
    await Promise.all(existing.map((link) => db.txTags.delete(link.id!)))
    for (const [index, tagUid] of tagUids.entries()) {
      await db.txTags.add({
        uid: genUid('txtag'),
        txUid,
        tagUid,
        objName: 'inoutcome',
        orderSeq: index + 1,
        isDel: 0,
        utime: Date.now(),
        isSynced: 0,
        syncTime: 0,
        syncVersion: 1,
      })
    }
  })
}

// ---------------------------------------------------------------------------
// Budget (anggaran) helpers — PRD-04
// ---------------------------------------------------------------------------

/** Active budgets: category budgets by order, then "Total anggaran" (BR-03). */
export async function getBudgets(): Promise<Budget[]> {
  const rows = await db.budgets.where('IS_DEL').equals(0).toArray()
  return rows.sort((a, b) => {
    if (a.IS_TOTAL !== b.IS_TOTAL) return a.IS_TOTAL - b.IS_TOTAL
    return a.ORDER_SEQ - b.ORDER_SEQ
  })
}

export async function getBudgetByTarget(targetUid: string): Promise<Budget | undefined> {
  const rows = await db.budgets.where('targetUid').equals(targetUid).toArray()
  return rows.find((b) => b.IS_DEL === 0)
}

/** The all-categories budget ("Total anggaran"). */
export async function getBudgetTotal(): Promise<Budget | undefined> {
  const rows = await db.budgets.where('IS_TOTAL').equals(1).toArray()
  return rows.find((b) => b.IS_DEL === 0)
}

export async function getBudgetAmounts(budgetUid: string): Promise<BudgetAmount[]> {
  const rows = await db.budgetAmounts.where('budgetUid').equals(budgetUid).toArray()
  return rows.filter((r) => r.IS_DEL === 0)
}

/** Every active override row (one shot load for the status screens). */
export async function getAllBudgetAmounts(): Promise<BudgetAmount[]> {
  return db.budgetAmounts.where('IS_DEL').equals(0).toArray()
}

/** Write (or update) the value stored for a single month. */
export async function setBudgetMonthAmount(
  budgetUid: string,
  year: number,
  month: number,
  amount: number,
): Promise<void> {
  const period = year * 100 + month + 1
  const rows = await db.budgetAmounts.where('budgetUid').equals(budgetUid).toArray()
  const existing = rows.find((r) => r.BUDGET_PERIOD === period)
  const now = Date.now()
  if (existing) {
    await db.budgetAmounts.update(existing.id!, { AMOUNT: amount, IS_DEL: 0, MODIFY_DATE: now })
    return
  }
  await db.budgetAmounts.add({
    uid: genUid('bamt'),
    budgetUid,
    IS_DEL: 0,
    AMOUNT: amount,
    BUDGET_PERIOD: period,
    MODIFY_DATE: now,
    isSynced: 0,
    syncTime: 0,
    syncVersion: 1,
  })
}

/**
 * Create a budget — or override the existing one for the same target (BR-05).
 * A fresh budget stores only the base amount: the base applies to every month,
 * so twelve rows are not needed until the user customises one (FR-02/FR-03).
 * Re-adding an existing target only rewrites the month in view (EC-03/TC-BUD-20).
 */
export async function saveBudget(input: {
  /** `null` = "Semua" ("Total anggaran"). */
  targetUid: string | null
  amount: number
  year: number
  month: number
}): Promise<string> {
  const targetUid = input.targetUid ?? ''
  const existing = targetUid ? await getBudgetByTarget(targetUid) : await getBudgetTotal()
  const now = Date.now()

  if (existing) {
    await setBudgetMonthAmount(existing.uid, input.year, input.month, input.amount)
    await db.budgets.update(existing.id!, { MODIFY_DATE: now })
    return existing.uid
  }

  const uid = genUid('budget')
  const all = await db.budgets.toArray()
  const maxOrder = all.reduce((max, b) => Math.max(max, b.ORDER_SEQ), 0)
  await db.budgets.add({
    uid,
    targetUid,
    DO_TYPE: 1, // expense
    PERIOD_TYPE: 1, // monthly
    IS_TOTAL: targetUid ? 0 : 1,
    TRANSFER_TYPE: 0,
    ORDER_SEQ: maxOrder + 1,
    IS_DEL: 0,
    MODIFY_DATE: now,
    BASE_AMOUNT: input.amount,
    isSynced: 0,
    syncTime: 0,
    syncVersion: 1,
  })
  return uid
}

/**
 * Change the "Anggaran dasar" (FR-02). Months up to and including `month` are
 * frozen at the previous base so the change only shows from next month onwards
 * (BR-01); months the user customised themselves are never overwritten (BR-02).
 */
export async function updateBudgetBase(
  budget: Budget,
  amount: number,
  year: number,
  month: number,
): Promise<void> {
  const oldBase = budget.BASE_AMOUNT
  await db.budgets.update(budget.id!, { BASE_AMOUNT: amount, MODIFY_DATE: Date.now() })
  const rows = await db.budgetAmounts.where('budgetUid').equals(budget.uid).toArray()
  const now = Date.now()
  for (let m = 0; m <= month; m += 1) {
    const period = year * 100 + m + 1
    const existing = rows.find((r) => r.BUDGET_PERIOD === period && r.IS_DEL === 0)
    if (existing) continue
    await db.budgetAmounts.add({
      uid: genUid('bamt'),
      budgetUid: budget.uid,
      IS_DEL: 0,
      AMOUNT: oldBase,
      BUDGET_PERIOD: period,
      MODIFY_DATE: now,
      isSynced: 0,
      syncTime: 0,
      syncVersion: 1,
    })
  }
}

/** Soft-delete a budget together with its per-month rows. */
export async function deleteBudget(uid: string): Promise<void> {
  const rows = await db.budgets.where('uid').equals(uid).toArray()
  await Promise.all(rows.map((b) => db.budgets.update(b.id!, { IS_DEL: 1, MODIFY_DATE: Date.now() })))
  const amounts = await db.budgetAmounts.where('budgetUid').equals(uid).toArray()
  await Promise.all(amounts.map((a) => db.budgetAmounts.update(a.id!, { IS_DEL: 1 })))
}

// ---------------------------------------------------------------------------
// Recurring transactions (REPEATTRANSACTION) — PRD-05
// ---------------------------------------------------------------------------

/** Fields copied from a transaction into its recurring series. */
export type RepeatSeriesSource = Pick<
  Transaction,
  | 'uid'
  | 'DO_TYPE'
  | 'ZDATE'
  | 'ctgUid'
  | 'assetUid'
  | 'toAssetUid'
  | 'currencyUid'
  | 'AMOUNT_ACCOUNT'
  | 'FEE'
  | 'ZCONTENT'
  | 'ZDATA'
  | 'CATEGORY_NAME'
  | 'ASSET_NIC'
  | 'MARK'
  | 'RECUR_TYPE'
  | 'RECUR_FREQ'
>

export async function getRepeatTransactions(): Promise<RepeatTransaction[]> {
  const rows = await db.repeats.where('IS_DEL').equals(0).toArray()
  return rows.sort((a, b) => a.NEXT_DATE.localeCompare(b.NEXT_DATE))
}

/** The series owned by a given transaction (the one holding the frequency). */
export async function getRepeatByOrigin(txUid: string): Promise<RepeatTransaction | undefined> {
  const rows = await db.repeats.where('ORIGIN_TX_UID').equals(txUid).toArray()
  return rows.find((r) => r.IS_DEL === 0)
}

/** Review time ("Waktu peninjauan ulang"): actual date or first day of month. */
export async function getRepeatReflectMode(): Promise<'actual_date' | 'first_of_month'> {
  const setting = await getSettingByKey('repeat_reflect_type')
  return setting?.ZDATA === '1' ? 'first_of_month' : 'actual_date'
}

export async function setRepeatReflectMode(
  mode: 'actual_date' | 'first_of_month',
): Promise<void> {
  await setSetting('repeat_reflect_type', mode === 'first_of_month' ? '1' : '0')
}

/**
 * Create / update / stop the recurring series owned by a transaction.
 *
 * A saved transaction becomes the series' first occurrence; `NEXT_DATE` is the
 * occurrence after it. Clearing the frequency in the form stops the series
 * (the transaction itself stays).
 */
export async function syncRepeatSeries(tx: RepeatSeriesSource): Promise<void> {
  const existing = await getRepeatByOrigin(tx.uid)
  const active =
    tx.RECUR_TYPE === 'repeat' &&
    tx.RECUR_FREQ !== null &&
    ACTIVE_REPEAT_TYPES.includes(tx.RECUR_FREQ)

  if (!active) {
    if (existing?.id) {
      await db.repeats.update(existing.id, { IS_DEL: 1, USETIME: Date.now() })
    }
    return
  }

  const payload = {
    IS_DEL: 0,
    USETIME: Date.now(),
    MARK: tx.MARK ?? 0,
    END_DATE: null,
    NEXT_DATE: nextRepeatDate(tx.ZDATE, tx.RECUR_FREQ as number),
    DO_TYPE: tx.DO_TYPE,
    REPEAT_TYPE: tx.RECUR_FREQ as number,
    assetUid: tx.assetUid,
    toAssetUid: tx.toAssetUid,
    ctgUid: tx.ctgUid,
    currencyUid: tx.currencyUid,
    AMOUNT_SUB: tx.AMOUNT_ACCOUNT,
    MEMO: tx.ZCONTENT,
    PAYEE: tx.ZDATA,
    FEE: tx.FEE,
    CATEGORY_NAME: tx.CATEGORY_NAME,
    ASSET_NIC: tx.ASSET_NIC,
  }

  if (existing?.id) {
    await db.repeats.update(existing.id, payload)
    return
  }

  await db.repeats.add({
    uid: `rep_${tx.uid}`,
    ORIGIN_TX_UID: tx.uid,
    isSynced: 0,
    syncTime: 0,
    syncVersion: 1,
    ...payload,
  })
}

/**
 * Write every occurrence that fell due on or before `today`.
 *
 * Runs from `initDB()` (PRD-05 §8.2), so opening the app catches up on missed
 * occurrences. `NEXT_DATE` advances as rows are written, which makes the whole
 * operation idempotent. The review mode decides the date each row is filed
 * under: its due date, or the first day of that month (BR-03).
 */
export async function materializeDueRepeats(today: string = todayIso()): Promise<number> {
  const series = await db.repeats.where('IS_DEL').equals(0).toArray()
  if (series.length === 0) return 0

  const setting = await getSettingByKey('repeat_reflect_type')
  const firstOfMonth = setting?.ZDATA === '1'
  let created = 0

  for (const s of series) {
    if (!ACTIVE_REPEAT_TYPES.includes(s.REPEAT_TYPE)) continue
    let cursor: string | null = s.NEXT_DATE
    let guard = 0
    let finished = false

    while (cursor && guard < 400) {
      if (cursor > today) break // ISO strings sort lexicographically
      if (s.END_DATE && cursor > s.END_DATE) {
        finished = true
        break
      }
      const execDate = reflectDate(cursor, firstOfMonth)
      await createTransaction({
        uid: genUid('trx'),
        assetUid: s.assetUid,
        CARDDIVIDMONTH: null,
        ctgUid: s.ctgUid,
        toAssetUid: s.toAssetUid,
        ZCONTENT: s.MEMO,
        ZDATE: execDate,
        WDATE: `${execDate} 00:00:00`,
        wtime: '00:00:00',
        paid: null,
        DO_TYPE: s.DO_TYPE,
        ZMONEY: String(s.AMOUNT_SUB),
        txUidTrans: null,
        ZDATA: s.PAYEE,
        SMS_RDATE: null,
        IN_ZMONEY: s.DO_TYPE === 'transfer' ? String(s.AMOUNT_SUB) : null,
        ASSET_NIC: s.ASSET_NIC,
        CATEGORY_NAME: s.CATEGORY_NAME,
        cardDivideUid: null,
        CARD_DIVIDE_MONTH_STR: null,
        MARK: 0,
        txUidFee: null,
        SMS_ORIGIN: null,
        SMS_PARSE_CONTENT: null,
        IS_DEL: 0,
        UTIME: Date.now(),
        currencyUid: s.currencyUid,
        AMOUNT_ACCOUNT: s.AMOUNT_SUB,
        lat: null,
        lng: null,
        gstd: null,
        FEE: s.FEE ?? 0,
        RECUR_TYPE: 'repeat',
        RECUR_FREQ: s.REPEAT_TYPE,
        INSTALLMENT_MONTHS: null,
        RECUR_UID: s.uid,
        isSynced: 0,
        syncTime: 0,
        syncVersion: 1,
      })
      created += 1
      cursor = nextRepeatDate(cursor, s.REPEAT_TYPE)
      guard += 1
    }

    if (s.id) {
      const patch: Partial<RepeatTransaction> = {}
      if (cursor && cursor !== s.NEXT_DATE) patch.NEXT_DATE = cursor
      if (finished) patch.IS_DEL = 1
      if (Object.keys(patch).length > 0) await db.repeats.update(s.id, patch)
    }
  }

  return created
}

// ---------------------------------------------------------------------------
// Investment helpers — Track Investasi
// ---------------------------------------------------------------------------

export async function getInvestments(): Promise<InvestmentAsset[]> {
  const rows = await db.investments.where('isDel').equals(0).toArray()
  return rows.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getInvestmentByUid(uid: string): Promise<InvestmentAsset | undefined> {
  const rows = await db.investments.where('uid').equals(uid).toArray()
  return rows.find((r) => r.isDel === 0)
}

export async function createInvestment(input: {
  name: string
  linkedAssetUid?: string | null
  currencyUid?: string
  notes?: string
}): Promise<number> {
  const now = Date.now()
  return db.investments.add({
    uid: genUid('inv'),
    name: input.name.trim(),
    linkedAssetUid: input.linkedAssetUid ?? null,
    currencyUid: input.currencyUid ?? 'IDR_IDR',
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    isDel: 0,
    utime: now,
  })
}

export async function updateInvestment(
  uid: string,
  patch: Partial<InvestmentAsset>,
): Promise<void> {
  const row = await db.investments.where('uid').equals(uid).first()
  if (row?.id != null) {
    await db.investments.update(row.id, { ...patch, utime: Date.now() })
  }
}

export async function softDeleteInvestment(uid: string): Promise<void> {
  const row = await db.investments.where('uid').equals(uid).first()
  if (row?.id != null) {
    await db.investments.update(row.id, { isDel: 1, utime: Date.now() })
    const records = await db.investmentRecords.where('investmentUid').equals(uid).toArray()
    await Promise.all(
      records.map((r) => db.investmentRecords.update(r.id!, { isDel: 1, utime: Date.now() })),
    )
  }
}

export async function getInvestmentRecords(
  investmentUid: string,
): Promise<InvestmentRecord[]> {
  const rows = await db.investmentRecords
    .where('investmentUid')
    .equals(investmentUid)
    .toArray()
  const active = rows.filter((r) => r.isDel === 0)
  return active.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return a.time.localeCompare(b.time)
  })
}

export async function createInvestmentRecord(input: {
  investmentUid: string
  date: string
  time: string
  amount: number
  note?: string
}): Promise<number> {
  const now = Date.now()
  return db.investmentRecords.add({
    uid: genUid('invrec'),
    investmentUid: input.investmentUid,
    date: input.date,
    time: input.time,
    amount: input.amount,
    note: input.note?.trim() || undefined,
    createdAt: now,
    isDel: 0,
    utime: now,
  })
}

export async function updateInvestmentRecord(
  uid: string,
  patch: Partial<InvestmentRecord>,
): Promise<void> {
  const row = await db.investmentRecords.where('uid').equals(uid).first()
  if (row?.id != null) {
    await db.investmentRecords.update(row.id, { ...patch, utime: Date.now() })
  }
}

export async function softDeleteInvestmentRecord(uid: string): Promise<void> {
  const row = await db.investmentRecords.where('uid').equals(uid).first()
  if (row?.id != null) {
    await db.investmentRecords.update(row.id, { isDel: 1, utime: Date.now() })
  }
}
