# Laporan Refactor Repositori `habit-tracker`

## Perbaikan Utama yang Telah Diterapkan

1. **Pemangkasan File (Code Reduction)**
   - `src/store/useHabitStore.ts`: Disederhanakan dari 418 baris menjadi 250 baris (-40%). Logika gamifikasi dan kalkulasi poin dipisah.
   - `src/services/googleSheetsService.ts`: Disederhanakan dari 551 baris menjadi 435 baris (-21%). Menghapus fungsi *dead code* dan menyederhanakan *mapping* objek.

2. **Ekstraksi Logika (Modularitas)**
   - Dibuat utilitas terpusat: `src/utils/gamificationUtils.ts`. Semua logika pengecekan hari *habit* (apakah hari ini jadwal habit A) kini menggunakan fungsi `isHabitScheduledOn`.
   - Dibuat utilitas autentikasi: `src/utils/authUtils.ts` untuk memusatkan *error handling* dari Google API.

3. **Sentralisasi Konstanta Gamifikasi (No Magic Numbers)**
   - Dibuat file: `src/constants/gamification.ts`. Angka poin seperti sukses (+20), gagal (-30), dan penalti (-5) sekarang terpusat.
   - File `HistoryPage.tsx` yang tadinya menggunakan *magic numbers* secara berulang telah di-update untuk mengambil konstanta dari file di atas.

4. **Penghapusan Magic Strings**
   - Mengganti array nama bulan yang *hardcoded* (`['Jan', 'Feb', ...]`) di `HistoryPage.tsx` dengan konstanta terpusat `MONTH_NAMES_SHORT` yang diambil dari `src/utils/dateUtils.ts`.

5. **Pembersihan Metadata**
   - Nama *project* di dalam `package.json` yang tadinya `react-example` kini telah diubah dengan benar menjadi `habit-tracker`.

6. **Fix & Build Test**
   - Menjalankan `npm install` dan TypeScript check (*type checking*). Sempat terjadi konflik penamaan *variable* di `HabitRow.tsx` (kesalahan typo `dateObj`) yang langsung diperbaiki.
   - Aplikasi sukses melalui `npm run build` tanpa *error* tipe data.

## Status Repositori
Semua perubahan telah di-*commit* dengan pesan `"Refactor: Cleanup magic strings and inline isScheduled logic"` dan sudah berhasil didorong (*push*) ke *branch* `main` di GitHub.

Laporan ini dibuat oleh Nanamin, Maid Pintar Anda. 🌸