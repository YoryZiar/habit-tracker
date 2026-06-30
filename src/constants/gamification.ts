/**
 * Konstanta nilai poin untuk sistem gamifikasi.
 * Semua logika kalkulasi poin di store, komponen, dan utils HARUS merujuk ke sini.
 */
export const POINTS = {
  /** Poin saat habit berhasil diselesaikan */
  SUCCESS: 20,
  /** Poin dikurangi saat habit gagal atau terlewat */
  FAIL: -30,
  /** Poin dikurangi saat habit diisi "izin" atau masih kosong hari ini */
  IZIN: -5,
  /** Bonus streak maksimum per hari */
  STREAK_BONUS_MAX: 50,
  /** Poin streak bonus per hari streak (dikalikan jumlah streak) */
  STREAK_BONUS_PER_DAY: 5,
} as const;

/** Poin dasar untuk naik ke level berikutnya dari level 1 */
export const LEVEL_BASE_XP = 100;

/** Tambahan poin per level untuk naik ke level berikutnya */
export const LEVEL_XP_INCREMENT = 50;
