# ANALYSIS & MEMORY: Audit Paritas Money Manager APK vs fin-app

Dokumen ini adalah basis pengetahuan teknis (*durable engineering memory*) yang mendokumentasikan prinsip audit, pemetaan berkas sumber APK decompiled (`tests/apk/src/sources/com/realbyte/money/`), riwayat kesalahan analisis sebelumnya beserta koreksinya, serta checklist audit komprehensif agar implementasi fin-app mencapai paritas 100% tanpa tebakan.

---

## 1. Prinsip Utama Audit (*Ground Truth Doctrine*)

1. **Kode Java APK adalah Kebenaran Mutlak (Tier 1 Authority):**
   - Sumber kode di `tests/apk/src/sources/com/realbyte/money/` dan skema `DBHelper.java` adalah standar acuan tertinggi.
   - Dilarang membuat asumsi visual (*mock/placeholder/heuristik*) tanpa memeriksa kelas `ViewHolder`, `Adapter`, dan query SQL terkait.
2. **Audit Wajib Mencakup 3 Dimensi:**
   - **Data Layer:** Definisi kolom tabel, relasi foreign key, tipe data, dan kode status numerik (`DO_TYPE`, `STATUS`, `TYPE`, `IS_DEL`).
   - **Repository / Service Layer:** Query string SQL (`DBQuery.java`), filter `WHERE`, penggabungan (*JOIN*), dan kalkulasi matematis.
   - **Presentation Layer:** Binding adapter (`DayAdapter.java`), percabangan visibilitas (`View.GONE` vs `View.VISIBLE`), pewarnaan teks (`UiUtil.java`), format pemisah, dan penanganan event klik pada header maupun baris.
3. **Pemeriksaan POV Ganda (Tab Utama vs Rincian Akun):**
   - Setiap fitur yang beririsan antara tampilan global (seperti Tab Transaksi/Statistik) dan tampilan per akun/kategori (Buku Besar Rincian) wajib dianalisis perilakunya dari **kedua sudut pandang** tersebut.

---

## 2. Riwayat Kesalahan Analisis & Pembelajaran (*Lessons Learned*)

### Kasus 1: Menyamakan Kartu Debit dengan Kartu Kredit
- **Kesalahan Awal:** Menggunakan helper `isCardGroup` untuk menampilkan input tanggal siklus penagihan ("Closing Date" dan "Payment Date") serta input saldo pada kartu debit.
- **Ground Truth APK (`ConfigAssetEdit.java:408` vs `453`):**
  - Kartu Kredit (`TYPE = 2`): Memiliki akun pembayar (`cardAssetUid`), tanggal siklus (`CARD_DAY_FIN`/`CARD_DAY_PAY`), dan input saldo/tagihan.
  - Kartu Debit (`TYPE = 3`): Input total saldo **disembunyikan** (`this.k.setVisibility(8)`), mata uang disembunyikan (`this.s.setVisibility(8)`), opsi sertakan dalam total disembunyikan (`this.x.setVisibility(8)`). Kartu debit adalah proksi cermin rekening bank terhubung.
- **Koreksi:** Memisahkan secara ketat `isCreditCard` dan `isDebitCard` di `asset-form.tsx` dan `asset-screen.tsx`.

### Kasus 2: Transaksi Penyesuaian Saldo (Selisih Saldo)
- **Kesalahan Awal:** Saat pengguna memilih "YA" (mencatat selisih saldo sebagai pendapatan/pengeluaran), fin-app mengosongkan `ctgUid: ''` dan menamai kategori "Pendapatan"/"Pengeluaran". Akibatnya muncul sebagai *Tanpa kategori*.
- **Ground Truth APK (`ConfigAssetEdit.java:621-654`):**
  - Baik dicatat sebagai income/expense (`DO_TYPE` 0/1) maupun penyesuaian murni (`DO_TYPE` 7/8), kategori transaksi **selalu ID `'-4'` dan berlabel `'Selisih saldo'`**.
  - Catatan/memo akun pengguna ditempelkan ke kolom memo transaksi (`ZDATA`).
- **Koreksi:** Menetapkan `ctgUid: '-4'`, `CATEGORY_NAME: 'Selisih saldo'`, dan mengisi `ZDATA` dari deskripsi akun.

