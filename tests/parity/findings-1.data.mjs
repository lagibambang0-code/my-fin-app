/**
 * Katalog temuan paritas — bagian 1.
 *
 * Berkas ini adalah **sumber tunggal** untuk:
 *  - `money-manager-clone/parity/temuan/T-XX-*.md`  (report per temuan)
 *  - `money-manager-clone/parity/prd/PRD-P-NN-*.md` (PRD per temuan)
 *  - `money-manager-clone/parity/TEMUAN.md`         (indeks + pelacakan revisi)
 *
 * Dihasilkan oleh `node tests/parity/emit-docs.mjs`.
 *
 * Aturan isi:
 *  - Hanya tulis yang benar-benar teramati. Yang belum diperiksa ditandai ❓.
 *  - `bukti` menunjuk berkas di `money-manager-clone/parity/bukti/<grup>/`.
 *  - Temuan hanya boleh **ditambahkan di akhir**; nomor PRD mengikuti urutan
 *    temuan supaya nomor lama tidak bergeser saat revisi.
 */
export const FINDINGS_1 = [
  {
    id: 'T-01',
    prdId: 'PRD-P-01',
    slug: 'format-angka-desimal',
    title: 'Format angka: jumlah desimal',
    kategori: 'Transaksi · tampilan angka',
    prioritas: 'High',
    parent: 'Tab Transaksi → ringkasan periode',
    masuk: 'Tab Transaksi → baris Pendapatan / Pengeluaran / Total',
    ringkas:
      'Aplikasi asli mencetak jumlah desimal sesuai setelan "Poin desimal" pada mata uang ' +
      'utama, sehingga nilai kosong pun tampil `0,00`. fin-app mencetak tanpa desimal untuk ' +
      'IDR (`Rp 0`). Setelah mata uang kedua sisi disamakan ke IDR, inilah selisih yang tersisa.',
    mm: [
      'Ringkasan periode menampilkan `0,00` untuk Pendapatan, Pengeluaran, dan Total.',
      'Pratinjau di layar setelan mata uang menampilkan `Rp 1.000,00`.',
      'Setelan menentukan dua hal: `Posisi satuan` (Depan/Belakang) dan `Poin desimal` (`1.00` = 2 angka).',
      'Pemisah mengikuti locale: `.` ribuan, `,` desimal.',
      'Nilai teramati saat pengujian: `Poin desimal` = `1.00` untuk USD maupun IDR.',
    ],
    fin: [
      '`components/asset-form.tsx` menetapkan `DECIMAL_POINT: iso.code === "IDR" || iso.code === "JPY" ? 0 : 2` — jadi 0 desimal untuk IDR, dipatok di kode.',
      'Ringkasan menampilkan `Rp 0`.',
      'Tidak ada setelan desimal maupun posisi satuan yang bisa diubah pengguna (❓ tidak ditemukan di `app/` maupun `components/`).',
    ],
    dampak:
      'Angka di fin-app tidak sama persis dengan aplikasi asli. Ini terlihat di semua layar ' +
      'yang menampilkan uang, jadi menyentuh banyak tahap pengujian berikutnya.',
    butuhPRD: true,
    bukti: [
      { group: 'TA00-persiapan', file: 'real-00-transaksi-harian.png', cap: 'Ringkasan periode aplikasi asli: `0,00`' },
      { group: 'TA00-persiapan', file: 'fin-00-transaksi-harian.png', cap: 'Ringkasan periode fin-app: `Rp 0`' },
      { group: 'TA01b-setelan-asli', file: 'real-pengaturan-mata-uang-utama.png', cap: 'Layar setelan mata uang: `Posisi satuan`, `Poin desimal`, pratinjau `Rp 1.000,00`' },
    ],
    prd: {
      deskripsi:
        'Aturan pencetakan angka uang: posisi simbol dan jumlah angka di belakang koma ' +
        'ditentukan oleh setelan mata uang utama, bukan dipatok di kode.',
      tujuan: [
        'Angka uang di seluruh layar tampil dengan format yang identik dengan aplikasi asli.',
        'Pengguna dapat mengubah posisi simbol dan jumlah desimal.',
        'Nilai nol pun tampil dengan format yang sama (`0,00`), supaya layar kosong tidak terlihat berbeda.',
      ],
      alur:
        'Setelan mata uang utama → "Posisi satuan" & "Poin desimal" → dipakai oleh SEMUA\n' +
        'pencetakan angka: ringkasan periode, daftar transaksi, saldo aset, statistik,\n' +
        'tutup buku, dan pratinjau di layar setelan itu sendiri.',
      userStory: [
        { prio: 'Tinggi', role: 'pengguna', want: 'angka tampil dengan format yang sama dengan aplikasi asli', so: 'hasil kerja saya bisa dibandingkan langsung dengan catatan lama' },
        { prio: 'Medium', role: 'pengguna', want: 'mengubah posisi simbol dan jumlah desimal', so: 'format uang sesuai kebiasaan saya' },
      ],
      struktur:
        'Layar yang terpengaruh (contoh pada ringkasan periode):\n\n' +
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  Okt 2026                                    │\n' +
        '│  Pendapatan    Pengeluaran    Total          │\n' +
        '│  0,00          0,00           0,00           │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Pencetakan angka uang',
          tipe: 'aturan tampilan',
          fungsi: 'Mengubah bilangan menjadi teks uang.',
          opsi: 'Posisi satuan: `Depan` / `Belakang`; Poin desimal: 0–2 angka',
          default: 'Mengikuti mata uang utama; pada aplikasi asli teramati `Depan` dan `1.00`',
          perilaku:
            'Pemisah ribuan `.` dan desimal `,` (locale Indonesia). Nilai dibulatkan ke jumlah ' +
            'desimal yang dipilih. Nilai nol tetap dicetak dengan desimal penuh.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Seluruh layar yang menampilkan uang memakai satu fungsi pencetakan yang sama.' },
        { id: 'FR-02', teks: 'Jumlah desimal dan posisi simbol dibaca dari setelan mata uang utama, bukan dari daftar kode mata uang yang dipatok di kode.' },
        { id: 'FR-03', teks: 'Nilai nol dicetak dengan jumlah desimal penuh (mis. `0,00`), bukan `0`.' },
        { id: 'FR-04', teks: 'Mengubah setelan langsung tercermin di seluruh layar tanpa perlu memuat ulang aplikasi.' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Konsistensi: satu nilai uang harus tercetak sama di semua layar.' },
        { id: 'NFR-02', teks: 'Usability: angka tetap terbaca (pemisah ribuan) pada nilai besar.' },
      ],
      interaksi: {
        navigasi: 'Setelan diubah dari layar mata uang utama (lihat PRD-P-07 / temuan T-11).',
        simpan: 'Setelan tersimpan saat pengguna menekan tombol simpan di layar tersebut.',
        validasi: 'Jumlah desimal dibatasi pilihan yang tersedia; tidak ada input bebas.',
      },
      teramati: [
        'Ringkasan periode: `0,00` (ketiga kolom).',
        'Pratinjau setelan: `Rp 1.000,00`.',
        'Posisi satuan `Depan` berarti simbol mendahului angka (`Rp 1.000,00`).',
      ],
      skema:
        'Setelan disimpan sebagai preferensi aplikasi (bukan per transaksi):\n\n' +
        '```\n' +
        'currency_main:  { code: "IDR", symbolPosition: "depan", decimalPlaces: 2 }\n' +
        '```',
      default: 'Posisi satuan `Depan`, poin desimal 2 angka.',
      alurData:
        'Setelan mata uang → (dibaca saat render) → fungsi pencetakan → semua layar.\n' +
        'Perubahan setelan → simpan → layar aktif dicetak ulang.',
      error: [
        { id: 'E-01', teks: 'Nilai uang sangat besar → tetap dicetak penuh dengan pemisah ribuan (bukan notasi ilmiah).' },
      ],
      edge: [
        { id: 'EC-01', teks: 'Nilai negatif → tanda minus di depan simbol.' },
        { id: 'EC-02', teks: 'Nol → `0,00` bila poin desimal 2.' },
        { id: 'EC-03', teks: 'Mata uang tanpa simbol lazim (mis. beberapa kode) → pakai kode mata uang.' },
      ],
      internal: [
        { teks: 'Ringkasan periode, daftar transaksi, saldo aset, statistik, tutup buku — semuanya memakai pencetakan ini.' },
      ],
      eksternal: [{ teks: 'Ekspor Excel memakai format yang sama supaya berkas dan layar tidak berbeda.' }],
      testing: 'Rujuk TS-05 (Tab Transaksi) dan TS-07 (Statistik); tambahkan TC khusus format angka.',
      metrics: [{ teks: 'Tidak ada layar yang mencetak uang dengan aturan berbeda.' }],
      verifikasi: {
        ok: [
          'Ringkasan periode aplikasi asli `0,00` (screenshot + XML Tahap 0).',
          'Layar setelan mata uang: `Posisi satuan` = `Depan`, `Poin desimal` = `1.00`, pratinjau `Rp 1.000,00`.',
        ],
        belum: [
          '❓ Apakah `Poin desimal` bisa bernilai 0 atau 3 — daftar opsinya belum dibuka.',
          '❓ Perilaku pembulatan pada nilai yang lebih kecil dari 0,005.',
        ],
      },
    },
  },
  {
    id: 'T-02',
    prdId: 'PRD-P-02',
    slug: 'hub-menu-lainnya',
    title: 'Struktur menu "Lainnya": grid + hub "Kelola pengaturan"',
    kategori: 'Lainnya · navigasi',
    prioritas: 'Medium',
    parent: 'Tab Lainnya',
    masuk: 'Tab Lainnya',
    ringkas:
      'Aplikasi asli menaruh 9 tombol pada grid tanpa judul seksi, dan mengumpulkan hampir semua ' +
      'setelan di dalam satu submenu bernama "Kelola pengaturan" (24 baris, 3 judul seksi). ' +
      'fin-app memakai satu daftar berseksi langsung di layar "Lainnya" (4 seksi, 14 item).',
    mm: [
      'Grid 3×3: `Kelola pengaturan`, `Kelola aset`, `Kata sandi`, `CalcBox`, `Pengelola PC`, `Cadangan`, `Masukan`, `Bantuan`, `Rekomendasi`.',
      'Tanpa judul seksi; setiap tombol punya ikon dan label di bawahnya.',
      'Tombol `Kelola pengaturan` membuka submenu berisi 24 baris dengan 3 judul seksi: `Kategori / Berulang`, `Kelola pengaturan`, `Lainnya`.',
      'Versi gratis menampilkan iklan di atas grid dan tombol `Hapus iklan`.',
    ],
    fin: [
      'Daftar berseksi: `Kategori / Berulang`, `Aset`, `Kelola pengaturan`, `Lainnya` (14 item).',
      'Setelan langsung ada di daftar ini; tidak ada submenu perantara.',
    ],
    dampak:
      'Alur masuk ke fitur berbeda, sehingga langkah pengujian paritas tidak bisa disandingkan ' +
      'satu-satu dan pengguna perlu belajar jalur baru.',
    butuhPRD: true,
    bukti: [
      { group: 'TA01-kerangka', file: 'real-20-lainnya.png', cap: 'Grid 3×3 aplikasi asli + iklan versi gratis' },
      { group: 'TA01-kerangka', file: 'fin-20-lainnya.png', cap: 'Daftar berseksi fin-app' },
      { group: 'TA01-kerangka', file: 'real-21-kelola-pengaturan.png', cap: 'Submenu "Kelola pengaturan"' },
    ],
    prd: {
      deskripsi:
        'Susunan tab "Lainnya": grid tombol tanpa judul seksi, ditambah satu hub ' +
        '"Kelola pengaturan" yang menampung setelan aplikasi.',
      tujuan: [
        'Jumlah langkah menuju tiap fitur sama dengan aplikasi asli.',
        'Layar "Lainnya" tetap ringkas walau setelannya banyak.',
      ],
      alur:
        'Tab Lainnya (grid)\n' +
        ' ├─ Kelola pengaturan (hub setelan, 24 baris, 3 seksi)\n' +
        ' ├─ Kelola aset\n' +
        ' ├─ Kata sandi\n' +
        ' └─ Cadangan',
      userStory: [
        { prio: 'Medium', role: 'pengguna baru', want: 'menemukan setelan di tempat yang sama seperti aplikasi asli', so: 'tidak perlu mencari ulang' },
      ],
      struktur:
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  Pengaturan                                  │\n' +
        '│  ┌─────────┐ ┌─────────┐ ┌─────────┐        │\n' +
        '│  │ Kelola  │ │ Kelola  │ │ Kata    │        │\n' +
        '│  │pengaturan│ │  aset   │ │ sandi   │        │\n' +
        '│  └─────────┘ └─────────┘ └─────────┘        │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Grid "Lainnya"',
          tipe: 'navigasi',
          fungsi: 'Pintu masuk fitur tingkat atas.',
          opsi: 'Tombol: Kelola pengaturan, Kelola aset, Kata sandi, Cadangan (sisanya sengaja dilewati)',
          default: '-',
          perilaku: '3 kolom per baris, tanpa judul seksi, label di bawah ikon.',
        },
        {
          nama: 'Hub "Kelola pengaturan"',
          tipe: 'daftar',
          fungsi: 'Menampung setelan aplikasi dalam 3 seksi: Kategori / Berulang, Kelola pengaturan, Lainnya.',
          opsi: '24 baris (lihat temuan T-11 … T-28)',
          default: '-',
          perilaku: 'Baris menampilkan label di kiri dan nilai aktif di kanan; baris tanpa nilai membuka halaman/dialog.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Tab "Lainnya" berupa grid tombol tanpa judul seksi.' },
        { id: 'FR-02', teks: 'Setelan aplikasi dikelompokkan di dalam satu hub "Kelola pengaturan".' },
        { id: 'FR-03', teks: 'Judul seksi di dalam hub: `Kategori / Berulang`, `Kelola pengaturan`, `Lainnya`.' },
        { id: 'FR-04', teks: 'Setiap baris menampilkan nilai aktif di kanan bila setelannya punya nilai.' },
      ],
      nfr: [{ id: 'NFR-01', teks: 'Usability: hub setelan tetap bisa digulir dengan nyaman pada layar kecil.' }],
      interaksi: {
        navigasi: 'Tap tombol grid → buka layar; tombol kembali di header untuk kembali ke grid.',
        simpan: 'Setiap baris menyimpan sendiri saat dipilih.',
        validasi: 'Tidak ada.',
      },
      teramati: ['Dua seksi baru terlihat setelah daftar digulir; judul seksi ketiga (`Lainnya`) berada di bawah lipatan layar.'],
      skema: 'Struktur menu bersifat statis; yang tersimpan hanya nilai setelannya.',
      default: '-',
      alurData: 'Tap tombol grid → layar tujuan. Tap baris setelan → halaman/dialog → simpan → nilai di baris diperbarui.',
      error: [{ id: 'E-01', teks: 'Tidak ada.' }],
      edge: [{ id: 'EC-01', teks: 'Layar kecil → daftar hub perlu digulir; judul seksi tetap menempel pada kelompoknya.' }],
      internal: [{ teks: 'Setiap item hub adalah pintu masuk ke PRD lain (mata uang, periode, tampilan, dst.).' }],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Rujuk TS-01…TS-07 untuk isi tiap pintu masuk.',
      metrics: [{ teks: 'Jumlah langkah menuju setelan sama dengan aplikasi asli.' }],
      verifikasi: {
        ok: ['Grid 9 tombol (screenshot + dump), hub 24 baris, 3 judul seksi (dump setelah digulir).'],
        belum: ['❓ Urutan tepat tombol grid pada layar kecil dengan iklan aktif — iklan menggeser posisi grid.'],
      },
    },
  },
  {
    id: 'T-04',
    prdId: 'PRD-P-03',
    slug: 'sub-tab-bulanan-tabel-kosong',
    title: 'Sub-tab Bulanan: tabel bulan/pekan tetap digambar walau kosong',
    kategori: 'Transaksi · sub-tab Bulanan',
    prioritas: 'Medium',
    parent: 'Tab Transaksi → sub-tab Bulanan',
    masuk: 'Tab Transaksi → Bulanan',
    ringkas:
      'Aplikasi asli tetap menggambar tabel ringkasan bulan + pekan walaupun belum ada data: ' +
      'baris bulan, rentang tanggal, baris tiap pekan, ditutup baris total. fin-app menampilkan ' +
      '"Tidak ada data" dan tidak menggambar tabelnya.',
    mm: [
      'Baris bulan `Okt` dengan rentang `01.10 ~ 31.10`.',
      'Baris tiap pekan: `29.10 ~ 04.11`, `22.10 ~ 28.10`, dan seterusnya.',
      'Baris penutup `Total` dengan nilai `0,00`.',
      'Header menampilkan tahun (`2026`).',
    ],
    fin: [
      'Sub-tab Bulanan kini selalu merender struktur tabel bulan berjalan dan rincian pekan lengkap dengan baris Total (Rp 0), tanpa jalan buntu "Tidak ada data" (selesai 24 Oktober 2026).',
    ],
    dampak:
      'Pengguna tidak bisa melihat struktur bulan dan pekan sebelum ada data. Pengujian tahap ' +
      'berikutnya juga tidak bisa membandingkan baris per baris.',
    selesai: '24 Oktober 2026',
    butuhPRD: true,
    bukti: [
      { group: 'TA01-kerangka', file: 'real-10-transaksi-bulanan.png', cap: 'Tabel bulan + pekan (data kosong)' },
      { group: 'TA01-kerangka', file: 'fin-10-transaksi-bulanan.png', cap: 'fin-app: "Tidak ada data"' },
      { group: 'TA01-kerangka', file: 'real-10-transaksi-bulanan-screen.md', cap: 'Daftar baris tabel versi teks' },
    ],
    prd: {
      deskripsi:
        'Sub-tab Bulanan menampilkan tabel ringkasan per bulan dan per pekan. Tabel tetap ' +
        'digambar meski belum ada transaksi, dengan nilai nol pada tiap barisnya.',
      tujuan: [
        'Struktur bulan/pekan terlihat sejak periode masih kosong.',
        'Nilai tiap pekan bisa dibandingkan baris demi baris dengan aplikasi asli.',
      ],
      alur: 'Tab Transaksi → Bulanan → tabel bulan → baris pekan → baris Total.\nGulir untuk melihat pekan lain; panah header untuk pindah periode.',
      userStory: [
        { prio: 'Medium', role: 'pengguna', want: 'melihat rekap per pekan walau bulan itu masih kosong', so: 'tahu kapan pengeluaran menumpuk' },
      ],
      struktur:
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  ◀  2026  ▶                                  │\n' +
        '│  Okt                                         │\n' +
        '│  01.10 ~ 31.10              0,00             │\n' +
        '│  29.10 ~ 04.11              0,00             │\n' +
        '│  22.10 ~ 28.10              0,00             │\n' +
        '│  Total                      0,00             │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Tabel bulan',
          tipe: 'daftar',
          fungsi: 'Rekap nilai per bulan beserta rentang tanggalnya.',
          opsi: '-',
          default: '-',
          perilaku: 'Digambar walau tanpa data; nilai `0,00`.',
        },
        {
          nama: 'Tabel pekan',
          tipe: 'daftar',
          fungsi: 'Rekap nilai per pekan di dalam bulan.',
          opsi: '-',
          default: '-',
          perilaku: 'Pekan mengikuti setelan "Mulai hari" (lihat T-06); pekan yang menyeberang bulan tetap ditampilkan utuh.',
        },
        {
          nama: 'Baris Total',
          tipe: 'ringkasan',
          fungsi: 'Menjumlahkan seluruh pekan.',
          opsi: '-',
          default: '-',
          perilaku: 'Selalu ada di baris terakhir.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Tabel bulan dan pekan selalu digambar, termasuk saat tidak ada transaksi.' },
        { id: 'FR-02', teks: 'Tiap baris pekan menampilkan rentang tanggal dan nilainya.' },
        { id: 'FR-03', teks: 'Ada baris Total di akhir daftar pekan.' },
        { id: 'FR-04', teks: 'Awal pekan mengikuti setelan "Mulai hari".' },
      ],
      nfr: [{ id: 'NFR-01', teks: 'Performa: jumlah pekan per bulan kecil (4–6), jadi penggambaran selalu murah.' }],
      interaksi: {
        navigasi: 'Panah kiri/kanan pada header berpindah bulan; gulir untuk pekan lain.',
        simpan: 'Tidak ada.',
        validasi: 'Tidak ada.',
      },
      teramati: [
        'Baris bulan `Okt` + `01.10 ~ 31.10`.',
        'Baris pekan pertama `29.10 ~ 04.11` (menyeberang bulan).',
        'Baris penutup `Total`.',
        'Header menampilkan `2026`.',
      ],
      skema: 'Turunan: dihitung dari transaksi + setelan periode. Tidak ada tabel baru yang perlu disimpan.',
      default: '-',
      alurData: 'Daftar transaksi → dikelompokkan per pekan (awal pekan dari setelan) → dicetak sebagai baris.',
      error: [{ id: 'E-01', teks: 'Gagal memuat transaksi → tampilkan pesan kesalahan, tabel tidak digambar setengah jadi.' }],
      edge: [
        { id: 'EC-01', teks: 'Pekan yang menyeberang bulan → ditampilkan utuh, bukan dipotong.' },
        { id: 'EC-02', teks: 'Bulan tanpa transaksi sama sekali → semua baris `0,00` (bukan "Tidak ada data").' },
      ],
      internal: [
        { teks: 'Tutup buku memakai periode yang sama; pastikan rentangnya konsisten.' },
        { teks: 'Statistik per pekan memakai awal pekan yang sama.' },
      ],
      eksternal: [{ teks: 'Ekspor Excel sebaiknya memakai pengelompokan yang sama.' }],
      testing: 'Rujuk TS-05 (Tab Transaksi).',
      metrics: [{ teks: 'Jumlah baris pekan sama dengan aplikasi asli untuk bulan yang sama.' }],
      verifikasi: {
        ok: ['Tangkapan layar + dump Tahap 1 pada keadaan kosong.'],
        belum: ['❓ Apakah tabel tetap digambar bila ada transaksi hanya di sebagian pekan.', '❓ Perilaku saat setelan "Mulai hari" diubah ke Minggu/Sabtu.'],
      },
    },
  },
  {
    id: 'T-05',
    prdId: 'PRD-P-04',
    slug: 'memo-sembunyikan-ringkasan',
    title: 'Sub-tab Memo: ringkasan periode disembunyikan',
    kategori: 'Transaksi · sub-tab Memo',
    prioritas: 'Low',
    parent: 'Tab Transaksi → sub-tab Memo',
    masuk: 'Tab Transaksi → Memo',
    ringkas:
      'Pada sub-tab Memo, aplikasi asli menyembunyikan baris ringkasan Pendapatan/Pengeluaran/Total ' +
      'dan hanya menampilkan keadaan kosong. fin-app tetap menampilkan ringkasan periode.',
    mm: ['Hanya tampil `Tidak ada data`.', 'Baris ringkasan Pendapatan/Pengeluaran/Total tidak ditampilkan pada sub-tab Memo.'],
    fin: [
      'Ringkasan periode tetap ditampilkan.',
      'Ditambah baris `0 memo pada periode ini` dan penjelasan `Tekan tombol + untuk membuat memo baru pada periode ini.`',
    ],
    dampak: 'Tampilan lebih ramai dari aslinya pada sub-tab yang isinya memo, bukan transaksi keuangan.',
    butuhPRD: true,
    bukti: [
      { group: 'TA01-kerangka', file: 'real-10-transaksi-memo.png', cap: 'Asli: hanya keadaan kosong' },
      { group: 'TA01-kerangka', file: 'fin-10-transaksi-memo.png', cap: 'fin-app: ringkasan tetap tampil' },
    ],
    prd: {
      deskripsi: 'Sub-tab Memo menyembunyikan ringkasan uang karena isinya memo, bukan transaksi keuangan.',
      tujuan: ['Tampilan sub-tab Memo sama dengan aplikasi asli.'],
      alur: 'Tab Transaksi → Memo → daftar memo (tanpa ringkasan periode).',
      userStory: [
        { prio: 'Low', role: 'pengguna', want: 'sub-tab Memo hanya menampilkan memo', so: 'tidak tertukar dengan layar transaksi' },
      ],
      struktur:
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  Harian Kalender Bulanan Tutup buku [Memo]   │\n' +
        '│                                              │\n' +
        '│              Tidak ada data                  │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Penyembunyian ringkasan',
          tipe: 'aturan tampilan',
          fungsi: 'Menyembunyikan baris Pendapatan/Pengeluaran/Total pada sub-tab Memo.',
          opsi: '-',
          default: '-',
          perilaku: 'Hanya berlaku pada sub-tab Memo; sub-tab lain tetap menampilkan ringkasan.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Sub-tab Memo tidak menampilkan ringkasan Pendapatan/Pengeluaran/Total.' },
        { id: 'FR-02', teks: 'Sub-tab lain tetap menampilkan ringkasan.' },
      ],
      nfr: [{ id: 'NFR-01', teks: 'Konsistensi header antar sub-tab tidak boleh berubah selain bagian yang disembunyikan.' }],
      interaksi: { navigasi: 'Tap sub-tab Memo.', simpan: 'Tidak ada.', validasi: 'Tidak ada.' },
      teramati: ['Keadaan kosong `Tidak ada data` tetap tampil.'],
      skema: 'Tidak ada perubahan data.',
      default: '-',
      alurData: 'Pilih sub-tab Memo → sembunyikan blok ringkasan → tampilkan daftar memo.',
      error: [{ id: 'E-01', teks: 'Tidak ada.' }],
      edge: [{ id: 'EC-01', teks: 'Ada memo di periode ini → ringkasan tetap tersembunyi (belum terverifikasi ❓).' }],
      internal: [{ teks: 'Header periode (panah + judul bulan) tetap sama seperti sub-tab lain.' }],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Rujuk TS-05 bagian Memo.',
      metrics: [{ teks: 'Tata letak sub-tab Memo sama dengan aplikasi asli.' }],
      verifikasi: {
        ok: ['Tangkapan layar kedua sisi pada keadaan kosong.'],
        belum: ['❓ Perilaku saat memo sudah ada isinya.'],
      },
    },
  },
  {
    id: 'T-06',
    prdId: 'PRD-P-05',
    slug: 'setelan-mulai-hari',
    title: 'Setelan "Mulai hari" (hari pertama pekan)',
    kategori: 'Setelan · periode & tampilan',
    prioritas: 'High',
    parent: 'Lainnya → Kelola pengaturan',
    masuk: 'Lainnya → Kelola pengaturan → Mulai hari',
    ringkas:
      'Aplikasi asli punya setelan "Mulai hari" berisi tujuh pilihan hari. Nilainya menentukan ' +
      'urutan kolom di sub-tab Kalender dan awal pekan di sub-tab Bulanan. fin-app selalu memakai ' +
      'Senin dan tidak menyediakan setelannya.',
    mm: [
      'Baris `Mulai hari` dengan nilai aktif di kanan.',
      'Tujuh opsi: `Minggu`, `Senin`, `Selasa`, `Rabu`, `Kamis`, `Jumat`, `Sabtu`.',
      'Nilai teramati saat pengujian pertama: `Kamis`; setelah disamakan dengan fin-app: `Senin`.',
      'Mengubahnya mengubah urutan kolom Kalender dan pengelompokan pekan di Bulanan.',
    ],
    fin: [
      'Tidak ada setelan ini (❓ tidak ditemukan di `app/` maupun `components/`).',
      '`weekStart` hanya nilai yang dihitung di `lib/statistics-utils.ts`; sub-tab Kalender selalu mulai `Sen`.',
    ],
    dampak:
      'Kalender dan pengelompokan pekan tidak bisa dibuat sama persis dengan aplikasi asli bila ' +
      'pengguna memilih hari lain. Untuk pengujian paritas, setelan asli terpaksa diubah ke Senin.',
    butuhPRD: true,
    bukti: [
      { group: 'TA01b-setelan-asli', file: 'real-mulai-hari.png', cap: 'Tujuh pilihan hari' },
      { group: 'TA01-kerangka', file: 'real-10-transaksi-kalender.png', cap: 'Kalender aplikasi asli (urutan kolom mengikuti setelan)' },
      { group: 'TA01-kerangka', file: 'fin-10-transaksi-kalender.png', cap: 'Kalender fin-app (selalu mulai Senin)' },
    ],
    prd: {
      deskripsi:
        'Setelan yang menentukan hari pertama pekan. Dipakai oleh sub-tab Kalender (urutan kolom) ' +
        'dan sub-tab Bulanan (pengelompokan pekan).',
      tujuan: [
        'Urutan kolom Kalender sama dengan aplikasi asli.',
        'Batas pekan pada rekap Bulanan mengikuti kebiasaan pengguna.',
      ],
      alur: 'Lainnya → Kelola pengaturan → Mulai hari → pilih hari → berlaku segera.',
      userStory: [
        { prio: 'Tinggi', role: 'pengguna', want: 'menentukan hari pertama pekan', so: 'kalender dan rekap pekan sesuai kebiasaan saya' },
      ],
      struktur:
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  ‹  Mulai hari                               │\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  Minggu                                      │\n' +
        '│  Senin                                       │\n' +
        '│  Selasa                                      │\n' +
        '│  Rabu                                        │\n' +
        '│  Kamis                                       │\n' +
        '│  Jumat                                       │\n' +
        '│  Sabtu                                       │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Pemilih hari',
          tipe: 'pilihan',
          fungsi: 'Menetapkan hari pertama pekan.',
          opsi: 'Minggu, Senin, Selasa, Rabu, Kamis, Jumat, Sabtu',
          default: '❓ belum terverifikasi nilai bawaan pabrik (perangkat uji teramati `Kamis`, lalu diubah ke `Senin`)',
          perilaku: 'Pilihan langsung berlaku; tidak ada tombol simpan pada layar ini.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Tersedia tujuh pilihan hari, urut Minggu sampai Sabtu.' },
        { id: 'FR-02', teks: 'Sub-tab Kalender menampilkan kolom mulai dari hari yang dipilih.' },
        { id: 'FR-03', teks: 'Sub-tab Bulanan mengelompokkan pekan berdasarkan hari yang dipilih.' },
        { id: 'FR-04', teks: 'Mengubah setelan langsung mengubah tampilan tanpa perlu memuat ulang aplikasi.' },
      ],
      nfr: [
        { id: 'NFR-01', teks: 'Konsistensi: kalender, rekap pekan, dan statistik mingguan memakai hari awal yang sama.' },
      ],
      interaksi: {
        navigasi: 'Baris setelan → layar pilihan → tap hari → kembali ke daftar setelan.',
        simpan: 'Langsung tersimpan saat hari dipilih (tidak ada tombol simpan).',
        validasi: 'Tidak ada.',
      },
      teramati: ['Nilai aktif tampil di baris setelan (`Mulai hari` → `Kamis`, lalu `Senin`).'],
      skema: '```\npreferensi.user.weekStart: "minggu" | "senin" | … | "sabtu"\n```',
      default: 'Senin dipakai fin-app saat ini; nilai bawaan aplikasi asli belum terverifikasi.',
      alurData: 'Pilih hari → simpan preferensi → sub-tab Kalender & Bulanan menggambar ulang urutannya.',
      error: [{ id: 'E-01', teks: 'Tidak ada.' }],
      edge: [
        { id: 'EC-01', teks: 'Hari awal `Minggu` → kolom pertama kalender `Min`, rekap pekan mulai Minggu.' },
        { id: 'EC-02', teks: 'Pekan yang menyeberang bulan tetap dihitung utuh.' },
      ],
      internal: [
        { teks: 'Sub-tab Kalender (urutan kolom) — bandingkan T-04 untuk pengelompokan Bulanan.' },
        { teks: 'Statistik mingguan memakai awal pekan yang sama.' },
      ],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Rujuk TS-05 (sub-tab Kalender & Bulanan).',
      metrics: [{ teks: 'Urutan kolom kalender sama dengan aplikasi asli untuk tiap nilai setelan.' }],
      verifikasi: {
        ok: [
          'Layar pilihan berisi tujuh hari (screenshot + dump survei).',
          'Nilai baris berubah `Kamis` → `Senin` setelah diubah lewat UI, dan urutan kolom kalender ikut berubah.',
        ],
        belum: ['❓ Nilai bawaan pabrik.', '❓ Apakah setelan ini juga mengubah statistik mingguan di tab Statistik.'],
      },
    },
  },
  {
    id: 'T-10',
    prdId: 'PRD-P-06',
    slug: 'kepala-layar-statistik',
    title: 'Kepala layar Statistik: periode di judul + pemilih periode',
    kategori: 'Statistik · tampilan',
    prioritas: 'Medium',
    parent: 'Tab Statistik',
    masuk: 'Tab Statistik',
    ringkas:
      'Aplikasi asli menaruh periode aktif (`Okt 2026`) sebagai judul layar Statistik, dengan ' +
      'pemilih periode di kanan atas. fin-app menaruh kata "Statistik" sebagai judul.',
    mm: [
      'Judul layar: `Okt 2026` (periode aktif).',
      'Kanan atas: `Bulanan` + ikon menu (pemilih periode).',
      'Di bawahnya: tombol `Pendapatan` / `Pengeluaran` dan grafik batang.',
    ],
    fin: ['Judul layar: `Statistik`.'],
    dampak:
      'Judul layar yang berbeda membuat penyandingan screenshot tidak sejajar; informasi periode ' +
      'tidak terlihat dari judul.',
    selesai: '24 Oktober 2026',
    selesaiCatatan:
      'Kepala layar Statistik fin-app kini menampilkan periode aktif (`Okt 2026`) dengan panah ' +
      'sebelum/sesudah dan pemilih rentang (`Bulanan`) di kanan atas; kata "Statistik" tinggal ' +
      'sebagai judul tersembunyi untuk pembaca layar. Diverifikasi pada Tahap 5 (TS-01)',
    butuhPRD: true,
    bukti: [
      { group: 'TA01-kerangka', file: 'real-20-statistik.png', cap: 'Asli: judul `Okt 2026` + pemilih periode' },
      { group: 'TA01-kerangka', file: 'fin-20-statistik.png', cap: 'fin-app: judul `Statistik`' },
      { group: 'TA01-kerangka', file: 'real-20-statistik-screen.md', cap: 'Daftar elemen versi teks' },
      { group: 'TA05-statistik', file: 'real-01-statistik-kosong.png', cap: 'Asli (Tahap 5): judul `Okt 2026` + panah + pemilih rentang' },
      { group: 'TA05-statistik', file: 'fin-01-statistik-kosong.png', cap: 'fin-app (Tahap 5): judul `Okt 2026` + panah + `Bulanan` — sudah setara' },
    ],
    prd: {
      deskripsi:
        'Kepala layar Statistik menampilkan periode aktif sebagai judul dan menyediakan pemilih ' +
        'periode di kanan atas.',
      tujuan: [
        'Periode yang sedang dilihat langsung terbaca dari judul.',
        'Periode bisa diganti tanpa meninggalkan layar.',
      ],
      alur: 'Tab Statistik → judul = periode aktif → pemilih periode di kanan atas → grafik menyesuaikan.',
      userStory: [
        { prio: 'Medium', role: 'pengguna', want: 'tahu periode mana yang sedang saya lihat', so: 'tidak salah membaca grafik' },
      ],
      struktur:
        '```\n' +
        '┌──────────────────────────────────────────────┐\n' +
        '│  Okt 2026                  Bulanan  ☰        │\n' +
        '├──────────────────────────────────────────────┤\n' +
        '│  [ Pendapatan ] [ Pengeluaran ]              │\n' +
        '│  ▁▃▅▂▇▁▃  (grafik batang)                    │\n' +
        '└──────────────────────────────────────────────┘\n' +
        '```',
      subFitur: [
        {
          nama: 'Judul periode',
          tipe: 'judul layar',
          fungsi: 'Menampilkan periode aktif.',
          opsi: '-',
          default: 'Periode bulan berjalan, format `Okt 2026`.',
          perilaku: 'Ikut berubah saat periode diganti.',
        },
        {
          nama: 'Pemilih periode',
          tipe: 'menu',
          fungsi: 'Mengganti rentang statistik.',
          opsi: '❓ daftar mode belum dibuka (di layar teramati label `Bulanan`)',
          default: '❓',
          perilaku: 'Membuka menu di kanan atas.',
        },
      ],
      fr: [
        { id: 'FR-01', teks: 'Judul layar Statistik menampilkan periode aktif (mis. `Okt 2026`).' },
        { id: 'FR-02', teks: 'Tersedia pemilih periode di kanan atas.' },
        { id: 'FR-03', teks: 'Mengganti periode memperbarui judul dan grafik.' },
      ],
      nfr: [{ id: 'NFR-01', teks: 'Usability: judul tetap terbaca pada layar sempit bersama pemilih periode.' }],
      interaksi: {
        navigasi: 'Tab Statistik → pemilih periode.',
        simpan: 'Periode terakhir tidak harus disimpan (belum diverifikasi ❓).',
        validasi: 'Tidak ada.',
      },
      teramati: ['Judul `Okt 2026`, label pemilih `Bulanan`, tombol `Pendapatan`/`Pengeluaran`, grafik `Bar Chart` dengan keadaan kosong.'],
      skema: 'Tidak ada perubahan data.',
      default: 'Bulan berjalan.',
      alurData: 'Periode → kueri transaksi → grafik + daftar.',
      error: [{ id: 'E-01', teks: 'Tanpa data → grafik kosong dengan keterangan `Tidak ada data`.' }],
      edge: [{ id: 'EC-01', teks: 'Periode tahunan → judul menampilkan tahun.' }],
      internal: [{ teks: 'Sub-tab Bulanan dan Tutup buku memakai penamaan periode yang sama.' }],
      eksternal: [{ teks: 'Tidak ada.' }],
      testing: 'Rujuk TS-07 (Tab Statistik).',
      metrics: [{ teks: 'Judul dan pemilih periode sama dengan aplikasi asli.' }],
      verifikasi: {
        ok: ['Tangkapan layar + dump Tahap 1: judul `Okt 2026`, pemilih `Bulanan`.'],
        belum: ['❓ Daftar lengkap mode periode pada pemilih.', '❓ Perilaku saat periode diganti.'],
      },
    },
  },
]
