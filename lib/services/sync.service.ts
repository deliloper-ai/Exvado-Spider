import { prisma } from '@/lib/db/prisma'

const SYNC_LOCK_KEY = 'sync_running'

/**
 * Sync lock yönetimi — settings tablosunda tutulur.
 * Eski projedeki settings.status ile aynı mantık.
 */
export const syncService = {
  /**
   * Sync şu anda çalışıyor mu?
   */
  async isRunning(): Promise<boolean> {
    const setting = await prisma.$queryRawUnsafe<any[]>(
      `SELECT status FROM settings WHERE name = ? LIMIT 1`,
      SYNC_LOCK_KEY
    )
    return Array.isArray(setting) && setting[0]?.status === 1
  },

  /**
   * Lock al — eğer zaten çalışıyorsa false döner
   */
  async acquireLock(): Promise<boolean> {
    const running = await this.isRunning()
    if (running) return false

    // Upsert: kayıt yoksa oluştur, varsa status=1 yap
    await prisma.$executeRawUnsafe(
      `INSERT INTO settings (name, status) VALUES (?, 1)
       ON DUPLICATE KEY UPDATE status = 1`,
      SYNC_LOCK_KEY
    )
    return true
  },

  /**
   * Lock'u serbest bırak
   */
  async releaseLock(): Promise<void> {
    await prisma.$executeRawUnsafe(
      `UPDATE settings SET status = 0 WHERE name = ?`,
      SYNC_LOCK_KEY
    )
  },

  /**
   * Mevcut tedarikçi adını sakla (frontend'de polling için)
   */
  async setCurrentSupplier(supplierName: string | null): Promise<void> {
    await prisma.$executeRawUnsafe(
      `INSERT INTO settings (name, status) VALUES ('sync_current', ?)
       ON DUPLICATE KEY UPDATE status = ?`,
      supplierName ? 1 : 0,
      supplierName ? 1 : 0
    )
    // İsim ayrı bir kayıtta da tutulabilir; basit tutalım
  },

  /**
   * Aktif tedarikçileri sıralı olarak getir
   */
  async getActiveSuppliers() {
    return prisma.supplier.findMany({
      where: { status: 1 },
      orderBy: { sira: 'asc' },
    })
  },

  /**
   * Sync log'unu tedarikci_cron tablosuna yaz
   */
  async logSync(data: {
    name: string
    status: 0 | 1 | 2  // 0=error, 1=success, 2=warning
    error?: string
    createdCount?: number
    updatedCount?: number
    totalCount?: number
    existCount?: number
    durationSeconds?: number
    errorCategory?: string
    productsProcessed?: number
  }) {
    await prisma.supplierCron.create({
      data: {
        name: data.name,
        status: data.status,
        error: data.error,
        created_count: data.createdCount ?? 0,
        updated_count: data.updatedCount ?? 0,
        total_count: data.totalCount,
        exist_count: data.existCount,
        time: data.durationSeconds ? String(data.durationSeconds) : null,
        response_time: data.durationSeconds,
        error_category: data.errorCategory,
        products_processed: data.productsProcessed ?? 0,
      } as any,
    })
  },
}