### Kasus 3: Reaktivitas State & Stale Balance Caching
- **Kesalahan Awal:** Menghapus transaksi penyesuaian saldo langsung di database Dexie, namun tidak memancarkan notifikasi perubahan. `AssetScreen` dan `AssetForm` masih memegang Map saldo usang di memori React.
- **Penyebab:** Tidak adanya sistem event terpusat yang menghubungkan mutasi database Dexie dengan UI React.
- **Koreksi:** Menambahkan event global `dompetku:transactions-changed` di semua mutasi `lib/db.ts` (`createTransaction`, `updateTransaction`, `softDeleteTransaction`, `restoreTransaction`, `purgeTransaction`), memasang listener di layar terkait, serta melakukan query live saldo langsung ke database saat form ubah dibuka.

### Kasus 4: Penutupan Dini Layar Rincian Aset (Back Stack Lifecycle)
- **Kesalahan Awal:** Tombol "Ubah" pada rincian aset memanggil `setDetailAsset(null)`, menghancurkan rincian aset dari DOM sebelum form edit dibuka. Saat form edit ditutup, pengguna terlempar ke Tab Aset utama.
- **Ground Truth APK:** Menggunakan back-stack Android (`AssetsDetail.java` $\to$ `ConfigAssetEdit.java`). Saat edit ditutup, pengguna kembali ke `AssetsDetail`.
- **Koreksi:** Mempertahankan state `detailAsset`, menaikkan z-index drawer form edit ke `z-[80]`, dan merender form di atas rincian aset.

### Kasus 5: Format Transaksi Transfer & Placeholder Hardcoded
- **Kesalahan Awal:**
  - Fallback string `'Aset tujuan'` jika akun tujuan tidak ter-resolve di Map.
  - Orientasi terbalik pada leg masuk transfer (`DO_TYPE = 4`).
  - Biaya transfer (`tx.FEE`) tidak ditampilkan di baris transaksi.
  - Tampilan transfer di rincian aset dibuat berbeda menggunakan teks buatan `"Ke ..."` / `"Dari ..."`.
- **Ground Truth APK (`DayAdapter.java:705-714`, `Search.java:354-357`):**
  - Format akun transfer di **semua layar selalu**: `[Akun Asal] → [Akun Tujuan]` (bahkan pada leg 4, urutan tetap dari pengirim ke penerima).
  - Biaya transfer dicetak di bawah nominal: `+Biaya: [Nominal Biaya]`.
  - Nominal transfer di Tab Transaksi berwarna **netral**, sedangkan di POV Akun Pengirim berwarna **merah** (keluar) dan Akun Penerima berwarna **biru** (masuk).
  - Tampilan rincian akun menggunakan komponen yang persis sama dengan Tab Transaksi (`DayAdapter`).
- **Koreksi:** Menghapus string `'Aset tujuan'`, memastikan query aset memuat seluruh database, menstandarkan format `Asal → Tujuan`, menyatukan tampilan rincian akun dengan `DailyTransactionList`, dan merender baris biaya.

### Kasus 6: Ketiadaan Tag pada Baris Transaksi
- **Kesalahan Awal:** Tag transaksi disimpan di tabel `TX_TAG`, namun sama sekali tidak dimuat dan tidak dirender pada baris transaksi di UI.
- **Ground Truth APK (`DayAdapter.java:784-798`):**
  - Tag digabungkan dengan koma `, ` dan ditempelkan di samping jam/nama akun pada Kolom 2 (`underTitleText`).
- **Koreksi:** Menambahkan `getTransactionTagMap()` di `lib/db.ts`, memasukkan data tag ke dalam `Lookups`, dan merender tag di samping jam/akun pada `TransactionRow`.

### Kasus 7: Navigasi Klik Tanggal pada POV Rincian Aset & Kategori Statistik
- **Kesalahan Awal:** Callback `onAddDate` tidak dihubungkan saat menggunakan `DailyTransactionList` di dalam `AssetDetail` dan `StatistikDetail`.
- **Ground Truth APK (`DayAdapter.java:593-640`):**
  - Mengklik header tanggal di rincian akun membuka form input dengan tanggal dan akun yang telah terisi otomatis.
  - Mengklik header tanggal di rincian statistik membuka form input dengan tanggal dan kategori yang telah terisi otomatis.
- **Koreksi:** Memasang properti `onAddDate` di `AssetDetail` dan `StatistikDetail` untuk membuka form transaksi secara presisi.

