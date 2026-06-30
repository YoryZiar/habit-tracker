# 🌟 Habit Tracker (dengan Sistem Gamifikasi)

Sebuah aplikasi pelacak kebiasaan (*habit tracker*) modern yang dirancang untuk membantu pengguna membangun dan mempertahankan rutinitas positif melalui pendekatan gamifikasi. Proyek ini dibangun dengan performa tinggi menggunakan **React, TypeScript, dan Vite**, serta memanfaatkan **Google Sheets API** sebagai basis data nir-server (*backend-less*).

## 🚀 Fitur Utama
- **Manajemen Kebiasaan & Tugas (Todo):** Lacak kebiasaan harian atau pada hari-hari spesifik, serta kelola daftar tugas yang harus diselesaikan.
- **Sistem Gamifikasi Terpadu:**
  - **Poin & Level:** Dapatkan EXP (*Experience Points*) setiap kali menyelesaikan kebiasaan, dan naikkan level Anda.
  - **Streak:** Pertahankan konsistensi berturut-turut untuk mendapatkan bonus poin (*Streak Bonus*).
  - **Badges/Lencana:** Buka pencapaian eksklusif seperti *Pemula*, *Konsisten*, *Master Habit*, hingga *Legenda* dan *Titan*.
  - **Penalti:** Hati-hati, poin akan berkurang jika Anda melewatkan kebiasaan!
- **Tipe Kebiasaan Fleksibel:** Mendukung kebiasaan dengan target selesai/gagal (Boolean) maupun target angka/kuantitatif (contoh: Minum 8 gelas air).
- **Statistik & Riwayat Visual:** Pantau perkembangan kedisiplinan Anda melalui grafik (*charts*) bulanan dan kalender riwayat yang interaktif.
- **Penyimpanan Terdesentralisasi:** Seluruh data histori dan poin disimpan dengan aman langsung di Google Sheets milik pengguna masing-masing.

## 🛠️ Teknologi yang Digunakan
- **Frontend:** React.js, TypeScript, Vite
- **Styling:** Tailwind CSS
- **Charts/Grafik:** Recharts
- **Database/Storage:** Google Sheets API (Google Workspace)
- **State Management:** Zustand

## 💻 Cara Menjalankan Secara Lokal

### Prasyarat
- Node.js terinstal di sistem Anda.
- Akun Google (untuk otentikasi Google Sheets API).

### Instalasi
1. *Clone* repositori ini ke komputer Anda:
   ```bash
   git clone git@github.com:YoryZiar/habit-tracker.git
   ```
2. Masuk ke dalam direktori proyek:
   ```bash
   cd habit-tracker
   ```
3. Instal semua dependensi proyek menggunakan npm:
   ```bash
   npm install
   ```
4. Jalankan server pengembangan (*development server*):
   ```bash
   npm run dev
   ```
5. Buka `http://localhost:5173` di *browser* Anda dan mulailah melacak kebiasaan Anda!

## 🤝 Kontribusi
Repositori ini sangat terbuka untuk perbaikan! Jika Anda menemukan *bug* atau memiliki ide fitur baru, silakan buka *Issue* atau kirimkan *Pull Request*.

---
*Dikembangkan dan dirawat agar tetap elegan.* 🌸