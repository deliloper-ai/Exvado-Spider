import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'

/**
 * GET /api/xml/logs?limit=20
 * tedarikci_cron tablosundan XML üretim loglarını döner + dosya bilgisi
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    const logs = await prisma.supplierCron.findMany({
      where: { name: 'XML Generator' },
      orderBy: { created_at: 'desc' },
      take: limit,
    })

    // Mevcut XML dosyası bilgisi
    const xmlPath = path.join(process.cwd(), 'public', 'tum_urunler.xml')
    let currentFile: { exists: boolean; size?: number; sizeText?: string; modifiedAt?: string } = { exists: false }
    if (fs.existsSync(xmlPath)) {
      const stat = fs.statSync(xmlPath)
      currentFile = {
        exists: true,
        size: stat.size,
        sizeText: `${(stat.size / 1024 / 1024).toFixed(2)} MB`,
        modifiedAt: stat.mtime.toISOString(),
      }
    }

    return success({
      currentFile,
      logs: logs.map(l => ({
        id: l.id,
        timestamp: l.created_at?.toISOString() || '',
        status: l.status === 1 ? 'success' : l.status === 2 ? 'partial' : 'failed',
        duration: l.time ? parseFloat(l.time) : 0,
        totalProducts: l.total_count ?? 0,
        generatedProducts: l.products_processed ?? 0,
        failedProducts: (l.total_count ?? 0) - (l.products_processed ?? 0),
        errors: l.error ? safeJsonParse(l.error, []) : [],
      })),
    })
  } catch (err: any) {
    console.error('XML logs hatası:', err)
    return error(err.message || 'Loglar alınamadı', 500)
  }
}

function safeJsonParse<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) } catch { return fallback }
}