### Kasus 8: Subkategori "Lainnya" Bernilai 0 di Tab Statistik
- **Kesalahan Awal:** Baris subkategori cadangan "Lainnya" (`stats-detail-sub-rest`) dirender secara mutlak tanpa syarat nominal sisa (`restAmount > 0`).
- **Koreksi:** Membungkus baris dengan `{restAmount > 0 && (...)}` dan memfilter subkategori yang memiliki nilai $> 0$.

### Kasus 9: Tampilan Waktu pada Baris Item Transaksi
- **Kesalahan Awal:** Memaksakan tampilan jam (`14:30`) pada setiap baris item transaksi secara default, bahkan saat tidak ada catatan.
- **Ground Truth APK (`DayAdapter.java:239-255` & `750-764`):**
  - Setting `time_display_order` (`10004`) memiliki nilai bawaan `'5'` (None Descending) atau `'2'` (Only Input).
  - Fungsi penentu tampilan waktu `f(i4, string, calendar)` di `DayAdapter.java:240` mengembalikan `false` jika setting bernilai `'0'`, `'5'`, `'4'`, atau `'2'`.
  - Waktu transaksi **HANYA TAMPIL** jika pengguna secara eksplisit mengaktifkannya via setting opsi `'1'` atau `'3'`.
  - Secara default (`showTime = false`):
    - Jika ADA Catatan: Judul atas = Catatan, Subjudul bawah = Akun (tanpa jam).
    - Jika TANPA Catatan: Judul atas = Akun, Subjudul bawah = Kosong (tanpa jam, atau hanya tag jika ada tag).
- **Koreksi:** Menambahkan pengecekan `time_display_order` ke dalam `Lookups.showTime` di `transaksi-screen.tsx`, `asset-detail.tsx`, dan `TransactionRow` sehingga waktu tidak dipaksakan tampil secara default.

### Kasus 10: Reset Data Cadangan (Setel Ulang Semua vs Rincian Transaksi Saja)
- **Kesalahan Awal:** "Setel ulang semua" sebelumnya mengeksekusi `db.delete()` dan menghapus `localStorage`, yang mencopot konfigurasi bahasa, merusak koneksi memoized `initPromise`, dan memaksa wizard onboarding pertama kali muncul. Sedangkan "Setel ulang rincian transaksi" hanya membersihkan `transactions`, meninggalkan foto dan tautan tag yatim.
- **Ground Truth APK (`ConfigBackupInit.java`, `DBInitService.b & h`, `DBInitService.c`):**
  - **Setel Ulang Semua (`fa.java case 1`):** Menghapus data tabel dan seketika me-reseed data bawaan bersih (kategori default, grup aset default, akun default Kas/Rekening/Kartu, dan setelan dasar) tanpa menghapus preferensi antarmuka pengguna (`localStorage`) dan tanpa memaksa onboarding baru.
  - **Hanya Setel Ulang Transaksi (`fa.java case 0`):** Menghapus tabel `INOUTCOME`, `PHOTO`, dan `TX_TAG` secara bersamaan, tanpa menyentuh akun, kategori, anggaran, atau setelan.
- **Koreksi:** Mengimplementasikan fungsi atomik `resetAllData(lang, currencyUid)` dan `resetTransactionsOnly()` di `lib/db.ts` dengan penyiapan kembali data bawaan yang bersih, pembersihan lampiran foto/tag, serta broadcast event reaktivitas.

### Kasus 11: Tipografi Responsif & Format Negatif Kartu Ringkasan Mobile
- **Kesalahan Awal:** Pada layar ponsel sempit ($\le 360\text{ px}$), kartu ringkasan 3-kolom (Pemasukan, Pengeluaran, Total) memotong nominal panjang dengan elipsis `truncate` (misal `Rp-1.384.0...`). Selain itu, tanda minus disematkan canggung di belakang simbol (`Rp -1.384.000` / `Rp-1.384.000`).
- **Ground Truth APK & Praktik Terbaik Akuntansi:**
  - Tanda minus diletakkan di depan simbol mata uang: `-Rp 1.384.000`.
  - Ukuran font kartu ringkasan dinamis: menggunakan `text-[12px]` atau `text-[11px]` dengan `tracking-tight` pada angka panjang (> 11 digit) agar seluruh angka (bahkan hingga ratusan juta) muat utuh tanpa terpotong `...`.
