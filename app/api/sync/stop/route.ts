import { NextRequest } from 'next/server'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'
import { syncService } from '@/lib/services/sync.service'

/**
 * POST /api/sync/stop
 *
 * Sync lock'unu serbest bırakır. Worker process'i öldürmez —
 * sadece DB lock'unu temizler ki yeni bir sync başlatılabilsin.
 * Çalışan worker process'i pm2 stop ile durdurulmalı.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    await syncService.releaseLock()
    return success({ message: 'Sync lock serbest bırakıldı' })
  } catch (err: any) {
    console.error('Sync stop hatası:', err)
    return error('Sync durdurulamadı', 500)
  }
}
