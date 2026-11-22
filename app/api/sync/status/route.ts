import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'
import { syncService } from '@/lib/services/sync.service'

interface SyncProgress {
  isRunning: boolean
  currentSupplier: string | null
  currentStep: 'idle' | 'fetching' | 'normalizing' | 'upserting' | 'recalculating' | 'finalizing'
  processed: number
  total: number
  createdCount: number
  updatedCount: number
  skippedCount: number
  errorCount: number
  startedAt: string | null
  updatedAt: string
  message: string | null
}

function readProgressFile(): SyncProgress | null {
  try {
    const file = path.join(process.cwd(), 'worker', 'logs', 'progress.json')
    if (!fs.existsSync(file)) return null
    return JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const isRunning = await syncService.isRunning()

    // Son 10 sync logunu getir
    const recentLogs = await prisma.supplierCron.findMany({
      orderBy: { created_at: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        status: true,
        created_count: true,
        updated_count: true,
        total_count: true,
        time: true,
        error: true,
        created_at: true,
      },
    })

    // Tedarikçi bazında en son sync durumu
    const allSuppliers = await prisma.supplier.findMany({
      where: { status: 1 },
      orderBy: { sira: 'asc' },
      select: { id: true, name: true },
    })

    const lastSyncBySupplier: Record<string, any> = {}
    for (const supplier of allSuppliers) {
      if (!supplier.name) continue
      const lastLog = await prisma.supplierCron.findFirst({
        where: { name: supplier.name },
        orderBy: { created_at: 'desc' },
      })
      lastSyncBySupplier[supplier.name] = lastLog
        ? {
            status: lastLog.status === 1 ? 'success' : 'error',
            createdCount: lastLog.created_count ?? 0,
            updatedCount: lastLog.updated_count ?? 0,
            totalCount: lastLog.total_count ?? 0,
            lastRun: lastLog.created_at,
            duration: lastLog.time,
            error: lastLog.error,
          }
        : null
    }

    const progress = readProgressFile()

    // isRunning: hem DB lock hem progress.json son 30sn'de güncellenmiş mi?
    // Worker çoklu spawn'larda DB lock bozulabilir, dosya gerçek truth'tur.
    let effectiveIsRunning = isRunning
    if (progress?.isRunning) {
      const lastUpdate = new Date(progress.updatedAt).getTime()
      const ageSeconds = (Date.now() - lastUpdate) / 1000
      if (ageSeconds < 30) {
        effectiveIsRunning = true
      }
    }

    return success({
      isRunning: effectiveIsRunning,
      progress,
      recentLogs: recentLogs.map(l => ({
        id: l.id,
        supplierName: l.name,
        status: l.status === 1 ? 'success' : 'error',
        createdCount: l.created_count ?? 0,
        updatedCount: l.updated_count ?? 0,
        totalCount: l.total_count ?? 0,
        duration: l.time,
        error: l.error,
        createdAt: l.created_at,
      })),
      suppliers: lastSyncBySupplier,
    })
  } catch (err: any) {
    console.error('Sync status hatası:', err)
    return error('Sync durumu alınırken hata oluştu', 500)
  }
}