- **Koreksi:** Menyelaraskan `formatCurrency` di `lib/format.ts` agar menaruh minus di depan (`-Rp ...`) dan menerapkan penskalaan font responsif di `SummaryCell` (`transaksi-screen.tsx`), `SummaryItem` (`asset-screen.tsx`), dan `Stat` (`asset-detail.tsx`).
## 3. Peta Berkas Sumber APK Money Manager (`tests/apk/src/sources/com/realbyte/money/`)

```
tests/apk/src/sources/com/realbyte/money/
├── database/
│   ├── database/
│   │   ├── DBHelper.java           # Skema SQLite lengkap (INOUTCOME, ASSETS, ASSETGROUP, ZETC, dll)
│   │   └── DBInitService.java      # Seed awal data dan migrasi
│   ├── query/
│   │   └── DBQuery.java            # Query view lengkap (DBQuery.h() untuk transaksi)
│   └── service/
│       ├── asset/                  # AssetService.java, AssetRepository.java, vo/
│       ├── assetGroup/             # AssetGroupService.java, AssetGroupRepository.java
│       ├── tx/                     # TxService.java, TxRepository.java, vo/
│       ├── category/               # CategoryService.java, CategoryRepository.java
│       ├── budget/                 # BudgetService.java, BudgetRepository.java
│       └── repeat/                 # RepeatService.java, RepeatRepository.java
├── adapter/
│   ├── DayAdapter.java             # Adapter inti baris transaksi harian & per aset
│   └── pager/                      # Pager kalender, statistik, dan rincian aset
├── ui/
│   ├── holder/
│   │   ├── DayAdapterViewHolder.java # Struktur view kolom baris transaksi (item_day_adapter)
│   │   └── AssetsViewHolder.java   # Struktur view baris aset
│   ├── main/
│   │   ├── daily/MainDayFragment.java # Layar transaksi harian
│   │   └── calendar/               # Kalender transaksi
│   ├── account/
│   │   ├── Assets.java             # Layar daftar akun
│   │   └── AssetsDetail.java       # Layar rincian buku besar akun
│   ├── inputUi/
│   │   ├── InputRoot.java          # Logika form input transaksi
│   │   ├── InputSaveContinue.java  # Tombol Simpan & Lanjut
│   │   └── InputUtil.java          # Utilitas kalkulator, transfer fee, dan kategori
│   └── config/account/
│       ├── ConfigAssetEdit.java    # Form tambah/ubah aset
│       └── ConfigAssetGroupList.java # Pengelolaan grup aset bawaan
└── utils/
    ├── date/DateUtil.java          # Perhitungan tanggal, siklus bulan, dan jam
    └── view/UiUtil.java            # Aturan pewarnaan nominal transaksi (UiUtil.q & UiUtil.o)
```

---

## 4. Checklist Audit Komprehensif Mendatang

- [x] **Skema Basis Data Inti (`ASSETS`, `ASSETGROUP`, `INOUTCOME`)**
- [x] **Kalkulasi Saldo & Net Worth (`AssetService.k`, `AssetRepository.a`)**
- [x] **Perilaku Akun Kartu Kredit vs Kartu Debit (`ConfigAssetEdit.java`)**
- [x] **Tata Letak Baris Transaksi 3-Kolom (`DayAdapter.java`)**
- [x] **Format Transaksi Transfer & Biaya di Semua POV (`DayAdapter.java`)**
- [x] **Penanganan Tag Transaksi di Baris Item (`DayAdapter.java:784-798`)**
- [x] **Navigasi Klik Header Tanggal di Seluruh Drill-down View**
- [ ] **Modul Anggaran / Budget (`BudgetService.java`, `BudgetRepository.java`):**
  - Perhitungan sisa anggaran kategori vs total anggaran (`IS_TOTAL = 1`).
  - Aturan carry over/rollover sisa anggaran ke bulan berikutnya.
- [ ] **Modul Transaksi Berulang & Cicilan (`RepeatService.java`):**
  - Eksekusi jatuh tempo otomatis saat aplikasi dibuka (`materializeDueRepeats`).
  - Pembagian nominal cicilan kartu kredit (`CARDDIVIDMONTH`).
- [ ] **Modul Ekspor & Impor Cadangan (`ConfigBackupImport.java`):**
  - Dukungan pembacaan langsung arsip `.mmbak` SQLite Money Manager.
