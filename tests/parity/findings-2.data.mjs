/**
 * Katalog temuan paritas — bagian 2.
 *
 * Berisi temuan hasil survei setelan (T-11 … T-28) plus temuan cacat tautan
 * fin-app (T-09). Semua entri di sini **belum punya PRD**; kolom PRD di
 * TEMUAN.md akan menandainya "belum ditulis" sampai batch berikutnya.
 *
 * Sumber perilaku aplikasi asli: `tests/parity/real-settings.mjs --survey`
 * (lihat bukti `TA01b-setelan-asli/survei.md`).
 *
 * Prinsip: hanya menulis yang teramati. Yang belum diperiksa ditandai ❓.
 */
export const FINDINGS_2 = [
  {
    id: 'T-09',
    prdId: null,
    slug: 'tautan-menu-404',
    title: 'Tiga tautan menu fin-app menuju 404',
    kategori: 'Cacat fin-app (bukan selisih paritas)',
    prioritas: 'High',
    parent: 'Lainnya',
    masuk: 'Lainnya → Pengaturan umum / Pengaturan alarm / Pengaturan bahasa',
    ringkas:
      'Tiga item pada daftar "Lainnya" di fin-app menunjuk rute yang tidak ada, sehingga ' +
      'mendarat di 404. Ini cacat fin-app sendiri: aplikasi asli bisa membuka ketiga layar itu.',
    mm: [
      '`Pengaturan alarm` membuka layar alarm (Alarm Aktif, `Masukan waktu` 21.00, `Ulangi` Min–Sab, tombol Edit).',
      '`Pengaturan bahasa` membuka daftar 16 bahasa beserta nama penerjemahnya.',
      '`Pengaturan umum` tidak ada sebagai baris terpisah; padanannya tersebar di hub setelan.',
    ],
    fin: [
      'Ketiga rute (`/lainnya/pengaturan-umum`, `/lainnya/pengaturan-alarm`, `/lainnya/pengaturan-bahasa`) telah dibuat dan mengembalikan status 200.',
      'Seluruh 14 tautan di daftar Lainnya kini berfungsi tanpa ada jalan buntu 404 (selesai 24 Oktober 2026).',
    ],
    dampak: 'Pengguna menekan menu lalu mendapat halaman kosong. Terlihat jelas, mudah ditemukan pengulas.',
    selesai: '24 Oktober 2026',
    butuhPRD: false,
    bukti: [
      { group: 'TA01-kerangka', file: 'fin-20-lainnya-labels.md', cap: 'Daftar item + tautan fin-app' },
      { group: 'TA01b-setelan-asli', file: 'real-pengaturan-alarm.png', cap: 'Layar alarm aplikasi asli (salah satu rute yang 404 di fin-app)' },
      { group: 'TA01b-setelan-asli', file: 'real-pengaturan-bahasa.png', cap: 'Layar bahasa aplikasi asli' },
    ],
  },
  {
    id: 'T-11',
    prdId: 'PRD-P-07',
    slug: 'setelan-mata-uang-utama',
    title: 'Layar setelan "Pengaturan mata uang utama"',
    kategori: 'Setelan · mata uang',
    prioritas: 'High',
    parent: 'Lainnya → Kelola pengaturan',
    masuk: 'Lainnya → Kelola pengaturan → Pengaturan mata uang utama',
    ringkas:
      'Aplikasi asli punya layar untuk mengganti mata uang utama, mengatur posisi simbol, dan ' +
      'jumlah desimal, lengkap dengan pratinjau dan alur konfirmasi dua dialog. fin-app tidak ' +
      'punya layar ini; mata uang utama tidak bisa diubah pengguna.',
    mm: [
      'Judul layar `Pengaturan mata uang utama`, tombol `Perubahan` di kanan atas untuk membuka daftar seluruh mata uang dunia.',
      'Baris mata uang aktif: `IDR - Indonesia (Rp)`.',
      'Pratinjau format: `Rp 1.000,00`.',
      'Baris `Posisi satuan` = `Depan`; baris `Poin desimal` = `1.00`.',
      'Tombol `Menyimpan` untuk menerapkan.',
      'Mengganti mata uang memunculkan dua dialog berurutan: (1) `Mata uang utama akan diubah menjadi IDR(Rp)` dengan opsi `Simpan data` / `Reset data` / `Batalkan`; (2) `[Pemberitahuan] … Apakah Anda yakin ingin mengubah mata uang?` dengan `TIDAK` / `YA`.',
      'Setelah dikonfirmasi, mata uang lama berpindah ke daftar `Pengaturan mata uang` (kurs).',
    ],
    fin: [
      'Tidak ada layar setelan mata uang (❓ tidak ditemukan di `app/` maupun `components/`).',
      'Mata uang utama ditentukan di `lib/currencies.ts` dan dipakai lewat `getMainCurrency()`; tidak ada jalur UI untuk mengubahnya.',
    ],
    dampak:
      'Pengguna tidak bisa menyesuaikan format uang. Ini juga akar temuan T-01 (jumlah desimal) ' +
      'dan penghalang agar konfigurasi kedua sisi bisa disamakan tanpa mengubah kode.',
    butuhPRD: true,
    prd: {
      deskripsi:
        'Menambahkan layar pengaturan mata uang utama pada fin-app, meliputi pemilih mata uang ' +
        'dunia, pengaturan posisi simbol, jumlah desimal, pratinjau format, dan alur konfirmasi ' +
        'dua dialog sebelum perubahan diterapkan — meniru layar asli Money Manager.',
      tujuan: [
        'Pengguna dapat mengganti mata uang utama dari antarmuka tanpa mengubah kode.',
        'Format angka (posisi simbol dan jumlah desimal) dapat disesuaikan sesuai preferensi.',
        'Perubahan mata uang dijaga keamanannya lewat konfirmasi dua langkah sebelum data lama berubah.',
      ],
      alur:
        'Lainnya → Kelola pengaturan → Pengaturan mata uang utama →\n' +
        '  ├─ Tekan "Perubahan" → daftar mata uang dunia → pilih → pratinjau diperbarui\n' +
        '  ├─ Atur posisi simbol (Depan / Belakang)\n' +
        '  ├─ Atur jumlah desimal\n' +
        '  └─ Tekan "Menyimpan" → dialog (1) Simpan data / Reset data / Batalkan\n' +
        '                       → dialog (2) konfirmasi YA / TIDAK → diterapkan',
      userStory: [
        { prio: 'Tinggi', role: 'pengguna', want: 'mengganti mata uang utama dari layar setelan', so: 'format uang di seluruh aplikasi langsung mengikuti pilihan saya tanpa perlu mengubah kode' },
        { prio: 'Medium', role: 'pengguna dengan mata uang non-IDR', want: 'memilih posisi simbol dan jumlah desimal yang sesuai standar negaraku', so: 'angka yang ditampilkan terlihat wajar dan mudah dibaca' },
        { prio: 'Rendah', role: 'pengguna yang salah pilih', want: 'membatalkan perubahan di dialog konfirmasi', so: 'data lama tidak ikut berubah secara tidak sengaja' },
      ],
      struktur:
        'Layar pengaturan mata uang utama:\n\n' +
        '```\n' +
        '┌─────────────────────────────────────────────┐\n' +
        '│  Pengaturan mata uang utama    [Perubahan]  │\n' +
        '├─────────────────────────────────────────────┤\n' +
        '│  IDR - Indonesia (Rp)                       │\n' +
        '│  Pratinjau: Rp 1.000,00                     │\n' +
        '│  Posisi satuan      Depan              >    │\n' +
        '│  Poin desimal       1.00               >    │\n' +
        '│  [ Menyimpan ]                              │\n' +
        '└─────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Pemilih mata uang dunia',
          tipe: 'daftar pilihan',
          fungsi: 'Memilih mata uang yang akan dijadikan mata uang utama.',
          opsi: 'Seluruh mata uang yang didukung (berdasarkan lib/currencies.ts)',
          default: 'IDR - Indonesia (Rp)',
          perilaku:
            'Tombol "Perubahan" membuka layar daftar seluruh mata uang; memilih satu mata uang ' +
            'menutup daftar dan memperbarui pratinjau format.',
        },
        {
          nama: 'Posisi satuan',
          tipe: 'pemilih',
          fungsi: 'Menentukan apakah simbol mata uang di depan atau belakang angka.',
          opsi: 'Depan / Belakang',
          default: 'Depan',
          perilaku: 'Mengubah pilihan langsung memperbarui pratinjau format.',
        },
        {
          nama: 'Poin desimal',
          tipe: 'pemilih',
          fungsi: 'Menentukan jumlah digit desimal pada format angka.',
          opsi: '0 / 1.0 / 1.00 / 1.000',
          default: '1.00',
          perilaku: 'Mengubah pilihan langsung memperbarui pratinjau format.',
        },
        {
          nama: 'Alur konfirmasi perubahan',
          tipe: 'dialog',
          fungsi: 'Meminta pengguna memilih apa yang terjadi pada data lama sebelum mata uang diterapkan.',
          opsi: 'Simpan data / Reset data / Batalkan (dialog 1); YA / TIDAK (dialog 2)',
          default: 'Tidak ada perubahan tanpa konfirmasi',
          perilaku:
            'Dialog 1 muncul saat "Menyimpan" ditekan. Memilih "Simpan data" atau "Reset data" ' +
            'memunculkan dialog 2 untuk konfirmasi akhir. "Batalkan" menutup dialog 1 tanpa perubahan.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Layar "Pengaturan mata uang utama" tersedia dari Lainnya → Kelola pengaturan, berisi baris mata uang aktif, pratinjau, posisi satuan, poin desimal, dan tombol "Menyimpan".' },
        { id: 'FR-02', teks: 'Tombol "Perubahan" di kanan atas membuka daftar seluruh mata uang; memilih mata uang memperbarui pratinjau secara langsung.' },
        { id: 'FR-03', teks: 'Menekan "Menyimpan" memunculkan dialog konfirmasi pertama dengan pilihan "Simpan data" / "Reset data" / "Batalkan".' },
        { id: 'FR-04', teks: 'Setelah memilih opsi data, dialog kedua muncul: "Apakah Anda yakin ingin mengubah mata uang?" dengan tombol "TIDAK" / "YA".' },
        { id: 'FR-05', teks: 'Setelah dikonfirmasi, mata uang lama berpindah ke daftar mata uang tambahan (PRD-P-08) dan mata uang baru mulai aktif.' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Konsistensi: seluruh angka di aplikasi (daftar transaksi, statistik, aset) langsung memakai format baru setelah perubahan disimpan.' },
        { id: 'NFR-02', teks: 'Keselamatan data: opsi "Reset data" harus memberikan peringatan tambahan karena bersifat destruktif.' },
      ],
      interaksi: {
        navigasi: 'Lainnya → Kelola pengaturan → Pengaturan mata uang utama.',
        simpan: '"Menyimpan" hanya berlaku setelah dua dialog konfirmasi disetujui.',
        validasi: 'Tidak ada masukan bebas; semua pilihan berasal dari daftar yang disediakan.',
      },
      teramati: [
        'Asli: judul layar "Pengaturan mata uang utama", tombol "Perubahan", baris IDR, pratinjau "Rp 1.000,00", posisi satuan "Depan", poin desimal "1.00", tombol "Menyimpan" (bukti `real-pengaturan-mata-uang-utama.png`).',
        'Asli: dialog 1 berbunyi "Mata uang utama akan diubah menjadi IDR(Rp)" dengan tiga opsi.',
        'Asli: dialog 2 berbunyi "[Pemberitahuan] … Apakah Anda yakin ingin mengubah mata uang?" dengan TIDAK / YA.',
        'fin-app: tidak ada layar setelan mata uang; mata uang ditentukan di `lib/currencies.ts` melalui `getMainCurrency()` (bukti di array `fin` T-11).',
      ],
      skema:
        'Setelan baru perlu disimpan di basis data:\n\n' +
        '```\n' +
        'settings.set("main_currency",   "IDR")\n' +
        'settings.set("symbol_position",  "front")\n' +
        'settings.set("decimal_places",   2)\n' +
        '```\n\n' +
        'Fungsi `getMainCurrency()` dan `formatCurrency()` di `lib/currencies.ts` membaca nilai ini.',
      default: 'IDR - Indonesia (Rp); posisi simbol Depan; dua desimal.',
      alurData:
        'Pengguna pilih mata uang → pratinjau dihitung ulang → "Menyimpan" → dialog 1 → dialog 2\n' +
        '→ settings.set(main_currency) → formatCurrency() di seluruh komponen membaca ulang nilai.',
      error: [
        { id: 'E-01', teks: 'Daftar mata uang gagal dimuat → tampilkan pesan "Gagal memuat daftar mata uang" dan izinkan coba ulang.' },
        { id: 'E-02', teks: 'Penyimpanan setelan gagal → dialog tetap terbuka dan pesan kesalahan muncul lewat notifikasi ringan.' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Pengguna memilih mata uang yang sama dengan yang sudah aktif → "Menyimpan" boleh diblokir atau konfirmasi ditetapkan sebagai tidak perlu.' },
        { id: 'EC-02', teks: 'Opsi "Reset data" dipilih → seluruh transaksi dan aset dalam mata uang lama dihapus; perlu peringatan sekali lagi sebelum berlaku.' },
      ],
      internal: [
        { teks: '`lib/currencies.ts` — fungsi `getMainCurrency()` dan daftar mata uang yang didukung.' },
        { teks: '`lib/db.ts` — tabel setelan yang menyimpan `main_currency`, `symbol_position`, `decimal_places`.' },
      ],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Uji ganti mata uang dengan masing-masing opsi dialog (Simpan data / Reset data / Batalkan), lalu periksa pratinjau format di layar transaksi dan statistik.',
      metrics: [
        { teks: 'Format angka di seluruh layar berubah sesuai mata uang dan desimal yang dipilih.' },
        { teks: 'Dialog konfirmasi muncul sebelum perubahan diterapkan pada setiap skenario.' },
      ],
      verifikasi: {
        ok: [
          'Asli: layar ada dengan semua elemen — Perubahan, pratinjau, Posisi satuan, Poin desimal, Menyimpan (bukti `real-pengaturan-mata-uang-utama.png`).',
          'Asli: mata uang diganti memunculkan dua dialog berurutan sebelum perubahan berlaku.',
          'fin-app: tidak ada jalur UI untuk mengganti mata uang utama; `getMainCurrency()` di `lib/currencies.ts` mengembalikan nilai tetap.',
        ],
        belum: [
          '❓ Isi lengkap daftar mata uang yang dapat dipilih (hanya IDR yang teramati pada layar asli).',
          '❓ Efek "Reset data": apakah hanya transaksi atau juga aset dan anggaran — belum diuji pada aplikasi asli.',
          '❓ Apakah pratinjau format memperbarui secara langsung saat posisi simbol atau desimal diubah (tidak ada tangkapan layar sela).',
        ],
      },
    },
    bukti: [
      { group: 'TA01b-setelan-asli', file: 'real-pengaturan-mata-uang-utama.png', cap: 'Layar lengkap: Perubahan, IDR, pratinjau, Posisi satuan, Poin desimal, Menyimpan' },
      { group: 'TA00-persiapan', file: 'real-settings.md', cap: 'Catatan nilai setelan sebelum/sesudah penyamaan konfigurasi' },
    ],
  },
  {
    id: 'T-12',
    prdId: 'PRD-P-08',
    slug: 'setelan-mata-uang-tambahan',
    title: 'Daftar "Pengaturan mata uang" (mata uang tambahan + kurs)',
    kategori: 'Setelan · mata uang',
    prioritas: 'Medium',
    parent: 'Lainnya → Kelola pengaturan',
    masuk: 'Lainnya → Kelola pengaturan → Pengaturan mata uang',
    ringkas:
      'Aplikasi asli mendukung lebih dari satu mata uang: daftar mata uang tambahan beserta ' +
      'kurs terhadap mata uang utama, dan tombol ' + '`Tambah`. fin-app hanya punya satu mata uang.',
    mm: [
      'Kepala layar menampilkan kurs, mis. `USD 1.00  =  IDR 18.053,0`.',
      'Baris mata uang tambahan: `USD - USA (US$)`; tombol `Tambah` untuk menambah mata uang.',
      'Mata uang yang diganti dari utama akan muncul di sini (perilaku alur ganti mata uang, lihat T-11).',
    ],
    fin: ['Tidak ada konsep mata uang tambahan, tidak ada kurs, tidak ada daftar (❓ tidak ditemukan di `lib/` maupun `components/`).'],
    dampak: 'Transaksi lintas mata uang tidak mungkin dicatat dengan benar; pengguna hanya bisa memakai satu mata uang.',
    butuhPRD: true,
    prd: {
      deskripsi:
        'Menambahkan layar daftar mata uang tambahan berikut pengaturan kurs konversi terhadap ' +
        'mata uang utama, mengikuti layar "Pengaturan mata uang" pada Money Manager.',
      tujuan: [
        'Pengguna dapat mencatat transaksi dalam lebih dari satu mata uang dengan kurs yang ditentukan sendiri.',
        'Mata uang yang pernah menjadi mata uang utama (lihat PRD-P-07) otomatis masuk ke daftar ini.',
        'Kurs terkini terlihat di kepala layar sebelum pengguna mengubahnya.',
      ],
      alur:
        'Lainnya → Kelola pengaturan → Pengaturan mata uang →\n' +
        '  ├─ Kepala: kurs ringkas (mis. USD 1.00 = IDR 18.053,0)\n' +
        '  ├─ Daftar mata uang tambahan (mis. USD - USA (US$))\n' +
        '  └─ Tombol "Tambah" → pilih mata uang → masukkan kurs → simpan',
      userStory: [
        { prio: 'Tinggi', role: 'pengguna yang bertransaksi dengan mata uang asing', want: 'melihat dan mengatur kurs mata uang tambahan', so: 'nilai transaksi dapat dikonversi dengan benar ke mata uang utama saya' },
        { prio: 'Medium', role: 'pengguna yang baru mengganti mata uang utama', want: 'mata uang lama otomatis muncul di daftar ini', so: 'saya tidak perlu memasukkannya ulang secara manual' },
      ],
      struktur:
        'Layar daftar mata uang tambahan:\n\n' +
        '```\n' +
        '┌───────────────────────────────────────────────┐\n' +
        '│  Pengaturan mata uang                         │\n' +
        '│  USD 1.00  =  IDR 18.053,0                    │\n' +
        '├───────────────────────────────────────────────┤\n' +
        '│  USD - USA (US$)                   ✎     🗑   │\n' +
        '├───────────────────────────────────────────────┤\n' +
        '│  [ Tambah ]                                   │\n' +
        '└───────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Kepala kurs ringkas',
          tipe: 'tampilan',
          fungsi: 'Menampilkan kurs konversi terkini antara mata uang tambahan pertama dan mata uang utama.',
          opsi: 'Otomatis diperbarui saat kurs diubah',
          default: 'Menampilkan kurs yang tersimpan terakhir',
          perilaku: 'Hanya tampilan; untuk mengubah kurs gunakan tombol edit pada baris.',
        },
        {
          nama: 'Tombol Tambah mata uang',
          tipe: 'aksi',
          fungsi: 'Menambah mata uang tambahan baru berikut kursnya.',
          opsi: 'Pilih dari daftar mata uang dunia, lalu isi kurs konversi',
          default: 'Tidak ada mata uang tambahan pada awal pertama kali',
          perilaku: 'Membuka pemilih mata uang, lalu layar isian kurs, lalu menyimpan ke daftar.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Layar "Pengaturan mata uang" menampilkan kurs ringkas di kepala dan daftar mata uang tambahan di bawahnya.' },
        { id: 'FR-02', teks: 'Tombol "Tambah" membuka pemilih mata uang dan kolom kurs; menyimpan menambah baris baru ke daftar.' },
        { id: 'FR-03', teks: 'Setiap baris mata uang tambahan memiliki tombol edit kurs dan tombol hapus.' },
        { id: 'FR-04', teks: 'Mata uang yang sebelumnya menjadi mata uang utama otomatis masuk ke daftar ini saat pengguna mengganti mata uang utama (keterkaitan dengan PRD-P-07).' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Konsistensi: kurs yang tersimpan langsung dipakai saat pengguna mencatat transaksi dalam mata uang tambahan.' },
        { id: 'NFR-02', teks: 'Validasi: kurs harus berupa angka positif; masukan kosong atau nol ditolak.' },
      ],
      interaksi: {
        navigasi: 'Lainnya → Kelola pengaturan → Pengaturan mata uang.',
        simpan: 'Kurs baru tersimpan saat pengguna menekan "Simpan" pada layar isian kurs.',
        validasi: 'Nilai kurs harus angka positif; mata uang yang sama tidak boleh ditambahkan dua kali.',
      },
      teramati: [
        'Asli: kepala layar menampilkan kurs "USD 1.00 = IDR 18.053,0" dan baris "USD - USA (US$)" (bukti `real-pengaturan-mata-uang.png`).',
        'Asli: tombol "Tambah" ada di bawah daftar untuk menambah mata uang baru.',
        'fin-app: tidak ada konsep mata uang tambahan maupun kurs di `lib/` maupun `components/` (dari array `fin` T-12).',
      ],
      skema:
        'Tabel baru untuk mata uang tambahan:\n\n' +
        '```\n' +
        'currencies_extra: { CODE, NAME, SYMBOL, RATE_TO_MAIN, CREATED_AT }\n' +
        '```\n\n' +
        'Kurs dibaca saat pencatatan transaksi mata uang asing untuk konversi ke mata uang utama.',
      default: 'Daftar kosong; kurs diisi manual oleh pengguna.',
      alurData:
        'Tambah mata uang → pilih kode → isi kurs → currencies_extra.insert()\n' +
        '→ kepala layar memuat ulang kurs ringkas.',
      error: [
        { id: 'E-01', teks: 'Kurs yang dimasukkan bukan angka positif → tampilkan validasi "Kurs harus berupa angka lebih dari nol".' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Pengguna menambah mata uang yang sudah ada di daftar → tampilkan pesan duplikat dan batalkan.' },
        { id: 'EC-02', teks: 'Mata uang tambahan dihapus padahal ada transaksi lama dalam mata uang itu → data transaksi tetap tersimpan, hanya konversi kurs yang menjadi tak tersedia.' },
      ],
      internal: [
        { teks: '`lib/currencies.ts` — fungsi yang ada saat ini untuk mata uang tunggal; perlu diperluas.' },
        { teks: '`lib/db.ts` — perlu tabel baru `currencies_extra` untuk menyimpan kurs.' },
      ],
      eksternal: [{ teks: 'Tidak ada; kurs diisi manual oleh pengguna (tidak ada integrasi API kurs otomatis yang teramati di aplikasi asli).' }],
      testing: 'Tambah mata uang baru, periksa kurs di kepala layar, lalu catat transaksi dalam mata uang itu dan periksa konversinya.',
      metrics: [
        { teks: 'Kurs yang tersimpan tampil di kepala layar segera setelah penyimpanan.' },
        { teks: 'Baris mata uang tambahan muncul dalam daftar setelah ditambahkan.' },
      ],
      verifikasi: {
        ok: [
          'Asli: layar ada dengan kepala kurs, daftar mata uang, dan tombol Tambah (bukti `real-pengaturan-mata-uang.png`).',
          'fin-app: tidak ada layar, komponen, atau model data untuk mata uang tambahan.',
        ],
        belum: [
          '❓ Format lengkap layar isian kurs saat menambah mata uang baru — belum ada tangkapan layar langkah itu.',
          '❓ Apakah kepala kurs menampilkan satu pasang atau semua pasang bila ada lebih dari satu mata uang tambahan.',
        ],
      },
    },
    bukti: [
      { group: 'TA01b-setelan-asli', file: 'real-pengaturan-mata-uang.png', cap: 'Kurs + mata uang tambahan + tombol Tambah' },
    ],
  },
  {
    id: 'T-13',
    prdId: 'PRD-P-09',
    slug: 'setelan-tanggal-mulai-bulanan',
    title: 'Setelan "Tanggal mulai bulanan" (+ perilaku akhir pekan)',
    kategori: 'Setelan · periode',
    prioritas: 'Medium',
    parent: 'Lainnya → Kelola pengaturan',
    masuk: 'Lainnya → Kelola pengaturan → Tanggal mulai bulanan',
    ringkas:
      'Aplikasi asli bisa memulai periode bulanan pada tanggal selain tanggal 1, dan menentukan ' +
      'apa yang terjadi bila tanggal itu jatuh pada akhir pekan. fin-app selalu memakai tanggal 1.',
    mm: [
      'Layar `Tanggal mulai bulanan` dengan baris `Tanggal mulai` = `1`.',
      'Baris `Jika tanggal mulai bulanan adalah akhir pekan` dengan tiga pilihan: `Tidak ada perubahan`, `Hari jumat sebelumnya`, `Senin berikutnya`.',
      'Tombol `Menyimpan`.',
    ],
    fin: [
      'Tidak ada setelan ini (❓ tidak ditemukan di `app/` maupun `components/`).',
      'Periode bulanan dihitung dari tanggal 1 pada `lib/statistics-utils.ts` dan `lib/month.ts`.',
    ],
    dampak: 'Pengguna bergaji bukan-tanggal-1 tidak bisa menyelaraskan periode dengan siklus gajinya.',
    butuhPRD: true,
    prd: {
      deskripsi:
        'Menambahkan layar setelan tanggal mulai periode bulanan pada fin-app, beserta ' +
        'pilihan perilaku bila tanggal itu jatuh pada akhir pekan, mengikuti layar asli Money Manager.',
      tujuan: [
        'Pengguna dapat menyelaraskan periode bulanan fin-app dengan siklus gaji atau periode anggaran mereka.',
        'Bila tanggal mulai jatuh di akhir pekan, pengguna memilih perilaku geser yang sesuai.',
        'Perubahan langsung berlaku pada perhitungan total dan statistik bulanan.',
      ],
      alur:
        'Lainnya → Kelola pengaturan → Tanggal mulai bulanan →\n' +
        '  ├─ Pilih Tanggal mulai (1–28)\n' +
        '  ├─ Pilih perilaku akhir pekan:\n' +
        '  │   ├─ Tidak ada perubahan\n' +
        '  │   ├─ Hari jumat sebelumnya\n' +
        '  │   └─ Senin berikutnya\n' +
        '  └─ Tekan "Menyimpan" → setelan berlaku mulai awal bulan berikutnya',
      userStory: [
        { prio: 'Tinggi', role: 'pengguna bergaji tanggal 25', want: 'menetapkan tanggal mulai bulanan menjadi 25', so: 'periode pengeluaran selaras dengan siklus gaji saya' },
        { prio: 'Medium', role: 'pengguna yang peduli hari kerja', want: 'memilih apa yang terjadi bila tanggal mulai jatuh di akhir pekan', so: 'periode tidak terpotong di hari non-kerja' },
      ],
      struktur:
        'Layar Tanggal mulai bulanan:\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  Tanggal mulai bulanan                       │\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  Tanggal mulai          1                  > │\n' +
        '│  Jika akhir pekan                            │\n' +
        '│   ◉ Tidak ada perubahan                      │\n' +
        '│   ○ Hari jumat sebelumnya                    │\n' +
        '│   ○ Senin berikutnya                         │\n' +
        '│  [ Menyimpan ]                               │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Pemilih tanggal mulai',
          tipe: 'pemilih angka',
          fungsi: 'Menentukan tanggal dalam bulan yang menjadi awal periode.',
          opsi: '1 hingga 28 (batas aman untuk semua bulan)',
          default: '1',
          perilaku: 'Perubahan tanggal memperbarui label pratinjau rentang bulan di bawahnya bila ada.',
        },
        {
          nama: 'Pilihan perilaku akhir pekan',
          tipe: 'pilihan radio',
          fungsi: 'Menentukan apa yang terjadi bila tanggal mulai jatuh pada hari Sabtu atau Minggu.',
          opsi: 'Tidak ada perubahan / Hari jumat sebelumnya / Senin berikutnya',
          default: 'Tidak ada perubahan',
          perilaku: 'Hanya aktif bila tanggal mulai bukan tanggal 1 (yang tidak bisa jatuh di akhir pekan setiap bulan).',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Layar "Tanggal mulai bulanan" menyediakan pemilih tanggal (1–28) dan tiga pilihan perilaku akhir pekan.' },
        { id: 'FR-02', teks: 'Menekan "Menyimpan" menyimpan nilai ke setelan; kalkulasi statistik dan total bulanan membaca nilai ini.' },
        { id: 'FR-03', teks: 'Fungsi-fungsi di `lib/statistics-utils.ts` dan `lib/month.ts` membaca tanggal mulai dari setelan, bukan dipatok pada 1.' },
        { id: 'FR-04', teks: 'Bila tanggal mulai yang tersimpan 29–31, aplikasi memakai hari terakhir bulan itu sebagai fallback bila bulan kurang hari.' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Konsistensi: seluruh tampilan "bulan ini" di tab Transaksi, Statistik, dan widget menggunakan tanggal mulai yang sama.' },
        { id: 'NFR-02', teks: 'Keandalan: perubahan tanggal tidak menghapus atau memindahkan transaksi lama; hanya mengubah cara mengelompokkannya.' },
      ],
      interaksi: {
        navigasi: 'Lainnya → Kelola pengaturan → Tanggal mulai bulanan.',
        simpan: '"Menyimpan" menyimpan tanggal dan pilihan akhir pekan ke setelan aplikasi.',
        validasi: 'Tanggal harus bilangan bulat 1–28; pilihan akhir pekan adalah pilihan tunggal dari tiga opsi.',
      },
      teramati: [
        'Asli: layar berisi baris "Tanggal mulai" = 1, tiga pilihan akhir pekan, dan tombol "Menyimpan" (bukti `real-tanggal-mulai-bulanan.png`).',
        'fin-app: periode selalu dihitung dari tanggal 1; setelan tidak ada di `app/` maupun `components/` (dari array `fin` T-13).',
        'fin-app: `lib/statistics-utils.ts` dan `lib/month.ts` memakai tanggal 1 secara tetap.',
      ],
      skema:
        'Dua kunci setelan baru:\n\n' +
        '```\n' +
        'settings.set("monthly_start_day",     1)          // 1–28\n' +
        'settings.set("weekend_behavior",      "none")     // none | friday | monday\n' +
        '```\n\n' +
        '`lib/month.ts` membaca kunci ini untuk menentukan batas awal/akhir periode.',
      default: 'Tanggal mulai 1; perilaku akhir pekan "Tidak ada perubahan".',
      alurData:
        'Pengguna ubah tanggal → pilih akhir pekan → "Menyimpan"\n' +
        '→ settings.set(monthly_start_day, weekend_behavior)\n' +
        '→ lib/month.ts hitung ulang rentang bulan aktif\n' +
        '→ seluruh komponen yang bergantung pada rentang bulan dicetak ulang.',
      error: [
        { id: 'E-01', teks: 'Tanggal diisi di luar 1–28 → tampilkan validasi "Tanggal harus antara 1 dan 28".' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Bulan Februari (28/29 hari) saat tanggal mulai > 28 → pakai hari terakhir bulan itu sebagai pengganti.' },
        { id: 'EC-02', teks: 'Tanggal mulai = 1 (tidak pernah akhir pekan di awal bulan mana pun secara universal) → pilihan perilaku akhir pekan bisa disembunyikan atau dinonaktifkan.' },
      ],
      internal: [
        { teks: '`lib/month.ts` — fungsi yang menghitung rentang bulan aktif; perlu membaca setelan tanggal mulai.' },
        { teks: '`lib/statistics-utils.ts` — perhitungan total bulanan; bergantung pada `lib/month.ts`.' },
        { teks: '`lib/db.ts` — tabel setelan untuk menyimpan `monthly_start_day` dan `weekend_behavior`.' },
      ],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Ubah tanggal mulai ke 15, simpan, lalu periksa tab Statistik dan total bulanan di tab Transaksi untuk memastikan rentang berubah.',
      metrics: [
        { teks: 'Rentang "bulan ini" di tab Transaksi mencerminkan tanggal mulai yang dipilih.' },
        { teks: 'Menyimpan tanggal baru tidak menghapus atau memindahkan transaksi yang sudah ada.' },
      ],
      verifikasi: {
        ok: [
          'Asli: layar ada dengan tanggal mulai 1, tiga pilihan akhir pekan, dan tombol Menyimpan (bukti `real-tanggal-mulai-bulanan.png`).',
          'fin-app: `lib/statistics-utils.ts` dan `lib/month.ts` memakai tanggal 1 secara tetap; tidak ada setelan tanggal mulai.',
        ],
        belum: [
          '❓ Apakah perubahan tanggal mulai berlaku pada bulan yang sedang berjalan atau hanya mulai bulan berikutnya — belum diuji di aplikasi asli.',
          '❓ Apakah aplikasi asli membatasi pilihan tanggal sampai 28 atau hingga 31 — tidak terlihat dari tangkapan layar.',
        ],
      },
    },
    bukti: [
      { group: 'TA01b-setelan-asli', file: 'real-tanggal-mulai-bulanan.png', cap: 'Tanggal mulai + tiga pilihan perilaku akhir pekan + Menyimpan' },
    ],
  },
  {
    id: 'T-14',
    prdId: 'PRD-P-10',
    slug: 'setelan-layar-utama',
    title: 'Setelan "Layar utama (Harian/Kalender)"',
    kategori: 'Setelan · tampilan',
    prioritas: 'Low',
    parent: 'Lainnya → Kelola pengaturan',
    masuk: 'Lainnya → Kelola pengaturan → Layar utama(Harian/Kalender)',
    ringkas:
      'Aplikasi asli membiarkan pengguna memilih sub-tab mana yang terbuka lebih dulu di tab ' +
      'Transaksi: `Harian` atau `Kalender`. fin-app selalu membuka `Harian`.',
    mm: ['Layar pilihan berisi `Harian` dan `Kalender`; nilai teramati `Harian`.'],
    fin: ['Tidak ada setelan ini (❓ tidak ditemukan); sub-tab awal dipatok pada `Harian` di `components/transaksi-screen.tsx`.'],
    dampak: 'Kecil — hanya soal sub-tab pertama yang tampil. Berpengaruh pada langkah pertama setiap skenario pengujian.',
    butuhPRD: true,
    prd: {
      deskripsi:
        'Menambahkan setelan layar utama tab Transaksi: pengguna dapat memilih apakah sub-tab ' +
        '"Harian" atau "Kalender" yang terbuka pertama kali setiap kali tab Transaksi dibuka.',
      tujuan: [
        'Pengguna yang lebih sering memakai tampilan kalender tidak perlu mengetuk tab itu setiap kali.',
        'Nilai bawaan selaras dengan aplikasi asli sehingga skenario pengujian dimulai dari keadaan yang sama.',
      ],
      alur:
        'Lainnya → Kelola pengaturan → Layar utama(Harian/Kalender) →\n' +
        '  ├─ Pilih "Harian"   → sub-tab aktif pertama = Harian\n' +
        '  └─ Pilih "Kalender" → sub-tab aktif pertama = Kalender',
      userStory: [
        { prio: 'Rendah', role: 'pengguna yang terbiasa melihat transaksi per kalender', want: 'membuka tab Transaksi langsung di tampilan Kalender', so: 'saya tidak perlu mengetuk tab Kalender setiap kali masuk' },
      ],
      struktur:
        'Layar pilihan sub-tab awal:\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  Layar utama (Harian/Kalender)               │\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  ◉ Harian                                    │\n' +
        '│  ○ Kalender                                  │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Pilihan sub-tab awal',
          tipe: 'pilihan radio',
          fungsi: 'Menentukan sub-tab mana yang aktif saat tab Transaksi pertama kali dibuka.',
          opsi: 'Harian / Kalender',
          default: 'Harian',
          perilaku:
            'Memilih salah satu dan keluar dari layar setelan menyimpan nilai; tab Transaksi ' +
            'membaca nilai ini saat pertama kali dirender.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Layar setelan menyediakan dua pilihan: "Harian" dan "Kalender".' },
        { id: 'FR-02', teks: 'Nilai yang dipilih tersimpan ke setelan; komponen `transaksi-screen.tsx` membaca nilai ini untuk menentukan tab awal.' },
        { id: 'FR-03', teks: 'Perubahan berlaku mulai sesi berikutnya (atau segera bila komponen dikosongkan dari memori).' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Ringan: setelan ini hanya mengubah tab awal, tidak memengaruhi data atau kinerja.' },
        { id: 'NFR-02', teks: 'Konsistensi: nilai bawaan "Harian" sama dengan perilaku fin-app saat ini, jadi tidak ada perubahan perilaku sebelum pengguna mengubahnya.' },
      ],
      interaksi: {
        navigasi: 'Lainnya → Kelola pengaturan → Layar utama(Harian/Kalender).',
        simpan: 'Nilai tersimpan segera saat pengguna memilih salah satu opsi.',
        validasi: 'Hanya dua pilihan; tidak ada masukan bebas.',
      },
      teramati: [
        'Asli: layar berisi dua pilihan "Harian" dan "Kalender"; nilai teramati "Harian" (bukti `real-layar-utama-harian-kalender.png`).',
        'fin-app: sub-tab awal dipatok pada "Harian" di `components/transaksi-screen.tsx`; tidak ada setelan.',
      ],
      skema:
        'Satu kunci setelan baru:\n\n' +
        '```\n' +
        'settings.set("home_tab", "daily")  // daily | calendar\n' +
        '```\n\n' +
        '`components/transaksi-screen.tsx` membaca kunci ini untuk nilai `initialTab`.',
      default: '"Harian" (sesuai nilai teramati di aplikasi asli dan perilaku fin-app saat ini).',
      alurData:
        'Pengguna pilih opsi → settings.set("home_tab") → transaksi-screen membaca nilai saat mount → activeTab diinisialisasi.',
      error: [
        { id: 'E-01', teks: 'Nilai setelan rusak atau tidak dikenal → pakai nilai bawaan "Harian".' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Pengguna berpindah ke tab lain lalu kembali → tab yang aktif mengikuti sesi, bukan selalu kembali ke pilihan setelan (sesuai perilaku tab umum).' },
        { id: 'EC-02', teks: 'Aplikasi direset/install ulang → nilai kembali ke bawaan "Harian".' },
      ],
      internal: [
        { teks: '`components/transaksi-screen.tsx` — tab Transaksi tempat `initialTab` ditentukan saat ini secara tetap.' },
        { teks: '`lib/db.ts` — tabel setelan untuk menyimpan `home_tab`.' },
      ],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Ubah ke "Kalender", tutup tab Transaksi, buka kembali, pastikan Kalender yang aktif pertama.',
      metrics: [
        { teks: 'Sub-tab yang aktif saat tab Transaksi pertama dibuka sesuai dengan pilihan setelan.' },
      ],
      verifikasi: {
        ok: [
          'Asli: layar dengan dua pilihan Harian/Kalender ada dan nilai teramati Harian (bukti `real-layar-utama-harian-kalender.png`).',
          'fin-app: `transaksi-screen.tsx` mematok sub-tab awal secara tetap pada Harian; tidak ada setelan.',
        ],
        belum: [
          '❓ Apakah setelan ini memengaruhi tab awal setiap kali tab Transaksi diklik, atau hanya saat pertama kali dibuka sejak login.',
        ],
      },
    },
    bukti: [
      { group: 'TA01b-setelan-asli', file: 'real-layar-utama-harian-kalender.png', cap: 'Pilihan Harian / Kalender' },
    ],
  },
  {
    id: 'T-15',
    prdId: 'PRD-P-11',
    slug: 'setelan-pindah-saldo',
    title: 'Setelan "Pengaturan pindah saldo" (sisa saldo bulan lalu)',
    kategori: 'Setelan · periode',
    prioritas: 'High',
    parent: 'Lainnya → Kelola pengaturan',
    masuk: 'Lainnya → Kelola pengaturan → Pengaturan pindah saldo',
    ringkas:
      'Aplikasi asli dapat memindahkan sisa uang bulan sebelumnya ke bulan ini, dicatat sebagai ' +
      'pendapatan bila positif dan pengeluaran bila negatif. fin-app tidak punya fungsi ini.',
    mm: [
      'Layar berisi penjelasan panjang (sisa saldo awal bulan ikut terhitung pada total kolom transaksi).',
      'Pilihan `Mati` / `Aktif`; nilai teramati `Mati`.',
      'Sisa negatif → dicatat sebagai pengeluaran di awal bulan; sisa non-negatif → pemasukan.',
      'Aset selain kartu debit dipindahkan otomatis; kartu debit disarankan diubah ke kelompok bank bila ingin ikut dipindah.',
    ],
    fin: [
      'Tidak ada setelan maupun logika pindah saldo (❓ tidak ditemukan; kata "carry" di `lib/statistics-utils.ts` hanya komentar soal sub-kategori).',
    ],
    dampak:
      'Total bulanan kedua aplikasi tidak akan pernah sama setelah ada data di lebih dari satu ' +
      'bulan. Ini akan langsung terlihat pada Tahap 4/6.',
    butuhPRD: true,
    prd: {
      deskripsi:
        'Menambahkan fitur pindah saldo pada fin-app: sisa saldo bulan lalu secara otomatis ' +
        'dicatat sebagai pemasukan (sisa positif) atau pengeluaran (sisa negatif) di awal bulan ' +
        'baru, dapat diaktifkan atau dimatikan lewat setelan.',
      tujuan: [
        'Total bulanan fin-app dapat selaras dengan aplikasi asli bila fitur ini diaktifkan.',
        'Pengguna dengan saldo awal bulan yang relevan mendapat gambaran keuangan yang lebih akurat.',
        'Fitur ini bersifat opsional sehingga pengguna yang tidak menginginkannya tidak terpengaruh.',
      ],
      alur:
        'Lainnya → Kelola pengaturan → Pengaturan pindah saldo →\n' +
        '  ├─ Baca penjelasan pindah saldo\n' +
        '  ├─ Pilih Mati / Aktif\n' +
        '  └─ Simpan → (bila Aktif) pada pergantian bulan:\n' +
        '       ├─ Saldo ≥ 0 → transaksi pemasukan otomatis di awal bulan\n' +
        '       └─ Saldo < 0 → transaksi pengeluaran otomatis di awal bulan',
      userStory: [
        { prio: 'Tinggi', role: 'pengguna yang ingin total bulanan mencakup sisa bulan lalu', want: 'mengaktifkan pindah saldo otomatis', so: 'angka total bulan ini sudah memperhitungkan uang yang tersisa dari bulan lalu' },
        { prio: 'Medium', role: 'pengguna yang hanya ingin mencatat pengeluaran bulan ini', want: 'memastikan fitur ini dalam keadaan mati', so: 'total saya tidak berisi entri otomatis yang tidak saya buat' },
      ],
      struktur:
        'Layar pengaturan pindah saldo:\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  Pengaturan pindah saldo                     │\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  Sisa saldo awal bulan ikut terhitung pada   │\n' +
        '│  total kolom transaksi. Sisa positif dicatat  │\n' +
        '│  sebagai pemasukan, sisa negatif sebagai      │\n' +
        '│  pengeluaran di awal bulan baru.              │\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  ○ Mati   ◉ Aktif                            │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Saklar pindah saldo',
          tipe: 'pilihan dua keadaan',
          fungsi: 'Mengaktifkan atau menonaktifkan pencatatan otomatis sisa saldo bulan lalu.',
          opsi: 'Mati / Aktif',
          default: 'Mati',
          perilaku:
            'Saat Aktif: pada hari pertama bulan baru, sistem menghitung saldo bersih bulan ' +
            'sebelumnya dan membuat satu entri transaksi otomatis (pemasukan atau pengeluaran). ' +
            'Saat Mati: tidak ada entri otomatis.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Layar "Pengaturan pindah saldo" berisi penjelasan dan pilihan Mati / Aktif.' },
        { id: 'FR-02', teks: 'Saat Aktif dan bulan berganti, sistem membuat satu transaksi pemasukan (saldo ≥ 0) atau pengeluaran (saldo < 0) senilai sisa bulan lalu.' },
        { id: 'FR-03', teks: 'Transaksi pindah saldo diberi label khusus agar pengguna tahu itu bukan transaksi manual (mis. "[Pindah saldo]").' },
        { id: 'FR-04', teks: 'Aset kelompok bank (termasuk mantan kartu debit yang sudah dipindah) ikut diperhitungkan dalam pindah saldo.' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Keandalan: transaksi pindah saldo hanya dibuat satu kali per bulan; pergantian bulan yang dicek berulang tidak membuat entri duplikat.' },
        { id: 'NFR-02', teks: 'Transparansi: pengguna dapat melihat dan menghapus transaksi pindah saldo dari daftar transaksi seperti transaksi lainnya.' },
      ],
      interaksi: {
        navigasi: 'Lainnya → Kelola pengaturan → Pengaturan pindah saldo.',
        simpan: 'Nilai tersimpan segera saat pengguna memilih Mati/Aktif.',
        validasi: 'Hanya dua pilihan; tidak ada masukan bebas.',
      },
      teramati: [
        'Asli: layar berisi penjelasan panjang, pilihan Mati/Aktif, nilai teramati Mati (bukti `real-pengaturan-pindah-saldo.png`).',
        'Asli: sisa negatif → dicatat sebagai pengeluaran; sisa non-negatif → pemasukan (dari array `mm` T-15).',
        'fin-app: tidak ada setelan maupun logika pindah saldo; kata "carry" di `lib/statistics-utils.ts` hanya komentar sub-kategori (dari array `fin` T-15).',
      ],
      skema:
        'Satu kunci setelan dan logika baru di kalkulasi bulanan:\n\n' +
        '```\n' +
        'settings.set("carry_balance", false)  // false | true\n' +
        '\n' +
        '// Dipanggil pada pergantian bulan\n' +
        'function carryBalance(prevMonthEnd) {\n' +
        '  const saldo = calcNetBalance(prevMonthEnd)\n' +
        '  if (saldo !== 0)\n' +
        '    transactions.insert({ amount: Math.abs(saldo), type: saldo > 0 ? "income" : "expense", note: "[Pindah saldo]" })\n' +
        '}\n' +
        '```',
      default: 'Mati (sesuai nilai teramati di aplikasi asli).',
      alurData:
        'Pergantian bulan → cek settings carry_balance → (Aktif) hitung saldo bersih bulan lalu\n' +
        '→ buat transaksi otomatis → statistik dan total bulan baru memuat ulang.',
      error: [
        { id: 'E-01', teks: 'Pembuatan transaksi pindah saldo gagal → catat di log, coba ulang keesokan harinya, dan beri notifikasi pengguna.' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Saldo bulan lalu = 0 → tidak ada transaksi pindah saldo yang dibuat.' },
        { id: 'EC-02', teks: 'Pengguna mematikan fitur setelah entri pindah saldo sudah dibuat → entri yang sudah ada tidak dihapus otomatis.' },
      ],
      internal: [
        { teks: '`lib/statistics-utils.ts` — perhitungan saldo bersih; perlu fungsi `calcNetBalance()` untuk akhir bulan.' },
        { teks: '`lib/db.ts` — tabel setelan untuk `carry_balance`; transaksi baru disimpan di tabel transaksi yang sama.' },
      ],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Aktifkan fitur, buat beberapa transaksi di bulan ini, tunggu atau simulasikan pergantian bulan, lalu periksa apakah transaksi pindah saldo muncul di awal bulan berikutnya.',
      metrics: [
        { teks: 'Tepat satu transaksi pindah saldo muncul per bulan saat fitur Aktif dan saldo ≠ 0.' },
        { teks: 'Total bulan baru mencakup nilai pindah saldo bila fitur Aktif.' },
      ],
      verifikasi: {
        ok: [
          'Asli: layar ada dengan penjelasan, pilihan Mati/Aktif, nilai teramati Mati (bukti `real-pengaturan-pindah-saldo.png`).',
          'Asli: sisa negatif → dicatat pengeluaran; sisa positif → pemasukan (dari array `mm` T-15).',
          'fin-app: tidak ada logika pindah saldo di `lib/statistics-utils.ts` maupun di tempat lain.',
        ],
        belum: [
          '❓ Apakah transaksi pindah saldo terhapus bila pengguna mematikan fitur dan menyalakan kembali — belum diuji di aplikasi asli.',
          '❓ Definisi aset "kartu debit" yang disarankan dipindah ke kelompok bank — belum ada tangkapan layar penjelasan lebih lanjut.',
        ],
      },
    },
    bukti: [
      { group: 'TA01b-setelan-asli', file: 'real-pengaturan-pindah-saldo.png', cap: 'Penjelasan + pilihan Mati/Aktif' },
    ],
  },
  {
    id: 'T-16',
    prdId: 'PRD-P-12',
    slug: 'setelan-geser',
    title: 'Setelan "Geser": penamaan opsi & penyaluran fungsi',
    kategori: 'Setelan · interaksi',
    prioritas: 'Medium',
    parent: 'Lainnya → Kelola pengaturan',
    masuk: 'Lainnya → Kelola pengaturan → Geser',
    ringkas:
      'Kedua aplikasi punya setelan geser horizontal dengan tiga opsi, tetapi penamaannya ' +
      'berbeda dan di fin-app opsi "Ubah tab" belum tersalurkan ke navigasi sub-tab.',
    mm: ['Tiga opsi: `Ubah tab`, `Ubah tanggal`, `Tidak digunakan`; nilai teramati `Ubah tanggal`.'],
    fin: [
      'Halaman `Pengaturan geser` ada di `/lainnya/pengaturan-geser`.',
      'Label opsi: `Ubah periode`, `Ubah tab`, `Nonaktifkan`.',
      'Nilai bawaan `change_date` (setara `Ubah periode`).',
      '❓ Mode `change_tab` tersimpan tetapi belum terhubung ke perpindahan sub-tab.',
    ],
    dampak: 'Label tidak konsisten dengan aplikasi asli, dan salah satu pilihan belum berfungsi.',
    butuhPRD: true,
    prd: {
      deskripsi:
        'Menyelaraskan label opsi setelan geser fin-app dengan aplikasi asli, dan menghubungkan ' +
        'mode "Ubah tab" yang tersimpan ke navigasi sub-tab aktual sehingga geser horizontal ' +
        'berfungsi penuh sesuai pilihan pengguna.',
      tujuan: [
        'Label opsi konsisten antara fin-app dan aplikasi asli: "Ubah tab" (bukan "Ubah periode").',
        'Geser horizontal dengan mode "Ubah tab" benar-benar memindahkan sub-tab aktif.',
        'Semua tiga mode geser berfungsi: pindah tab, pindah tanggal/periode, nonaktif.',
      ],
      alur:
        'Lainnya → Kelola pengaturan → Geser →\n' +
        '  ├─ Pilih "Ubah tab"     → geser pada layar = pindah sub-tab Harian/Kalender\n' +
        '  ├─ Pilih "Ubah tanggal" → geser = maju/mundur satu hari (perilaku saat ini)\n' +
        '  └─ Pilih "Tidak digunakan" → geser diabaikan',
      userStory: [
        { prio: 'Tinggi', role: 'pengguna yang terbiasa geser untuk pindah tab', want: 'mode "Ubah tab" benar-benar memindahkan sub-tab saat digesek', so: 'geser dan ketuk tab menghasilkan efek yang sama' },
        { prio: 'Medium', role: 'pengguna yang membandingkan dengan aplikasi asli', want: 'melihat label opsi yang sama persis', so: 'saya tidak bingung mencari opsi yang saya ingat' },
      ],
      struktur:
        'Layar Pengaturan geser (label diselaraskan):\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  Geser                                       │\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  ○ Ubah tab                                  │\n' +
        '│  ◉ Ubah tanggal                              │\n' +
        '│  ○ Tidak digunakan                           │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Opsi "Ubah tab"',
          tipe: 'pilihan radio',
          fungsi: 'Mengonfigurasi geser horizontal agar memindahkan sub-tab aktif.',
          opsi: 'change_tab',
          default: 'Tidak dipilih secara bawaan',
          perilaku:
            'Saat dipilih, geser kiri/kanan pada layar Transaksi memindahkan sub-tab antara ' +
            '"Harian" dan "Kalender". Handler geser membaca nilai setelan dan memanggil ' +
            'fungsi pindah tab yang sudah ada di komponen.',
        },
        {
          nama: 'Penamaan ulang label',
          tipe: 'tampilan',
          fungsi: 'Menyelaraskan teks opsi dengan aplikasi asli.',
          opsi: 'Ubah tab / Ubah tanggal / Tidak digunakan',
          default: 'Ubah tanggal (setara change_date yang sudah ada)',
          perilaku: 'Hanya perubahan teks label; nilai internal tidak berubah.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Label opsi pada layar "Pengaturan geser" adalah: "Ubah tab", "Ubah tanggal", "Tidak digunakan" — sesuai aplikasi asli.' },
        { id: 'FR-02', teks: 'Memilih "Ubah tab" dan menggeser layar Transaksi ke kiri atau kanan memindahkan sub-tab aktif (Harian ↔ Kalender).' },
        { id: 'FR-03', teks: 'Mode "Ubah tanggal" tetap berfungsi seperti sekarang: geser maju/mundur satu hari.' },
        { id: 'FR-04', teks: 'Mode "Tidak digunakan" menonaktifkan geser sepenuhnya.' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Responsif: perpindahan sub-tab dari geser tidak boleh terasa lebih lambat dari mengetuk tab langsung.' },
        { id: 'NFR-02', teks: 'Kompatibilitas: handler geser tidak boleh mengganggu geser yang sudah ada pada komponen kalender atau daftar transaksi.' },
      ],
      interaksi: {
        navigasi: 'Lainnya → Kelola pengaturan → Geser (layar `/lainnya/pengaturan-geser`).',
        simpan: 'Nilai tersimpan segera saat pengguna memilih salah satu opsi.',
        validasi: 'Hanya tiga pilihan; tidak ada masukan bebas.',
      },
      teramati: [
        'Asli: tiga opsi "Ubah tab", "Ubah tanggal", "Tidak digunakan"; nilai teramati "Ubah tanggal" (bukti `real-geser.png`).',
        'fin-app: halaman ada di `/lainnya/pengaturan-geser`; label "Ubah periode", "Ubah tab", "Nonaktifkan"; mode `change_tab` tersimpan tapi belum terhubung (dari array `fin` T-16).',
      ],
      skema:
        'Tidak ada perubahan skema; nilai internal tetap `change_tab | change_date | disabled`.\n' +
        'Hanya label yang diubah dan handler geser yang disambungkan:\n\n' +
        '```\n' +
        'if (swipeSetting === "change_tab") switchActiveTab(direction)\n' +
        'else if (swipeSetting === "change_date") shiftDate(direction)\n' +
        '```',
      default: 'Ubah tanggal (`change_date`), sesuai nilai bawaan yang sudah ada di fin-app.',
      alurData:
        'Pengguna ubah pilihan → settings.set(swipe_action)\n' +
        '→ handler geser di transaksi-screen.tsx membaca nilai → menjalankan aksi sesuai mode.',
      error: [
        { id: 'E-01', teks: 'Nilai setelan geser tidak dikenal → pakai bawaan "Ubah tanggal" dan catat peringatan di konsol.' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Sub-tab sudah di ujung (misal sudah di "Kalender") dan pengguna geser ke kanan lagi → tidak ada aksi, geser diabaikan.' },
        { id: 'EC-02', teks: 'Mode "Ubah tab" aktif saat komponen kalender menangani geser internal → prioritas geser perlu didefinisikan agar tidak konflik.' },
      ],
      internal: [
        { teks: '`components/swipe-gesture-settings-screen.tsx` — layar pengaturan geser yang sudah ada.' },
        { teks: '`components/transaksi-screen.tsx` — handler geser yang perlu disambungkan ke pindah tab.' },
      ],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Pilih "Ubah tab", kembali ke layar Transaksi, lalu geser kiri dan kanan untuk memastikan sub-tab berpindah.',
      metrics: [
        { teks: 'Geser dengan mode "Ubah tab" memindahkan sub-tab aktif setiap kali.' },
        { teks: 'Label opsi cocok persis dengan aplikasi asli: "Ubah tab", "Ubah tanggal", "Tidak digunakan".' },
      ],
      verifikasi: {
        ok: [
          'Asli: tiga opsi dengan label "Ubah tab", "Ubah tanggal", "Tidak digunakan"; nilai teramati "Ubah tanggal" (bukti `real-geser.png`).',
          'fin-app: halaman ada di `/lainnya/pengaturan-geser`; `swipe-gesture-settings-screen.tsx` sudah ada di `components/`.',
          'fin-app: mode `change_tab` tersimpan di setelan tetapi belum terhubung ke pindah sub-tab (dari array `fin` T-16).',
        ],
        belum: [
          '❓ Apakah geser "Ubah tanggal" yang sudah ada juga berpengaruh di sub-tab Kalender atau hanya di sub-tab Harian — belum diuji seluruh kombinasi.',
        ],
      },
    },
    bukti: [
      { group: 'TA01b-setelan-asli', file: 'real-geser.png', cap: 'Opsi aplikasi asli' },
      { group: 'TA01-kerangka', file: 'fin-20-lainnya.png', cap: 'fin-app: item `Pengaturan geser` pada daftar Lainnya' },
    ],
  },
  {
    id: 'T-17',
    prdId: 'PRD-P-13',
    slug: 'setelan-warna-pendapatan-pengeluaran',
    title: 'Setelan "Warna pendapatan-pengeluaran" (Bag.A / Bag.B)',
    kategori: 'Setelan · tampilan',
    prioritas: 'Low',
    parent: 'Lainnya → Kelola pengaturan',
    masuk: 'Lainnya → Kelola pengaturan → Warna pendapatan-pengeluaran',
    ringkas:
      'Aplikasi asli bisa menukar warna pendapatan/pengeluaran: skema A (pendapatan biru, ' +
      'pengeluaran merah) atau skema B (kebalikannya). fin-app memakai satu skema tetap.',
    mm: [
      'Layar `Pengaturan warna` dengan penjelasan bawaan: pendapatan biru, pengeluaran merah.',
      'Pilihan A: `Pendapatan: Biru, Pengeluaran: Merah`; pilihan B: `Pendapatan: Merah, Pengeluaran: Biru`.',
      'Nilai baris setelan teramati `Bag.A`.',
    ],
    fin: ['Tidak ada setelan ini (❓ tidak ditemukan); warna ditentukan komponen.'],
    dampak: 'Kecil — hanya warna angka. Namun mudah terlihat pada tangkapan layar berdampingan.',
    butuhPRD: true,
    prd: {
      deskripsi:
        'Menambahkan setelan skema warna pendapatan/pengeluaran pada fin-app: Bag.A ' +
        '(pendapatan biru, pengeluaran merah) atau Bag.B (kebalikannya), mengikuti ' +
        'layar "Pengaturan warna" pada aplikasi asli.',
      tujuan: [
        'Pengguna dapat memilih skema warna sesuai preferensi atau konvensi regional.',
        'Warna yang dipilih berlaku konsisten di seluruh layar: daftar transaksi, statistik, dan ringkasan.',
      ],
      alur:
        'Lainnya → Kelola pengaturan → Warna pendapatan-pengeluaran →\n' +
        '  ├─ Pilih Bag.A (Pendapatan: Biru, Pengeluaran: Merah)\n' +
        '  └─ Pilih Bag.B (Pendapatan: Merah, Pengeluaran: Biru)',
      userStory: [
        { prio: 'Rendah', role: 'pengguna yang terbiasa merah = pendapatan', want: 'memilih skema warna Bag.B', so: 'warna angka sesuai intuisi saya tanpa harus belajar konvensi baru' },
      ],
      struktur:
        'Layar Pengaturan warna:\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  Pengaturan warna                            │\n' +
        '│  Bawaan: Pendapatan biru, Pengeluaran merah  │\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  ◉ Bag.A  Pendapatan: Biru, Pengeluaran: Merah│\n' +
        '│  ○ Bag.B  Pendapatan: Merah, Pengeluaran: Biru│\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Pilihan skema warna',
          tipe: 'pilihan radio',
          fungsi: 'Menentukan warna angka pendapatan dan pengeluaran di seluruh aplikasi.',
          opsi: 'Bag.A (pendapatan biru, pengeluaran merah) / Bag.B (pendapatan merah, pengeluaran biru)',
          default: 'Bag.A',
          perilaku:
            'Memilih skema menyimpan preferensi; seluruh komponen yang menampilkan angka ' +
            'pendapatan/pengeluaran membaca setelan ini dan memakai variabel CSS yang sesuai.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Layar "Pengaturan warna" menyediakan dua pilihan Bag.A dan Bag.B dengan keterangan warna masing-masing.' },
        { id: 'FR-02', teks: 'Memilih salah satu menyimpan preferensi; warna pendapatan dan pengeluaran berubah segera di seluruh antarmuka.' },
        { id: 'FR-03', teks: 'Skema warna berlaku pada daftar transaksi, tab Statistik, dan ringkasan bulanan.' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Aksesibilitas: skema warna yang dipilih tetap memenuhi rasio kontras WCAG 2.1 AA terhadap latar belakang tema yang aktif.' },
        { id: 'NFR-02', teks: 'Konsistensi: tidak ada komponen yang mengeras warna pendapatan/pengeluaran; semua membaca dari variabel yang diatur oleh setelan ini.' },
      ],
      interaksi: {
        navigasi: 'Lainnya → Kelola pengaturan → Warna pendapatan-pengeluaran.',
        simpan: 'Nilai tersimpan dan berlaku segera saat pengguna memilih opsi.',
        validasi: 'Hanya dua pilihan; tidak ada masukan bebas.',
      },
      teramati: [
        'Asli: layar berisi penjelasan bawaan, Bag.A (Pendapatan: Biru, Pengeluaran: Merah), Bag.B (Pendapatan: Merah, Pengeluaran: Biru); nilai teramati Bag.A (bukti `real-warna-pendapatan-pengeluaran.png`).',
        'fin-app: warna ditentukan per komponen; tidak ada setelan warna pendapatan/pengeluaran (dari array `fin` T-17).',
      ],
      skema:
        'Satu kunci setelan baru:\n\n' +
        '```\n' +
        'settings.set("color_scheme", "A")  // A | B\n' +
        '```\n\n' +
        'Komponen membaca nilai ini untuk menentukan kelas CSS `income-color` dan `expense-color`.',
      default: 'Bag.A (pendapatan biru, pengeluaran merah).',
      alurData:
        'Pengguna pilih Bag.A/B → settings.set(color_scheme)\n' +
        '→ komponen membaca setelan → variabel CSS diperbarui → tampilan berubah.',
      error: [
        { id: 'E-01', teks: 'Nilai setelan tidak dikenal → pakai Bag.A sebagai bawaan.' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Pengguna mengganti tema (Terang/Gelap) setelah memilih skema warna → kedua setelan independen dan keduanya berlaku bersama.' },
        { id: 'EC-02', teks: 'Grafik statistik menggunakan warna fill yang sama → perlu memastikan warna grafik juga mengikuti skema.' },
      ],
      internal: [
        { teks: '`components/theme-settings.tsx` — komponen setelan tema yang sudah ada; setelan warna bisa ditambahkan di layar yang sama atau layar baru.' },
        { teks: '`lib/db.ts` — tabel setelan untuk menyimpan `color_scheme`.' },
      ],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Pilih Bag.B, periksa daftar transaksi, statistik, dan ringkasan untuk memastikan pendapatan merah dan pengeluaran biru.',
      metrics: [
        { teks: 'Warna angka pendapatan dan pengeluaran sesuai skema yang dipilih di seluruh layar.' },
      ],
      verifikasi: {
        ok: [
          'Asli: layar ada dengan dua skema Bag.A dan Bag.B; nilai teramati Bag.A (bukti `real-warna-pendapatan-pengeluaran.png`).',
          'fin-app: warna dieras di komponen; tidak ada setelan atau variabel CSS terpusat untuk warna pendapatan/pengeluaran.',
        ],
        belum: [
          '❓ Apakah grafik statistik (pie chart, bar chart) juga mengikuti skema warna yang dipilih — belum terlihat di tangkapan layar asli.',
          '❓ Apakah Bag.B mengubah warna total bersih (surplus/defisit) juga — belum dikonfirmasi.',
        ],
      },
    },
    bukti: [
      { group: 'TA01b-setelan-asli', file: 'real-warna-pendapatan-pengeluaran.png', cap: 'Penjelasan + Bag.A/Bag.B' },
    ],
  },
  {
    id: 'T-18',
    prdId: 'PRD-P-14',
    slug: 'setelan-masukan-waktu',
    title: 'Setelan "Masukan waktu" (enam mode)',
    kategori: 'Setelan · input',
    prioritas: 'Medium',
    parent: 'Lainnya → Kelola pengaturan',
    masuk: 'Lainnya → Kelola pengaturan → Masukan waktu',
    ringkas:
      'Aplikasi asli punya enam mode penanganan waktu saat mencatat transaksi: tidak dipakai, ' +
      'ditampilkan di daftar, atau hanya untuk input — masing-masing dengan urutan menurun/naik. ' +
      'fin-app tidak punya setelan ini.',
    mm: [
      'Enam pilihan: `Tidak ada, urutkan menurun`, `Tidak ada, urutkan naik`, `Tampilkan di daftar, urut menurun`, `Tampilkan di daftar, urut naik`, `Hanya input, urutkan turun`, `Hanya input, urutkan naik`.',
      'Nilai teramati: `Tidak ada, urutkan menurun`.',
    ],
    fin: ['Tidak ada setelan ini (❓ tidak ditemukan).'],
    dampak: 'Transaksi tidak punya dimensi waktu yang bisa diurutkan seperti di aplikasi asli.',
    butuhPRD: true,
    prd: {
      deskripsi:
        'Menambahkan setelan masukan waktu pada fin-app: pengguna memilih apakah kolom waktu ' +
        'pada formulir transaksi tidak ada, hanya untuk input, atau juga ditampilkan di daftar — ' +
        'dan menentukan arah pengurutan transaksi berdasarkan waktu.',
      tujuan: [
        'Pengguna yang ingin mencatat jam transaksi dapat mengaktifkan kolom waktu.',
        'Pengguna yang tidak membutuhkan waktu tidak terganggu oleh kolom tambahan.',
        'Urutan transaksi dalam satu hari dapat disesuaikan: terbaru di atas atau terlama di atas.',
      ],
      alur:
        'Lainnya → Kelola pengaturan → Masukan waktu →\n' +
        '  ├─ Tidak ada, urutkan menurun\n' +
        '  ├─ Tidak ada, urutkan naik\n' +
        '  ├─ Tampilkan di daftar, urut menurun\n' +
        '  ├─ Tampilkan di daftar, urut naik\n' +
        '  ├─ Hanya input, urutkan turun\n' +
        '  └─ Hanya input, urutkan naik',
      userStory: [
        { prio: 'Medium', role: 'pengguna yang mencatat waktu transaksi', want: 'menyalakan kolom waktu dan memilih urutan tampilnya di daftar', so: 'saya dapat melihat transaksi berurutan sesuai jam kejadian' },
        { prio: 'Rendah', role: 'pengguna yang tidak butuh waktu', want: 'memastikan kolom waktu tidak muncul di formulir', so: 'formulir transaksi tetap ringkas' },
      ],
      struktur:
        'Layar Masukan waktu (enam pilihan):\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  Masukan waktu                               │\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  ◉ Tidak ada, urutkan menurun                │\n' +
        '│  ○ Tidak ada, urutkan naik                   │\n' +
        '│  ○ Tampilkan di daftar, urut menurun         │\n' +
        '│  ○ Tampilkan di daftar, urut naik            │\n' +
        '│  ○ Hanya input, urutkan turun                │\n' +
        '│  ○ Hanya input, urutkan naik                 │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Mode tampilan waktu',
          tipe: 'pilihan radio tiga nilai',
          fungsi: 'Menentukan apakah kolom waktu muncul di formulir input saja, di daftar juga, atau tidak sama sekali.',
          opsi: 'Tidak ada / Tampilkan di daftar / Hanya input',
          default: 'Tidak ada',
          perilaku:
            '"Tidak ada": formulir tidak memiliki kolom waktu. "Hanya input": kolom ada di formulir ' +
            'tapi jam tidak ditampilkan di baris daftar. "Tampilkan di daftar": kolom ada di formulir ' +
            'dan jam terlihat di setiap baris daftar transaksi.',
        },
        {
          nama: 'Arah pengurutan per hari',
          tipe: 'pilihan dua arah',
          fungsi: 'Menentukan urutan transaksi dalam satu hari: terbaru di atas atau terlama di atas.',
          opsi: 'Menurun (terbaru di atas) / Naik (terlama di atas)',
          default: 'Menurun',
          perilaku: 'Berlaku pada semua tampilan daftar transaksi dalam satu hari.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Layar "Masukan waktu" menyediakan enam pilihan yang menggabungkan mode tampilan dan arah urutan.' },
        { id: 'FR-02', teks: 'Saat mode "Tampilkan di daftar" atau "Hanya input", formulir transaksi memiliki kolom jam dengan pemilih waktu.' },
        { id: 'FR-03', teks: 'Saat mode "Tampilkan di daftar", baris daftar transaksi menampilkan jam di samping tanggal.' },
        { id: 'FR-04', teks: 'Arah pengurutan berlaku pada semua tampilan daftar transaksi dalam satu hari.' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Kompatibilitas: transaksi lama tanpa data waktu tidak error; jam ditampilkan kosong atau sebagai "--".' },
        { id: 'NFR-02', teks: 'Konsistensi: semua tampilan daftar (harian, kalender, pencarian) menggunakan urutan yang sama.' },
      ],
      interaksi: {
        navigasi: 'Lainnya → Kelola pengaturan → Masukan waktu.',
        simpan: 'Nilai tersimpan segera saat pengguna memilih opsi.',
        validasi: 'Hanya enam pilihan tetap; tidak ada masukan bebas.',
      },
      teramati: [
        'Asli: enam pilihan mode waktu; nilai teramati "Tidak ada, urutkan menurun" (bukti `real-masukan-waktu.png`).',
        'fin-app: tidak ada setelan masukan waktu; tidak ditemukan di seluruh direktori (dari array `fin` T-18).',
      ],
      skema:
        'Dua kunci setelan baru:\n\n' +
        '```\n' +
        'settings.set("time_input_mode", "none")  // none | list | input_only\n' +
        'settings.set("time_sort_dir",   "desc")  // desc | asc\n' +
        '```\n\n' +
        'Kolom `TIME` perlu ditambahkan ke tabel transaksi bila belum ada.',
      default: '"Tidak ada, urutkan menurun" — sesuai nilai teramati di aplikasi asli.',
      alurData:
        'Pengguna pilih mode → settings.set(time_input_mode, time_sort_dir)\n' +
        '→ transaction-form membaca mode → menampilkan/menyembunyikan kolom waktu\n' +
        '→ transaction-list membaca mode dan arah → mengurut dan menampilkan jam.',
      error: [
        { id: 'E-01', teks: 'Kolom TIME belum ada di database lama → migrasi tambah kolom nullable tanpa merusak data yang ada.' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Transaksi dicatat tanpa waktu (mode "Tidak ada") lalu mode diubah ke "Tampilkan di daftar" → jam transaksi lama ditampilkan sebagai "--".' },
        { id: 'EC-02', teks: 'Beberapa transaksi dalam satu hari punya jam yang sama → urutan stabil mengikuti urutan ID masuk.' },
      ],
      internal: [
        { teks: '`components/transaction-form.tsx` — formulir transaksi tempat kolom waktu perlu ditambahkan.' },
        { teks: '`components/transaction-list.tsx` — daftar transaksi tempat jam dan urutan dirender.' },
        { teks: '`lib/db.ts` — tabel transaksi; perlu kolom `TIME` nullable.' },
      ],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Aktifkan "Tampilkan di daftar, urut naik", catat dua transaksi dengan jam berbeda, lalu periksa bahwa jam tampil dan transaksi terlama ada di atas.',
      metrics: [
        { teks: 'Kolom waktu muncul/hilang di formulir sesuai mode yang dipilih.' },
        { teks: 'Urutan baris dalam satu hari sesuai arah yang dipilih.' },
      ],
      verifikasi: {
        ok: [
          'Asli: enam pilihan ada pada layar; nilai teramati "Tidak ada, urutkan menurun" (bukti `real-masukan-waktu.png`).',
          'fin-app: tidak ada setelan, kolom waktu, atau logika pengurutan per jam di seluruh kode.',
        ],
        belum: [
          '❓ Apakah jam disimpan sebagai string (mis. "21:00") atau timestamp unix — format penyimpanan belum dikonfirmasi dari aplikasi asli.',
          '❓ Apakah "Hanya input" menyembunyikan jam dari daftar tetapi masih menyimpannya untuk keperluan pengurutan.',
        ],
      },
    },
    bukti: [
      { group: 'TA01b-setelan-asli', file: 'real-masukan-waktu.png', cap: 'Enam pilihan mode waktu' },
    ],
  },
  {
    id: 'T-19',
    prdId: 'PRD-P-15',
    slug: 'setelan-tampilkan-deskripsi',
    title: 'Setelan "Tampilkan deskripsi"',
    kategori: 'Setelan · tampilan',
    prioritas: 'Low',
    parent: 'Lainnya → Kelola pengaturan',
    masuk: 'Lainnya → Kelola pengaturan → Tampilkan deskripsi',
    ringkas: 'Aplikasi asli bisa menyalakan/mematikan kolom deskripsi. fin-app tidak menyediakannya.',
    mm: ['Pilihan `Mati` / `Aktif`; nilai teramati `Mati`.'],
    fin: ['Tidak ada setelan ini (❓ tidak ditemukan).'],
    dampak: 'Susunan kolom daftar transaksi berbeda bila pengguna menyalakannya di aplikasi asli.',
    butuhPRD: true,
    prd: {
      deskripsi:
        'Menambahkan setelan "Tampilkan deskripsi" pada fin-app: saklar yang mengaktifkan ' +
        'kolom deskripsi tambahan pada formulir dan daftar transaksi, sesuai aplikasi asli.',
      tujuan: [
        'Pengguna yang ingin mencatat keterangan panjang pada setiap transaksi dapat mengaktifkan kolom deskripsi.',
        'Pengguna yang tidak butuh kolom tambahan tidak terganggu oleh kolom kosong di setiap baris.',
      ],
      alur:
        'Lainnya → Kelola pengaturan → Tampilkan deskripsi →\n' +
        '  ├─ Mati  → formulir transaksi tidak memiliki kolom deskripsi\n' +
        '  └─ Aktif → formulir memiliki kolom deskripsi; daftar menampilkan deskripsi bila ada',
      userStory: [
        { prio: 'Rendah', role: 'pengguna yang ingin mencatat konteks transaksi', want: 'mengaktifkan kolom deskripsi', so: 'setiap transaksi bisa memiliki catatan panjang di luar nama kategori' },
      ],
      struktur:
        'Layar setelan Tampilkan deskripsi:\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  Tampilkan deskripsi                         │\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  ○ Mati   ◉ Aktif                            │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Saklar Tampilkan deskripsi',
          tipe: 'pilihan dua keadaan',
          fungsi: 'Mengaktifkan atau menonaktifkan kolom deskripsi pada formulir dan daftar transaksi.',
          opsi: 'Mati / Aktif',
          default: 'Mati',
          perilaku:
            'Saat Aktif: formulir transaksi memiliki kolom deskripsi teks bebas; baris daftar ' +
            'menampilkan deskripsi di bawah nama kategori bila terisi. Saat Mati: kolom tidak ada.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Layar setelan "Tampilkan deskripsi" menyediakan pilihan Mati / Aktif.' },
        { id: 'FR-02', teks: 'Saat Aktif, formulir transaksi menampilkan kolom deskripsi teks bebas.' },
        { id: 'FR-03', teks: 'Saat Aktif, baris daftar transaksi menampilkan deskripsi di bawah nama kategori bila kolom terisi.' },
        { id: 'FR-04', teks: 'Mematikan setelan tidak menghapus deskripsi yang sudah tersimpan; hanya menyembunyikan tampilannya.' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Kompatibilitas: transaksi lama tanpa deskripsi tidak menampilkan baris kosong saat setelan Aktif.' },
        { id: 'NFR-02', teks: 'Kinerja: kolom deskripsi tidak memperlambat rendering daftar panjang.' },
      ],
      interaksi: {
        navigasi: 'Lainnya → Kelola pengaturan → Tampilkan deskripsi.',
        simpan: 'Nilai tersimpan segera saat pengguna memilih opsi.',
        validasi: 'Hanya dua pilihan; tidak ada masukan bebas.',
      },
      teramati: [
        'Asli: layar berisi pilihan Mati / Aktif; nilai teramati Mati (bukti `real-tampilkan-deskripsi.png`).',
        'fin-app: tidak ada setelan ini; tidak ditemukan di seluruh direktori (dari array `fin` T-19).',
      ],
      skema:
        'Satu kunci setelan dan kolom opsional di tabel transaksi:\n\n' +
        '```\n' +
        'settings.set("show_description", false)  // false | true\n' +
        '// Kolom DESCRIPTION mungkin sudah ada di tabel transactions;\n' +
        '// perlu diperiksa.\n' +
        '```',
      default: 'Mati (sesuai nilai teramati di aplikasi asli).',
      alurData:
        'Pengguna pilih Aktif → settings.set(show_description, true)\n' +
        '→ transaction-form menampilkan kolom deskripsi\n' +
        '→ transaction-list membaca field DESCRIPTION dan menampilkannya.',
      error: [
        { id: 'E-01', teks: 'Kolom DESCRIPTION belum ada di database → migrasi tambah kolom nullable TEXT.' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Pengguna mengisi deskripsi lalu mematikan setelan → deskripsi tersimpan tapi tidak tampil; menyalakan kembali mengembalikan tampilannya.' },
        { id: 'EC-02', teks: 'Deskripsi sangat panjang → potong dengan elipsis di daftar; formulir memperbolehkan teks penuh.' },
      ],
      internal: [
        { teks: '`components/transaction-form.tsx` — formulir transaksi tempat kolom deskripsi perlu ditambahkan secara kondisional.' },
        { teks: '`components/transaction-list.tsx` — daftar transaksi tempat deskripsi perlu ditampilkan di bawah nama kategori.' },
        { teks: '`lib/db.ts` — tabel transaksi; perlu kolom `DESCRIPTION` nullable.' },
      ],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Aktifkan setelan, catat transaksi dengan deskripsi, lalu periksa bahwa deskripsi muncul di baris daftar.',
      metrics: [
        { teks: 'Kolom deskripsi muncul/hilang di formulir sesuai setelan.' },
        { teks: 'Deskripsi tampil di baris daftar saat setelan Aktif dan kolom terisi.' },
      ],
      verifikasi: {
        ok: [
          'Asli: layar setelan ada dengan pilihan Mati/Aktif; nilai teramati Mati (bukti `real-tampilkan-deskripsi.png`).',
          'fin-app: tidak ada setelan maupun kolom deskripsi yang terlihat di formulir transaksi.',
        ],
        belum: [
          '❓ Apakah deskripsi berbeda dengan kolom "catatan/memo" yang mungkin sudah ada — perlu cek skema database fin-app.',
          '❓ Apakah setelan Aktif juga menampilkan deskripsi di sub-tab Kalender atau hanya di daftar Harian.',
        ],
      },
    },
    bukti: [{ group: 'TA01b-setelan-asli', file: 'real-tampilkan-deskripsi.png', cap: 'Pilihan Mati/Aktif' }],
  },
  {
    id: 'T-20',
    prdId: 'PRD-P-16',
    slug: 'setelan-autofill-riwayat',
    title: 'Setelan "Autofill riwayat" (+ Mulai ulang)',
    kategori: 'Setelan · input',
    prioritas: 'Medium',
    parent: 'Lainnya → Kelola pengaturan',
    masuk: 'Lainnya → Kelola pengaturan → Autofill riwayat',
    ringkas:
      'Aplikasi asli mengisi otomatis kolom transaksi dari riwayat, dan menyediakan tombol ' +
      '`Mulai ulang (Cadangkan/Pemulihan)` untuk membersihkan riwayat autofill. fin-app tidak punya.',
    mm: [
      'Pilihan `Mati` / `Aktif`; nilai teramati `Aktif`.',
      'Tersedia aksi `Mulai ulang (Cadangkan/Pemulihan)`.',
    ],
    fin: ['Tidak ada setelan ini (❓ tidak ditemukan).'],
    dampak: 'Pencatatan transaksi berulang jadi lebih lambat dibanding aplikasi asli.',
    butuhPRD: true,
    prd: {
      deskripsi:
        'Menambahkan fitur autofill riwayat pada formulir transaksi fin-app: kolom jumlah, ' +
        'kategori, dan catatan terisi otomatis berdasarkan transaksi serupa sebelumnya, ' +
        'disertai tombol "Mulai ulang" untuk membersihkan cache riwayat autofill.',
      tujuan: [
        'Pengguna yang mencatat transaksi berulang (misalnya tagihan bulanan) tidak perlu mengisi ulang seluruh formulir.',
        'Riwayat autofill dapat dibersihkan tanpa menghapus data transaksi.',
      ],
      alur:
        'Lainnya → Kelola pengaturan → Autofill riwayat →\n' +
        '  ├─ Pilih Mati / Aktif\n' +
        '  └─ Tekan "Mulai ulang (Cadangkan/Pemulihan)" → cache autofill dikosongkan',
      userStory: [
        { prio: 'Medium', role: 'pengguna yang sering mencatat transaksi berulang', want: 'formulir terisi otomatis dari riwayat serupa', so: 'saya cukup memeriksa dan menyimpan tanpa mengetik ulang' },
        { prio: 'Rendah', role: 'pengguna yang ingin autofill bersih', want: 'menghapus cache riwayat autofill', so: 'saran lama yang tidak relevan tidak muncul lagi' },
      ],
      struktur:
        'Layar setelan Autofill riwayat:\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  Autofill riwayat                            │\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  ○ Mati   ◉ Aktif                            │\n' +
        '│  [ Mulai ulang (Cadangkan/Pemulihan) ]       │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Saklar autofill',
          tipe: 'pilihan dua keadaan',
          fungsi: 'Mengaktifkan atau menonaktifkan pengisian otomatis formulir dari riwayat.',
          opsi: 'Mati / Aktif',
          default: 'Aktif',
          perilaku:
            'Saat Aktif: saat pengguna membuka formulir transaksi, aplikasi mencocokkan ' +
            'tanggal/hari dengan riwayat dan mengisi kolom serupa. Saat Mati: formulir selalu kosong.',
        },
        {
          nama: 'Tombol Mulai ulang',
          tipe: 'aksi',
          fungsi: 'Menghapus cache riwayat yang dipakai autofill.',
          opsi: 'Konfirmasi sebelum menghapus',
          default: 'Cache kosong pada awal pemasangan',
          perilaku: 'Menekan tombol memunculkan konfirmasi; setelah disetujui cache autofill dikosongkan. Data transaksi tidak terpengaruh.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Layar "Autofill riwayat" menyediakan pilihan Mati/Aktif dan tombol "Mulai ulang (Cadangkan/Pemulihan)".' },
        { id: 'FR-02', teks: 'Saat Aktif, formulir transaksi menampilkan saran isian dari riwayat serupa; pengguna dapat mengabaikan atau menerima saran.' },
        { id: 'FR-03', teks: 'Tombol "Mulai ulang" mengosongkan cache autofill setelah konfirmasi; data transaksi tetap utuh.' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Privasi: cache autofill disimpan lokal di basis data perangkat, tidak dikirim ke server eksternal.' },
        { id: 'NFR-02', teks: 'Kinerja: pencarian riwayat untuk autofill selesai dalam waktu yang tidak terasa oleh pengguna (<100ms untuk 1000 entri).' },
      ],
      interaksi: {
        navigasi: 'Lainnya → Kelola pengaturan → Autofill riwayat.',
        simpan: 'Nilai Mati/Aktif tersimpan segera; tombol Mulai ulang langsung beraksi setelah konfirmasi.',
        validasi: 'Hanya dua pilihan dan satu aksi; tidak ada masukan bebas.',
      },
      teramati: [
        'Asli: pilihan Mati/Aktif, nilai teramati Aktif, tombol "Mulai ulang (Cadangkan/Pemulihan)" (bukti `real-autofill-riwayat.png`).',
        'fin-app: tidak ada setelan autofill; formulir transaksi selalu kosong saat dibuka (dari array `fin` T-20).',
      ],
      skema:
        'Satu kunci setelan dan tabel cache baru:\n\n' +
        '```\n' +
        'settings.set("autofill_history", true)\n' +
        'autofill_cache: { DATE_KEY, CATEGORY_ID, AMOUNT, NOTE, LAST_USED }\n' +
        '```',
      default: 'Aktif (sesuai nilai teramati di aplikasi asli).',
      alurData:
        'Buka formulir → (Aktif) query autofill_cache(DATE_KEY) → tampilkan saran\n' +
        '→ simpan transaksi → update autofill_cache.',
      error: [
        { id: 'E-01', teks: 'Cache kosong atau tidak ada data cocok → formulir tetap kosong tanpa pesan kesalahan.' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Mulai ulang cache lalu langsung mencatat transaksi → formulir kosong; entri baru menjadi cache pertama.' },
        { id: 'EC-02', teks: 'Mode Mati saat ada data di cache → cache tidak dihapus, hanya tidak dipakai; menyalakan kembali langsung menggunakan cache yang ada.' },
      ],
      internal: [
        { teks: '`components/transaction-form.tsx` — formulir transaksi; perlu logika baca cache dan tampilkan saran.' },
        { teks: '`lib/db.ts` — perlu tabel `autofill_cache` baru.' },
      ],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Aktifkan autofill, catat satu transaksi, buka formulir baru di tanggal yang sama, dan periksa bahwa kolom terisi otomatis sesuai riwayat.',
      metrics: [
        { teks: 'Formulir terisi otomatis saat ada riwayat cocok dan setelan Aktif.' },
        { teks: 'Cache kosong setelah tombol Mulai ulang ditekan dan dikonfirmasi.' },
      ],
      verifikasi: {
        ok: [
          'Asli: layar ada dengan Mati/Aktif (nilai Aktif) dan tombol Mulai ulang (bukti `real-autofill-riwayat.png`).',
          'fin-app: tidak ada setelan maupun logika autofill di kode yang ditemukan.',
        ],
        belum: [
          '❓ Kriteria pencocokan riwayat: apakah berdasarkan hari, kategori, atau kombinasi keduanya — belum diuji di aplikasi asli.',
          '❓ Apakah autofill menawarkan beberapa pilihan atau hanya mengisi satu pilihan terbaik.',
        ],
      },
    },
    bukti: [{ group: 'TA01b-setelan-asli', file: 'real-autofill-riwayat.png', cap: 'Pilihan + aksi Mulai ulang' }],
  },
  {
    id: 'T-21',
    prdId: 'PRD-P-17',
    slug: 'setelan-urutan-masuk',
    title: 'Setelan "Urutan masuk": Dari jumlah / Dari aset',
    kategori: 'Setelan · input',
    prioritas: 'Medium',
    parent: 'Lainnya → Kelola pengaturan',
    masuk: 'Lainnya → Kelola pengaturan → Urutan masuk',
    ringkas:
      'Aplikasi asli menentukan urutan langkah saat mencatat transaksi: masukkan jumlah dulu ' +
      'atau pilih aset dulu. fin-app tidak menyediakannya.',
    mm: ['Dua pilihan: `Dari jumlah`, `Dari aset`; nilai teramati `Dari jumlah`.'],
    fin: ['Tidak ada setelan ini (❓ tidak ditemukan).'],
    dampak: 'Alur pengisian formulir transaksi berbeda dari aplikasi asli — terlihat di setiap tahap CRUD transaksi.',
    butuhPRD: true,
    prd: {
      deskripsi:
        'Menambahkan setelan urutan langkah pengisian formulir transaksi: apakah pengguna ' +
        'memasukkan jumlah uang lebih dulu atau memilih aset lebih dulu saat formulir dibuka, ' +
        'meniru setelan "Urutan masuk" pada aplikasi asli.',
      tujuan: [
        'Alur pengisian formulir transaksi dapat disesuaikan dengan kebiasaan mental pengguna.',
        'Fokus input pertama saat formulir dibuka diarahkan ke kolom yang sesuai dengan setelan.',
      ],
      alur:
        'Lainnya → Kelola pengaturan → Urutan masuk →\n' +
        '  ├─ Pilih "Dari jumlah" → formulir transaksi fokus ke keypad/kolom jumlah duluan\n' +
        '  └─ Pilih "Dari aset"   → formulir transaksi membuka pemilih aset duluan',
      userStory: [
        { prio: 'Medium', role: 'pengguna yang terbiasa memilih dompet dulu sebelum jumlah', want: 'formulir langsung meminta aset duluan', so: 'alur pengisian mengalir alami tanpa harus melompati kolom jumlah' },
        { prio: 'Rendah', role: 'pengguna yang mencatat transaksi cepat', want: 'jumlah uang menjadi langkah pertama', so: 'saya bisa langsung mengetik nominalnya' },
      ],
      struktur:
        'Layar setelan Urutan masuk:\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  Urutan masuk                                │\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  ◉ Dari jumlah                               │\n' +
        '│  ○ Dari aset                                 │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Pilihan urutan masuk',
          tipe: 'pilihan dua arah',
          fungsi: 'Menentukan kolom pertama yang menerima fokus saat formulir transaksi dibuka.',
          opsi: 'Dari jumlah / Dari aset',
          default: 'Dari jumlah',
          perilaku:
            '"Dari jumlah": keypad atau kolom input nominal aktif pertama kali. ' +
            '"Dari aset": pemilih aset dibuka otomatis atau mendapat fokus pertama.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Layar setelan "Urutan masuk" menyediakan pilihan "Dari jumlah" dan "Dari aset".' },
        { id: 'FR-02', teks: 'Saat "Dari jumlah" dipilih, membuka formulir transaksi memfokuskan kolom nominal/keypad terlebih dahulu.' },
        { id: 'FR-03', teks: 'Saat "Dari aset" dipilih, membuka formulir transaksi memfokuskan atau membuka pemilih aset terlebih dahulu.' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Aksesibilitas: fokus keyboard otomatis diatur tanpa mengacaukan pembaca layar.' },
        { id: 'NFR-02', teks: 'Responsif: pemilihan urutan tidak menambah waktu tunggu saat membuka formulir transaksi.' },
      ],
      interaksi: {
        navigasi: 'Lainnya → Kelola pengaturan → Urutan masuk.',
        simpan: 'Nilai tersimpan segera saat pengguna memilih salah satu opsi.',
        validasi: 'Hanya dua opsi; tidak ada masukan bebas.',
      },
      teramati: [
        'Asli: dua pilihan "Dari jumlah" dan "Dari aset"; nilai teramati "Dari jumlah" (bukti `real-urutan-masuk.png`).',
        'fin-app: tidak ada setelan urutan masuk di seluruh kode (dari array `fin` T-21).',
      ],
      skema:
        'Satu kunci setelan baru:\n\n' +
        '```\n' +
        'settings.set("input_order", "amount")  // amount | asset\n' +
        '```\n\n' +
        '`components/transaction-form.tsx` membaca nilai ini saat inisialisasi fokus.',
      default: '"Dari jumlah" (sesuai nilai teramati di aplikasi asli).',
      alurData:
        'Pengguna pilih urutan → settings.set(input_order)\n' +
        '→ transaction-form membaca saat mount → autoFocus diarahkan ke kolom yang dipilih.',
      error: [
        { id: 'E-01', teks: 'Nilai setelan tidak dikenal → pakai bawaan "Dari jumlah".' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Mode "Dari aset" tetapi pengguna belum punya aset terdaftar → jatuh balik ke fokus jumlah.' },
        { id: 'EC-02', teks: 'Membuka formulir dari pintasan edit (bukan tambah baru) → urutan masuk tidak berlaku; fokus tetap pada nilai yang ada.' },
      ],
      internal: [
        { teks: '`components/transaction-form.tsx` — formulir transaksi tempat fokus awal ditentukan.' },
        { teks: '`lib/db.ts` — tabel setelan untuk menyimpan `input_order`.' },
      ],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Pilih "Dari aset", buka formulir tambah transaksi baru, pastikan pemilih aset yang menerima fokus pertama.',
      metrics: [
        { teks: 'Elemen yang pertama kali menerima fokus sesuai dengan setelan urutan masuk.' },
      ],
      verifikasi: {
        ok: [
          'Asli: layar ada dengan dua pilihan Dari jumlah dan Dari aset; nilai teramati Dari jumlah (bukti `real-urutan-masuk.png`).',
          'fin-app: formulir transaksi selalu membuka dengan urutan default tetap tanpa setelan.',
        ],
        belum: [
          '❓ Apakah "Dari aset" di aplikasi asli membuka bottom-sheet pemilih aset secara otomatis atau hanya memberi highlight — belum diuji.',
        ],
      },
    },
    bukti: [{ group: 'TA01b-setelan-asli', file: 'real-urutan-masuk.png', cap: 'Pilihan Dari jumlah / Dari aset' }],
  },
  {
    id: 'T-22',
    prdId: 'PRD-P-18',
    slug: 'setelan-tombol-memo',
    title: 'Setelan "Pengaturan tombol memo"',
    kategori: 'Setelan · tampilan',
    prioritas: 'Low',
    parent: 'Lainnya → Kelola pengaturan',
    masuk: 'Lainnya → Kelola pengaturan → Pengaturan tombol memo',
    ringkas:
      'Aplikasi asli bisa menampilkan/menyembunyikan tombol memo di tab Transaksi. fin-app selalu ' +
      'menampilkan sub-tab Memo.',
    mm: [
      'Layar berisi keterangan `Tampilikan tombol memo di tab Transaksi`.',
      'Pilihan `Mati` / `Aktif`; nilai teramati `Mati`.',
    ],
    fin: ['Tidak ada setelan ini; sub-tab `Memo` selalu ada (`components/transaksi-screen.tsx`, `VIEWS`).'],
    dampak: 'Bila aplikasi asli menyembunyikan tombol memo, jumlah sub-tab kedua sisi berbeda.',
    butuhPRD: true,
    prd: {
      deskripsi:
        'Menambahkan setelan untuk menampilkan atau menyembunyikan tombol/sub-tab Memo pada ' +
        'layar Transaksi fin-app, mengikuti layar "Pengaturan tombol memo" pada aplikasi asli.',
      tujuan: [
        'Pengguna yang tidak memakai fitur memo dapat menyembunyikan sub-tab Memo agar tampilan lebih ringkas.',
        'Jumlah sub-tab di tab Transaksi dapat disamakan dengan aplikasi asli saat pengujian paritas.',
      ],
      alur:
        'Lainnya → Kelola pengaturan → Pengaturan tombol memo →\n' +
        '  ├─ Mati  → sub-tab Memo disembunyikan dari tab Transaksi\n' +
        '  └─ Aktif → sub-tab Memo ditampilkan (perilaku fin-app saat ini)',
      userStory: [
        { prio: 'Rendah', role: 'pengguna yang tidak menggunakan memo', want: 'menyembunyikan sub-tab Memo dari tab Transaksi', so: 'navigasi lebih fokus hanya pada Harian dan Kalender' },
      ],
      struktur:
        'Layar setelan Pengaturan tombol memo:\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  Pengaturan tombol memo                      │\n' +
        '│  Tampilkan tombol memo di tab Transaksi      │\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  ◉ Mati   ○ Aktif                            │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Saklar tombol memo',
          tipe: 'pilihan dua keadaan',
          fungsi: 'Menentukan apakah sub-tab Memo dirender pada bilah tab Transaksi.',
          opsi: 'Mati / Aktif',
          default: 'Mati',
          perilaku:
            '"Mati": sub-tab Memo tidak dirender di `components/transaksi-screen.tsx`. ' +
            '"Aktif": sub-tab Memo dirender di antara sub-tab yang ada.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Layar "Pengaturan tombol memo" menyediakan keterangan dan pilihan Mati / Aktif.' },
        { id: 'FR-02', teks: 'Bila Mati, sub-tab Memo tidak muncul di deretan tab pada layar Transaksi.' },
        { id: 'FR-03', teks: 'Bila Aktif, sub-tab Memo muncul seperti perilaku fin-app saat ini.' },
        { id: 'FR-04', teks: 'Menyembunyikan sub-tab Memo tidak menghapus catatan memo yang sudah ada.' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Keselamatan data: data memo di basis data tetap utuh saat tombol disembunyikan.' },
        { id: 'NFR-02', teks: 'Responsif: perubahan setelan langsung terlihat pada tab Transaksi tanpa memuat ulang aplikasi.' },
      ],
      interaksi: {
        navigasi: 'Lainnya → Kelola pengaturan → Pengaturan tombol memo.',
        simpan: 'Nilai tersimpan segera saat pengguna memilih Mati atau Aktif.',
        validasi: 'Hanya dua pilihan; tidak ada masukan bebas.',
      },
      teramati: [
        'Asli: layar berisi keterangan "Tampilkan tombol memo di tab Transaksi", pilihan Mati/Aktif, nilai teramati Mati (bukti `real-pengaturan-tombol-memo.png`).',
        'fin-app: sub-tab Memo selalu ada di `components/transaksi-screen.tsx` (`VIEWS`); tidak ada setelan (dari array `fin` T-22).',
      ],
      skema:
        'Satu kunci setelan baru:\n\n' +
        '```\n' +
        'settings.set("show_memo_tab", false)  // false | true\n' +
        '```\n\n' +
        '`components/transaksi-screen.tsx` menyaring array `VIEWS` berdasarkan nilai ini.',
      default: 'Mati (sesuai nilai teramati di aplikasi asli). Catatan: fin-app saat ini default Aktif.',
      alurData:
        'Pengguna ubah pilihan → settings.set(show_memo_tab)\n' +
        '→ transaksi-screen.tsx membaca setelan → menyaring VIEWS → bilah sub-tab dicetak ulang.',
      error: [
        { id: 'E-01', teks: 'Nilai setelan tidak dikenal → pakai bawaan Mati.' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Pengguna sedang berada di sub-tab Memo saat mematikan fitur ini dari setelan → alihkan sub-tab aktif ke Harian.' },
        { id: 'EC-02', teks: 'Ada data memo tersimpan saat sub-tab disembunyikan → data tetap bisa diakses kembali saat fitur dinyalakan lagi.' },
      ],
      internal: [
        { teks: '`components/transaksi-screen.tsx` — tempat array `VIEWS` didefinisikan secara tetap.' },
        { teks: '`lib/db.ts` — tabel setelan untuk menyimpan `show_memo_tab`.' },
      ],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Ubah setelan ke Mati, buka tab Transaksi, pastikan sub-tab Memo tidak ada di bilah navigasi.',
      metrics: [
        { teks: 'Sub-tab Memo hadir atau absen di tab Transaksi sesuai nilai setelan.' },
      ],
      verifikasi: {
        ok: [
          'Asli: layar setelan ada dengan keterangan dan pilihan Mati/Aktif, nilai teramati Mati (bukti `real-pengaturan-tombol-memo.png`).',
          'fin-app: `VIEWS` di `components/transaksi-screen.tsx` selalu memuat Memo secara tetap tanpa kondisi.',
        ],
        belum: [
          '❓ Apakah di aplikasi asli ada jalan pintas lain untuk membuka memo jika tombol di tab Transaksi dimatikan — belum diuji.',
        ],
      },
    },
    bukti: [{ group: 'TA01b-setelan-asli', file: 'real-pengaturan-tombol-memo.png', cap: 'Keterangan + Mati/Aktif' }],
  },
  {
    id: 'T-23',
    prdId: 'PRD-P-19',
    slug: 'setelan-fungsi-sub-kategori',
    title: 'Saklar "Fungsi sub kategori": nilai bawaan berbeda (asli Aktif, fin Mati)',
    kategori: 'Setelan · kategori',
    prioritas: 'High',
    parent: 'Lainnya → Kelola pengaturan',
    masuk: 'Lainnya → Kelola pengaturan → Fungsi sub kategori',
    ringkas:
      'Kedua aplikasi punya saklar global sub-kategori di atas daftar kategori. Yang berbeda ' +
      'adalah **nilai bawaannya**: aplikasi asli sudah `Aktif` sejak awal sehingga daftar ' +
      'kategori langsung menampilkan sub-kategorinya, sedangkan fin-app mulai dari `Mati` ' +
      'sehingga daftar terlihat lebih ringkas. Cara mematikannya juga berbeda: aplikasi asli ' +
      'melalui halaman tersendiri di hub setelan, fin-app langsung dari saklar di daftar kategori.',
    mm: [
      'Ada halaman `Pengaturan sub kategori` di hub setelan, isinya penjelasan + pilihan `Mati` / `Aktif`.',
      'Nilai teramati `Aktif` — jadi ini nilai bawaan aplikasi, bukan hasil pengaturan pengulas.',
      'Saklar ini juga punya barisnya sendiri di hub `Kelola pengaturan`, jadi bisa dibuka dari dua tempat: hub setelan dan atas daftar kategori.',
      'Di layar kategori, saklar muncul sebagai baris `Fungsi sub kategori` beserta saklar merah, tanpa teks keadaan.',
      'Saat aktif, baris kategori menampilkan sub-kategori sebaris: `Food (4)` dengan `Lunch, Dinner, Eating out, Beverages` (lihat T-32 untuk keadaan saat mati).',
      'Ada aksi alihkan sub-kategori ↔ kategori utama (❓ belum diperiksa; dijadwalkan pada Tahap 3).',
    ],
    fin: [
      'Nilai bawaan saklar "Fungsi sub kategori" telah diselaraskan menjadi `Aktif` (\'1\') di `lib/db.ts` sejak instalasi awal (selesai 24 Oktober 2026).',
      'Pengguna baru langsung melihat struktur sub-kategori aktif secara otomatis, sama persis seperti aplikasi asli.',
    ],
    dampak:
      'Pengguna fin-app harus menyalakan saklar dulu sebelum sub-kategori terlihat, sedangkan di ' +
      'aplikasi asli sudah menyala. Ini yang membuat tangkapan layar kedua daftar kategori ' +
      'terlihat berbeda meski datanya sama. Langsung relevan untuk Tahap 2 dan Tahap 3.',
    selesai: '24 Oktober 2026',
    butuhPRD: true,
    prd: {
      deskripsi:
        'Menyelaraskan nilai bawaan saklar "Fungsi sub kategori" fin-app menjadi Aktif agar ' +
        'daftar kategori langsung menampilkan sub-kategori sejak awal seperti aplikasi asli, ' +
        'menghapus teks keadaan "Aktif/Mati" di samping saklar, dan menambahkan baris setelan ini ' +
        'ke hub Kelola pengaturan.',
      tujuan: [
        'Pengguna baru langsung melihat struktur sub-kategori tanpa harus menyalakan saklar secara manual.',
        'Tampilan saklar di atas daftar kategori bersih tanpa label status teks redundan.',
        'Fitur dapat diakses dari dua tempat: atas daftar kategori dan hub Kelola pengaturan.',
      ],
      alur:
        'Pintu 1: Kelola kategori → baris pertama "Fungsi sub kategori" → ketuk saklar\n' +
        'Pintu 2: Lainnya → Kelola pengaturan → Fungsi sub kategori → layar penjelasan + Mati/Aktif',
      userStory: [
        { prio: 'Tinggi', role: 'pengguna baru', want: 'melihat sub-kategori langsung di bawah nama kategori utama', so: 'saya tahu kategori makanan punya sub-kategori seperti makan siang dan makan malam' },
        { prio: 'Medium', role: 'penguji paritas', want: 'daftar kategori fin-app langsung cocok dengan aplikasi asli tanpa konfigurasi manual', so: 'tangkapan layar pengujian tidak berbeda tampilan' },
      ],
      struktur:
        'Baris saklar di atas daftar kategori (mengikuti aplikasi asli, tanpa teks Aktif/Mati):\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  ◯  Fungsi sub kategori               [🔘]   │  ← saklar tanpa teks keadaan\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  🍜 Food (4)                                 │\n' +
        '│      Lunch, Dinner, Eating out, Beverages    │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Nilai bawaan use_sub_category',
          tipe: 'konfigurasi basis data',
          fungsi: 'Menetapkan nilai awal saklar saat database pertama kali diinisialisasi.',
          opsi: "'1' (Aktif) / '0' (Mati)",
          default: "'1' (Aktif, diubah dari '0')",
          perilaku: 'Penyemaian basis data `lib/db.ts` menginisialisasi `use_sub_category` dengan nilai 1.',
        },
        {
          nama: 'Tampilan saklar baris kategori',
          tipe: 'tampilan',
          fungsi: 'Menampilkan saklar tanpa teks status Aktif/Mati di kanan baris.',
          opsi: 'Dengan teks / Tanpa teks',
          default: 'Tanpa teks (mengikuti aplikasi asli)',
          perilaku: 'Teks "Aktif" atau "Mati" dihapus dari JSX baris saklar di `category-list.tsx`. Keadaan cukup diwakili oleh posisi tombol saklar.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Nilai awal setelan `use_sub_category` di database disemai dengan Aktif (1).' },
        { id: 'FR-02', teks: 'Baris saklar "Fungsi sub kategori" di atas daftar kategori tidak menampilkan teks status "Aktif" atau "Mati".' },
        { id: 'FR-03', teks: 'Tersedia baris "Fungsi sub kategori" di hub Kelola pengaturan yang membuka layar penjelasan dengan pilihan Mati/Aktif.' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Konsistensi: keadaan saklar di layar kategori dan di layar setelan selalu tersinkronisasi.' },
        { id: 'NFR-02', teks: 'Aksesibilitas: elemen saklar tetap memiliki `aria-checked` dan `aria-label` yang benar walau teks visual dihilangkan.' },
      ],
      interaksi: {
        navigasi: 'Atas daftar kategori (langsung), atau Lainnya → Kelola pengaturan → Fungsi sub kategori.',
        simpan: 'Nilai tersimpan segera saat saklar diketuk.',
        validasi: 'Hanya dua keadaan (Aktif/Mati); tidak ada masukan bebas.',
      },
      teramati: [
        'Asli: nilai bawaan Aktif; baris saklar di daftar kategori tidak memiliki teks keadaan (bukti `real-fungsi-sub-kategori.png`, `real-01-daftar-pengeluaran.png`).',
        'fin-app: saklar ada di `category-list.tsx` tetapi disemai Mati (0) di `lib/db.ts`; ada teks "Aktif/Mati" di kanan baris (bukti `fin-01-daftar-pengeluaran.png`).',
      ],
      skema:
        'Penyemaian awal di `lib/db.ts` diubah dari 0 menjadi 1:\n\n' +
        '```\n' +
        '// Sebelum:\n' +
        'INSERT INTO settings (key, value) VALUES (\'use_sub_category\', \'0\');\n' +
        '// Sesudah:\n' +
        'INSERT INTO settings (key, value) VALUES (\'use_sub_category\', \'1\');\n' +
        '```',
      default: 'Aktif (1), sesuai nilai bawaan aplikasi asli.',
      alurData:
        'Ketuk saklar → setelan use_sub_category diperbarui di db\n' +
        '→ daftar kategori dirender ulang (sub-kategori tampil/sembunyi sesuai T-32).',
      error: [
        { id: 'E-01', teks: 'Gagal memperbarui setelan di basis data → kembalikan posisi saklar ke keadaan sebelumnya dan beri notifikasi ringan.' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Database sudah ada dari instalasi lama pengguna (dengan nilai 0) → migrasi tidak menimpa pilihan pengguna yang sudah ada; perubahan hanya berlaku untuk inisialisasi baru.' },
        { id: 'EC-02', teks: 'Kategori tidak punya sub-kategori → menyalakan saklar tidak memunculkan baris kedua kosong (sudah ditangani di T-32).' },
      ],
      internal: [
        { teks: '`components/category-list.tsx` — baris saklar `data-testid="sub-toggle"` dan teks status yang perlu dihapus.' },
        { teks: '`lib/db.ts` — inisialisasi awal nilai `use_sub_category`.' },
      ],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Reset database, buka daftar kategori, pastikan saklar sudah Aktif dan sub-kategori tampil sebaris tanpa teks status Aktif/Mati di sampingnya.',
      metrics: [
        { teks: 'Database baru langsung menginisialisasi use_sub_category = 1.' },
        { teks: 'Teks "Aktif" atau "Mati" tidak ada di samping tombol saklar pada category-list.' },
      ],
      verifikasi: {
        ok: [
          'Asli: saklar Aktif secara bawaan; tidak ada teks status di baris saklar (bukti `real-01-daftar-pengeluaran.png`).',
          'fin-app: `lib/db.ts` menyemai `use_sub_category` dengan \'0\'; `category-list.tsx` merender teks Aktif/Mati.',
        ],
        belum: [
          '❓ Aksi alihkan sub-kategori ↔ kategori utama di aplikasi asli: apakah ada di layar ini atau di tempat lain (dijadwalkan di Tahap 3).',
        ],
      },
    },
    bukti: [
      { group: 'TA01b-setelan-asli', file: 'real-fungsi-sub-kategori.png', cap: 'Layar setelan: penjelasan + Mati/Aktif' },
      { group: 'TA02-kategori', file: 'real-01-daftar-pengeluaran.png', cap: 'Asli: saklar sudah Aktif, sub-kategori tampil sebaris' },
      { group: 'TA02-kategori', file: 'real-05-saklar-sub-kategori-mati.png', cap: 'Asli: saklar dimatikan — nama kategori saja' },
      { group: 'TA02-kategori', file: 'fin-01-daftar-pengeluaran.png', cap: 'fin-app: saklar masih Mati, baris menampilkan teks keadaan' },
      { group: 'TA02-kategori', file: 'fin-05-saklar-sub-kategori.png', cap: 'fin-app: saklar dinyalakan — sub-kategori tampil sebaris, sama seperti asli' },
    ],
  },
  {
    id: 'T-24',
    prdId: 'PRD-P-20',
    slug: 'setelan-pintasan',
    title: 'Setelan "Pintasan" (bilah notifikasi)',
    kategori: 'Setelan · platform',
    prioritas: 'Low',
    parent: 'Lainnya → Kelola pengaturan',
    masuk: 'Lainnya → Kelola pengaturan → Pintasan',
    ringkas:
      'Aplikasi asli bisa menampilkan pintasan di bilah notifikasi Android. fin-app berjalan di ' +
      'peramban sehingga padanannya tidak langsung ada (mungkin PWA shortcut).',
    mm: [
      'Layar berisi keterangan `Menampilkan fitur pintasan di bilah notifikasi.`',
      'Pilihan `Mati` / `Aktif`; nilai teramati `Mati`.',
    ],
    fin: ['Tidak ada setelan ini (❓ tidak ditemukan).'],
    dampak: 'Tidak ada padanan langsung di web; perlu keputusan apakah dilewati atau diganti fitur PWA.',
    butuhPRD: true,
    prd: {
      deskripsi:
        'Menambahkan setelan pintasan notifikasi (atau padanan Web/PWA-nya pada fin-app): ' +
        'layar yang memungkinkan pengguna mengaktifkan pintasan cepat untuk mencatat transaksi ' +
        'baru langsung dari bilah notifikasi atau pintasan aplikasi (PWA shortcuts).',
      tujuan: [
        'Pengguna dapat mencatat transaksi dengan satu ketukan tanpa harus membuka aplikasi terlebih dahulu.',
        'Meniru fitur "Pintasan" di bilah notifikasi Android pada aplikasi asli, disesuaikan untuk lingkungan web/PWA.',
      ],
      alur:
        'Lainnya → Kelola pengaturan → Pintasan →\n' +
        '  ├─ Mati  → tidak ada pintasan aktif\n' +
        '  └─ Aktif → daftarkan pintasan PWA (Web App Manifest shortcuts) atau izin notifikasi sistem',
      userStory: [
        { prio: 'Rendah', role: 'pengguna mobile/PWA', want: 'memiliki pintasan catat cepat', so: 'saya dapat langsung membuka formulir transaksi baru dari beranda perangkat' },
      ],
      struktur:
        'Layar setelan Pintasan:\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  Pintasan                                    │\n' +
        '│  Menampilkan fitur pintasan di bilah        │\n' +
        '│  notifikasi.                                 │\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  ◉ Mati   ○ Aktif                            │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Saklar pintasan',
          tipe: 'pilihan dua keadaan',
          fungsi: 'Mengaktifkan atau menonaktifkan penyediaan pintasan cepat pencatatan transaksi.',
          opsi: 'Mati / Aktif',
          default: 'Mati',
          perilaku:
            '"Mati": tidak ada tindakan tambahan. "Aktif": aplikasi mendaftarkan shortcut ' +
            'di manifest PWA atau meminta izin notifikasi berkala bila didukung peramban.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Layar setelan "Pintasan" menyediakan keterangan dan pilihan Mati / Aktif.' },
        { id: 'FR-02', teks: 'Nilai tersimpan ke setelan aplikasi; bila Aktif, aplikasi mengonfigurasi pintasan PWA bila lingkungan mendukung.' },
        { id: 'FR-03', teks: 'Bila peramban tidak mendukung notifikasi atau pintasan sistem, tampilkan penjelasan ringan bahwa fitur ini memerlukan instalasi sebagai PWA.' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Platform-graceful: di peramban desktop yang tidak mendukung fitur ini, saklar tetap ada tetapi diberi keterangan batas kemampuan peramban.' },
        { id: 'NFR-02', teks: 'Keamanan: permintaan izin notifikasi hanya dipicu saat pengguna secara eksplisit memilih "Aktif".' },
      ],
      interaksi: {
        navigasi: 'Lainnya → Kelola pengaturan → Pintasan.',
        simpan: 'Nilai tersimpan segera saat pengguna memilih opsi.',
        validasi: 'Hanya dua pilihan; tidak ada masukan bebas.',
      },
      teramati: [
        'Asli: layar berisi keterangan "Menampilkan fitur pintasan di bilah notifikasi.", pilihan Mati/Aktif, nilai teramati Mati (bukti `real-pintasan.png`).',
        'fin-app: tidak ada setelan ini di seluruh kode (dari array `fin` T-24).',
      ],
      skema:
        'Satu kunci setelan baru:\n\n' +
        '```\n' +
        'settings.set("notification_shortcut", false)  // false | true\n' +
        '```',
      default: 'Mati (sesuai nilai teramati di aplikasi asli).',
      alurData:
        'Pengguna pilih Aktif → settings.set(notification_shortcut, true)\n' +
        '→ periksa dukungan PWA/notifikasi → aktifkan shortcut bila didukung.',
      error: [
        { id: 'E-01', teks: 'Peramban menolak izin notifikasi → kembalikan saklar ke Mati dan tampilkan penjelasan izin ditolak.' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Dibuka di peramban yang tidak mendukung service worker / notifikasi → tampilkan pesan informatif tanpa tombol menjadi error.' },
        { id: 'EC-02', teks: 'Aplikasi diinstal sebagai PWA → pintasan muncul di menu ikon aplikasi di beranda perangkat.' },
      ],
      internal: [
        { teks: '`lib/db.ts` — tabel setelan untuk menyimpan `notification_shortcut`.' },
      ],
      eksternal: [{ teks: 'Web Notification API / PWA Web App Manifest shortcuts.' }],
      testing: 'Pilih Aktif, periksa bahwa nilai tersimpan, dan pastikan tidak ada error di konsol pada peramban apa pun.',
      metrics: [
        { teks: 'Setelan tersimpan dan terbaca kembali dengan benar.' },
      ],
      verifikasi: {
        ok: [
          'Asli: layar ada dengan keterangan dan pilihan Mati/Aktif, nilai teramati Mati (bukti `real-pintasan.png`).',
          'fin-app: tidak ada layar setelan maupun konfigurasi pintasan bilah notifikasi.',
        ],
        belum: [
          '❓ Tampilan visual notifikasi pintasan pada bilah notifikasi Android di aplikasi asli — belum ada tangkapan layar saat Aktif.',
        ],
      },
    },
    bukti: [{ group: 'TA01b-setelan-asli', file: 'real-pintasan.png', cap: 'Keterangan + Mati/Aktif' }],
  },
  {
    id: 'T-25',
    prdId: 'PRD-P-21',
    slug: 'setelan-gaya',
    title: 'Setelan "Gaya": pilihan mode tampilan',
    kategori: 'Setelan · tampilan',
    prioritas: 'Low',
    parent: 'Lainnya → Kelola pengaturan',
    masuk: 'Lainnya → Kelola pengaturan → Gaya',
    ringkas:
      'Kedua aplikasi punya pengaturan tampilan, tetapi pilihannya berbeda: aplikasi asli ' +
      'menyediakan `Mode sistem`, sedangkan fin-app menyediakan `Terang`/`Gelap` plus palet warna.',
    mm: ['Tiga pilihan: `Mode sistem`, `Mode gelap`, `Mode terang`.'],
    fin: [
      'Halaman `/lainnya/tema` → `components/theme-settings.tsx`.',
      'Dua mode: `Terang`, `Gelap` (tanpa `Mode sistem`).',
      'Tambahan fin-app: palet warna `Teal`, `Samudra`, `Lavender` (tidak ada di aplikasi asli).',
    ],
    dampak: 'Pengguna tidak bisa memakai pengaturan tema perangkat; sebaliknya palet fin-app tidak ada padanannya di asli.',
    butuhPRD: true,
    prd: {
      deskripsi:
        'Menambahkan opsi "Mode sistem" pada layar pengaturan tema/gaya fin-app sehingga tampilan ' +
        'dapat secara otomatis mengikuti tema perangkat/sistem operasi pengguna, sesuai tiga ' +
        'pilihan yang ada di aplikasi asli (Mode sistem, Mode gelap, Mode terang).',
      tujuan: [
        'Pengguna dapat menyelaraskan tema aplikasi dengan setelan gelap/terang perangkat secara otomatis.',
        'Layar gaya memiliki tiga pilihan standar yang sama dengan aplikasi asli.',
        'Palet warna yang sudah ada di fin-app tetap dapat dipertahankan sebagai fitur tambahan.',
      ],
      alur:
        'Lainnya → Kelola pengaturan → Gaya (atau Lainnya → Tema) →\n' +
        '  ├─ Mode sistem → ikuti prefers-color-scheme peramban\n' +
        '  ├─ Mode gelap  → paksa tema gelap\n' +
        '  └─ Mode terang → paksa tema terang',
      userStory: [
        { prio: 'Medium', role: 'pengguna dengan preferensi tema otomatis di perangkat', want: 'memilih "Mode sistem"', so: 'fin-app otomatis gelap di malam hari dan terang di siang hari sesuai setelan perangkat saya' },
        { prio: 'Rendah', role: 'pengguna setia tema tertentu', want: 'memaksa Terang atau Gelap secara manual', so: 'tampilan tetap konsisten apa pun setelan sistem' },
      ],
      struktur:
        'Layar setelan Gaya (pilihan tema):\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  Gaya                                        │\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  ◉ Mode sistem                               │\n' +
        '│  ○ Mode gelap                                │\n' +
        '│  ○ Mode terang                               │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Opsi Mode sistem',
          tipe: 'pilihan radio',
          fungsi: 'Menghubungkan tema aplikasi dengan media query `prefers-color-scheme`.',
          opsi: 'system / dark / light',
          default: 'system (atau light bila belum diatur)',
          perilaku:
            'Saat "system" dipilih, listener `matchMedia("(prefers-color-scheme: dark)")` ' +
            'mengatur class `dark` pada dokumen HTML sesuai preferensi sistem secara dinamis.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Layar setelan tema/gaya menyediakan tiga pilihan: "Mode sistem", "Mode gelap", dan "Mode terang".' },
        { id: 'FR-02', teks: 'Memilih "Mode sistem" membuat aplikasi merespons perubahan tema sistem secara langsung via `matchMedia`.' },
        { id: 'FR-03', teks: 'Memilih "Mode gelap" atau "Mode terang" mengunci tema tanpa terpengaruh preferensi sistem.' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Bebas kedipan (no flash): tema yang tersimpan di-inject di head HTML sebelum render awal agar tidak ada flicker tema saat muat halaman.' },
        { id: 'NFR-02', teks: 'Aksesibilitas: kontras kedua tema tetap memenuhi batas WCAG AA.' },
      ],
      interaksi: {
        navigasi: 'Lainnya → Kelola pengaturan → Gaya (dan/atau `/lainnya/tema`).',
        simpan: 'Nilai tersimpan segera dan tema langsung berubah.',
        validasi: 'Hanya tiga pilihan; tidak ada masukan bebas.',
      },
      teramati: [
        'Asli: tiga pilihan "Mode sistem", "Mode gelap", "Mode terang" (bukti `real-gaya.png`).',
        'fin-app: hanya Terang dan Gelap di `components/theme-settings.tsx`; ada tambahan palet warna Teal, Samudra, Lavender yang tidak ada di asli (bukti `fin-20-lainnya.png`).',
      ],
      skema:
        'Kunci setelan tema diperluas:\n\n' +
        '```\n' +
        'settings.set("theme_mode", "system")  // system | dark | light\n' +
        '```',
      default: '"system" (atau Terang bila default lama dipertahankan).',
      alurData:
        'Pengguna pilih Mode sistem → settings.set(theme_mode, "system")\n' +
        '→ applyTheme() membaca matchMedia → tambah/hapus class "dark" pada documentElement.',
      error: [
        { id: 'E-01', teks: 'Peramban tidak mendukung `matchMedia` → jatuh balik ke tema Terang sebagai default aman.' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Sistem operasi berganti tema saat fin-app sedang terbuka → aplikasi langsung beralih warna secara otomatis via media query listener.' },
        { id: 'EC-02', teks: 'Palet warna aktif bersamaan dengan Mode sistem → palet warna diaplikasikan di atas tema terang atau gelap yang sedang aktif.' },
      ],
      internal: [
        { teks: '`components/theme-settings.tsx` — layar pengaturan tema yang sudah ada.' },
        { teks: '`app/globals.css` — definisi variabel warna tema.' },
      ],
      eksternal: [{ teks: 'CSS media feature `prefers-color-scheme` dan window.matchMedia API.' }],
      testing: 'Pilih "Mode sistem", ubah setelan tema OS dari terang ke gelap, pastikan fin-app otomatis berganti ke tema gelap.',
      metrics: [
        { teks: 'Pilihan "Mode sistem" hadir di layar setelan tema.' },
        { teks: 'Aplikasi merespons perubahan preferensi sistem saat "Mode sistem" aktif.' },
      ],
      verifikasi: {
        ok: [
          'Asli: tiga pilihan Mode sistem, Mode gelap, Mode terang ada pada layar (bukti `real-gaya.png`).',
          'fin-app: `components/theme-settings.tsx` ada di `/lainnya/tema`, hanya menyediakan Terang dan Gelap.',
        ],
        belum: [
          '❓ Apakah di aplikasi asli ada layar "Gaya" terpisah dari "Tema" atau keduanya adalah hal yang sama.',
        ],
      },
    },
    bukti: [
      { group: 'TA01b-setelan-asli', file: 'real-gaya.png', cap: 'Mode sistem / gelap / terang' },
      { group: 'TA01-kerangka', file: 'fin-20-lainnya.png', cap: 'fin-app: item `Tema` pada daftar Lainnya' },
    ],
  },
  {
    id: 'T-26',
    prdId: 'PRD-P-22',
    slug: 'setelan-widget',
    title: 'Setelan "Pengaturan Widget"',
    kategori: 'Setelan · platform',
    prioritas: 'Low',
    parent: 'Lainnya → Kelola pengaturan',
    masuk: 'Lainnya → Kelola pengaturan → Pengaturan Widget',
    ringkas:
      'Aplikasi asli punya widget layar utama lengkap dengan pratinjau dan pengaturan warna/opasitas. ' +
      'fin-app berjalan di peramban sehingga tidak punya padanan langsung.',
    mm: [
      'Layar `Pengaturan Widget` dengan pratinjau: `Pendapatan`, `Pengeluaran`, `Total`, `Bulan ini`, `0,00`, `dibandingkan Bulan Lalu`.',
      'Baris `Warna Latar Belakang` dengan `Mode sistem` / `Mode gelap` / `Mode terang`.',
      'Baris `Opasitas Latar Belakang` = `100%`.',
    ],
    fin: ['Tidak ada setelan ini (❓ tidak ditemukan).'],
    dampak: 'Tidak ada padanan di web; perlu keputusan apakah dilewati.',
    butuhPRD: true,
    prd: {
      deskripsi:
        'Menambahkan layar "Pengaturan Widget" atau padanan komponen ringkasan cepat pada fin-app: ' +
        'pratinjau widget keuangan (Pendapatan, Pengeluaran, Total bulan ini, dibandingkan bulan lalu) ' +
        'beserta pengaturan warna latar belakang (Mode sistem/gelap/terang) dan opasitas.',
      tujuan: [
        'Pengguna dapat mengonfigurasi tampilan kartu ringkasan cepat keuangan.',
        'Meniru layar setelan widget aplikasi asli lengkap dengan pratinjau real-time.',
      ],
      alur:
        'Lainnya → Kelola pengaturan → Pengaturan Widget →\n' +
        '  ├─ Pratinjau widget (Pendapatan, Pengeluaran, Total, perbandingan bulan lalu)\n' +
        '  ├─ Warna Latar Belakang: Mode sistem / Mode gelap / Mode terang\n' +
        '  └─ Opasitas Latar Belakang: slider 0% – 100%',
      userStory: [
        { prio: 'Rendah', role: 'pengguna', want: 'mengatur warna dan transparansi widget ringkasan', so: 'tampilan widget cocok dengan wallpaper atau tema yang saya sukai' },
      ],
      struktur:
        'Layar Pengaturan Widget:\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  Pengaturan Widget                           │\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  ┌────────────────────────────────────────┐  │\n' +
        '│  │ Bulan ini                              │  │\n' +
        '│  │ Pendapatan: 0,00  Pengeluaran: 0,00    │  │\n' +
        '│  │ Total: 0,00 (dibandingkan Bulan Lalu)  │  │\n' +
        '│  └────────────────────────────────────────┘  │\n' +
        '│  Warna Latar Belakang    Mode sistem    >    │\n' +
        '│  Opasitas Latar Belakang 100%           >    │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Pratinjau widget interaktif',
          tipe: 'tampilan',
          fungsi: 'Menampilkan pratinjau langsung kartu ringkasan saat pengaturan diubah.',
          opsi: 'Otomatis mengikuti pilihan warna dan slider opasitas',
          default: 'Warna Mode sistem, opasitas 100%',
          perilaku: 'Setiap perubahan warna atau opasitas langsung tercermin pada pratinjau tanpa perlu menyimpan.',
        },
        {
          nama: 'Warna latar belakang',
          tipe: 'pemilih',
          fungsi: 'Memilih skema warna latar belakang widget.',
          opsi: 'Mode sistem / Mode gelap / Mode terang',
          default: 'Mode sistem',
          perilaku: 'Mengubah warna dasar kartu pratinjau.',
        },
        {
          nama: 'Opasitas latar belakang',
          tipe: 'slider / pemilih persentase',
          fungsi: 'Menentukan tingkat transparansi latar belakang kartu.',
          opsi: '0% – 100%',
          default: '100%',
          perilaku: 'Mengubah nilai opacity latar belakang kartu widget.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Layar "Pengaturan Widget" menampilkan kartu pratinjau ringkasan bulanan di bagian atas.' },
        { id: 'FR-02', teks: 'Tersedia pilihan Warna Latar Belakang (Mode sistem / Mode gelap / Mode terang).' },
        { id: 'FR-03', teks: 'Tersedia pengaturan Opasitas Latar Belakang (nilai teramati 100%).' },
        { id: 'FR-04', teks: 'Perubahan pada warna atau opasitas langsung memperbarui kartu pratinjau secara real-time.' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Platform-graceful: di web, widget berfungsi sebagai kartu ringkasan yang dapat disematkan di beranda dashboard.' },
        { id: 'NFR-02', teks: 'Responsif: pratinjau memperbarui seketika (<16ms) saat slider digerakkan.' },
      ],
      interaksi: {
        navigasi: 'Lainnya → Kelola pengaturan → Pengaturan Widget.',
        simpan: 'Nilai tersimpan saat pengguna keluar dari layar atau menekan tombol simpan.',
        validasi: 'Opasitas berupa persentase 0–100; warna berasal dari 3 opsi tetap.',
      },
      teramati: [
        'Asli: layar ada dengan pratinjau (Pendapatan, Pengeluaran, Total, Bulan ini, 0,00, dibandingkan Bulan Lalu), Warna Latar Belakang (Mode sistem/gelap/terang), Opasitas 100% (bukti `real-pengaturan-widget.png`).',
        'fin-app: tidak ada setelan widget di seluruh kode (dari array `fin` T-26).',
      ],
      skema:
        'Dua kunci setelan baru:\n\n' +
        '```\n' +
        'settings.set("widget_bg_color", "system")  // system | dark | light\n' +
        'settings.set("widget_opacity",  100)       // 0–100\n' +
        '```',
      default: 'Warna Mode sistem; opasitas 100%.',
      alurData:
        'Pengguna geser opasitas / ubah warna → pratinjau bereaksi langsung\n' +
        '→ settings.set(widget_bg_color, widget_opacity)\n' +
        '→ kartu ringkasan dashboard membaca setelan dan menerapkan style.',
      error: [
        { id: 'E-01', teks: 'Nilai opasitas di luar 0–100 → batasi ke batas terdekat (clamp 0..100).' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Opasitas 0% (sepenuhnya transparan) → teks kartu harus tetap terbaca dengan kontras memadai di atas latar belakang apa pun.' },
        { id: 'EC-02', teks: 'Bulan baru belum ada transaksi → angka pratinjau menampilkan 0,00 tanpa error.' },
      ],
      internal: [
        { teks: '`lib/db.ts` — tabel setelan untuk menyimpan preferensi widget.' },
      ],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Buka layar setelan widget, ubah opasitas ke 50%, pastikan kartu pratinjau terlihat transparan secara langsung.',
      metrics: [
        { teks: 'Pratinjau widget memperbarui style secara real-time.' },
        { teks: 'Nilai warna dan opasitas tersimpan dan terbaca kembali dengan benar.' },
      ],
      verifikasi: {
        ok: [
          'Asli: layar ada dengan pratinjau lengkap, warna latar belakang, dan opasitas 100% (bukti `real-pengaturan-widget.png`).',
          'fin-app: tidak ada layar setelan widget atau kartu pratinjau yang setara.',
        ],
        belum: [
          '❓ Apakah di Android widget ini benar-benar dipasang di home screen launcher (AppWidgetProvider) — di web padanannya adalah kartu dashboard.',
        ],
      },
    },
    bukti: [{ group: 'TA01b-setelan-asli', file: 'real-pengaturan-widget.png', cap: 'Pratinjau widget + warna + opasitas' }],
  },
  {
    id: 'T-27',
    prdId: 'PRD-P-23',
    slug: 'setelan-bahasa',
    title: 'Setelan "Pengaturan bahasa": 16 bahasa',
    kategori: 'Setelan · lokalisasi',
    prioritas: 'Medium',
    parent: 'Lainnya → Kelola pengaturan',
    masuk: 'Lainnya → Kelola pengaturan → Pengaturan bahasa',
    ringkas:
      'Aplikasi asli menyediakan 16 bahasa beserta nama penerjemahnya. fin-app hanya tersedia ' +
      'dalam Bahasa Indonesia dan tautan menunya bahkan 404 (lihat T-09).',
    mm: [
      'Daftar: `Bahasa Indonesia`, `Deutsch`, `English`, `Español`, `Français`, `Hindi`, `Italiano`, `Polish`, `Português`, `Pусский`, `Românește`, `Türkçe`, `Tiếng Việt`, `Українська`, `বাঙালি`, `ไทย`.',
      'Setiap baris menampilkan nama penerjemah (mis. `Agnes Luciana, Benedict Sakti`).',
    ],
    fin: [
      'Tidak ada pemilih bahasa (❓ tidak ditemukan mekanisme i18n di `app/`, `lib/`, `components/`).',
      'Tautan `/lainnya/pengaturan-bahasa` → 404 (T-09).',
    ],
    dampak: 'Pengguna non-Indonesia tidak bisa memakai fin-app dalam bahasanya.',
    butuhPRD: true,
    prd: {
      deskripsi:
        'Menambahkan layar "Pengaturan bahasa" pada rute `/lainnya/pengaturan-bahasa` yang saat ' +
        'ini 404, memuat daftar 16 bahasa beserta nama penerjemahnya seperti aplikasi asli, ' +
        'dan menerapkan kerangka lokalisasi (i18n) pada teks antarmuka fin-app.',
      tujuan: [
        'Memperbaiki rute 404 pada menu Pengaturan bahasa (menyelesaikan sebagian temuan T-09).',
        'Menampilkan 16 bahasa lengkap dengan kredit penerjemah seperti di Money Manager.',
        'Memungkinkan pengguna beralih bahasa antarmuka aplikasi.',
      ],
      alur:
        'Lainnya → Kelola pengaturan → Pengaturan bahasa (atau `/lainnya/pengaturan-bahasa`) →\n' +
        '  ├─ Daftar 16 bahasa + nama penerjemah\n' +
        '  └─ Ketuk salah satu bahasa → centang berpindah → teks antarmuka berganti bahasa',
      userStory: [
        { prio: 'Tinggi', role: 'pengguna yang menekan menu bahasa di Lainnya', want: 'halaman pengaturan bahasa terbuka, bukan 404', so: 'aplikasi tidak terlihat rusak' },
        { prio: 'Medium', role: 'pengguna berbahasa Inggris atau lainnya', want: 'memilih bahasa Inggris', so: 'semua menu dan label tampil dalam bahasa yang saya mengerti' },
      ],
      struktur:
        'Layar Pengaturan bahasa (16 bahasa + kredit penerjemah):\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  Pengaturan bahasa                           │\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  ◉ Bahasa Indonesia                          │\n' +
        '│      Agnes Luciana, Benedict Sakti           │\n' +
        '│  ○ English                                   │\n' +
        '│      Realbyte                                │\n' +
        '│  ○ Deutsch                                   │\n' +
        '│      ...                                     │\n' +
        '│  ○ Español                                   │\n' +
        '│      ...                                     │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Daftar 16 bahasa',
          tipe: 'daftar pilihan radio',
          fungsi: 'Menampilkan seluruh bahasa yang didukung beserta nama penerjemahnya.',
          opsi: 'Bahasa Indonesia, Deutsch, English, Español, Français, Hindi, Italiano, Polish, Português, Pусский, Românește, Türkçe, Tiếng Việt, Українська, বাঙালি, ไทย',
          default: 'Bahasa Indonesia',
          perilaku:
            'Ketuk salah satu baris memindahkan tanda centang/radio ke bahasa itu dan menyimpan ' +
            'pilihan ke basis data setelan, lalu memperbarui konteks lokalisasi.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Rute `/lainnya/pengaturan-bahasa` mengembalikan layar pengaturan bahasa yang valid (bukan 404).' },
        { id: 'FR-02', teks: 'Layar memuat 16 bahasa sesuai daftar aplikasi asli, masing-masing dengan nama penerjemah di baris kedua.' },
        { id: 'FR-03', teks: 'Bahasa aktif ditandai dengan radio/centang; memilih bahasa lain menyimpan setelan dan mengubah locale aplikasi.' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Keandalan navigasi: tautan dari menu Lainnya tidak boleh menghasilkan respons 404.' },
        { id: 'NFR-02', teks: 'Lokalisasi parsial aman: kunci teks yang belum diterjemahkan di bahasa baru jatuh balik (fallback) ke Bahasa Indonesia atau English tanpa merusak layout.' },
      ],
      interaksi: {
        navigasi: 'Lainnya → Pengaturan bahasa, atau Lainnya → Kelola pengaturan → Pengaturan bahasa.',
        simpan: 'Nilai tersimpan segera saat bahasa dipilih.',
        validasi: 'Hanya pilihan dari 16 bahasa yang disediakan; tidak ada masukan bebas.',
      },
      teramati: [
        'Asli: layar memuat daftar 16 bahasa lengkap dengan nama penerjemah pada setiap baris (bukti `real-pengaturan-bahasa.png`).',
        'fin-app: tautan `/lainnya/pengaturan-bahasa` mendarat di 404; tidak ada mekanisme i18n di `app/`, `lib/`, `components/` (bukti `fin-20-lainnya-labels.md` dan T-09).',
      ],
      skema:
        'Satu kunci setelan baru:\n\n' +
        '```\n' +
        'settings.set("app_language", "id")  // id | en | de | es | fr | ...\n' +
        '```',
      default: '"Bahasa Indonesia" (`id`).',
      alurData:
        'Pengguna pilih bahasa → settings.set(app_language)\n' +
        '→ locale provider memuat kamus bahasa terpilih → teks UI dirender dalam bahasa baru.',
      error: [
        { id: 'E-01', teks: 'Kamus bahasa belum tersedia lengkap → teks yang belum ada memakai kamus default Bahasa Indonesia.' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Pengguna memilih bahasa dengan arah tulisan kanan-ke-kiri (RTL) bila kelak didukung → layout tetap stabil.' },
        { id: 'EC-02', teks: 'Bahasa diganti saat berada di tengah formulir pengisian → formulir tidak ter-reset, hanya label kolom yang berganti bahasa.' },
      ],
      internal: [
        { teks: '`lib/db.ts` — tabel setelan untuk menyimpan `app_language`.' },
      ],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Buka `/lainnya/pengaturan-bahasa` (pastikan 200 OK), pilih English, dan pastikan setelan tersimpan dan teks menu berubah.',
      metrics: [
        { teks: 'Rute `/lainnya/pengaturan-bahasa` menghasilkan status 200, bukan 404.' },
        { teks: 'Semua 16 bahasa tercantum lengkap beserta nama penerjemahnya.' },
      ],
      verifikasi: {
        ok: [
          'Asli: layar memuat 16 bahasa dengan nama penerjemah (bukti `real-pengaturan-bahasa.png`).',
          'fin-app: tautan menghasilkan 404 (terverifikasi di T-09 dan TA1-10).',
        ],
        belum: [
          '❓ Daftar lengkap nama penerjemah untuk seluruh 16 bahasa selain Indonesia yang tampak di tangkapan layar.',
        ],
      },
    },
    bukti: [{ group: 'TA01b-setelan-asli', file: 'real-pengaturan-bahasa.png', cap: 'Daftar 16 bahasa + penerjemah' }],
  },
  {
    id: 'T-28',
    prdId: 'PRD-P-24',
    slug: 'setelan-alarm',
    title: 'Setelan "Pengaturan alarm" (pengingat input)',
    kategori: 'Setelan · platform',
    prioritas: 'Medium',
    parent: 'Lainnya → Kelola pengaturan',
    masuk: 'Lainnya → Kelola pengaturan → Pengaturan alarm',
    ringkas:
      'Aplikasi asli bisa mengingatkan pengguna untuk mencatat transaksi pada jam dan hari yang ' +
      'dipilih. fin-app belum punya layarnya (tautan menunya 404 — lihat T-09).',
    mm: [
      'Layar `Pengaturan alarm` dengan penjelasan pengingat input data.',
      'Baris `Alarm` (nilai teramati `Aktif`), baris `Masukan waktu` = `21.00`, tombol `Edit`.',
      'Baris `Ulangi` dengan tujuh hari: `Min` … `Sab`.',
    ],
    fin: ['Belum ada layar maupun logika alarm; `Pengaturan alarm` pada daftar Lainnya menuju rute yang tidak ada.'],
    dampak: 'Fitur pengingat hilang. Di web, padanannya perlu Notifikasi API (dengan izin pengguna).',
    butuhPRD: true,
    prd: {
      deskripsi:
        'Menambahkan layar "Pengaturan alarm" pada rute `/lainnya/pengaturan-alarm` yang saat ' +
        'ini 404, memuat setelan alarm pengingat input harian dengan jam masukan dan pilihan ' +
        'hari pengulangan (Min–Sab), meniru layar asli Money Manager.',
      tujuan: [
        'Memperbaiki rute 404 pada menu Pengaturan alarm (menyelesaikan sebagian temuan T-09).',
        'Pengguna dapat menyetel pengingat harian agar tidak lupa mencatat transaksi keuangan.',
        'Jam dan hari pengulangan dapat disesuaikan secara fleksibel.',
      ],
      alur:
        'Lainnya → Pengaturan alarm (atau `/lainnya/pengaturan-alarm`) →\n' +
        '  ├─ Saklar Alarm: Mati / Aktif\n' +
        '  ├─ Masukan waktu (jam:menit, mis. 21.00) + tombol Edit\n' +
        '  └─ Ulangi: pilih hari Min, Sen, Sel, Rab, Kam, Jum, Sab',
      userStory: [
        { prio: 'Tinggi', role: 'pengguna yang menekan menu alarm di Lainnya', want: 'halaman pengaturan alarm terbuka, bukan 404', so: 'aplikasi tidak menampilkan halaman error' },
        { prio: 'Medium', role: 'pengguna yang sering lupa mencatat pengeluaran', want: 'mengatur pengingat setiap pukul 21.00', so: 'saya mendapat notifikasi untuk mencatat transaksi sebelum tidur' },
      ],
      struktur:
        'Layar Pengaturan alarm:\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  Pengaturan alarm                            │\n' +
        '│  Pengingat untuk menginput data transaksi.   │\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  Alarm                  Aktif           [🔘] │\n' +
        '│  Masukan waktu          21.00        [Edit]  │\n' +
        '│  Ulangi                 Min Sen Sel Rab      │\n' +
        '│                         Kam Jum Sab          │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Saklar alarm',
          tipe: 'saklar dua keadaan',
          fungsi: 'Mengaktifkan atau mematikan alarm pengingat.',
          opsi: 'Mati / Aktif',
          default: 'Aktif (mengikuti nilai teramati aplikasi asli)',
          perilaku: 'Saat Aktif: pengingat dijadwalkan; saat Mati: jadwal dibatalkan.',
        },
        {
          nama: 'Masukan waktu',
          tipe: 'pemilih waktu',
          fungsi: 'Menentukan jam dan menit alarm berbunyi/muncul.',
          opsi: 'Format jam:menit (00:00 – 23:59)',
          default: '21.00',
          perilaku: 'Tombol Edit membuka pemilih waktu; menyimpan memperbarui jam alarm.',
        },
        {
          nama: 'Pilihan hari pengulangan',
          tipe: 'pemilih multi-opsi',
          fungsi: 'Menentukan hari-hari dalam seminggu saat alarm aktif.',
          opsi: 'Min, Sen, Sel, Rab, Kam, Jum, Sab',
          default: 'Semua 7 hari terpilih',
          perilaku: 'Pengguna dapat mengetuk tiap hari untuk mengaktifkan atau menonaktifkannya.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Rute `/lainnya/pengaturan-alarm` mengembalikan layar pengaturan alarm yang valid (bukan 404).' },
        { id: 'FR-02', teks: 'Layar memuat saklar Alarm (Aktif/Mati), baris Masukan waktu dengan tombol Edit, dan baris Ulangi 7 hari.' },
        { id: 'FR-03', teks: 'Nilai waktu dan pilihan hari tersimpan di database setelan dan dijadwalkan via Web Notification API bila izin diberikan.' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Keandalan navigasi: tautan dari menu Lainnya tidak boleh menghasilkan rute 404.' },
        { id: 'NFR-02', teks: 'Privasi & izin: permintaan izin notifikasi hanya dipicu saat pengguna mengaktifkan alarm.' },
      ],
      interaksi: {
        navigasi: 'Lainnya → Pengaturan alarm, atau Lainnya → Kelola pengaturan → Pengaturan alarm.',
        simpan: 'Nilai saklar, jam, dan hari tersimpan segera saat diubah.',
        validasi: 'Waktu harus format jam valid; minimal satu hari harus dipilih bila alarm aktif.',
      },
      teramati: [
        'Asli: layar memuat penjelasan pengingat, Alarm (Aktif), Masukan waktu = 21.00 dengan tombol Edit, Ulangi dengan 7 hari (bukti `real-pengaturan-alarm.png`).',
        'fin-app: tautan `/lainnya/pengaturan-alarm` menuju rute yang tidak ada (404) (bukti `fin-20-lainnya-labels.md` dan T-09).',
      ],
      skema:
        'Setelan alarm disimpan di basis data:\n\n' +
        '```\n' +
        'settings.set("alarm_enabled", true)\n' +
        'settings.set("alarm_time",    "21:00")\n' +
        'settings.set("alarm_days",    [0,1,2,3,4,5,6])  // 0=Min .. 6=Sab\n' +
        '```',
      default: 'Alarm Aktif, waktu 21.00, ulangi setiap hari (Min–Sab).',
      alurData:
        'Pengguna atur waktu/hari → settings.set(alarm_*)\n' +
        '→ jadwalkan notifikasi via ServiceWorker / Web Notification API.',
      error: [
        { id: 'E-01', teks: 'Peramban menolak izin notifikasi → tampilkan pesan panduan cara mengizinkan notifikasi di setelan peramban.' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Alarm disetel di perangkat saat offline → ServiceWorker tetap dapat memicu notifikasi lokal tanpa koneksi internet.' },
        { id: 'EC-02', teks: 'Semua hari dimatikan pada Ulangi → saklar Alarm otomatis dimatikan.' },
      ],
      internal: [
        { teks: '`lib/db.ts` — tabel setelan untuk menyimpan preferensi alarm.' },
      ],
      eksternal: [{ teks: 'Web Notification API dan ServiceWorker Registration.' }],
      testing: 'Buka `/lainnya/pengaturan-alarm` (pastikan 200 OK), ubah jam ke 20.00, simpan, pastikan jam baru tersimpan di database.',
      metrics: [
        { teks: 'Rute `/lainnya/pengaturan-alarm` mengembalikan status 200.' },
        { teks: 'Setelan jam dan hari tersimpan dan terbaca kembali dengan benar.' },
      ],
      verifikasi: {
        ok: [
          'Asli: layar ada dengan Alarm Aktif, 21.00, Edit, dan Ulangi 7 hari (bukti `real-pengaturan-alarm.png`).',
          'fin-app: rute `/lainnya/pengaturan-alarm` saat ini menghasilkan 404 (diverifikasi di T-09).',
        ],
        belum: [
          '❓ Apakah di aplikasi asli alarm memutar suara atau getar tertentu — belum ada pengujian audio/haptic.',
        ],
      },
    },
    bukti: [{ group: 'TA01b-setelan-asli', file: 'real-pengaturan-alarm.png', cap: 'Alarm + waktu + Ulangi' }],
  },
  {
    id: 'T-29',
    prdId: 'PRD-P-25',
    slug: 'baris-kategori-sarana-tindakan',
    title: 'Baris daftar kategori: cara hapus, ubah, dan urutkan berbeda',
    kategori: 'Kategori · interaksi daftar',
    prioritas: 'Medium',
    parent: 'Kelola kategori pengeluaran / pendapatan',
    masuk: 'Lainnya → Kelola pengaturan → Kelola kategori pengeluaran',
    ringkas:
      'Isi kedua daftar kategori sudah sama persis — 12 kategori pengeluaran dan 5 kategori ' +
      'pendapatan dengan nama serta emoji yang identik. Yang berbeda adalah sarana tindakan pada ' +
      'tiap baris: aplikasi asli memakai tombol ⊖, pensil, dan pegangan geser; fin-app memakai ' +
      'kotak centang, dua tombol panah, pensil, dan tanda chevron.',
    mm: [
      'Tiap baris: tombol ⊖ merah di kiri (memulai hapus), emoji + nama di tengah, pensil di kanan (buka sub-kategori), pegangan geser ≡ di ujung kanan (ubah urutan dengan menyeret).',
      'Tidak ada kotak centang, tidak ada tombol naik/turun, tidak ada tanda bahwa kategori itu bawaan.',
      'Urutan diubah dengan menyeret pegangan, bukan menekan tombol.',
      'Pola yang sama berlaku di daftar sub-kategori: tiap baris punya ⊖, nama, pensil, dan pegangan geser ≡ (bukti Tahap 3: `real-01-daftar-sub.png`).',
    ],
    fin: [
      'Tiap baris: kotak centang di kiri (memilih untuk hapus massal), emoji + nama + tanda `Bawaan`, lalu tombol `↑` dan `↓` (naik/turun satu posisi), pensil (ubah nama), dan chevron `>` (buka sub-kategori).',
      'Judul layar didahului keterangan kecil `KELOLA PENGATURAN` yang tidak ada di aplikasi asli.',
      'Tidak ada tombol hapus per baris; penghapusan selalu lewat pemilihan lalu tombol `Hapus kategori terpilih`.',
      'Pola yang sama berlaku di pengelola sub-kategori: kotak centang, `↑` `↓`, dan pensil per baris (bukti Tahap 3: `fin-01-daftar-sub.png`).',
    ],
    dampak:
      'Pengguna aplikasi asli terbiasa menekan ⊖ untuk menghapus dan menyeret untuk mengurutkan. ' +
      'Di fin-app keduanya harus dilakukan dengan cara lain. Isi daftar sendiri sudah sama, jadi ' +
      'selisih ini murni soal sarana tindakan.',
    butuhPRD: true,
    prd: {
      deskripsi:
        'Menyelaraskan sarana tindakan baris daftar kategori dan sub-kategori fin-app agar ' +
        'mengikuti aplikasi asli: mengganti kotak centang dengan tombol hapus ⊖ di kiri, ' +
        'mengganti tombol panah ↑/↓ dengan pegangan seret ≡ di kanan untuk pengurutan drag-and-drop, ' +
        'dan menghapus penanda "Bawaan" dari baris.',
      tujuan: [
        'Interaksi baris kategori konsisten dengan kebiasaan pengguna aplikasi asli.',
        'Pengurutan kategori dilakukan dengan menyeret pegangan ≡, bukan menekan panah berulang kali.',
        'Pola baris yang sama berlaku seragam pada daftar kategori utama dan daftar sub-kategori.',
      ],
      alur:
        'Daftar kategori → tiap baris:\n' +
        '  ├─ [⊖] kiri → memulai alur hapus baris itu (lihat PRD-P-26)\n' +
        '  ├─ Emoji + Nama di tengah\n' +
        '  ├─ [✎] kanan → buka sub-kategori (atau ubah nama bila saklar mati, lihat PRD-P-29)\n' +
        '  └─ [≡] ujung kanan → seret ke atas/bawah untuk mengubah urutan',
      userStory: [
        { prio: 'Tinggi', role: 'pengguna aplikasi asli', want: 'menyeret pegangan ≡ untuk mengurutkan kategori', so: 'saya tidak perlu menekan tombol panah berkali-kali untuk memindahkan satu kategori ke atas' },
        { prio: 'Medium', role: 'pengguna', want: 'menghapus kategori langsung dari barisnya via tombol ⊖', so: 'saya tidak perlu mencentang kotak lalu mencari tombol hapus di bawah' },
      ],
      struktur:
        'Baris daftar kategori (mengikuti pola aplikasi asli):\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  ⊖  🍜 Food (4)                    ✎    ≡   │\n' +
        '│  ⊖  👬🏻 Social Life                 ✎    ≡   │\n' +
        '│  ⊖  🐶 Pets                        ✎    ≡   │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Tombol ⊖ hapus per baris',
          tipe: 'tombol aksi',
          fungsi: 'Memulai penghapusan kategori pada baris yang bersangkutan.',
          opsi: 'Muncul di sisi kiri setiap baris kategori',
          default: 'Selalu ada di setiap baris',
          perilaku: 'Ditekan → memicu alur hapus kategori (lihat PRD-P-26 untuk alur tanpa konfirmasi / tombol sampah).',
        },
        {
          nama: 'Pegangan seret ≡ (drag handle)',
          tipe: 'interaksi seret',
          fungsi: 'Mengubah urutan kategori dengan cara drag-and-drop.',
          opsi: 'Ujung kanan setiap baris',
          default: 'Selalu ada di setiap baris',
          perilaku: 'Diseret ke atas/bawah memindahkan posisi kategori di daftar; urutan baru disimpan ke basis data setelah seretan dilepas.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Setiap baris kategori dan sub-kategori menampilkan tombol ⊖ di sisi kiri, emoji + nama di tengah, tombol pensil di kanan, dan pegangan geser ≡ di ujung kanan.' },
        { id: 'FR-02', teks: 'Kotak centang dan tombol panah `↑` `↓` dihapus dari baris daftar kategori dan sub-kategori.' },
        { id: 'FR-03', teks: 'Menyeret pegangan ≡ memindahkan posisi baris; urutan baru disimpan ke kolom ORDER pada tabel kategori setelah selesai seret.' },
        { id: 'FR-04', teks: 'Teks keterangan kecil "KELOLA PENGATURAN" di atas judul layar dihilangkan agar sesuai aplikasi asli.' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Aksesibilitas: interaksi drag-and-drop harus memiliki alternatif keyboard (mis. Space untuk ambil, Panah untuk pindah, Space untuk lepas).' },
        { id: 'NFR-02', teks: 'Keandalan data: urutan baru disimpan dalam satu batch update agar tidak ada duplikasi nomor urut.' },
      ],
      interaksi: {
        navigasi: 'Lainnya → Kelola pengaturan → Kelola kategori pengeluaran / pendapatan.',
        simpan: 'Urutan baru tersimpan segera saat pengguna melepas seretan (onDragEnd).',
        validasi: 'Tidak ada masukan bebas.',
      },
      teramati: [
        'Asli: tiap baris memiliki ⊖ merah di kiri, emoji+nama di tengah, pensil di kanan, dan pegangan ≡ di ujung kanan (bukti `real-01-daftar-pengeluaran.png`, `real-01-daftar-sub.png`).',
        'fin-app: kotak centang di kiri, emoji+nama+Bawaan, tombol ↑ ↓, pensil, chevron > (bukti `fin-01-daftar-pengeluaran.png`, `fin-01-daftar-sub.png`).',
      ],
      skema:
        'Kolom urutan sudah ada di tabel kategori (`ORDER_INDEX` atau sejenisnya).\n' +
        'Pembaruan urutan batch:\n\n' +
        '```\n' +
        'categories.reorder(orderedIds)\n' +
        '```',
      default: 'Urutan mengikuti ORDER_INDEX yang sudah tersimpan.',
      alurData:
        'Seret baris ≡ → lepas → hitung urutan baru → update database batch\n' +
        '→ daftar di-render ulang dengan urutan baru.',
      error: [
        { id: 'E-01', teks: 'Penyimpanan urutan gagal → kembalikan urutan visual ke posisi sebelumnya dan tampilkan pesan kesalahan.' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Seret dibatalkan (mis. dilepas di luar area daftar) → baris kembali ke posisi semula tanpa mengubah database.' },
        { id: 'EC-02', teks: 'Hanya ada 1 kategori di daftar → pegangan ≡ tetap ada tapi tidak bisa dipindahkan.' },
      ],
      internal: [
        { teks: '`components/category-list.tsx` — komponen daftar kategori yang merender baris, centang, dan tombol panah.' },
        { teks: '`components/sub-category-manager.tsx` — pengelola sub-kategori yang memakai pola baris serupa.' },
        { teks: '`lib/db.ts` — fungsi pembaruan urutan kategori.' },
      ],
      eksternal: [{ teks: 'Library drag-and-drop (mis. dnd-kit atau HTML5 Drag and Drop API native).' }],
      testing: 'Seret baris kategori kedua ke posisi pertama, muat ulang halaman, pastikan urutan baru bertahan.',
      metrics: [
        { teks: 'Kotak centang dan tombol panah ↑/↓ tidak lagi dirender pada baris kategori.' },
        { teks: 'Urutan kategori tersimpan konsisten setelah drag-and-drop.' },
      ],
      verifikasi: {
        ok: [
          'Asli: ⊖ di kiri, emoji+nama di tengah, pensil di kanan, ≡ di ujung kanan (bukti `real-01-daftar-pengeluaran.png`, `real-01-daftar-sub.png`).',
          'fin-app: baris merender kotak centang, ↑, ↓, dan penanda Bawaan (bukti `fin-01-daftar-pengeluaran.png`).',
        ],
        belum: [
          '❓ Apakah pegangan ≡ bisa diseret dengan sentuhan jari (touch) dan mouse secara identik di aplikasi asli.',
        ],
      },
    },
    bukti: [
      { group: 'TA02-kategori', file: 'real-01-daftar-pengeluaran.png', cap: 'Asli: ⊖ · emoji+nama · pensil · pegangan geser' },
      { group: 'TA02-kategori', file: 'fin-01-daftar-pengeluaran.png', cap: 'fin-app: kotak centang · emoji+nama+Bawaan · ↑ ↓ · pensil · chevron' },
      { group: 'TA03-subkategori', file: 'real-01-daftar-sub.png', cap: 'Asli: pola yang sama pada daftar sub-kategori (⊖ · nama · pensil · ≡)' },
      { group: 'TA03-subkategori', file: 'fin-01-daftar-sub.png', cap: 'fin-app: pola yang sama pada pengelola sub-kategori (centang · ↑ ↓ · pensil)' },
    ],
  },
  {
    id: 'T-30',
    prdId: 'PRD-P-26',
    slug: 'hapus-kategori-tanpa-konfirmasi',
    title: 'Menghapus kategori: asli tanpa konfirmasi, fin-app memakai dialog',
    kategori: 'Kategori · interaksi hapus',
    prioritas: 'Medium',
    parent: 'Kelola kategori pengeluaran / pendapatan',
    masuk: 'Lainnya → Kelola pengaturan → Kelola kategori pengeluaran',
    ringkas:
      'Aplikasi asli menghapus kategori dalam dua ketukan tanpa pertanyaan: tekan ⊖, lalu tekan ' +
      'tombol sampah yang muncul. fin-app menyisipkan dialog konfirmasi sebelum menghapus.',
    mm: [
      'Tekan ⊖ pada baris → ⊖ berubah menjadi tanda ⓘ dan muncul tombol sampah merah menggantikan posisi pensil.',
      'Tekan tombol sampah → kategori langsung terhapus. Tidak ada dialog konfirmasi yang muncul (tangkapan layar `real-04b-hapus-konfirmasi-ZZUjiParitasEdit.png` memperlihatkan keadaan sebelum penekanan, tanpa dialog).',
      'Di daftar sub-kategori perlakuannya sama: ⊖ pada baris sub → tombol sampah di posisi pensil → sub terhapus tanpa dialog (bukti Tahap 3: `real-04b-tombol-hapus-sub.png`).',
    ],
    fin: [
      'Centang baris → tekan `Hapus kategori terpilih` → muncul `ConfirmDialog` berjudul `Hapus kategori?` dengan keterangan `1 kategori akan dihapus. Kategori bawaan dapat dipulihkan kembali setelah dihapus.` dan tombol `Batal` / `Hapus`.',
      'Penghapusan baru terjadi setelah tombol `Hapus` pada dialog ditekan.',
      'Di pengelola sub-kategori polanya sama: centang → `Hapus sub terpilih` → dialog `Hapus sub kategori?` (bukti Tahap 3: `fin-04b-konfirmasi-hapus.png`).',
    ],
    dampak:
      'Aplikasi asli lebih cepat tetapi tidak bisa dibatalkan; fin-app lebih aman tetapi satu ' +
      'langkah lebih panjang. Perlu keputusan: ikut aplikasi asli (hapus langsung) atau ' +
      'mempertahankan konfirmasi sebagai perbaikan yang disengaja.',
    butuhPRD: true,
    prd: {
      deskripsi:
        'Menentukan alur penghapusan kategori dan sub-kategori fin-app: menyediakan opsi alur hapus ' +
        'cepat dua ketukan (tekan ⊖ → muncul tombol sampah merah → hapus langsung tanpa modal dialog) ' +
        'seperti aplikasi asli, dengan tetap menjaga keamanan data kategori bawaan yang dapat dipulihkan.',
      tujuan: [
        'Penghapusan kategori menjadi lebih cepat (dua ketukan di baris yang sama, tanpa membuka dialog modal).',
        'Pengguna aplikasi asli menemukan alur yang familier tanpa dialog konfirmasi tambahan.',
        'Kategori bawaan tetap memiliki mekanisme pemulihan bila terhapus tanpa sengaja.',
      ],
      alur:
        'Daftar kategori → tekan tombol [⊖] pada baris →\n' +
        '  ├─ [⊖] berubah menjadi icon [ⓘ]\n' +
        '  ├─ Tombol pensil berganti menjadi tombol sampah merah [🗑]\n' +
        '  └─ Tekan [🗑] → kategori langsung dihapus dari daftar (tanpa dialog konfirmasi)',
      userStory: [
        { prio: 'Tinggi', role: 'pengguna aplikasi asli', want: 'menghapus kategori dengan menekan ⊖ lalu sampah', so: 'saya tidak perlu membaca dan mengonfirmasi dialog setiap kali menghapus kategori' },
        { prio: 'Medium', role: 'pengguna yang tidak sengaja menghapus', want: 'memulihkan kategori bawaan yang terhapus', so: 'data penting tidak hilang selamanya' },
      ],
      struktur:
        'Keadaan transisi tombol hapus baris:\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  ⊖  🍜 Food (4)                    ✎    ≡   │  ← awal\n' +
        '└──────────────────────────────────────────────┘\n' +
        '        ↓ tekan ⊖\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  ⓘ  🍜 Food (4)                    🗑   ≡   │  ← tombol sampah merah muncul\n' +
        '└──────────────────────────────────────────────┘\n' +
        '        ↓ tekan 🗑\n' +
        '    (kategori langsung terhapus)\n' +
        '```',
      subFitur: [
        {
          nama: 'Alur hapus inline (two-tap delete)',
          tipe: 'interaksi tombol',
          fungsi: 'Menghapus kategori dalam 2 ketukan tanpa dialog modal.',
          opsi: 'Aktif di setiap baris kategori dan sub-kategori',
          default: 'Aktif, mengikuti aplikasi asli',
          perilaku:
            'Ketukan pertama pada ⊖ memicu state `confirmingDeleteId = id`, mengubah ⊖ jadi ⓘ dan ' +
            'pensil jadi tombol sampah merah. Ketukan kedua pada sampah langsung menjalankan ' +
            '`categories.delete(id)`. Mengetuk di luar baris membatalkan state.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Menekan tombol ⊖ pada baris kategori mengubah tombol itu menjadi tanda ⓘ dan memunculkan tombol sampah merah menggantikan pensil.' },
        { id: 'FR-02', teks: 'Menekan tombol sampah merah langsung menghapus kategori tanpa memunculkan dialog konfirmasi modal.' },
        { id: 'FR-03', teks: 'Mengetuk area lain di luar baris atau mengetuk ⓘ membatalkan mode hapus dan mengembalikan tombol pensil.' },
        { id: 'FR-04', teks: 'Pola dua ketukan yang sama berlaku pada daftar sub-kategori (bukti Tahap 3: `real-04b-tombol-hapus-sub.png`).' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Kecepatan interaksi: penghapusan selesai dalam <50ms dari ketukan tombol sampah tanpa lag UI.' },
        { id: 'NFR-02', teks: 'Aksesibilitas: tombol sampah memiliki `aria-label="Konfirmasi hapus {NAMA_KATEGORI}"` agar pengguna pembaca layar tahu aksi destruktif ini.' },
      ],
      interaksi: {
        navigasi: 'Lainnya → Kelola pengaturan → Kelola kategori pengeluaran / pendapatan.',
        simpan: 'Penghapusan langsung disimpan ke basis data saat tombol sampah ditekan.',
        validasi: 'Kategori bawaan yang dihapus ditandai sebagai `is_deleted = 1` agar dapat dipulihkan lewat tombol "Pulihkan kategori bawaan".',
      },
      teramati: [
        'Asli: tekan ⊖ → ⊖ berubah jadi ⓘ dan muncul tombol sampah merah di posisi pensil; tekan sampah → langsung terhapus tanpa dialog (bukti `real-04b-hapus-konfirmasi-ZZUjiParitasEdit.png`).',
        'Asli: pola sama pada sub-kategori (bukti `real-04b-tombol-hapus-sub.png`).',
        'fin-app: harus centang kotak → tekan tombol "Hapus kategori terpilih" → muncul dialog modal `ConfirmDialog` dengan Batal/Hapus (bukti `fin-04b-hapus-konfirmasi.png`).',
      ],
      skema:
        'Logika state lokal pada komponen daftar:\n\n' +
        '```\n' +
        'const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)\n' +
        '// pendingDeleteId === cat.id ? renderTrashButton() : renderEditButton()\n' +
        '```',
      default: 'Tidak ada baris dalam keadaan siap hapus saat daftar pertama dimuat.',
      alurData:
        'Tekan ⊖ → setPendingDeleteId(cat.id)\n' +
        '→ Tekan sampah → categories.delete(cat.id) → daftar dimuat ulang.',
      error: [
        { id: 'E-01', teks: 'Kategori masih memiliki transaksi terkait → tampilkan notifikasi ringan "Kategori ini memiliki N transaksi terkait" tanpa dialog yang memblokir.' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Pengguna menekan ⊖ pada kategori A lalu menekan ⊖ pada kategori B → state berpindah ke kategori B, kategori A kembali normal.' },
        { id: 'EC-02', teks: 'Kategori bawaan dihapus → soft delete agar tetap bisa dipulihkan kembali dari tombol pemulihan.' },
      ],
      internal: [
        { teks: '`components/category-list.tsx` — baris kategori yang menangani aksi hapus.' },
        { teks: '`components/sub-category-manager.tsx` — baris sub-kategori yang memakai pola serupa.' },
        { teks: '`lib/db.ts` — fungsi `deleteCategory` / `softDeleteCategory`.' },
      ],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Tekan ⊖ pada kategori uji, pastikan tombol sampah muncul; tekan sampah, pastikan kategori langsung hilang dari daftar tanpa dialog.',
      metrics: [
        { teks: 'Jumlah langkah hapus kategori turun dari 3 (centang + tombol + dialog) menjadi 2 ketukan.' },
        { teks: 'Tidak ada modal dialog yang muncul saat alur dua ketukan dijalankan.' },
      ],
      verifikasi: {
        ok: [
          'Asli: tombol sampah muncul menggantikan pensil, tanpa dialog (bukti `real-04b-hapus-konfirmasi-ZZUjiParitasEdit.png`, `real-04b-tombol-hapus-sub.png`).',
          'fin-app: menampilkan dialog `Hapus kategori?` dengan tombol Batal dan Hapus (bukti `fin-04b-hapus-konfirmasi.png`).',
        ],
        belum: [
          '❓ Apakah kategori dengan riwayat transaksi di aplikasi asli dapat dihapus langsung atau memicu peringatan khusus — belum diuji.',
        ],
      },
    },
    bukti: [
      { group: 'TA02-kategori', file: 'real-04b-hapus-konfirmasi-ZZUjiParitasEdit.png', cap: 'Asli: tombol sampah muncul di posisi pensil, tanpa dialog' },
      { group: 'TA02-kategori', file: 'fin-04b-hapus-konfirmasi.png', cap: 'fin-app: dialog "Hapus kategori?" dengan Batal / Hapus' },
      { group: 'TA03-subkategori', file: 'real-04b-tombol-hapus-sub.png', cap: 'Asli: ⊖ pada baris sub-kategori — tanpa dialog konfirmasi' },
      { group: 'TA03-subkategori', file: 'fin-04b-konfirmasi-hapus.png', cap: 'fin-app: dialog "Hapus sub kategori?" pada penghapusan sub' },
    ],
  },
  {
    id: 'T-31',
    prdId: 'PRD-P-27',
    slug: 'ubah-nama-kategori-lewat-sub-kategori',
    title: 'Mengubah nama kategori: aplikasi asli lewat daftar sub-kategori',
    kategori: 'Kategori · interaksi ubah',
    prioritas: 'Low',
    parent: 'Kelola kategori pengeluaran / pendapatan',
    masuk: 'Lainnya → Kelola pengaturan → Kelola kategori pengeluaran',
    ringkas:
      'Untuk mengganti nama kategori, aplikasi asli tidak menyediakan tombol di daftar. Jalurnya ' +
      'melewati daftar sub-kategori lebih dulu. fin-app menyediakan tombol pensil yang langsung ' +
      'membuka dialog ubah nama.',
    mm: [
      'Jalur: tekan baris kategori → masuk daftar sub-kategori kategori itu → tekan pensil di header (`faEditSubcategory`) → layar `Edit kategori` → ubah `textValueView` → `Menyimpan`.',
      'Pensil di daftar kategori bukan untuk mengubah nama, melainkan pintasan ke daftar sub-kategori yang sama.',
      'Pensil header (`faEditSubcategory`) hanya ada di daftar sub-kategori; dari situ kategori induk disunting (bukti Tahap 3: `real-01-daftar-sub.png`).',
    ],
    fin: [
      'Jalur: tekan pensil pada baris kategori → dialog ubah nama → `Simpan kategori`.',
      'Chevron `>` pada baris yang membuka sub-kategori — padanan pensilnya di aplikasi asli.',
      'Pengelola sub-kategori hanya punya tombol kembali dan tambah; untuk mengubah nama kategori induk pengguna harus kembali ke daftar kategori.',
    ],
    dampak:
      'Pengguna aplikasi asli mencari nama lewat daftar sub-kategori; di fin-app tombolnya berbeda. ' +
      'Perlu keputusan apakah menambah jalur serupa atau menyimpan jalur fin-app yang lebih pendek.',
    butuhPRD: true,
    prd: {
      deskripsi:
        'Menambahkan pintu masuk pengubahan nama kategori induk dari dalam layar pengelola ' +
        'sub-kategori melalui tombol pensil header (`faEditSubcategory`), meniru alur navigasi ' +
        'aplikasi asli di mana nama kategori induk dapat disunting langsung saat mengelola sub-kategorinya.',
      tujuan: [
        'Pengguna tidak perlu kembali ke daftar kategori utama hanya untuk memperbaiki nama kategori induk.',
        'Pintu masuk konsisten dengan aplikasi asli (pensil di kanan header pengelola sub-kategori).',
        'Pintasan ubah nama yang sudah ada di fin-app tetap dapat dipertahankan untuk kenyamanan.',
      ],
      alur:
        'Daftar kategori → tekan baris kategori → masuk pengelola sub-kategori →\n' +
        '  └─ Tekan pensil di header kanan atas → dialog "Edit kategori" → ubah nama → "Menyimpan"',
      userStory: [
        { prio: 'Medium', role: 'pengguna yang sedang mengelola sub-kategori', want: 'mengubah nama kategori induk langsung dari header pengelola sub-kategori', so: 'saya tidak perlu menekan kembali ke daftar utama lalu mencari kategori itu lagi' },
        { prio: 'Rendah', role: 'pengguna aplikasi asli', want: 'menemukan pensil header di tempat yang sama seperti di Money Manager', so: 'alur pengubahan nama terasa alami' },
      ],
      struktur:
        'Header pengelola sub-kategori (ditambah tombol pensil ubah nama):\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  <  🍜 Food                           ✎   +  │  ← pensil header ubah nama induk\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  ⊖  Lunch                          ✎    ≡   │\n' +
        '│  ⊖  Dinner                         ✎    ≡   │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Pensil header pengelola sub-kategori',
          tipe: 'tombol aksi',
          fungsi: 'Membuka dialog ubah nama kategori induk saat ini.',
          opsi: 'Ikon pensil di header kanan pengelola sub-kategori',
          default: 'Selalu ada saat mengelola sub-kategori',
          perilaku: 'Ditekan → membuka dialog Ubah kategori yang sudah ada di fin-app, dengan nama induk saat ini terisi.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Header layar pengelola sub-kategori menyediakan tombol pensil di samping tombol tambah (+).' },
        { id: 'FR-02', teks: 'Menekan tombol pensil header membuka dialog ubah nama kategori induk.' },
        { id: 'FR-03', teks: 'Menyimpan nama baru memperbarui judul header pengelola sub-kategori dan nama kategori di basis data.' },
        { id: 'FR-04', teks: 'Batal menutup dialog tanpa mengubah nama kategori.' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Aksesibilitas: tombol pensil header memiliki `aria-label="Ubah nama kategori {NAMA}"` yang jelas.' },
        { id: 'NFR-02', teks: 'Konsistensi: dialog ubah nama yang dipanggil adalah komponen dialog yang sama dengan yang dipakai dari daftar kategori utama.' },
      ],
      interaksi: {
        navigasi: 'Lainnya → Kelola kategori → tekan baris → tekan pensil di header kanan atas.',
        simpan: 'Nama baru tersimpan saat pengguna menekan "Menyimpan" pada dialog.',
        validasi: 'Nama kategori tidak boleh kosong dan tidak boleh sama dengan kategori lain yang sudah ada.',
      },
      teramati: [
        'Asli: pensil header (`faEditSubcategory`) ada di daftar sub-kategori dan membuka layar "Edit kategori" (bukti `real-01-daftar-sub.png`, `real-03-setelah-ubah-nama.png`).',
        'fin-app: pengelola sub-kategori hanya punya tombol kembali dan tambah; tidak ada pensil di header (bukti `fin-01-daftar-sub.png`).',
      ],
      skema:
        'Tidak ada perubahan skema database. Pembaruan nama kategori memakai fungsi yang sudah ada:\n\n' +
        '```\n' +
        'categories.update(catId, { NAME: newName })\n' +
        '```',
      default: 'Nama kategori terisi nilai saat ini.',
      alurData:
        'Tekan pensil header → buka dialog dengan nama aktif → ketik nama baru\n' +
        '→ "Menyimpan" → categories.update(catId, { NAME }) → header dan daftar diperbarui.',
      error: [
        { id: 'E-01', teks: 'Nama baru kosong → tampilkan validasi "Nama kategori tidak boleh kosong".' },
        { id: 'E-02', teks: 'Nama sudah dipakai kategori lain → tampilkan "Nama kategori sudah ada".' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Kategori bawaan diubah namanya → nama baru tersimpan; tanda Bawaan tetap dipertahankan bila kategori itu bawaan.' },
        { id: 'EC-02', teks: 'Nama kategori sangat panjang → elipsis di judul header pengelola sub-kategori.' },
      ],
      internal: [
        { teks: '`components/sub-category-manager.tsx` — header pengelola sub-kategori tempat tombol pensil ditambahkan.' },
        { teks: '`components/confirm-dialog.tsx` / dialog `Ubah kategori` — dialog yang dipakai ulang.' },
        { teks: '`lib/db.ts` — fungsi pembaruan nama kategori.' },
      ],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Buka pengelola sub-kategori Food, tekan pensil di header, ubah jadi "Food & Drink", simpan, pastikan judul header langsung berubah.',
      metrics: [
        { teks: 'Tombol pensil hadir di header sub-category-manager.' },
        { teks: 'Menyimpan nama baru mengubah judul header seketika.' },
      ],
      verifikasi: {
        ok: [
          'Asli: pensil header ada di daftar sub-kategori dan membuka layar Edit kategori (bukti `real-01-daftar-sub.png`, `real-03-setelah-ubah-nama.png`).',
          'fin-app: pengelola sub-kategori tidak memiliki tombol pensil di header; pengguna harus kembali ke daftar utama (bukti `fin-01-daftar-sub.png`).',
        ],
        belum: [
          '❓ Apakah di aplikasi asli pensil di daftar kategori utama benar-benar hanya membuka sub-kategori atau punya fungsi lain saat saklar mati (dianalisis di T-33).',
        ],
      },
    },
    bukti: [
      { group: 'TA02-kategori', file: 'panjang-langkah.md', cap: 'Perbandingan jumlah langkah tiap aksi' },
      { group: 'TA02-kategori', file: 'fin-03-form-ubah.png', cap: 'fin-app: dialog ubah nama langsung dari daftar' },
      { group: 'TA02-kategori', file: 'real-03-setelah-ubah-nama.png', cap: 'Asli: hasil setelah nama diubah lewat layar Edit kategori' },
      { group: 'TA03-subkategori', file: 'real-01-daftar-sub.png', cap: 'Asli: pensil header di daftar sub-kategori — pintu masuk layar "Edit kategori"' },
      { group: 'TA03-subkategori', file: 'real-07b-kategori-saat-saklar-mati.png', cap: 'Asli: layar "Edit kategori" yang sama, tercapai dari baris saat sub-kategori dimatikan' },
    ],
  },
  {
    id: 'T-32',
    prdId: 'PRD-P-28',
    selesai: '24 Oktober 2026',
    selesaiCatatan:
      'Angka jumlah sub dan daftar nama sub hanya dirender saat saklar "Fungsi sub kategori" ' +
      'menyala; saat mati baris hanya menampilkan nama kategori + tanda "Bawaan" (diuji ulang ' +
      'lewat `pnpm test:ui` TC-SUB-E05 dan SK-07)',
    slug: 'angka-sub-kategori-saat-mati',
    title: 'Angka jumlah sub-kategori tetap tampil saat sub-kategori dimatikan',
    kategori: 'Kategori · tampilan daftar',
    prioritas: 'Low',
    parent: 'Kelola kategori pengeluaran / pendapatan',
    masuk: 'Lainnya → Kelola pengaturan → Kelola kategori pengeluaran',
    ringkas:
      'Saat saklar sub-kategori dimatikan, aplikasi asli membersihkan baris kategori sampai ' +
      'tersisa emoji dan nama saja. fin-app tetap menampilkan jumlah sub-kategori dalam tanda ' +
      'kurung, sehingga terlihat seolah sub-kategori masih aktif.',
    mm: [
      'Saklar `Mati`: baris menampilkan emoji + nama saja — `Food`, bukan `Food (4)`. Tidak ada baris kedua berisi nama sub-kategori.',
      'Saklar `Aktif`: baris menampilkan `Food (4)` dengan daftar sub-kategori di baris kedua.',
    ],
    fin: [
      'Saklar `Mati`: baris tetap menampilkan `Food (4)` + tanda `Bawaan`, tanpa daftar sub-kategori.',
      'Saklar `Aktif`: baris menampilkan `Food (4)` + daftar sub-kategori — sama seperti aplikasi asli ✅.',
    ],
    dampak:
      'Ketika sub-kategori dimatikan, jumlah pada tanda kurung menjadi angka yang tidak bisa ' +
      'ditindaklanjuti pengguna — tidak ada cara melihat isinya dari layar itu.',
    butuhPRD: true,
    bukti: [
      { group: 'TA02-kategori', file: 'real-05-saklar-sub-kategori-mati.png', cap: 'Asli: saklar Mati — hanya emoji + nama, tanpa angka' },
      { group: 'TA02-kategori', file: 'fin-01-daftar-pengeluaran.png', cap: 'fin-app: saklar Mati — angka (4) masih tampil' },
      { group: 'TA02-kategori', file: 'fin-05-saklar-sub-kategori.png', cap: 'fin-app: saklar Aktif — tampilannya sudah sama dengan asli' },
    ],
    prd: {
      deskripsi:
        'Menetapkan tampilan baris kategori saat fitur sub-kategori dimatikan: jumlah sub-kategori ' +
        'dan daftar nama sub hanya boleh muncul ketika saklar "Fungsi sub kategori" menyala, ' +
        'seperti perilaku aplikasi asli.',
      tujuan: [
        'Baris kategori tidak menampilkan angka yang tidak bisa ditindaklanjuti saat sub-kategori dimatikan.',
        'Tampilan baris sama dengan aplikasi asli pada kedua keadaan saklar.',
        'Perubahan hanya menyentuh tampilan; data sub-kategori tetap utuh dan kembali terlihat saat saklar dinyalakan.',
      ],
      alur:
        'Daftar kategori → saklar "Fungsi sub kategori"\n' +
        '  ├─ Aktif → baris "🍜 Food (4)" + baris kedua nama sub   (sudah sesuai)\n' +
        '  └─ Mati  → baris "🍜 Food" saja, tanpa angka dan tanpa baris kedua   (yang diusulkan)',
      userStory: [
        { prio: 'Tinggi', role: 'pengguna yang mematikan sub-kategori', want: 'melihat baris kategori yang bersih tanpa angka sub', so: 'saya tidak mengira sub-kategori masih aktif padahal fiturnya sedang mati' },
        { prio: 'Medium', role: 'pengguna pembaca layar', want: 'mendengar nama kategori dan jumlah sub yang konsisten dengan yang terlihat', so: 'informasi yang saya dengar tidak bertentangan dengan layar' },
      ],
      struktur:
        'Keadaan saklar (yang diusulkan, mengikuti aplikasi asli):\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  ◯  Fungsi sub kategori             Aktif    │\n' +
        '│  ☐  🍜 Food (4)  [Bawaan]   ↑ ↓ ✎     ≡      │\n' +
        '│      Lunch, Dinner, Eating out, Beverages     │  ← baris kedua\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  ◯  Fungsi sub kategori              Mati    │\n' +
        '│  ☐  🍜 Food  [Bawaan]       ↑ ↓ ✎            │  ← tanpa (4), tanpa baris kedua\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Label jumlah sub-kategori',
          tipe: 'tampilan',
          fungsi: 'Menunjukkan berapa sub-kategori yang dimiliki sebuah kategori.',
          opsi: 'Selalu tampil, atau hanya saat saklar sub-kategori menyala',
          default: 'Hanya saat saklar menyala (mengikuti aplikasi asli)',
          perilaku:
            'Angka `(N)` dirender hanya bila `use_sub_category` aktif dan kategori punya sub. ' +
            'Saat saklar mati, label teksnya sama persis dengan nama kategori.',
        },
        {
          nama: 'Baris kedua daftar sub',
          tipe: 'tampilan',
          fungsi: 'Menampilkan nama-nama sub-kategori di bawah nama kategori.',
          opsi: 'Selalu tampil, atau hanya saat saklar menyala',
          default: 'Hanya saat saklar menyala (sudah begitu di fin-app)',
          perilaku:
            'Tidak berubah: baris kedua sudah disembunyikan saat saklar mati. PRD ini hanya ' +
            'menyelaraskan label jumlah agar tidak bertentangan dengan baris kedua yang kosong.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Bila saklar `Fungsi sub kategori` `Mati`, label baris kategori = nama kategori (dan tanda `Bawaan` bila kategori bawaan) — tanpa `(N)`.' },
        { id: 'FR-02', teks: 'Bila saklar `Aktif`, label baris kategori tetap menampilkan `(N)` setelah nama, seperti sekarang.' },
        { id: 'FR-03', teks: 'Elemen `sub-count` tidak dirender sama sekali saat saklar mati (bukan hanya disembunyikan secara visual).' },
        { id: 'FR-04', teks: '`aria-label` tombol baris tidak memuat jumlah sub; jumlah hanya diumumkan lewat elemen teks saat saklar menyala.' },
        { id: 'FR-05', teks: 'Menyembunyikan angka tidak boleh mengubah data sub-kategori; menyalakan saklar kembali langsung memunculkan angka dan nama sub yang sama.' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Konsistensi: susunan kolom baris (emoji, nama, tanda bawaan, tombol) tidak berubah antara kedua keadaan.' },
        { id: 'NFR-02', teks: 'Keterbacaan: baris tanpa angka tidak boleh terlihat seperti data yang hilang — nama kategori tetap menjadi teks utama.' },
      ],
      interaksi: {
        navigasi: 'Saklar berada di baris pertama layar daftar kategori; perubahan langsung berlaku pada daftar tanpa memuat ulang halaman.',
        simpan: 'Nilai saklar tersimpan pada setelan aplikasi (padanan `use_sub_category` di `lib/db.ts`); tidak ada penyimpanan tambahan untuk PRD ini.',
        validasi: 'Tidak ada masukan bebas pada PRD ini.',
      },
      teramati: [
        'Asli, saklar `Mati`: label baris `🍜 Food` saja — tanpa angka dan tanpa baris kedua nama sub (bukti `real-05`/`real-07a`, Tahap 2–3).',
        'Asli, saklar `Aktif`: label baris `🍜 Food (4)` dengan nama sub di baris kedua (bukti `real-01`, Tahap 3).',
        'fin-app, saklar `Mati`: label baris `🍜 Food (4) Bawaan` — angka tetap tampil walau baris kedua sudah disembunyikan (bukti `fin-07a`, Tahap 3).',
      ],
      skema:
        'Tidak ada perubahan skema. Hanya aturan render pada komponen daftar kategori:\n\n' +
        '```\n' +
        'tampilkanJumlahSub = subCategoryEnabled && subs.length > 0\n' +
        'tampilkanDaftarSub = subCategoryEnabled && subs.length > 0   // sudah berlaku\n' +
        '```',
      default: 'Nilai bawaan saklar mengikuti temuan T-23 (asli `Aktif`, fin-app `Mati`); PRD ini tidak mengubah bawaan tersebut.',
      alurData:
        'Setelan `use_sub_category` → status komponen daftar → jumlah sub per kategori dari tabel `categories` → label baris.\n' +
        'Saklar diubah → setelan disimpan → daftar dicetak ulang dengan aturan baru.',
      error: [
        { id: 'E-01', teks: 'Kategori tanpa sub (`subs.length = 0`) → tidak ada angka yang dirender, pada keadaan saklar mana pun.' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Saklar dimatikan lalu dinyalakan lagi → angka dan nama sub muncul kembali tanpa kehilangan data.' },
        { id: 'EC-02', teks: 'Daftar kategori pendapatan diperlakukan sama seperti pengeluaran.' },
        { id: 'EC-03', teks: 'Tanda `Bawaan` tetap tampil di kedua keadaan (fin-app menampilkannya; aplikasi asli belum diamati memakai penanda ini — lihat bagian ❓).' },
      ],
      internal: [
        { teks: '`components/category-list.tsx` — blok `subs.length > 0` yang merender `data-testid={`sub-count-${cat.NAME}`}`.' },
        { teks: '`lib/db.ts` — setelan `use_sub_category` sebagai sumber keadaan saklar.' },
      ],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Uji UI `pnpm test:ui` (TS-06) + uji paritas Tahap 3 SK-07 pada `tests/parity/ta03-subkategori.mjs`.',
      metrics: [
        { teks: 'Teks baris saat saklar mati tidak cocok dengan pola `\\(\\d+\\)`.' },
        { teks: 'Teks baris saat saklar mati sama dengan nama kategori + tanda bawaan, tanpa elemen tambahan.' },
      ],
      verifikasi: {
        ok: [
          'Asli: saklar Mati → baris `🍜 Food` tanpa angka; saklar Aktif → `🍜 Food (4)` (bukti `real-07a`, `real-01`).',
          'fin-app: saklar Mati → baris `🍜 Food (4) Bawaan` (bukti `fin-07a`), jadi selisihnya hanya pada angka.',
        ],
        belum: [
          '❓ Apakah aplikasi asli menampilkan penanda "bawaan" pada kategori bawaan — belum terlihat pada tangkapan layar.',
          '❓ Apakah aplikasi asli menyembunyikan angka juga pada daftar kategori pendapatan (belum dipotret saat saklar mati).',
        ],
      },
    },
  },
  {
    id: 'T-33',
    prdId: 'PRD-P-29',
    selesai: '18 Oktober 2026',
    selesaiCatatan:
      'Baris kategori selalu aktif: saklar hidup membuka daftar sub-kategori, saklar mati membuka ' +
      'dialog "Edit kategori" (diuji ulang lewat `pnpm test:ui` TC-SUB-E05 dan SK-07b)',
    slug: 'baris-kategori-buntu-saat-sub-kategori-mati',
    title: 'Baris kategori buntu saat saklar sub-kategori dimatikan',
    kategori: 'Kategori · navigasi baris',
    prioritas: 'Medium',
    parent: 'Kelola kategori pengeluaran / pendapatan',
    masuk: 'Lainnya → Kelola pengaturan → Kelola kategori pengeluaran, dengan saklar "Fungsi sub kategori" = Mati',
    ringkas:
      'Saat saklar "Fungsi sub kategori" dimatikan, aplikasi asli memindahkan tindakan baris ' +
      'kategori ke pengubahan kategori: yang terbuka adalah layar "Edit kategori". fin-app ' +
      'menonaktifkan baris itu sepenuhnya — penekanan tidak menghasilkan apa pun dan tidak ada ' +
      'tanda pada barisnya bahwa ia sedang tidak aktif.',
    mm: [
      'Saklar `Mati` → menekan baris `🍜 Food` membuka layar `Edit kategori` (satu kolom nama kategori + tombol `Menyimpan`).',
      'Saklar `Aktif` → baris yang sama membuka daftar sub-kategori; layar `Edit kategori` pindah ke pensil header (`faEditSubcategory`).',
      'Pada saklar `Mati`, label baris juga ikut bersih: `🍜 Food` saja — tanpa angka jumlah sub dan tanpa baris kedua berisi nama sub (lihat T-32).',
    ],
    fin: [
      'Saklar `Mati` → `aria-label="Kelola sub kategori …"` hilang dari tombol baris dan tombol itu menjadi `disabled`; penekanan tidak membuka layar apa pun.',
      'Baris tetap menampilkan chevron `>` serta angka `(4)` dan tanda `Bawaan`, jadi tidak tampak bahwa baris itu tidak aktif.',
      'Mengubah nama kategori masih bisa lewat tombol pensil `Ubah kategori {NAMA}`, yang tidak dipengaruhi saklar.',
    ],
    dampak:
      'Pengguna aplikasi asli yang mematikan sub-kategori tetap bisa membuka dan mengubah kategori ' +
      'lewat barisnya. Di fin-app baris itu jadi area mati: terlihat sama seperti baris aktif, ' +
      'tetapi tidak bereaksi. Karena tidak ada penanda apa pun, pengguna bisa mengira aplikasinya ' +
      'sedang bermasalah.',
    butuhPRD: true,
    bukti: [
      { group: 'TA03-subkategori', file: 'real-07a-kategori-saklar-mati.png', cap: 'Asli: saklar Mati — label bersih, baris tetap dapat ditekan' },
      { group: 'TA03-subkategori', file: 'real-07b-kategori-saat-saklar-mati.png', cap: 'Asli: setelah baris ditekan → layar "Edit kategori"' },
      { group: 'TA03-subkategori', file: 'fin-07a-kategori-saklar-mati.png', cap: 'fin-app: saklar Mati — baris tetap aktif dan ber-aria-label "Ubah kategori 🍜 Food", tanpa jumlah sub (T-32 diperbaiki)' },
      { group: 'TA03-subkategori', file: 'fin-07b-kategori-saat-saklar-mati.png', cap: 'fin-app: setelah baris ditekan → dialog "Edit kategori" terbuka' },
    ],
    prd: {
      deskripsi:
        'Menetapkan apa yang terjadi saat baris kategori ditekan ketika fitur sub-kategori ' +
        'dimatikan: baris harus tetap punya tindakan, dan bila memang nonaktif harus jelas ' +
        'terlihat serta terbaca oleh teknologi bantu.',
      tujuan: [
        'Tidak ada baris kategori yang menjadi area mati tanpa penjelasan.',
        'Perilaku baris mengikuti aplikasi asli: saklar mati → membuka pengubahan kategori.',
        'Baris nonaktif, bila tetap dipertahankan, punya penanda visual dan tetap punya nama aksesibilitas.',
      ],
      alur:
        'Daftar kategori → saklar "Fungsi sub kategori"\n' +
        '  ├─ Aktif  → tekan baris → pengelola sub-kategori   (perilaku sekarang)\n' +
        '  └─ Mati   → tekan baris → dialog "Ubah kategori"   (perilaku aplikasi asli)',
      userStory: [
        { prio: 'Tinggi', role: 'pengguna yang mematikan sub-kategori', want: 'tetap dapat membuka dan mengubah kategori dari barisnya', so: 'saya tidak perlu mencari tombol lain untuk mengganti nama' },
        { prio: 'Medium', role: 'pengguna pembaca layar', want: 'setiap baris selalu punya nama aksesibilitas', so: 'saya tahu baris itu ada dan apa isinya' },
      ],
      struktur:
        'Keadaan saklar Mati (yang diusulkan, mengikuti aplikasi asli):\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  ◯  Fungsi sub kategori              Mati    │\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  ☐  🍜 Food  [Bawaan]          ↑ ↓ ✎     >   │  ← tekan baris = ubah kategori\n' +
        '│  ☐  🐶 Pets  [Bawaan]          ↓   ✎     >   │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Tindakan baris saat sub-kategori mati',
          tipe: 'navigasi',
          fungsi: 'Menentukan tujuan penekanan baris.',
          opsi: 'Membuka pengubahan kategori (mengikuti aplikasi asli) atau tetap membuka daftar sub-kategori',
          default: 'Membuka pengubahan kategori',
          perilaku:
            'Penekanan di area nama baris membuka dialog `Ubah kategori` yang sudah ada di ' +
            'fin-app. Chevron `>` disembunyikan karena baris tidak lagi berpindah halaman.',
        },
        {
          nama: 'Keadaan baris nonaktif',
          tipe: 'tampilan',
          fungsi: 'Menandai baris yang tidak dapat ditekan.',
          opsi: 'Penanda visual + teks bantuan, atau hilangkan keadaan nonaktif sama sekali',
          default: 'Baris tidak pernah nonaktif',
          perilaku:
            'Bila tetap ada kondisi baris nonaktif, tampilkan peredupan pada nama dan ' +
            'sertakan alasan singkat (mis. "Aktifkan fungsi sub kategori untuk mengelola isinya").',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Bila saklar `Fungsi sub kategori` `Mati`, menekan baris kategori membuka pengubahan kategori (dialog `Ubah kategori`).' },
        { id: 'FR-02', teks: 'Bila saklar `Aktif`, menekan baris kategori membuka pengelola sub-kategori seperti sekarang.' },
        { id: 'FR-03', teks: 'Tombol pada baris selalu memiliki `aria-label`; tidak boleh bernilai `undefined` pada keadaan mana pun.' },
        { id: 'FR-04', teks: 'Chevron `>` pada baris hanya ditampilkan bila penekanan baris memang berpindah halaman.' },
        { id: 'FR-05', teks: 'Baris kategori tidak boleh berakhir dalam keadaan `disabled` tanpa penanda visual dan tanpa penjelasan teks.' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Aksesibilitas: seluruh baris dapat dijangkau dan dibaca pembaca layar pada semua keadaan saklar.' },
        { id: 'NFR-02', teks: 'Konsistensi: keadaan saklar tidak boleh mengubah susunan kolom pada baris (posisi emoji, nama, tombol tetap).' },
      ],
      interaksi: {
        navigasi: 'Saklar berada di baris pertama layar daftar kategori; perubahannya langsung berlaku tanpa memuat ulang halaman.',
        simpan: 'Nilai saklar tersimpan pada setelan aplikasi (padanan `use_sub_category` di `lib/db.ts`).',
        validasi: 'Tidak ada masukan bebas; hanya dua keadaan (Aktif / Mati).',
      },
      teramati: [
        'Asli, saklar `Mati`: label `🍜 Food` tanpa angka; menekan baris membuka `Edit kategori` (judul layar ini terbaca dari `titleName`).',
        'Asli, saklar `Aktif`: label `🍜 Food (4)`; menekan baris membuka daftar sub-kategori.',
        'fin-app, saklar `Mati`: jumlah elemen ber-`aria-label` `Kelola sub kategori …` = 0; tombol baris `disabled = true`.',
      ],
      skema:
        'Tidak ada perubahan skema. Yang berubah hanya aturan tampil/tindak pada komponen daftar kategori:\n\n' +
        '```\n' +
        'onRowPress(cat) =\n' +
        '  subCategoryEnabled ? bukaPengelolaSub(cat) : bukaDialogUbahKategori(cat)\n' +
        '```',
      default: 'Saklar `Fungsi sub kategori` bawaan aplikasi asli `Aktif`; fin-app saat ini `Mati` (lihat T-23).',
      alurData:
        'Setelan saklar → status komponen daftar → (Aktif) pengelola sub-kategori | (Mati) dialog ubah kategori.\n' +
        'Perubahan saklar → simpan setelan → daftar dicetak ulang.',
      error: [
        { id: 'E-01', teks: 'Kategori sudah dihapus di tab lain → tekan baris tidak menemukan data → tampilkan pesan singkat dan muat ulang daftar.' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Kategori tanpa sub-kategori → tetap dapat dibuka pengubahan kategori.' },
        { id: 'EC-02', teks: 'Kategori bawaan → pengubahan nama tetap diizinkan seperti sekarang (tombol tersedia di semua keadaan).' },
        { id: 'EC-03', teks: 'Mode pendapatan → perilaku sama; saklar berlaku untuk kedua daftar.' },
      ],
      internal: [
        { teks: '`components/category-list.tsx` — tombol baris, `aria-label`, dan `disabled` saat ini dipakai bersama tombol chevron.' },
        { teks: '`components/confirm-dialog.tsx` / dialog `Ubah kategori` — tujuan alternatif saat saklar mati.' },
      ],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Lihat TS-06 (Sub-kategori), TC "baris kategori saat saklar dimatikan" pada SKENARIO.md Tahap 3, langkah SK-07.',
      metrics: [
        { teks: 'Tidak ada elemen baris yang berakhir `disabled` tanpa penanda.' },
        { teks: 'Setiap baris memiliki nama aksesibilitas pada kedua keadaan saklar.' },
      ],
      verifikasi: {
        ok: [
          'Asli: saklar Mati → baris dapat ditekan dan membuka `Edit kategori` (bukti `real-07a`/`real-07b`, Tahap 3).',
          'Asli: saklar Mati → label baris tanpa angka jumlah sub (bukti `real-07a`).',
          'fin-app: saklar Mati → `aria-label` hilang dan tombol baris `disabled` (bukti `fin-07`).',
        ],
        belum: [
          '❓ Apakah layar `Edit kategori` aplikasi asli juga memuat kolom sub-kategori saat saklar mati — belum dibuka sampai tombol simpan.',
          '❓ Apakah fin-app menyimpan alasan lain untuk menonaktifkan baris (mis. saat kategori dikunci) — belum ditemukan di kode.',
        ],
      },
    },
  },
  {
    id: 'T-34',
    prdId: 'PRD-P-30',
    selesai: '18 Oktober 2026',
    selesaiCatatan:
      'Kolom "Kategori" pada dialog sub-kategori dapat ditekan dan menampilkan kategori utama ' +
      'sejenis sebagai pilihan; menyimpan sub memindahkannya ke induk yang dipilih (diuji ulang ' +
      'lewat `pnpm test:ui` TC-SUB-E03 dan SK-06b)',
    slug: 'kategori-induk-tidak-dapat-diganti',
    title: 'Kategori induk sub-kategori tidak dapat diganti di fin-app',
    kategori: 'Sub-kategori · pengelolaan',
    prioritas: 'Medium',
    parent: 'Kelola kategori pengeluaran / pendapatan → daftar sub-kategori',
    masuk: 'Lainnya → Kelola pengaturan → Kelola kategori pengeluaran → tekan <kategori> → ubah salah satu sub-kategori',
    ringkas:
      'Aplikasi asli membiarkan sub-kategori berpindah induk: baris `Kategori` di layar ' +
      'tambah/edit sub-kategori dapat ditekan dan memunculkan seluruh kategori utama. Di fin-app ' +
      'kolom `Kategori` hanya teks terkunci, sehingga sub-kategori yang salah tempat tidak bisa ' +
      'dipindahkan — hanya bisa dihapus lalu dibuat ulang.',
    mm: [
      'Layar `Edit sub kategori` memuat baris `Kategori` (`categoryValueBlock`) yang isinya dapat ditekan (`categoryTextView` = kategori induk saat ini).',
      'Menekannya memunculkan panel `Kategori` dari bawah layar (`subTitleName`) berisi 12 tombol `kindButton` dalam tiga kolom: `🍜 Food`, `👬🏻 Social Life`, `🐶 Pets`, `🚖 Transport`, `🖼 Culture`, `🪑 Household`, `🧥 Apparel`, `💄 Beauty`, `🧘🏼 Health`, `📙 Education`, `🎁 Gift`, `Other`.',
      'Panel itu punya pensil (`editButton`) untuk menyunting daftar kategori dan tombol `✕` untuk menutup.',
      'Baris `Kategori` yang sama ada di layar `Sub kategori` (tambah), jadi induk juga dapat dipilih sebelum sub dibuat.',
    ],
    fin: [
      'Dialog `Sub kategori` / `Edit sub kategori` menampilkan kolom `Kategori` sebagai `<input readOnly>` berisi nama induk; tidak ada daftar pilihan maupun tombol buka.',
      'Yang tersedia hanyalah aksi `Jadikan kategori utama` (naik pangkat, lihat T-35) — bukan pindah induk.',
      'Untuk memindahkan sub-kategori, pengguna harus menghapus sub itu lalu membuatnya ulang di kategori lain.',
    ],
    dampak:
      'Salah pilih induk memaksa pengguna menghapus dan mengetik ulang nama sub-kategori, dan ' +
      'keterkaitan sub itu dengan catatan lama berisiko hilang. Aplikasi asli menyelesaikannya ' +
      'dengan satu ketukan.',
    butuhPRD: true,
    bukti: [
      { group: 'TA03-subkategori', file: 'real-06-pilih-kategori-induk.png', cap: 'Asli: panel `Kategori` dengan grid 12 kategori utama di layar Edit sub kategori' },
      { group: 'TA03-subkategori', file: 'fin-05-layar-edit-sub.png', cap: 'fin-app: kolom `Kategori` read-only di dialog Edit sub kategori' },
      { group: 'TA03-subkategori', file: 'perbandingan.md', cap: 'Tabel perbandingan Tahap 3 (baris "Kategori induk")' },
    ],
    prd: {
      deskripsi:
        'Menambah kemampuan memindahkan sub-kategori ke kategori induk lain dari layar ' +
        'pengelolaan sub-kategori, meniru panel pemilih kategori pada aplikasi asli.',
      tujuan: [
        'Sub-kategori yang salah induk bisa dipindahkan tanpa menghapus dan membuat ulang.',
        'Pemilihan induk dilakukan dari layar yang sama, tanpa kehilangan konteks.',
        'Struktur dan penamaan kategori tetap mengikuti data yang sudah ada.',
      ],
      alur:
        'Daftar kategori → kategori (mis. Food) → pengelola sub-kategori → pilih sub →\n' +
        'dialog "Edit sub kategori" → tekan kolom "Kategori" → panel pilihan kategori →\n' +
        'pilih kategori lain → kolom berubah → "Menyimpan".',
      userStory: [
        { prio: 'Tinggi', role: 'pengguna', want: 'memindahkan sub-kategori ke kategori lain', so: 'saya tidak perlu menghapus dan membuat ulang datanya' },
        { prio: 'Medium', role: 'pengguna baru', want: 'melihat seluruh kategori utama saat memilih induk', so: 'saya tidak salah menaruh sub-kategori di awal' },
      ],
      struktur:
        'Dialog edit sub-kategori dengan panel pilihan (mengikuti aplikasi asli):\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  Edit sub kategori            [Kategori utama]│\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  Kategori      🍜 Food                      > │  ← tekan\n' +
        '│  Nama sub      ZzSubEdit                      │\n' +
        '│  [ Batal ]                     [ Menyimpan ]  │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '        ↓ setelah kolom Kategori ditekan\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  Kategori                            ✎    ✕  │\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  🍜 Food      │  👬🏻 Social Life │  🐶 Pets     │\n' +
        '│  🚖 Transport │  🖼 Culture      │  🪑 Household│\n' +
        '│  🧥 Apparel   │  💄 Beauty       │  🧘🏼 Health  │\n' +
        '│  📙 Education │  🎁 Gift         │  Other      │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Kolom Kategori pada dialog ubah sub',
          tipe: 'pemilih',
          fungsi: 'Menampilkan dan mengubah kategori induk sub-kategori.',
          opsi: 'Seluruh kategori utama pada jenis yang sama (pengeluaran atau pendapatan)',
          default: 'Kategori induk sub-kategori saat ini',
          perilaku:
            'Ditekan → panel pilihan muncul dari bawah layar. Memilih satu kategori menutup ' +
            'panel dan mengganti nilai kolom; nilai baru tersimpan saat `Menyimpan` ditekan.',
        },
        {
          nama: 'Panel pilihan kategori',
          tipe: 'daftar pilihan',
          fungsi: 'Memilih kategori induk baru.',
          opsi: 'Grid tiga kolom berisi seluruh kategori utama, ditambah pensil (kelola kategori) dan `✕` (tutup)',
          default: 'Panel tertutup',
          perilaku:
            'Nama kategori mengikuti data pengguna; tidak ada kolom pencarian pada aplikasi ' +
            'asli. Tekan di luar panel atau `✕` membatalkan pilihan.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Dialog ubah sub-kategori menampilkan kolom `Kategori` yang dapat ditekan, bukan teks terkunci.' },
        { id: 'FR-02', teks: 'Menekan kolom itu menampilkan seluruh kategori utama jenis yang sama; kategori induk saat ini ditandai sebagai terpilih.' },
        { id: 'FR-03', teks: 'Memilih kategori lain mengubah nilai kolom dan menyimpan perpindahan saat `Menyimpan` ditekan.' },
        { id: 'FR-04', teks: 'Pengurutan sub-kategori pada kategori tujuan ikut menyesuaikan (sub baru diletakkan di akhir bila belum punya posisi).' },
        { id: 'FR-05', teks: 'Memindahkan sub-kategori tidak menghapus keterkaitan sub itu dengan transaksi dan berulang yang sudah ada.' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Konsistensi data: perpindahan dilakukan dalam satu transaksi basis data agar tidak ada sub tanpa induk.' },
        { id: 'NFR-02', teks: 'Usability: panel mengikuti pola panel yang sudah dipakai fin-app (fokus terperangkap, `Esc`/`✕` menutup).' },
      ],
      interaksi: {
        navigasi: 'Lewat ikon pensil pada baris sub-kategori di pengelola sub-kategori; dialog yang sudah ada dipakai ulang.',
        simpan: 'Nilai induk baru tersimpan saat tombol `Menyimpan` ditekan; `Batal` mengembalikan nilai lama.',
        validasi: 'Hanya kategori utama pada jenis yang sama yang boleh dipilih; sub-kategori tidak dapat menjadi induk.',
      },
      teramati: [
        'Asli: panel `Kategori` menampilkan 12 tombol `kindButton` dalam grid tiga kolom (bukti `real-06`, Tahap 3).',
        'Asli: panel memiliki pensil `editButton` dan tombol tutup `✕`.',
        'fin-app: elemen `Kategori induk` bertipe `<input readOnly=true>` (bukti `fin-05`, Tahap 3).',
      ],
      skema:
        'Kolom induk sudah ada pada tabel kategori (`PARENT`). Perpindahan hanya mengubah kolom itu:\n\n' +
        '```\n' +
        'categories.update(subId, { PARENT: kategoriTujuanId })\n' +
        '```\n\n' +
        'Bila pengurutan disimpan per kategori, sub yang dipindah diberi posisi terakhir pada kategori tujuan.',
      default: 'Kolom `Kategori` terisi induk sub saat ini.',
      alurData:
        'Tekan kolom Kategori → muat daftar kategori utama (jenis sama) → pilih → set nilai\n' +
        '→ `Menyimpan` → `categories.update({ PARENT })` → muat ulang daftar sub-kategori induk baru.',
      error: [
        { id: 'E-01', teks: 'Tidak ada kategori lain tersedia → kolom tetap dapat ditekan tetapi panel menampilkan "Belum ada kategori lain" dan tombol pensil untuk menambah.' },
        { id: 'E-02', teks: 'Penyimpanan gagal → dialog tetap terbuka dan pesan kesalahan muncul lewat notifikasi ringan (pola `sonner` yang sudah dipakai).' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Kategori tujuan berisi banyak sub → sub yang dipindah masuk di akhir daftar.' },
        { id: 'EC-02', teks: 'Sub-kategori terpilih sebagai induk → dicegah, karena daftar hanya memuat kategori utama.' },
        { id: 'EC-03', teks: 'Perpindahan lintas jenis (pengeluaran → pendapatan) → tidak disediakan, sama seperti aplikasi asli.' },
      ],
      internal: [
        { teks: '`components/sub-category-manager.tsx` — dialog tambah/ubah sub-kategori dan kolom `Kategori induk`.' },
        { teks: '`lib/db.ts` (`categories`) — kolom induk sub-kategori.' },
      ],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Lihat TS-06 (Sub-kategori), TC "pindah induk sub-kategori" pada SKENARIO.md Tahap 3, langkah SK-06.',
      metrics: [
        { teks: 'Sub-kategori dapat berpindah induk tanpa menghapus data lama.' },
        { teks: 'Jumlah sub pada kategori asal dan tujuan berubah sesuai perpindahan.' },
      ],
      verifikasi: {
        ok: [
          'Asli: baris `Kategori` dapat ditekan dan memunculkan 12 kategori utama (bukti `real-06`, Tahap 3).',
          'fin-app: kolom `Kategori` bertipe read-only dan tidak menyediakan pilihan (bukti `fin-05`, Tahap 3).',
        ],
        belum: [
          '❓ Efek menekan salah satu `kindButton` belum diverifikasi (panel ditutup tanpa memilih, agar data uji tidak berubah).',
          '❓ Apakah aplikasi asli menyimpan urutan sub saat sub dipindah ke kategori yang sudah punya sub.',
        ],
      },
    },
  },
  {
    id: 'T-35',
    prdId: 'PRD-P-31',
    selesai: '18 Oktober 2026',
    selesaiCatatan:
      'Dialog tambah sub-kategori juga menyediakan tombol "Kategori utama" dengan konfirmasi yang ' +
      'sama; menyetujui membuat kategori utama baru dari nama yang sudah diketik (diuji ulang lewat ' +
      '`pnpm test:ui` TC-SUB-E04 dan SK-05d)',
    slug: 'pintasan-kategori-utama-hanya-di-mode-ubah',
    title: 'Pintasan "Kategori utama" hanya ada di mode ubah, tidak di mode tambah',
    kategori: 'Sub-kategori · pengelolaan',
    prioritas: 'Low',
    parent: 'Kelola kategori pengeluaran / pendapatan → daftar sub-kategori',
    masuk: 'Lainnya → Kelola pengaturan → Kelola kategori pengeluaran → tekan <kategori> → tombol + (tambah sub-kategori)',
    ringkas:
      'Aplikasi asli menaruh tombol `Kategori utama` di kanan atas layar menambah sub-kategori — ' +
      'jadi sub yang sedang diketik bisa langsung dijadikan kategori utama. fin-app hanya ' +
      'menyediakan tombol itu di dialog ubah, sedangkan dialog tambah berhenti pada `Batal` dan ' +
      '`Menyimpan`.',
    mm: [
      'Layar `Sub kategori` (tambah) memiliki tombol kanan atas `Kategori utama`.',
      'Layar `Edit sub kategori` (ubah) memiliki tombol yang sama di posisi yang sama.',
      'Menekannya memunculkan konfirmasi `Sub kategori akan diubah ke kategori utama. Apakah anda yakin untuk mengubahnya?` dengan tombol `TIDAK` dan `YA` — teks yang sama persis pada kedua layar.',
    ],
    fin: [
      'Dialog `Tambah sub kategori` hanya memuat `Kategori` (read-only), kolom nama, lalu tombol `Batal` dan `Menyimpan`.',
      'Tombol `Jadikan kategori utama` hanya muncul di dialog `Edit sub kategori`.',
      'Teks konfirmasinya di fin-app sudah sama dengan aplikasi asli: `Jadikan kategori utama? Sub kategori akan diubah ke kategori utama. Apakah anda yakin untuk mengubahnya?` — cocok ✅.',
    ],
    dampak:
      'Pengguna yang menyadari sub-kategorinya seharusnya kategori utama harus menyimpan dulu, ' +
      'membuka ulang, lalu menaikkan pangkatnya. Dampaknya kecil karena jalurnya tetap ada, ' +
      'tetapi menambah satu putaran langkah yang tidak ada di aplikasi asli.',
    butuhPRD: true,
    bukti: [
      { group: 'TA03-subkategori', file: 'real-02a-form-tambah-sub.png', cap: 'Asli: layar tambah sub dengan tombol `Kategori utama` di kanan atas' },
      { group: 'TA03-subkategori', file: 'real-05c-tombol-kategori-utama-saat-tambah.png', cap: 'Asli: konfirmasi yang muncul dari layar tambah' },
      { group: 'TA03-subkategori', file: 'fin-05c-dialog-tambah-sub.png', cap: 'fin-app: dialog tambah tanpa tombol serupa' },
      { group: 'TA03-subkategori', file: 'fin-05b-tombol-kategori-utama.png', cap: 'fin-app: tombol hanya ada di dialog ubah' },
    ],
    prd: {
      deskripsi:
        'Menambahkan pintasan "Kategori utama" pada dialog menambah sub-kategori, sehingga sub ' +
        'yang sedang diketik dapat langsung disimpan sebagai kategori utama.',
      tujuan: [
        'Alur menambah sub-kategori dan langsung menaikkan pangkatnya tersedia dalam satu layar.',
        'Teks dan perilaku konfirmasi sama dengan dialog ubah yang sudah ada.',
        'Tidak ada data yang hilang saat pengguna berpindah maksud di tengah pengisian.',
      ],
      alur:
        'Pengelola sub-kategori → `+` (tambah sub) → isi nama → tekan "Kategori utama" →\n' +
        'konfirmasi → (Ya) kategori utama dibuat dengan nama yang sudah diketik →\n' +
        'kembali ke daftar kategori utama.',
      userStory: [
        { prio: 'Medium', role: 'pengguna', want: 'langsung menjadikan apa yang saya ketik sebagai kategori utama', so: 'saya tidak perlu menyimpan lalu membukanya lagi' },
        { prio: 'Rendah', role: 'pengguna yang salah memilih formulir', want: 'berpindah maksud tanpa mengetik ulang', so: 'pekerjaan saya tidak terbuang' },
      ],
      struktur:
        'Dialog tambah sub-kategori (tambahan tombol di kanan judul):\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  Sub kategori              [Kategori utama]   │\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  Kategori      🍜 Food                        │\n' +
        '│  Nama sub      ....                          │\n' +
        '│  [ Batal ]                     [ Menyimpan ]  │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Tombol Kategori utama pada dialog tambah',
          tipe: 'aksi',
          fungsi: 'Mengubah maksud penyimpanan dari sub-kategori menjadi kategori utama.',
          opsi: 'Ada / tidak ada',
          default: 'Ada, mengikuti aplikasi asli',
          perilaku:
            'Tekan → konfirmasi `Jadikan kategori utama?` → `Ya` menyimpan sebagai kategori ' +
            'utama memakai nama yang sudah diketik; `Tidak` kembali ke dialog tanpa perubahan.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Dialog menambah sub-kategori menyediakan tombol `Kategori utama`.' },
        { id: 'FR-02', teks: 'Menekannya memunculkan konfirmasi dengan teks yang sama seperti pada dialog ubah.' },
        { id: 'FR-03', teks: 'Setuju → kategori utama dibuat dengan nama yang sudah diketik, dan pengguna kembali ke daftar kategori.' },
        { id: 'FR-04', teks: 'Batal → kembali ke dialog tambah dengan nama yang masih terisi.' },
        { id: 'FR-05', teks: 'Bila nama kosong, tombol tidak melakukan apa pun selain memunculkan kesalahan validasi nama.' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Konsistensi: kedua dialog (tambah dan ubah) memakai komponen konfirmasi yang sama.' },
        { id: 'NFR-02', teks: 'Keselamatan data: perpindahan maksud terjadi sebelum penyimpanan, sehingga tidak ada sisa sub-kategori setengah jadi.' },
      ],
      interaksi: {
        navigasi: 'Tombol berada di kanan judul dialog, pola yang sudah dipakai dialog ubah.',
        simpan: 'Penyimpanan hanya terjadi setelah pengguna menyetujui konfirmasi.',
        validasi: 'Nama wajib diisi; panjang dan karakter mengikuti aturan yang sudah ada pada dialog sub-kategori.',
      },
      teramati: [
        'Asli: layar tambah sub punya tombol kanan atas `Kategori utama` (bukti `real-02a`).',
        'Asli: menekannya memunculkan `Sub kategori akan diubah ke kategori utama. Apakah anda yakin untuk mengubahnya?` + `TIDAK`/`YA` (bukti `real-05c`).',
        'fin-app: dialog tambah hanya `Batal` dan `Menyimpan`; pencarian `Jadikan kategori utama` pada keadaan itu menghasilkan 0 elemen (bukti `fin-05c`).',
      ],
      skema:
        'Tidak ada perubahan skema; kategori utama memakai tabel yang sama dengan kolom induk kosong:\n\n' +
        '```\n' +
        'categories.add({ NAME: namaYangDiketik, PARENT: null, ... })\n' +
        '```',
      default: 'Tombol tampil pada dialog tambah dan ubah.',
      alurData:
        'Isi nama → tekan Kategori utama → konfirmasi → `categories.add` tanpa induk →\n' +
        'tutup dialog → kembali ke daftar kategori utama.',
      error: [
        { id: 'E-01', teks: 'Nama sudah dipakai kategori utama lain → tampilkan kesalahan nama tanpa menutup dialog.' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Dialog terisi sebagian → batal konfirmasi tidak menghapus isian.' },
        { id: 'EC-02', teks: 'Dipicu dari daftar kategori pendapatan → kategori utama baru masuk ke daftar pendapatan.' },
      ],
      internal: [
        { teks: '`components/sub-category-manager.tsx` — dialog tambah dan ubah sub-kategori.' },
        { teks: '`components/confirm-dialog.tsx` — konfirmasi yang dipakai ulang.' },
      ],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Lihat TS-06 (Sub-kategori), TC "tambah sub lalu naikkan jadi kategori utama" pada SKENARIO.md Tahap 3, langkah SK-05c/SK-05d.',
      metrics: [
        { teks: 'Jumlah langkah menambah sub yang langsung menjadi kategori utama turun dari 5 menjadi 2.' },
        { teks: 'Tidak ada sub-kategori setengah jadi yang tertinggal di basis data.' },
      ],
      verifikasi: {
        ok: [
          'Asli: tombol `Kategori utama` ada pada layar tambah dan layar ubah (bukti `real-02a`, `real-05`).',
          'Asli: konfirmasi dari layar tambah berbunyi sama dengan yang dari layar ubah (bukti `real-05c`, `real-05b`).',
          'fin-app: dialog tambah tidak memuat tombol tersebut (bukti `fin-05c`).',
        ],
        belum: [
          '❓ Apa yang terjadi bila tombol `YA` ditekan dari layar tambah (kategori utama dibuat, atau formulir berubah menjadi formulir kategori) — belum diuji supaya data pada aplikasi asli tidak berubah.',
          '❓ Apakah nama yang sudah diketik tetap terpakai setelah konfirmasi disetujui.',
        ],
      },
    },
  },
  {
    id: 'T-36',
    prdId: 'PRD-P-32',
    slug: 'numpad-form-transaksi-tanpa-minus-kalkulator-selesai',
    title: 'Numpad form transaksi tidak punya minus, kalkulator, dan tombol Selesai',
    kategori: 'Transaksi · numpad',
    prioritas: 'Medium',
    keputusan: {
      tanggal: '24 Oktober 2026',
      hasil: 'Dikerjakan sebagian',
      alasan:
        'Kalkulator tidak dibuat dan pintasan mata uang tidak ditambahkan; yang diikuti hanya tombol ' +
        'minus dan `Selesai`. Papan angka tetap ringkas dan tidak menambah panel baru.',
    },
    selesai: '24 Oktober 2026',
    selesaiCatatan:
      'Numpad form transaksi kini punya tombol minus (bergantian tanda, tidak tampil untuk transfer) ' +
      'dan tombol `Selesai` yang menutup papan angka tanpa menutup form; total bisa diketuk untuk ' +
      'membuka papan angka lagi. Kalkulator dan pintasan mata uang tetap tidak dibuat. Uji UI ' +
      'TC-TRX-36a…36f lulus',
    parent: 'Tab Transaksi → form tambah/ubah transaksi',
    masuk: 'Tab Transaksi → tombol + (Tambah) atau tekan satu baris transaksi',
    ringkas:
      'Aplikasi asli melengkapi numpad form transaksi dengan tombol minus, kalkulator, tombol ' +
      '`Selesai`, dan pintasan `Pengaturan mata uang`. fin-app hanya menyediakan angka 0–9, `00`, ' +
      'koma, dan hapus, sehingga nominal negatif tidak bisa diketik, kalkulator tidak tersedia, ' +
      'dan papan angka tidak punya tombol penutup.',
    mm: [
      'Numpad memuat `pad0`–`pad9`, `pad00`, `padDot`, `padMinus`, `padback`.',
      'Di sisi kanan ada `calButton` (kalkulator) dan `numberDoneButton` bertulisan `Selesai`.',
      'Baris atas numpad memuat `currencySettingBtn` (pintasan ke pengaturan mata uang) dan `numberCancelButton`.',
      'Tombol `Selesai` menutup papan angka dan menahan nilai yang sudah diketik.',
    ],
    fin: [
      'Numpad memuat `numpad-0`…`numpad-9`, `numpad-00`, `numpad-dot`, `numpad-back` — tidak ada minus, kalkulator, maupun tombol `Selesai`.',
      'Nilai langsung tampil di `trx-amount-display` setiap tombol ditekan; tidak ada langkah "selesai".',
      'Pengaturan mata uang tidak bisa dijangkau dari form (hanya dari menu Lainnya).',
    ],
    dampak:
      'Pengguna yang perlu mencatat koreksi bernilai negatif, menghitung beberapa angka sebelum ' +
      'menyimpan, atau mengganti mata uang saat mengisi transaksi harus keluar dari form. ' +
      'Dampaknya sedang: pencatatan biasa tetap berjalan, tetapi jalur yang disediakan aplikasi ' +
      'asli tidak tersedia.',
    butuhPRD: true,
    bukti: [
      { group: 'TA04-transaksi', file: 'real-02-form-tambah.png', cap: 'Asli: numpad dengan 0–9, 00, koma, minus, hapus, kalkulator, `Selesai`, dan pintasan mata uang' },
      { group: 'TA04-transaksi', file: 'fin-02-form-tambah.png', cap: 'fin-app: numpad hanya 0–9, 00, koma, dan hapus' },
    ],
    prd: {
      deskripsi:
        'Melengkapi numpad form transaksi fin-app dengan tombol minus dan tombol `Selesai` yang ' +
        'menutup papan angka. Kalkulator dan pintasan `Pengaturan mata uang` **tidak** diikuti — ' +
        'keduanya sudah diputuskan dilewati pada 24 Oktober 2026.',
      tujuan: [
        'Nominal negatif dapat diketik langsung dari papan angka.',
        'Papan angka punya tombol penutup yang jelas seperti pada aplikasi asli.',
      ],
      alur:
        'Tab Transaksi → tombol + → papan angka di bagian bawah →\n' +
        '  ├─ ketik angka (0–9, 00, koma) → nilai tampil di `Total`\n' +
        '  ├─ tombol minus → tanda negatif di depan nilai\n' +
        '  └─ `Selesai` → papan angka ditutup, form tetap terbuka',
      userStory: [
        { prio: 'Medium', role: 'pengguna', want: 'mengetik nominal negatif untuk koreksi', so: 'saya tidak perlu membuat transaksi lawan untuk membetulkan catatan' },
        { prio: 'Rendah', role: 'pengguna', want: 'menutup papan angka dengan satu tombol', so: 'sisa layar bisa dipakai untuk memeriksa isian' },
      ],
      struktur:
        'Papan angka form transaksi (tambahan ditandai `+`):\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  Total                        Rp 12.345       │\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  7   8   9   ⌫                                 │\n' +
        '│  4   5   6   +[−]                              │\n' +
        '│  1   2   3   +[Selesai]                        │\n' +
        '│  00  0   ,                                     │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Tombol minus',
          tipe: 'aksi',
          fungsi: 'Memberi tanda negatif pada nominal yang sedang diketik.',
          opsi: 'Ada / tidak ada',
          default: 'Ada, mengikuti aplikasi asli',
          perilaku: 'Tekan → nilai berubah tanda; tekan lagi → kembali positif.',
        },
        {
          nama: 'Tombol Selesai',
          tipe: 'aksi',
          fungsi: 'Menutup papan angka tanpa meninggalkan form.',
          opsi: 'Ada / tidak ada',
          default: 'Ada, mengikuti aplikasi asli',
          perilaku: 'Tekan → papan angka tersembunyi; form tetap terbuka dan bisa disimpan.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Papan angka memuat tombol minus yang mengubah tanda nominal.' },
        { id: 'FR-02', teks: 'Papan angka memuat tombol `Selesai` yang menutup papan angka tanpa menutup form.' },
        { id: 'FR-03', teks: 'Kedua tombol baru tetap dapat dijangkau keyboard dan pembaca layar (`aria-label`).' },
        { id: 'FR-04', teks: 'Kalkulator dan pintasan pengaturan mata uang tidak ditambahkan (keputusan 24 Oktober 2026).' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Susunan tombol mengikuti aplikasi asli supaya pengguna yang berpindah aplikasi tidak mencari ulang.' },
        { id: 'NFR-02', teks: 'Penambahan tombol tidak mempersempit sasaran sentuh di bawah 44×44 px pada lebar 540 px.' },
      ],
      interaksi: {
        navigasi: 'Tombol tambahan berada di kolom kanan dan baris atas papan angka, sama seperti aplikasi asli.',
        simpan: 'Nilai negatif disimpan apa adanya; saldo aset berkurang bila negatif dan bertambah bila positif.',
        validasi: 'Nominal nol tetap ditolak seperti sekarang; minus pada nol tidak menghasilkan nilai baru.',
      },
      teramati: [
        'Asli: dump form menampilkan `padMinus`, `calButton`, `numberDoneButton`, `currencySettingBtn` (bukti `real-02-form-tambah.png`).',
        'fin-app: hanya `numpad-0`…`numpad-9`, `numpad-00`, `numpad-dot`, `numpad-back` (bukti `fin-02-form-tambah.png`).',
        '❓ Perilaku panel kalkulator di aplikasi asli belum dijalankan (hanya keberadaan tombol yang tercatat).',
      ],
      skema:
        'Tidak ada perubahan skema; nominal negatif disimpan pada kolom yang sudah ada:\n\n' +
        '```\n' +
        'transactions.add({ amount: -12500, ... })\n' +
        '```',
      default: 'Nominal awal 0; tanda positif.',
      alurData:
        'Ketikan papan angka → state `amount` di form → `transactions.add/update` → daftar dan ' +
        'ringkasan menghitung ulang (pendapatan/pengeluaran/total).',
      error: [
        { id: 'E-01', teks: 'Nominal negatif pada jenis transaksi yang tidak mengizinkan nilai negatif → tampilkan kesalahan dan pertahankan nilai sebelumnya.' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Minus ditekan berulang → tanda berganti-ganti, bukan menumpuk.' },
        { id: 'EC-02', teks: 'Form transfer → tombol minus tidak ditampilkan karena nominal wajib positif.' },
      ],
      internal: [
        { teks: '`components/ui/numpad.tsx` — komponen papan angka bersama.' },
        { teks: '`components/transaction-form.tsx` — pemakaian papan angka dan state nominal.' },
      ],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Lihat TS-05 (Tab Transaksi), langkah TX-06 pada SKENARIO.md Tahap 4.',
      metrics: [
        { teks: 'Jumlah tombol papan angka yang tersedia naik dari 13 menjadi 15 (minus + `Selesai`); kalkulator dan pintasan mata uang sengaja tidak diikuti.' },
        { teks: 'Papan angka tetap muat satu layar pada lebar 540 px tanpa menambah baris.' },
      ],
      verifikasi: {
        ok: [
          'Asli: tombol minus, kalkulator, `Selesai`, dan pintasan mata uang ada di dump form (bukti `real-02-form-tambah.png`).',
          'fin-app: keempat tombol itu tidak ada (bukti `fin-02-form-tambah.png`).',
          'Keputusan 24 Oktober 2026: hanya minus dan `Selesai` yang diikuti; kalkulator dan pintasan mata uang dilewati.',
        ],
        belum: [
          '❓ Apakah `Selesai` menyimpan lebih dulu atau hanya menutup papan angka — belum diuji karena akan menulis data.',
          '❓ Apakah aplikasi asli mengizinkan nominal negatif disimpan.',
        ],
      },
    },
  },
  {
    id: 'T-37',
    prdId: 'PRD-P-33',
    slug: 'nama-hari-hilang-pada-label-tanggal',
    title: 'Label tanggal form memakai "Hari ini"/"Kemarin" sehingga nama hari hilang',
    kategori: 'Transaksi · tanggal',
    prioritas: 'Low',
    keputusan: {
      tanggal: '24 Oktober 2026',
      hasil: 'Dipertahankan',
      alasan:
        'Label "Hari ini"/"Kemarin" dinilai lebih berguna daripada nama hari, jadi fin-app tidak ' +
        'diubah. Perbedaan ini diterima sebagai pilihan desain, bukan cacat.',
    },
    parent: 'Tab Transaksi → form tambah/ubah transaksi',
    masuk: 'Tab Transaksi → tombol + (Tambah) atau tekan satu baris transaksi',
    ringkas:
      'Aplikasi asli menulis baris tanggal sebagai tanggal + nama hari, mis. `24/10/26 (Sab)`. ' +
      'fin-app menampilkan `24/10/26 (Hari ini)` dan `… (Kemarin)` untuk dua tanggal terdekat, ' +
      'sehingga nama hari hilang justru pada tanggal yang paling sering dipakai.',
    mm: [
      'Baris `Tanggal` pada form menampilkan `24/10/26 (Sab)` — tanggal dua digit + nama hari tiga huruf.',
      'Nama hari selalu ada, termasuk untuk hari ini dan kemarin.',
    ],
    fin: [
      'Baris tanggal (`trx-date-input`) menampilkan `24/10/26` lalu `(Hari ini)`.',
      'Untuk kemarin, labelnya `(Kemarin)`; untuk tanggal lain, labelnya kembali menjadi nama hari, mis. `(Sen)` — dibaca dari `relativeDateLabel` di `lib/transaction-utils.ts`.',
    ],
    dampak:
      'Pengguna yang mencatat mundur ke kemarin kehilangan konteks nama hari — misalnya untuk ' +
      'memastikan transaksi akhir pekan masuk ke tanggal yang benar. Dampaknya kecil karena ' +
      'tanggalnya sendiri tetap terbaca.',
    butuhPRD: true,
    bukti: [
      { group: 'TA04-transaksi', file: 'real-02-form-tambah.png', cap: 'Asli: `24/10/26 (Sab)` — tanggal + nama hari' },
      { group: 'TA04-transaksi', file: 'fin-02-form-tambah.png', cap: 'fin-app: `24/10/26 (Hari ini)` — nama hari tidak tampil' },
    ],
    prd: {
      deskripsi:
        'Menampilkan nama hari pada label tanggal form transaksi untuk semua tanggal, termasuk ' +
        'hari ini dan kemarin, sehingga bentuknya sama dengan aplikasi asli.',
      tujuan: [
        'Nama hari selalu terlihat di samping tanggal, seperti pada aplikasi asli.',
        'Label "Hari ini"/"Kemarin" tidak lagi menggantikan informasi yang lebih berguna.',
      ],
      alur:
        'Tab Transaksi → tombol + → baris `Tanggal` →\n' +
        '  ├─ hari ini   → `24/10/26 (Sab)`\n' +
        '  ├─ kemarin    → `23/10/26 (Jum)`\n' +
        '  └─ tanggal lain → `11/10/26 (Min)`\n' +
        'Lalu tekan baris tanggal → pemilih tanggal seperti biasa.',
      userStory: [
        { prio: 'Rendah', role: 'pengguna', want: 'melihat nama hari di samping tanggal', so: 'saya yakin transaksi akhir pekan tercatat pada tanggal yang benar' },
      ],
      struktur:
        'Baris tanggal pada form transaksi:\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  📅 Tanggal                 24/10/26 (Sab) ›  │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Label nama hari',
          tipe: 'tampilan',
          fungsi: 'Menambahkan nama hari tiga huruf di dalam tanda kurung setelah tanggal.',
          opsi: 'Nama hari · "Hari ini"/"Kemarin"',
          default: 'Nama hari, mengikuti aplikasi asli',
          perilaku: 'Selalu tampil untuk semua tanggal; teks mengikuti tanggal yang dipilih.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Label tanggal menampilkan nama hari tiga huruf untuk semua tanggal.' },
        { id: 'FR-02', teks: 'Label "Hari ini"/"Kemarin" tidak lagi menggantikan nama hari.' },
        { id: 'FR-03', teks: 'Nama hari mengikuti bahasa antarmuka (`id` → Sen/Sel/…, `en` → Mon/Tue/…).' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Panjang label tidak memotong tombol pada lebar 540 px.' },
      ],
      interaksi: {
        navigasi: 'Hanya teks di dalam tombol tanggal; tidak ada tombol baru.',
        simpan: 'Tidak berubah.',
        validasi: 'Tidak berubah.',
      },
      teramati: [
        'Asli: `writeDate` = `24/10/26 (Sab)` (bukti `real-02-form-tambah.png`).',
        'fin-app: `trx-date-input` = `24/10/26` + `(Hari ini)` (bukti `fin-02-form-tambah.png`).',
        'Kode fin-app: `relativeDateLabel` mengembalikan `Hari ini` / `Kemarin` / kosong, dan label hanya memakai `relative || weekday`.',
      ],
      skema: 'Tidak ada perubahan skema; nilai tanggal tetap ISO (`YYYY-MM-DD`).',
      default: 'Nama hari mengikuti tanggal hari ini.',
      alurData:
        '`date` (ISO) → `formatShortDate(date)` + nama hari dari `Intl.DateTimeFormat` → teks tombol.',
      error: [
        { id: 'E-01', teks: 'Tanggal tidak valid → tetap tampilkan tanggal apa adanya tanpa nama hari.' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Pergantian hari saat form terbuka → label ikut tanggal terpilih, bukan jam sistem.' },
        { id: 'EC-02', teks: 'Bahasa antarmuka Inggris → nama hari tiga huruf Inggris.' },
      ],
      internal: [
        { teks: '`lib/transaction-utils.ts` — `relativeDateLabel`, `weekdayLabel`.' },
        { teks: '`components/transaction-form.tsx` — tombol `trx-date-input`.' },
      ],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Lihat TS-05 (Tab Transaksi), langkah TX-12 pada SKENARIO.md Tahap 4.',
      metrics: [
        { teks: 'Nama hari tampil pada 100% tanggal, bukan hanya tanggal selain hari ini/kemarin.' },
      ],
      verifikasi: {
        ok: [
          'Asli: `24/10/26 (Sab)` (bukti `real-02-form-tambah.png`).',
          'fin-app: `24/10/26 (Hari ini)` (bukti `fin-02-form-tambah.png`).',
        ],
        belum: [
          '❓ Tampilan tanggal selain hari ini/kemarin belum diambil tangkapan layarnya; perilaku `(Sen)` dibaca dari kode, bukan dari layar.',
          '❓ Apakah pemilih tanggal fin-app menampilkan nama hari di dalam kalender.',
        ],
      },
    },
  },
  {
    id: 'T-38',
    prdId: 'PRD-P-34',
    slug: 'bentuk-grafik-statistik-donat-vs-batang',
    title: 'Grafik Statistik: aplikasi asli memakai donat dan garis, fin-app memakai batang',
    kategori: 'Statistik · grafik',
    prioritas: 'Medium',
    parent: 'Tab Statistik',
    masuk: 'Tab Statistik setelah ada transaksi, lalu tekan satu baris kategori untuk rinciannya',
    ringkas:
      'Aplikasi asli menggambar proporsi kategori sebagai **donat** dengan legenda persentase, dan ' +
      'tren bulanan pada layar rincian sebagai **grafik garis**. fin-app memakai batang mendatar ' +
      'untuk proporsi kategori dan batang tegak untuk tren bulanan, sehingga kesan visual dan cara ' +
      'membaca kedua layar berbeda.',
    mm: [
      'Layar Statistik: satu donat penuh; tiap potongan mewakili satu kategori.',
      'Di bawah donat ada legenda `🍜 Food` + `100.0 %`.',
      'Baris daftar memuat lencana persen (`100%`), nama kategori, dan nominal.',
      'Layar rincian: grafik garis `Mar … Okt` dengan sumbu nominal (`0 · 25k · 50k · 75k`).',
    ],
    fin: [
      'Layar Statistik kini menampilkan grafik Donat (CategoryDonutChart) sebagai tampilan bawaan dengan legenda nama dan persentase yang jelas, lengkap dengan opsi beralih ke batang.',
      'Layar rincian kini menampilkan grafik garis (MonthlyLineChart) dengan area terisi gradien dan sumbu ringkas (0 · 25k · 50k · 75k) sesuai aplikasi asli (selesai 24 Oktober 2026).',
    ],
    dampak:
      'Pengguna berpindah aplikasi kehilangan bentuk grafik yang biasa dibaca. Dampaknya sedang: ' +
      'angkanya tetap sama dan terbaca, hanya bentuk penyajiannya berbeda, sehingga perbandingan ' +
      'antar-kategori tetap bisa dilakukan lewat daftar di bawah grafik.',
    selesai: '24 Oktober 2026',
    butuhPRD: true,
    bukti: [
      { group: 'TA05-statistik', file: 'real-04-statistik-ada-data.png', cap: 'Asli: donat penuh + legenda `Food 100.0 %`' },
      { group: 'TA05-statistik', file: 'fin-04-statistik-ada-data.png', cap: 'fin-app: batang mendatar berjudul `Bar Chart`' },
      { group: 'TA05-statistik', file: 'real-06-rincian-kategori.png', cap: 'Asli: grafik garis tren `Mar … Okt`' },
      { group: 'TA05-statistik', file: 'fin-06-rincian-kategori.png', cap: 'fin-app: batang tegak per bulan' },
    ],
    prd: {
      deskripsi:
        'Menyamakan bentuk grafik layar Statistik dengan aplikasi asli: proporsi kategori sebagai ' +
        'donat, dan tren bulanan pada layar rincian sebagai grafik garis.',
      tujuan: [
        'Proporsi antar-kategori terbaca sekilas seperti pada aplikasi asli.',
        'Tren bulanan pada rincian kategori memakai garis, bukan batang.',
        'Angka, persentase, dan urutan kategori tetap sama seperti sekarang.',
      ],
      alur:
        'Tab Statistik → pilih jenis (Pendapatan/Pengeluaran) →\n' +
        '  ├─ grafik donat: satu potongan per kategori + legenda nama & persen\n' +
        '  └─ daftar kategori di bawahnya (tidak berubah)\n' +
        'Tekan satu baris kategori → layar rincian →\n' +
        '  └─ grafik garis tren bulanan + daftar transaksi (tidak berubah)',
      userStory: [
        { prio: 'Medium', role: 'pengguna', want: 'melihat proporsi kategori sebagai donat', so: 'saya langsung tahu kategori mana yang paling besar tanpa membaca daftar' },
        { prio: 'Rendah', role: 'pengguna', want: 'melihat tren bulanan sebagai garis', so: 'naik-turun pengeluaran antar bulan lebih mudah dibaca' },
      ],
      struktur:
        'Layar Statistik (bagian grafik):\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│            ╭───────────────╮                 │\n' +
        '│           │   donat per    │                │\n' +
        '│           │   kategori     │   🍜 Food      │\n' +
        '│            ╰───────────────╯    100.0 %      │\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│ 100%  🍜 Food                        Rp 12.345│\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Donat proporsi kategori',
          tipe: 'grafik',
          fungsi: 'Menampilkan porsi tiap kategori terhadap total jenis yang dipilih.',
          opsi: 'Donat · batang',
          default: 'Donat, mengikuti aplikasi asli',
          perilaku: 'Satu potongan per kategori; warna berbeda; legenda memuat nama + persen.',
        },
        {
          nama: 'Grafik garis tren bulanan',
          tipe: 'grafik',
          fungsi: 'Menampilkan nilai kategori terpilih per bulan pada layar rincian.',
          opsi: 'Garis · batang',
          default: 'Garis, mengikuti aplikasi asli',
          perilaku: 'Sumbu X berisi nama bulan, sumbu Y nominal dengan label ringkas (0 · 25k · …).',
        },
        {
          nama: 'Legenda grafik',
          tipe: 'tampilan',
          fungsi: 'Menjelaskan warna potongan: nama kategori + persentase.',
          opsi: 'Ada · tidak ada',
          default: 'Ada',
          perilaku: 'Mengikuti urutan kategori pada daftar di bawah grafik.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Layar Statistik menampilkan proporsi kategori sebagai grafik donat.' },
        { id: 'FR-02', teks: 'Setiap potongan donat punya pasangan di legenda: nama kategori + persentase.' },
        { id: 'FR-03', teks: 'Layar rincian kategori menampilkan tren bulanan sebagai grafik garis.' },
        { id: 'FR-04', teks: 'Angka, persentase, dan urutan kategori tetap sama seperti daftar yang sudah ada.' },
        { id: 'FR-05', teks: 'Grafik tetap terbaca tanpa warna (pola/legenda teks) dan punya `aria-label` per potongan/titik.' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Grafik dimuat < 300 ms untuk 12 kategori pada perangkat kelas menengah.' },
        { id: 'NFR-02', teks: 'Tidak menambah dependensi grafik baru bila SVG sederhana cukup.' },
      ],
      interaksi: {
        navigasi: 'Menekan potongan donat membuka rincian kategori yang sama seperti menekan baris daftar.',
        simpan: 'Tidak berubah (layar baca-saja).',
        validasi: 'Tidak berubah.',
      },
      teramati: [
        'Asli: donat penuh + legenda `🍜 Food 100.0 %` (bukti `real-04-statistik-ada-data.png`).',
        'Asli: grafik garis `Mar … Okt` dengan sumbu `0 · 25k · 50k · 75k` (bukti `real-06-rincian-kategori.png`).',
        'fin-app: `CategoryBarChart` (`stats-bar-*`) dan `MonthlyBarChart` (bukti `fin-04`, `fin-06`).',
        'Kedua grafik fin-app adalah SVG sederhana buatan sendiri, bukan pustaka grafik.',
      ],
      skema: 'Tidak ada perubahan skema; data grafik berasal dari `lib/statistics-utils.ts`.',
      default: 'Donat pada ringkasan, garis pada rincian.',
      alurData:
        '`stats: CategoryStat[]` → potongan donat (sudut = `percent`) + legenda.\n' +
        '`trend: TrendPoint[]` → titik garis (x = bulan, y = nominal).',
      error: [
        { id: 'E-01', teks: 'Tidak ada data → tampilkan keadaan kosong, bukan donat kosong.' },
        { id: 'E-02', teks: 'Semua nilai nol → tampilkan donat abu-abu netral dengan legenda 0%.' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Satu kategori saja (100%) → donat penuh satu warna, tetap ada garis pemisah.' },
        { id: 'EC-02', teks: 'Lebih dari 8 kategori → gabungkan sisanya menjadi satu potongan `Lainnya` agar legenda tetap terbaca.' },
        { id: 'EC-03', teks: 'Nilai sangat kecil (< 1%) → tetap diberi warna; legenda menampilkan `<1%`.' },
        { id: 'EC-04', teks: 'Tren hanya satu bulan → tampilkan satu titik dengan sumbu bulan itu saja.' },
      ],
      internal: [
        { teks: '`components/statistik-chart.tsx` — `CategoryBarChart`, `MonthlyBarChart`.' },
        { teks: '`components/statistik-screen.tsx`, `components/statistik-detail.tsx` — pemakaian grafik.' },
      ],
      eksternal: [{ teks: 'Tidak ada; grafik digambar sebagai SVG di dalam aplikasi.' }],
      testing: 'Lihat TS-07 (Tab Statistik), langkah TS-06 & TS-13 pada SKENARIO.md Tahap 5.',
      metrics: [
        { teks: 'Bentuk grafik ringkasan = donat dan rincian = garis, sama dengan aplikasi asli.' },
        { teks: 'Jumlah potongan donat = jumlah kategori pada daftar di bawahnya.' },
      ],
      verifikasi: {
        ok: [
          'Asli: donat + legenda (bukti `real-04-statistik-ada-data.png`).',
          'Asli: garis tren bulanan (bukti `real-06-rincian-kategori.png`).',
          'fin-app: batang mendatar dan batang tegak (bukti `fin-04`, `fin-06`).',
        ],
        belum: [
          '❓ Apakah potongan donat aplikasi asli bisa ditekan untuk membuka rincian — belum diuji.',
          '❓ Perilaku aplikasi asli bila kategori lebih dari delapan (apakah digabung) — belum diuji.',
          '❓ Warna potongan mengikuti kategori atau urutan — belum dipastikan.',
        ],
      },
    },
  },
  {
    id: 'T-39',
    selesai: '24 Oktober 2026',
    slug: 'label-grafik-bar-chart-belum-diterjemahkan',
    title: 'Label grafik "Bar Chart" pada Statistik belum diterjemahkan',
    kategori: 'Statistik · teks',
    prioritas: 'Low',
    parent: 'Tab Statistik → bagian grafik',
    masuk: 'Tab Statistik setelah ada transaksi',
    ringkas:
      'Grafik fin-app diberi judul `Bar Chart` dalam bahasa Inggris, sementara seluruh antarmuka ' +
      'lain berbahasa Indonesia. Aplikasi asli tidak memberi judul pada grafiknya.',
    mm: ['Tidak ada judul di atas grafik; donat langsung tampil di bawah tombol jenis.'],
    fin: ['Judul `Bar Chart` (ditampilkan kapital) di atas batang, di layar Statistik maupun di rincian kategori.'],
    dampak:
      'Campuran bahasa di satu layar terlihat tidak konsisten dan membingungkan pengguna yang tidak ' +
      'mengerti istilah Inggris. Dampaknya kecil karena grafiknya tetap terbaca.',
    butuhPRD: false,
    bukti: [
      { group: 'TA05-statistik', file: 'fin-04-statistik-ada-data.png', cap: 'fin-app: judul `BAR CHART` di atas batang' },
      { group: 'TA05-statistik', file: 'real-04-statistik-ada-data.png', cap: 'Asli: grafik tanpa judul' },
    ],
  },
  {
    id: 'T-40',
    selesai: '24 Oktober 2026',
    prdId: 'PRD-P-35',
    slug: 'rincian-kategori-tanpa-baris-semua-dan-lainnya',
    title: 'Rincian kategori: baris "Semua" dan "Lainnya" belum ada di fin-app',
    kategori: 'Statistik · rincian',
    prioritas: 'Low',
    parent: 'Tab Statistik → rincian kategori',
    masuk: 'Tab Statistik → tekan satu baris kategori',
    ringkas:
      'Layar rincian aplikasi asli selalu memuat baris `Semua` dan `Lainnya` beserta persentasenya. ' +
      'fin-app hanya menampilkan baris sub-kategori, sehingga kategori tanpa sub-kategori tidak ' +
      'memperlihatkan satu baris pun.',
    mm: [
      'Rincian memuat baris `Semua` (`100%`) dan `Lainnya` (`100%`) di bawah `Total bulanan`.',
      'Baris memuat nama, persentase di kolom tengah, dan nominal di kolom kanan.',
      'Setelah daftar baris, ada grafik garis tren bulanan.',
    ],
    fin: [
      'Rincian memuat `Total bulanan`, grafik, lalu daftar transaksi.',
      'Baris ringkasan hanya muncul bila kategori punya sub-kategori (`stats-detail-sub-*`); tanpa sub, bagian itu kosong.',
    ],
    dampak:
      'Rincian fin-app terasa lebih kosong dan pengguna kehilangan ringkasan berapa bagian kategori ' +
      'yang sudah ber-sub dan berapa yang masuk `Lainnya`. Dampaknya kecil karena total dan daftar ' +
      'transaksi tetap ada.',
    butuhPRD: true,
    bukti: [
      { group: 'TA05-statistik', file: 'real-06-rincian-kategori.png', cap: 'Asli: baris `Semua 100% Rp 50.000,00` dan `Lainnya 100% Rp 50.000,00`' },
      { group: 'TA05-statistik', file: 'fin-06-rincian-kategori.png', cap: 'fin-app: hanya `Total bulanan` + grafik + daftar transaksi' },
      { group: 'TA05-statistik', file: 'real-05-statistik-pendapatan.png', cap: 'Asli: layar Statistik sebelum masuk rincian' },
    ],
    prd: {
      deskripsi:
        'Menambahkan baris ringkasan `Semua` dan `Lainnya` pada layar rincian kategori, mengikuti ' +
        'susunan aplikasi asli.',
      tujuan: [
        'Kategori tanpa sub-kategori tetap punya ringkasan yang bisa dibaca.',
        'Bagian yang belum ber-sub terlihat jelas lewat baris `Lainnya`.',
      ],
      alur:
        'Tab Statistik → tekan baris kategori →\n' +
        '  ├─ `Total bulanan` (tetap)\n' +
        '  ├─ baris `Semua` — 100% + nominal (baru)\n' +
        '  ├─ baris per sub-kategori + `Lainnya` untuk sisanya (baru)\n' +
        '  └─ grafik + daftar transaksi (tetap)',
      userStory: [
        { prio: 'Rendah', role: 'pengguna', want: 'melihat baris Semua dan Lainnya di rincian kategori', so: 'saya tahu berapa bagian yang masuk sub-kategori dan berapa yang tidak' },
      ],
      struktur:
        'Layar rincian kategori:\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  Total bulanan                               │\n' +
        '│  Rp 50.000                                   │\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  Semua                          100%  Rp 50.000│\n' +
        '│  Lainnya                        100%  Rp 50.000│\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Baris Semua',
          tipe: 'tampilan',
          fungsi: 'Menampilkan total kategori terpilih beserta porsinya terhadap jenis (100%).',
          opsi: 'Ada · tidak ada',
          default: 'Ada, mengikuti aplikasi asli',
          perilaku: 'Selalu tampil, disorot sebagai baris pertama.',
        },
        {
          nama: 'Baris Lainnya',
          tipe: 'tampilan',
          fungsi: 'Menampilkan bagian transaksi kategori yang tidak masuk sub-kategori mana pun.',
          opsi: 'Ada · tidak ada',
          default: 'Ada',
          perilaku: 'Tampil setelah baris sub-kategori; 0% bila semua transaksi sudah ber-sub.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Layar rincian menampilkan baris `Semua` dengan persentase dan nominal.' },
        { id: 'FR-02', teks: 'Layar rincian menampilkan baris `Lainnya` untuk transaksi tanpa sub-kategori.' },
        { id: 'FR-03', teks: 'Baris sub-kategori tetap tampil di antara keduanya bila ada.' },
      ],
      nfr: [{ id: 'NFR-01', teks: 'Baris baru tidak mendorong grafik ke luar layar 540 px tanpa bisa digulir.' }],
      interaksi: {
        navigasi: 'Baris hanya menampilkan data; tidak menambah navigasi baru.',
        simpan: 'Tidak berubah.',
        validasi: 'Tidak berubah.',
      },
      teramati: [
        'Asli: `categoryName` = `Semua` dan `Lainnya`, `categoryRate` = `100%` (bukti `real-06-rincian-kategori.png`).',
        'fin-app: `statistik-detail.tsx` hanya merender `Semua` + sub-kategori bila `subStats.length > 0`.',
      ],
      skema: 'Tidak ada perubahan skema; memakai `CategoryStat` yang sudah memuat `subStats`.',
      default: 'Dua baris selalu tampil.',
      alurData:
        '`stat.amount` → baris `Semua` (100%).\n' +
        '`stat.subStats` → baris sub-kategori.\n' +
        '`stat.amount − Σ subStats` → baris `Lainnya`.',
      error: [{ id: 'E-01', teks: 'Selisih negatif (data tak konsisten) → tampilkan `Lainnya` 0% dan catat ke console.' }],
      edge: [
        { id: 'EC-01', teks: 'Kategori tanpa transaksi → layar rincian tidak dibuka.' },
        { id: 'EC-02', teks: 'Semua transaksi ber-sub → `Lainnya` tetap tampil dengan 0%.' },
        { id: 'EC-03', teks: 'Fungsi sub-kategori dimatikan → hanya `Semua` dan `Lainnya` yang tampil.' },
      ],
      internal: [
        { teks: '`components/statistik-detail.tsx` — daftar `SubRow`.' },
        { teks: '`lib/statistics-utils.ts` — `subStats` per kategori.' },
      ],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Lihat TS-07 (Tab Statistik), langkah TS-13 pada SKENARIO.md Tahap 5.',
      metrics: [
        { teks: 'Rincian selalu memuat minimal dua baris (`Semua`, `Lainnya`) untuk setiap kategori.' },
      ],
      verifikasi: {
        ok: [
          'Asli: baris `Semua` + `Lainnya` (bukti `real-06-rincian-kategori.png`).',
          'fin-app: tanpa baris apa pun saat kategori tidak punya sub (bukti `fin-06-rincian-kategori.png`).',
        ],
        belum: [
          '❓ Apakah angka `Lainnya` di aplikasi asli benar-benar transaksi tanpa sub-kategori — belum diuji dengan data ber-sub.',
          '❓ Urutan baris saat kategori punya banyak sub-kategori.',
        ],
      },
    },
  },
  {
    id: 'T-41',
    selesai: '24 Oktober 2026',
    prdId: 'PRD-P-36',
    slug: 'rincian-aset-tanpa-tombol-ubah-dan-statistik',
    title: 'Rincian aset: tombol ubah dan tampilan statistik belum ada di fin-app',
    kategori: 'Aset · rincian',
    prioritas: 'Medium',
    parent: 'Tab Aset → rincian aset',
    masuk: 'Tab Aset → tekan satu baris aset',
    ringkas:
      'Kepala rincian aset aplikasi asli memuat dua tombol: grafik (beralih ke tampilan statistik aset) ' +
      'dan pensil (membuka form "Informasi aset"). fin-app hanya menampilkan tombol kembali, sehingga ' +
      'tidak ada cara melihat statistik satu aset dan mengubah aset harus lewat Kelola aset → Pengaturan aset.',
    mm: [
      'Kepala rincian: `faStatsButton` (grafik) dan `editButton` (pensil) di kanan atas.',
      'Tombol grafik membuka tampilan statistik aset: grafik garis harian (Mei–Okt) dan grafik batang bulanan, dengan empat angka Deposit/Penarikan/Total/akumulasi saldo di atasnya.',
      'Tombol pensil membuka form `Informasi aset` (Grup · Nama · Total · Deskripsi · `Menyimpan`).',
      'Menekan tombol grafik sekali lagi kembali ke daftar transaksi.',
    ],
    fin: [
      'Kepala rincian (`asset-detail`) hanya berisi tombol kembali + nama aset.',
      'Mengubah aset harus lewat Lainnya → Kelola aset → Pengaturan aset → tekan baris aset (tiga ketukan tambahan).',
      'Tidak ada tampilan statistik per aset; yang tersedia hanya "Total statistik" gabungan dari kepala tab Aset.',
    ],
    dampak:
      'Tugas yang sering (mengubah saldo/nama aset) jadi lebih panjang, dan pengguna kehilangan grafik ' +
      'tren per aset yang membantu memeriksa mutasi. Secara data tidak ada yang hilang, jadi dampaknya ' +
      'pada kenyamanan, bukan kebenaran angka.',
    butuhPRD: true,
    bukti: [
      { group: 'TA06-aset', file: 'real-02-rincian-aset.png', cap: 'Asli: kepala rincian dengan ikon grafik dan pensil, daftar transaksi kosong' },
      { group: 'TA06-aset', file: 'real-02b-rincian-statistik.png', cap: 'Asli: tampilan statistik aset — garis harian + batang bulanan' },
      { group: 'TA06-aset', file: 'fin-02-rincian-aset.png', cap: 'fin-app: kepala rincian tanpa ikon grafik/pensil' },
      { group: 'TA06-aset', file: 'fin-03-form-ubah-aset.png', cap: 'fin-app: form ubah hanya bisa dibuka dari Kelola aset → Pengaturan aset' },
    ],
    prd: {
      deskripsi:
        'Menambahkan dua aksi di kepala rincian aset: tombol grafik untuk beralih ke tampilan statistik ' +
        'aset, dan tombol pensil untuk membuka form `Informasi aset`.',
      tujuan: [
        'Mengubah aset langsung dari layar rinciannya.',
        'Melihat tren saldo satu aset di layar yang sama dengan daftar transaksinya.',
      ],
      alur:
        'Tab Aset → tekan baris aset →\n' +
        '  ├─ kepala: [←] Nama aset [grafik] [pensil] (baru)\n' +
        '  ├─ ringkasan Deposit · Penarikan · Total · akumulasi saldo (tetap)\n' +
        '  ├─ daftar transaksi (tetap) ⇄ tampilan statistik (baru)\n' +
        '  └─ tombol tambah transaksi (tetap)',
      userStory: [
        { prio: 'Sedang', role: 'pengguna', want: 'mengubah aset atau melihat grafiknya langsung dari rincian aset', so: 'saya tidak perlu mundur ke Kelola aset untuk tugas yang sering' },
      ],
      struktur:
        'Kepala rincian aset:\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  ←   Cash                    ▥ grafik  ✎ ubah│\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  Deposit   Penarikan   Total   akumulasi     │\n' +
        '│  Rp 0      Rp 0        Rp 0    Rp 0          │\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  (daftar transaksi)  atau  (grafik aset)     │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Tombol grafik',
          tipe: 'aksi',
          fungsi: 'Beralih antara daftar transaksi dan tampilan statistik aset.',
          opsi: 'Ada · tidak ada',
          default: 'Ada, mengikuti aplikasi asli',
          perilaku: 'Sekali tekan menampilkan grafik aset; tekan lagi kembali ke daftar transaksi.',
        },
        {
          nama: 'Tombol ubah',
          tipe: 'aksi',
          fungsi: 'Membuka form `Informasi aset` untuk aset yang sedang dibuka.',
          opsi: 'Ada · tidak ada',
          default: 'Ada',
          perilaku: 'Setelah `Menyimpan`, form tertutup dan rincian memuat data terbaru.',
        },
        {
          nama: 'Tampilan statistik aset',
          tipe: 'tampilan',
          fungsi: 'Grafik garis nilai harian dan grafik bulanan untuk aset terpilih.',
          opsi: 'Ada · tidak ada',
          default: 'Ada',
          perilaku: 'Mengikuti periode dan mode (Harian · Bulanan · Setiap tahun) yang sudah ada di rincian.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Kepala rincian aset menampilkan tombol grafik dan tombol ubah.' },
        { id: 'FR-02', teks: 'Tampilan statistik menampilkan grafik garis harian dan grafik bulanan sesuai periode aktif.' },
        { id: 'FR-03', teks: 'Tombol ubah membuka form aset yang sama dengan yang dipakai di Kelola aset.' },
        { id: 'FR-04', teks: 'Kedua tombol punya `aria-label` yang jelas ("Statistik aset", "Ubah aset").' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Dua tombol tambahan tidak mengurangi ruang nama aset pada lebar 540 px.' },
        { id: 'NFR-02', teks: 'Target sentuh tiap tombol minimal 44 × 44 px.' },
      ],
      interaksi: {
        navigasi: 'Tidak ada rute baru; keduanya beraksi di dalam panel rincian.',
        simpan: 'Memakai `AssetForm` yang sudah ada.',
        validasi: 'Mengikuti validasi form aset yang sudah ada.',
      },
      teramati: [
        'Asli: `faStatsButton` + `editButton` di kepala rincian (bukti `real-02-rincian-aset.png`).',
        'Asli: tampilan statistik memuat grafik garis harian dan grafik batang bulanan (bukti `real-02b-rincian-statistik.png`).',
        'fin-app: kepala rincian hanya tombol kembali (bukti `fin-02-rincian-aset.png`); ubah baru bisa lewat Kelola aset → Pengaturan aset (bukti `fin-03-form-ubah-aset.png`).',
      ],
      skema: 'Tidak ada perubahan skema; memakai transaksi aset yang sudah dibaca `asset-detail.tsx`.',
      default: 'Kedua tombol tampil untuk semua aset.',
      alurData:
        '`getAllTransactions()` + `assetDelta(tx, asset.uid)` → seri harian/bulanan → grafik.\n' +
        'Empat angka ringkasan tidak berubah.',
      error: [
        { id: 'E-01', teks: 'Tidak ada transaksi → grafik garis datar 0 dan teks keadaan kosong tetap tampil.' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Aset tanpa transaksi → tampilan statistik tetap bisa dibuka.' },
        { id: 'EC-02', teks: 'Aset kartu kredit → grafik memakai angka yang sama dengan ringkasan.' },
        { id: 'EC-03', teks: 'Mata uang aset bukan mata uang utama → grafik memakai mata uang aset itu.' },
      ],
      internal: [
        { teks: '`components/asset-detail.tsx` — kepala panel + mode tampilan.' },
        { teks: '`lib/db.ts` — `assetDelta`, `getAllTransactions`.' },
        { teks: 'Komponen grafik yang sama dengan T-38/PRD-P-34.' },
      ],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Lihat TS-02 (Kelola Aset) + langkah AS-05 pada SKENARIO.md Tahap 6.',
      metrics: [
        { teks: 'Ubah aset dari rincian tercapai dalam ≤2 ketukan (buka rincian → pensil).' },
      ],
      verifikasi: {
        ok: [
          'Asli: dua ikon di kepala rincian + tampilan statistik (bukti `real-02`, `real-02b`).',
          'fin-app: hanya tombol kembali (bukti `fin-02`).',
        ],
        belum: [
          '❓ Apakah tampilan statistik asli memakai grafik yang sama untuk grup kartu kredit.',
          '❓ Gaya grafik final mengikuti keputusan T-38 (donut/garis vs batang).',
        ],
      },
    },
  },
  {
    id: 'T-42',
    selesai: '24 Oktober 2026',
    prdId: null,
    slug: 'transfer-tanpa-keadaan-kosong',
    title: 'Pengaturan pengeluaran transfer tanpa keadaan kosong',
    kategori: 'Aset · setelan',
    prioritas: 'Low',
    parent: 'Kelola aset',
    masuk: 'Lainnya → Kelola aset → Pengaturan pengeluaran transfer',
    ringkas:
      'Aplikasi asli menampilkan teks bantuan lalu "Tidak ada data" bila tidak ada aset sulit ' +
      'dilikuidasi yang bisa diatur. fin-app hanya menampilkan teks bantuan karena keadaan kosongnya ' +
      'bergantung pada jumlah grup (selalu empat), bukan jumlah aset.',
    mm: [
      'Teks bantuan di atas, lalu keadaan kosong "Tidak ada data" ketika belum ada aset pada grup Tabungan/Investasi/Pinjaman/Asuransi.',
    ],
    fin: [
      'Teks bantuan tampil, lalu tidak ada apa pun di bawahnya (tidak ada "Tidak ada data").',
      '`transfer-settings.tsx` memakai `eligible = groups.filter(...)` yang selalu berisi empat grup, sehingga cabang keadaan kosong tidak pernah tercapai.',
    ],
    dampak:
      'Layar terasa menggantung tanpa penjelasan. Kecil, tetapi mudah terlihat dan mudah diperbaiki.',
    butuhPRD: false,
    bukti: [
      { group: 'TA06-aset', file: 'real-11-transfer.png', cap: 'Asli: teks bantuan + "Tidak ada data"' },
      { group: 'TA06-aset', file: 'fin-10-transfer.png', cap: 'fin-app: teks bantuan saja, tanpa keadaan kosong' },
    ],
  },
  {
    id: 'T-43',
    prdId: 'PRD-P-37',
    slug: 'hub-menu-cadangan',
    title: 'Layar "Cadangan": aplikasi asli berupa hub 10 opsi, fin-app berupa halaman ekspor/impor langsung',
    kategori: 'Cadangan · navigasi',
    prioritas: 'Medium',
    parent: 'Lainnya → Cadangan',
    masuk: 'Lainnya → Cadangan',
    ringkas:
      'Aplikasi asli menampung 10 opsi navigasi terstruktur (termasuk sub-layar Cadangkan/pemulihan ke perangkat, ' +
      'riwayat cadangan otomatis berkala, dan pencadangan Google Drive). fin-app menyajikan layar tunggal ' +
      'ekspor/impor JSON langsung tanpa sub-menu perantara.',
    mm: [
      'Hub navigasi 10 baris: Google Drive, Cadangkan/pemulihan ke perangkat, Email DB, Email Excel, Impor Excel, Ekspor Foto, Impor Foto, Bantuan, Setel ulang semua, Setel ulang transaksi.',
      'Sub-layar "Cadangkan/pemulihan ke perangkat" memuat deskripsi folder /Unduh, opsi Cadangan data (.mmbak), Pemulihan data, dan Riwayat cadangan otomatis.',
      'Layar "Riwayat cadangan otomatis" mendaftar tanggal, jam, dan ukuran berkas cadangan berkala.',
    ],
    fin: [
      'Layar tunggal /lainnya/backup dengan teks panduan, kartu info cadangan terakhir, tombol "Ekspor Sekarang", dan "Impor Cadangan".',
      'Belum ada struktur hub navigasi maupun riwayat berkala cadangan otomatis.',
    ],
    dampak:
      'Struktur menu cadangan belum setara dengan aplikasi asli; pengguna tidak memiliki tempat terpisah ' +
      'untuk melihat riwayat cadangan berkala atau mengakses opsi cadangan lanjutan.',
    butuhPRD: true,
    bukti: [
      { group: 'TA06b-cadangan', file: 'real-01-hub-cadangan.png', cap: 'Asli: hub navigasi Cadangan dengan 10 baris' },
      { group: 'TA06b-cadangan', file: 'fin-01-hub-cadangan.png', cap: 'fin-app: layar tunggal ekspor/impor JSON' },
      { group: 'TA06b-cadangan', file: 'real-02-cadangan-perangkat.png', cap: 'Asli: sub-layar Cadangkan/pemulihan ke perangkat' },
      { group: 'TA06b-cadangan', file: 'real-03-riwayat-cadangan-otomatis.png', cap: 'Asli: daftar riwayat cadangan otomatis' },
    ],
    prd: {
      deskripsi:
        'Menata ulang layar "Cadangan" menjadi hub navigasi terstruktur yang menampung opsi cadangan perangkat, ' +
        'riwayat cadangan, dan aksi terkait sesuai hierarki aplikasi asli.',
      tujuan: [
        'Memisahkan aksi cadangan manual, pemulihan, dan peninjauan riwayat berkala.',
        'Menyediakan struktur navigasi yang konsisten dengan aplikasi asli.',
      ],
      alur:
        'Lainnya → Cadangan (Hub)\n' +
        '  ├─ Cadangkan/pemulihan ke perangkat\n' +
        '  │    ├─ Cadangan data (unduh file cadangan)\n' +
        '  │    ├─ Pemulihan data (unggah & timpa data)\n' +
        '  │    └─ Riwayat cadangan otomatis (daftar riwayat)\n' +
        '  ├─ Ekspor / Impor tambahan (Excel, Foto)\n' +
        '  └─ Mulai ulang (Setel ulang)',
      userStory: [
        { prio: 'Sedang', role: 'pengguna', want: 'memiliki hub menu cadangan yang teratur', so: 'saya dapat memilih jenis operasi cadangan atau melihat riwayat dengan jelas' },
      ],
      struktur:
        'Hub Cadangan:\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  Cadangan                                    │\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  Pencadangan otomatis Google Drive     Mati  │\n' +
        '│  Cadangkan/pemulihan ke perangkat            │\n' +
        '│  Mengekspor file cadangan melalui email      │\n' +
        '│  Mengekspor file excel melalui email         │\n' +
        '│  Impor file excel                            │\n' +
        '│  Bantuan                                     │\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  Mulai ulang (Cadangkan/Pemulihan)           │\n' +
        '│  Setel ulang semua                           │\n' +
        '│  Setel ulang rincian transaksi saja          │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Hub navigasi Cadangan',
          tipe: 'navigasi daftar',
          fungsi: 'Menampilkan daftar opsi modul cadangan dalam seksi-seksi yang rapi.',
          opsi: '10 baris opsi',
          default: 'Tampil sebagai halaman utama rute /lainnya/backup',
          perilaku: 'Setiap baris mengarahkan ke sub-layar atau memicu dialog terkait.',
        },
        {
          nama: 'Sub-layar Cadangkan/pemulihan ke perangkat',
          tipe: 'sub-layar',
          fungsi: 'Memfasilitasi ekspor, impor, dan riwayat cadangan perangkat.',
          opsi: 'Cadangan data · Pemulihan data · Riwayat cadangan otomatis',
          default: 'Tersedia',
          perilaku: 'Cadangan data memicu unduhan, Pemulihan data memicu picker file, Riwayat membuka daftar snapshot.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Rute `/lainnya/backup` menampilkan hub menu cadangan dengan seksi Mulai ulang.' },
        { id: 'FR-02', teks: 'Baris `Cadangkan/pemulihan ke perangkat` membuka sub-layar dengan 3 aksi terkait perangkat.' },
        { id: 'FR-03', teks: 'Tersedia sub-layar `Riwayat cadangan otomatis` yang mencatat berkas cadangan lokal.' },
      ],
      nfr: [{ id: 'NFR-01', teks: 'Tampilan rapi dan responsif pada lebar layar 540 px.' }],
      interaksi: {
        navigasi: 'Navigasi berjenjang dari Hub Cadangan ke sub-halaman.',
        simpan: 'Snapshot cadangan dicatat ke IndexedDB penyimpanan lokal.',
        validasi: 'Operasi pemulihan meminta konfirmasi pengguna sebelum menimpa data.',
      },
      teramati: [
        'Asli: hub navigasi 10 baris dengan seksi Mulai ulang (bukti `real-01-hub-cadangan.png`).',
        'fin-app: layar tunggal ekspor/impor JSON langsung (bukti `fin-01-hub-cadangan.png`).',
      ],
      skema: 'Tabel `backupSnapshots` untuk menyimpan riwayat cadangan lokal jika diperlukan.',
      default: 'Status Google Drive Mati.',
      alurData: 'Aksi ekspor membaca tabel database → mengompresi/menyusun payload → mengunduh.',
      error: [
        { id: 'E-01', teks: 'Penyimpanan penuh atau berkas rusak saat impor → tampilkan pesan error yang jelas.' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Aplikasi baru dibuka tanpa transaksi → cadangan tetap menghasilkan berkas valid berisi tabel bawaan.' },
      ],
      internal: [
        { teks: '`components/backup-screen.tsx`' },
        { teks: '`app/(tabs)/lainnya/backup/page.tsx`' },
      ],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Lihat TS-03 (Cadangan) + langkah BK-01 dan BK-02 pada SKENARIO.md Tahap 6b.',
      metrics: [
        { teks: 'Pengguna dapat mengakses cadangan perangkat dalam ≤2 ketukan dari tab Lainnya.' },
      ],
      verifikasi: {
        ok: [
          'Asli: 10 opsi navigasi berhierarki lengkap (bukti `real-01`, `real-02`, `real-03`).',
          'fin-app: fitur ekspor dan impor JSON berjalan lancar (bukti `fin-01`, `fin-02`, `fin-03`).',
        ],
        belum: [
          '❓ Penataan sub-layar berjenjang pada komponen web fin-app.',
        ],
      },
    },
  },
  {
    id: 'T-44',
    prdId: 'PRD-P-38',
    slug: 'ekspor-transaksi-excel',
    title: 'Fitur ekspor transaksi ke berkas Excel (.xls / .xlsx) belum tersedia di fin-app',
    kategori: 'Cadangan · ekspor',
    prioritas: 'Medium',
    parent: 'Lainnya → Cadangan',
    masuk: 'Lainnya → Cadangan → Mengekspor file excel melalui email',
    ringkas:
      'Aplikasi asli menyediakan dialog pemilihan periode (Bulanan, Bulan lalu, Tahunan, Tahun lalu, Semua) ' +
      'dan mengekspor seluruh transaksi periode tersebut ke format spreadsheet Excel. fin-app saat ini ' +
      'hanya mendukung ekspor basis data JSON.',
    mm: [
      'Dialog pemilihan periode: Bulanan, Bulan lalu, Tahunan, Tahun lalu, Semua dengan rentang tanggal.',
      'Menghasilkan berkas Excel (.xls/.xlsx) yang memuat catatan transaksi terformat rapi.',
    ],
    fin: [
      'Fitur ekspor transaksi ke Excel (.xls) telah ditambahkan di modul Cadangan lengkap dengan dialog 5 pilihan periode (Bulanan, Bulan lalu, Tahunan, Tahun lalu, Semua) dan 8 kolom standar Money Manager (selesai 24 Oktober 2026).',
    ],
    dampak:
      'Pengguna yang ingin memeriksa atau mengolah mutasi transaksi di luar aplikasi (mis. di Microsoft Excel ' +
      'atau Google Sheets) tidak dapat melakukannya tanpa konversi pihak ketiga.',
    selesai: '24 Oktober 2026',
    butuhPRD: true,
    bukti: [
      { group: 'TA06b-cadangan', file: 'real-05-ekspor-excel.png', cap: 'Asli: dialog pilihan periode ekspor Excel' },
      { group: 'TA06b-cadangan', file: 'fin-05-ekspor-excel-ketiadaan.png', cap: 'fin-app: tidak ada opsi ekspor Excel' },
    ],
    prd: {
      deskripsi:
        'Menyediakan fitur ekspor transaksi ke dalam format spreadsheet Excel/CSV dengan pilihan rentang periode ' +
        '(Bulanan, Bulan lalu, Tahunan, Tahun lalu, Semua) yang dapat langsung diunduh.',
      tujuan: [
        'Memudahkan pengguna mengolah, merekap, dan mencetak catatan keuangan menggunakan aplikasi spreadsheet.',
        'Mencapai kesetaraan fungsional dengan fitur ekspor Excel aplikasi asli.',
      ],
      alur:
        'Lainnya → Cadangan → Mengekspor file excel →\n' +
        '  ├─ Dialog pilih periode (Bulanan / Bulan lalu / Tahunan / Tahun lalu / Semua)\n' +
        '  └─ Klik periode → proses pembentukan spreadsheet → browser mengunduh file .xlsx / .csv',
      userStory: [
        { prio: 'Sedang', role: 'pengguna', want: 'mengekspor mutasi transaksi ke Excel', so: 'saya bisa menganalisis pengeluaran dan anggaran di spreadsheet komputer' },
      ],
      struktur:
        'Dialog Pilihan Periode Excel:\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  Pengelola Keuangan - Excel               ✕  │\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  Bulanan (01.10.26 ~ 31.10.26)               │\n' +
        '│  Bulan lalu (01.09.26 ~ 30.09.26)            │\n' +
        '│  Tahunan (01.01.26 ~ 31.12.26)               │\n' +
        '│  Tahun lalu (01.01.25 ~ 31.12.25)            │\n' +
        '│  Semua                                       │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Dialog periode ekspor Excel',
          tipe: 'dialog pemilih',
          fungsi: 'Memilih rentang waktu transaksi yang akan disertakan dalam spreadsheet.',
          opsi: '5 pilihan periode bawaan',
          default: 'Bulanan',
          perilaku: 'Memilih salah satu opsi langsung memulai pembuatan berkas.',
        },
        {
          nama: 'Pembangkit berkas spreadsheet',
          tipe: 'utilitas ekspor',
          fungsi: 'Mengonversi catatan transaksi menjadi baris kolom Excel dengan header Tanggal, Akun, Kategori, Sub-kategori, Catatan, Jumlah.',
          opsi: 'XLSX / CSV',
          default: 'XLSX (atau CSV kompatibel)',
          perilaku: 'Membentuk Blob dan memicu unduhan berkas di peramban.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Menyediakan dialog pemilih periode ekspor transaksi Excel.' },
        { id: 'FR-02', teks: 'Format kolom spreadsheet memuat Tanggal, Jenis, Kategori, Sub-kategori, Aset, Jumlah, Deskripsi, Catatan.' },
        { id: 'FR-03', teks: 'Berkas spreadsheet dapat langsung diunduh pengguna setelah dipilih.' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Pemrosesan 5.000 transaksi selesai dalam waktu ≤2 detik di sisi klien.' },
      ],
      interaksi: {
        navigasi: 'Dialog overlay di atas menu Cadangan.',
        simpan: 'Menghasilkan file unduhan di perangkat pengguna.',
        validasi: 'Bila periode terpilih tidak memiliki transaksi, tetap menghasilkan berkas dengan baris header dan pesan kosong.',
      },
      teramati: [
        'Asli: dialog pilihan 5 periode (bukti `real-05-ekspor-excel.png`).',
        'fin-app: belum ada opsi ekspor Excel (bukti `fin-05-ekspor-excel-ketiadaan.png`).',
      ],
      skema: 'Tidak memerlukan perubahan skema Dexie.',
      default: 'Periode aktif default mengikuti bulan berjalan.',
      alurData: 'Query transaksi berdasarkan rentang ZDATE → pemetaan kolom → unduh Blob.',
      error: [
        { id: 'E-01', teks: 'Gagal menghasilkan berkas → tampilkan notifikasi toast kesalahan.' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Transaksi dengan karakter khusus atau emoji pada catatan tetap aman diekspor.' },
      ],
      internal: [
        { teks: '`components/backup-screen.tsx`' },
        { teks: '`lib/export-excel.ts` (modul baru)' },
      ],
      eksternal: [{ teks: 'Pustaka pembuat spreadsheet klien (mis. xlsx atau generator CSV).' }],
      testing: 'Lihat TS-03 (Cadangan TC-BAK-06) + langkah BK-05 pada SKENARIO.md Tahap 6b.',
      metrics: [
        { teks: 'Ekspor Excel selesai dalam ≤2 klik dari menu Cadangan.' },
      ],
      verifikasi: {
        ok: [
          'Asli: dialog 5 periode Excel terverifikasi (bukti `real-05`).',
        ],
        belum: [
          '❓ Pemilihan format spesifik (.xlsx vs .csv) yang paling ringan untuk fin-app.',
        ],
      },
    },
  },
  {
    id: 'T-45',
    prdId: 'PRD-P-39',
    slug: 'setel-ulang-data',
    title: 'Fitur setel ulang data (semua / transaksi saja) belum tersedia di menu Cadangan fin-app',
    kategori: 'Cadangan · reset',
    prioritas: 'Medium',
    parent: 'Lainnya → Cadangan',
    masuk: 'Lainnya → Cadangan → Seksi Mulai ulang (Cadangkan/Pemulihan)',
    ringkas:
      'Aplikasi asli menyediakan seksi "Mulai ulang (Cadangkan/Pemulihan)" dengan dua pilihan: "Setel ulang semua" ' +
      '(mengembalikan app ke kondisi instalasi awal) dan "Setel ulang rincian transaksi saja" (menghapus riwayat ' +
      'transaksi tanpa mengubah aset, kategori, dan pengaturan). fin-app belum memiliki aksi setel ulang ini.',
    mm: [
      'Seksi "Mulai ulang (Cadangkan/Pemulihan)" memuat 2 opsi.',
      'Setel ulang semua meminta konfirmasi "Apakah anda yakin ingin menyetel ulang?".',
      'Setel ulang rincian transaksi saja meminta konfirmasi dengan penjelasan bahwa aset, kategori, dan pengaturan tetap ada.',
    ],
    fin: [
      'Seksi "Mulai ulang (Cadangkan/Pemulihan)" telah ditambahkan pada modul Cadangan dengan 2 tombol: "Setel ulang rincian transaksi saja" dan "Setel ulang semua".',
      'Masing-masing aksi diproteksi dengan ConfirmDialog konfirmasi (TIDAK/YA) sesuai teks aplikasi asli (selesai 24 Oktober 2026).',
    ],
    dampak:
      'Pengguna yang ingin membersihkan transaksi latihan atau mereset aplikasi dari awal tidak memiliki ' +
      'fasilitas resmi yang terjamin keamanannya di antarmuka.',
    selesai: '24 Oktober 2026',
    butuhPRD: true,
    bukti: [
      { group: 'TA06b-cadangan', file: 'real-06-setel-ulang-dialog.png', cap: 'Asli: dialog konfirmasi setel ulang transaksi' },
      { group: 'TA06b-cadangan', file: 'fin-06-setel-ulang-ketiadaan.png', cap: 'fin-app: tidak ada opsi setel ulang' },
    ],
    prd: {
      deskripsi:
        'Menambahkan seksi "Mulai ulang (Cadangkan/Pemulihan)" pada menu Cadangan yang memuat opsi setel ulang semua ' +
        'dan setel ulang transaksi saja dengan proteksi dialog konfirmasi.',
      tujuan: [
        'Memungkinkan pengguna membersihkan transaksi uji tanpa kehilangan daftar aset dan kategori.',
        'Memfasilitasi reset menyeluruh ke kondisi awal instalasi pabrik dengan aman.',
      ],
      alur:
        'Lainnya → Cadangan → Seksi Mulai ulang →\n' +
        '  ├─ Setel ulang semua → Dialog konfirmasi → Hapus seluruh tabel & inisialisasi ulang bawaan\n' +
        '  └─ Setel ulang rincian transaksi saja → Dialog konfirmasi → Kosongkan tabel transaksi saja',
      userStory: [
        { prio: 'Sedang', role: 'pengguna', want: 'mereset transaksi saja', so: 'saya bisa mulai mencatat dari awal tanpa perlu mengatur ulang kategori dan rekening saya' },
      ],
      struktur:
        'Dialog Konfirmasi Reset:\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  Menyetel ulang konten. Detail lain seperti  │\n' +
        '│  aset, kategori, Pengaturan, dan lain-lain   │\n' +
        '│  akan tetap ada. Apakah Anda ingin           │\n' +
        '│  melanjutkan?                                │\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│                [ TIDAK ]       [ YA ]        │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Setel ulang semua',
          tipe: 'aksi destruktif dengan konfirmasi',
          fungsi: 'Menghapus seluruh database IndexedDB dan memicu ulang seeding bawaan.',
          opsi: 'Konfirmasi TIDAK / YA',
          default: 'Tidak dijalankan tanpa konfirmasi eksplisit',
          perilaku: 'Jika YA, seluruh data dihapus dan aplikasi dimuat ulang ke keadaan baru.',
        },
        {
          nama: 'Setel ulang rincian transaksi saja',
          tipe: 'aksi destruktif dengan konfirmasi',
          fungsi: 'Mengosongkan tabel transaksi saja (`db.transactions.clear()`), menjaga aset, kategori, dan pengaturan.',
          opsi: 'Konfirmasi TIDAK / YA',
          default: 'Tidak dijalankan tanpa konfirmasi eksplisit',
          perilaku: 'Jika YA, tabel transaksi dikosongkan dan saldo aset disesuaikan kembali.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Menu Cadangan memuat seksi "Mulai ulang (Cadangkan/Pemulihan)".' },
        { id: 'FR-02', teks: 'Tombol `Setel ulang semua` memunculkan dialog konfirmasi sebelum membersihkan seluruh data.' },
        { id: 'FR-03', teks: 'Tombol `Setel ulang rincian transaksi saja` hanya menghapus data transaksi dan mempertahankan aset/kategori.' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Tombol konfirmasi menggunakan penegasan warna dan dialog modal untuk mencegah ketukan tidak sengaja.' },
      ],
      interaksi: {
        navigasi: 'Dialog konfirmasi muncul di atas halaman cadangan.',
        simpan: 'Perubahan langsung diterapkan ke IndexedDB.',
        validasi: 'Memerlukan persetujuan eksplisit YA sebelum penghapusan.',
      },
      teramati: [
        'Asli: seksi Mulai ulang dan dialog konfirmasi pesan spesifik (bukti `real-06-setel-ulang-dialog.png`).',
        'fin-app: tidak ada tombol reset di menu Cadangan (bukti `fin-06-setel-ulang-ketiadaan.png`).',
      ],
      skema: 'Tidak memerlukan perubahan skema tabel.',
      default: 'Data default dikembalikan setelah Setel ulang semua.',
      alurData: '`db.transactions.clear()` atau `db.delete()` + `initDB()` → redirect ke `/transaksi`.',
      error: [
        { id: 'E-01', teks: 'Penghapusan gagal → tampilkan toast error dan jangan sentuh data lain.' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Reset transaksi saat tidak ada transaksi → operasi tetap aman tanpa error.' },
      ],
      internal: [
        { teks: '`components/backup-screen.tsx`' },
        { teks: '`lib/db.ts`' },
      ],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Lihat TS-03 (Cadangan TC-RST-03 & TC-RST-04) + langkah BK-06 pada SKENARIO.md Tahap 6b.',
      metrics: [
        { teks: 'Pembersihan transaksi berhasil dalam <500 ms tanpa sisa transaksi.' },
      ],
      verifikasi: {
        ok: [
          'Asli: dialog konfirmasi reset terverifikasi (bukti `real-06`).',
        ],
        belum: [
          '❓ Perilaku saldo awal aset setelah rincian transaksi disetel ulang.',
        ],
      },
    },
  },
  {
    id: 'T-46',
    prdId: 'PRD-P-40',
    slug: 'judul-layar-anggaran',
    title: 'Judul layar daftar anggaran di fin-app disederhanakan ("Anggaran" vs "Pengaturan anggaran")',
    kategori: 'Anggaran · tata nama',
    prioritas: 'Rendah',
    parent: 'Lainnya → Pengaturan anggaran',
    masuk: 'Lainnya → Pengaturan anggaran (header)',
    ringkas:
      'Di aplikasi asli Money Manager, judul layar daftar anggaran adalah "Pengaturan anggaran", ' +
      'selaras dengan teks menu masukannya. Di fin-app, judul disederhanakan menjadi "Anggaran".',
    mm: [
      'Header aplikasi asli bertuliskan "Pengaturan anggaran" (id `titleName`).',
      'Nama menu di seksi Kategori/Berulang bertuliskan "Pengaturan anggaran".',
    ],
    fin: [
      'Header fin-app telah diselaraskan menjadi `Pengaturan anggaran` dengan sub-label `Lainnya`.',
      'Teks menu dan header layar kini 100% konsisten (selesai 24 Oktober 2026).',
    ],
    dampak: 'Perbedaan minor tata nama visual pada header antarmuka.',
    selesai: '24 Oktober 2026',
    butuhPRD: true,
    bukti: [
      { group: 'TA07-anggaran-berulang', file: 'real-01-budget-list-kosong.png', cap: 'Asli: judul layar "Pengaturan anggaran"' },
      { group: 'TA07-anggaran-berulang', file: 'fin-01-budget-list-kosong.png', cap: 'fin-app: judul layar "Anggaran"' },
    ],
    prd: {
      deskripsi:
        'Menyelaraskan judul layar daftar anggaran di fin-app agar menggunakan "Pengaturan anggaran" sesuai aplikasi asli.',
      tujuan: [
        'Keseragaman terminologi antara menu navigasi dan header layar.',
      ],
      alur: 'Lainnya → Pengaturan anggaran → Header menampilkan "Pengaturan anggaran".',
      userStory: [
        { prio: 'Rendah', role: 'pengguna', want: 'melihat judul layar yang konsisten dengan nama menu yang ditekan', so: 'tidak bingung memastikan layar yang sedang dibuka' },
      ],
      struktur:
        'Header layar:\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│ [<] Lainnya                                  │\n' +
        '│     Pengaturan anggaran                  [+] │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Header judul anggaran',
          tipe: 'label UI',
          fungsi: 'Menampilkan teks "Pengaturan anggaran" pada header.',
          opsi: 'Tidak ada',
          default: 'Pengaturan anggaran',
          perilaku: 'Teks statis di header layar anggaran.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Header layar daftar anggaran bertuliskan "Pengaturan anggaran".' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Tetap mempertahankan safe-area dan tombol kembali serta tombol tambah.' },
      ],
      interaksi: {
        navigasi: 'Tetap sama melalui /lainnya/anggaran.',
        simpan: 'Tidak ada simpanan data.',
        validasi: 'Tidak ada.',
      },
      teramati: [
        'Asli: judul "Pengaturan anggaran" (bukti `real-01-budget-list-kosong.png`).',
        'fin-app: judul "Anggaran" (bukti `fin-01-budget-list-kosong.png`).',
      ],
      skema: 'Tidak memerlukan perubahan skema.',
      default: 'Tidak ada.',
      alurData: 'Statis di komponen `components/budget-list-screen.tsx`.',
      error: [],
      edge: [],
      internal: [{ teks: '`components/budget-list-screen.tsx`' }],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Lihat TS-04 (Anggaran) + langkah AB-01 pada SKENARIO.md Tahap 7.',
      metrics: [{ teks: 'Paritas nama judul 100% cocok dengan aplikasi asli.' }],
      verifikasi: {
        ok: ['Asli dan fin-app telah ditangkap buktinya di TA07.'],
        belum: [],
      },
    },
  },
  {
    id: 'T-47',
    prdId: 'PRD-P-41',
    slug: 'pemilih-kategori-anggaran-subkategori',
    title: 'Form Tambah Anggaran: ketiadaan pemilihan sub-kategori pada fin-app',
    kategori: 'Anggaran · form',
    prioritas: 'Medium',
    parent: 'Lainnya → Pengaturan anggaran → Tambah anggaran',
    masuk: 'Lainnya → Pengaturan anggaran → [+] Tambah anggaran',
    ringkas:
      'Di Money Manager, kategori anggaran dipilih melalui layout dua kolom (kategori utama di kiri dan sub-kategori di kanan), ' +
      'sehingga pengguna dapat menetapkan anggaran per sub-kategori atau kategori keseluruhan ([Kategori] (Semua)). ' +
      'Di fin-app, pemilihan hanya berbentuk grid 3 kolom kategori utama plus "· Semua", tanpa dukungan penetapan per sub-kategori.',
    mm: [
      'Pemilih kategori menampilkan dua kolom: kiri untuk kategori utama (scrollable), kanan untuk sub-kategori.',
      'Memilih kategori utama di kiri membuka daftar sub-kategori di kanan, dengan item teratas `[Kategori] (Semua)`.',
      'Pengguna dapat mengalokasikan anggaran untuk sub-kategori tertentu (misal hanya Lunch, bukan seluruh Food).',
    ],
    fin: [
      'Pemilih kategori telah ditingkatkan menjadi layout 2 kolom: kolom kiri untuk kategori utama (dan `· Semua`), kolom kanan untuk sub-kategori (termasuk opsi `[Kategori] (Semua)`).',
      'Mendukung penetapan anggaran terperinci hingga tingkat sub-kategori secara penuh (selesai 24 Oktober 2026).',
    ],
    dampak: 'Pengguna yang ingin membuat anggaran terperinci per sub-kategori tidak dapat melakukannya di fin-app.',
    selesai: '24 Oktober 2026',
    butuhPRD: true,
    bukti: [
      { group: 'TA07-anggaran-berulang', file: 'real-02-form-tambah-budget.png', cap: 'Asli: tata letak 2 kolom kategori utama + sub-kategori' },
      { group: 'TA07-anggaran-berulang', file: 'fin-02-form-tambah-budget.png', cap: 'fin-app: grid 3 kolom tanpa sub-kategori' },
    ],
    prd: {
      deskripsi:
        'Menyediakan dukungan penetapan anggaran per sub-kategori pada form Tambah/Ubah Anggaran dengan antarmuka yang memungkinkan pemilihan sub-kategori.',
      tujuan: [
        'Pengguna dapat membatasi anggaran pada sub-kategori tertentu selain kategori utama.',
        'Mendukung struktur data anggaran untuk target sub-kategori.',
      ],
      alur:
        'Lainnya → Pengaturan anggaran → [+] Tambah anggaran →\n' +
        '  ├─ Pilih kategori utama di panel kiri\n' +
        '  ├─ Pilih sub-kategori spesifik atau opsi "(Semua)" di panel kanan\n' +
        '  └─ Kategori terpilih diperbarui ke form',
      userStory: [
        { prio: 'Sedang', role: 'pengguna', want: 'menetapkan anggaran khusus untuk makan siang (sub-kategori Lunch)', so: 'pengeluaran makan malam atau jajan tidak memakan kuota anggaran kerja siang saya' },
      ],
      struktur:
        'Pemilih kategori 2 kolom:\n\n' +
        '```\n' +
        '┌──────────────────────────────┬──────────────────────────────┐\n' +
        '│ Semua                        │ 🍜 Food (Semua)              │\n' +
        '│ 🍜 Food                      │ Lunch                        │\n' +
        '│ 👥 Social Life               │ Dinner                       │\n' +
        '│ 🐶 Pets                      │ Eating out                   │\n' +
        '│ 🚗 Transport                 │ Beverages                    │\n' +
        '└──────────────────────────────┴──────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Dukungan sub-kategori anggaran',
          tipe: 'pemilih bertingkat',
          fungsi: 'Memungkinkan pemilihan sub-kategori sebagai target anggaran.',
          opsi: 'Kategori utama / Sub-kategori / Semua',
          default: '· Semua',
          perilaku: 'Menyimpan targetUid yang merujuk ke sub-kategori bila dipilih.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Form anggaran mendukung pemilihan sub-kategori pengeluaran.' },
        { id: 'FR-02', teks: 'Perhitungan sisa anggaran memperhitungkan transaksi pada sub-kategori yang bersangkutan.' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Tampilan tetap responsif di mobile web dengan layout yang nyaman disentuh.' },
      ],
      interaksi: {
        navigasi: 'Di dalam sheet Tambah/Ubah anggaran.',
        simpan: 'Tersimpan di tabel budgets dengan kolom target sub-kategori.',
        validasi: 'Wajib memilih kategori sebelum menyimpan.',
      },
      teramati: [
        'Asli: 2 kolom (bukti `real-02-form-tambah-budget.png`).',
        'fin-app: 3 kolom tanpa sub-kategori (bukti `fin-02-form-tambah-budget.png`).',
      ],
      skema: 'Tabel budgets di IndexedDB mendukung targetUid kategori maupun sub-kategori.',
      default: 'Anggaran keseluruhan (IS_TOTAL = 1).',
      alurData: 'Menyimpan targetUid ke Dexie/IndexedDB.',
      error: [
        { id: 'E-01', teks: 'Kategori belum dipilih → tampilkan dialog Silahkan pilih kategori.' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Sub-kategori dihapus setelah anggaran dibuat → anggaran tetap aman atau dialihkan ke parent.' },
      ],
      internal: [
        { teks: '`components/budget-form-sheet.tsx`' },
        { teks: '`lib/db.ts`' },
      ],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Lihat TS-04 (Anggaran TC-BDG-01 & TC-BDG-02) + langkah AB-03 pada SKENARIO.md Tahap 7.',
      metrics: [{ teks: 'Pengguna dapat membuat anggaran hingga tingkat sub-kategori.' }],
      verifikasi: {
        ok: ['Buktinya terpublikasi di TA07.'],
        belum: [],
      },
    },
  },
  {
    id: 'T-48',
    prdId: 'PRD-P-42',
    slug: 'kemunculan-numpad-form-anggaran',
    title: 'Perbedaan pemicu pembukaan numpad pada form Tambah Anggaran (otomatis vs ketuk baris Total)',
    kategori: 'Anggaran · UX interaksi',
    prioritas: 'Rendah',
    parent: 'Lainnya → Pengaturan anggaran → Tambah anggaran',
    masuk: 'Lainnya → Pengaturan anggaran → [+] Tambah anggaran',
    ringkas:
      'Di Money Manager, setelah kategori dipilih, panel kategori otomatis menutup dan numpad kalkulator ' +
      'kustom langsung muncul di bagian bawah layar. Di fin-app, pemilihan kategori membiarkan grid kategori tetap terbuka; ' +
      'pengguna harus mengetuk baris "Total" secara terpisah untuk memunculkan numpad sheet.',
    mm: [
      'Memilih kategori langsung mengganti panel bawah menjadi numpad kustom (angka 0–9, tombol hitung, Selesai).',
      'Pengguna bisa langsung mengetik nominal tanpa tap tambahan.',
    ],
    fin: [
      'Pemilihan kategori pada form Tambah Anggaran kini otomatis membuka amount sheet / keypad nominal tanpa perlu ketukan terpisah pada baris Total (selesai 24 Oktober 2026).',
    ],
    dampak: 'Di fin-app membutuhkan 1 ketukan tambahan (ketuk Total) untuk mulai memasukkan nominal anggaran.',
    selesai: '24 Oktober 2026',
    butuhPRD: true,
    bukti: [
      { group: 'TA07-anggaran-berulang', file: 'real-02b-numpad-budget.png', cap: 'Asli: numpad kalkulator muncul otomatis setelah kategori dipilih' },
      { group: 'TA07-anggaran-berulang', file: 'fin-02-form-tambah-budget.png', cap: 'fin-app: kategori tetap terbuka, numpad belum muncul' },
    ],
    prd: {
      deskripsi:
        'Mengoptimalkan alur pembuatan anggaran di fin-app agar setelah kategori dipilih, input atau sheet nominal dapat otomatis aktif.',
      tujuan: [
        'Mengurangi jumlah ketukan pengguna saat membuat anggaran baru.',
        'Mendekatkan alur interaksi form anggaran dengan aplikasi asli.',
      ],
      alur:
        'Lainnya → Pengaturan anggaran → [+] Tambah anggaran → Pilih kategori → Numpad / sheet nominal otomatis terbuka → Simpan.',
      userStory: [
        { prio: 'Rendah', role: 'pengguna', want: 'langsung memasukkan angka setelah memilih kategori', so: 'proses pembuatan anggaran lebih cepat dan praktis' },
      ],
      struktur:
        'Alur otomatis:\n\n' +
        '```\n' +
        'Pilih Kategori ───> [ Otomatis buka Amount Sheet / Numpad ] ───> Selesai ───> Menyimpan\n' +
        '```',
      subFitur: [
        {
          nama: 'Auto-open amount pad',
          tipe: 'interaksi UX',
          fungsi: 'Membuka dialog amount pad otomatis saat kategori dipilih pertama kali.',
          opsi: 'Aktif / Nonaktif',
          default: 'Aktif saat penambahan baru',
          perilaku: 'Setelah `setTarget(...)`, picu `setPadOpen(true)`.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Pada penambahan anggaran baru, pemilihan kategori otomatis memicu pembukaan keypad nominal.' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Transisi animasi sheet berlangsung mulus tanpa kedipan.' },
      ],
      interaksi: {
        navigasi: 'Di dalam sheet Tambah anggaran.',
        simpan: 'Tidak ada.',
        validasi: 'Tidak ada.',
      },
      teramati: [
        'Asli: numpad langsung tampil di bawah (bukti `real-02b-numpad-budget.png`).',
        'fin-app: butuh ketukan di baris Total (bukti `fin-02-form-tambah-budget.png`).',
      ],
      skema: 'Tidak ada perubahan skema.',
      default: 'Tidak ada.',
      alurData: 'Komponen internal `BudgetFormSheet`.',
      error: [],
      edge: [],
      internal: [{ teks: '`components/budget-form-sheet.tsx`' }],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Lihat TS-04 (Anggaran TC-BDG-01) + langkah AB-02b pada SKENARIO.md Tahap 7.',
      metrics: [{ teks: 'Pengurangan 1 interaksi tap per pembuatan anggaran.' }],
      verifikasi: {
        ok: ['Buktinya terpublikasi di TA07.'],
        belum: [],
      },
    },
  }
]
