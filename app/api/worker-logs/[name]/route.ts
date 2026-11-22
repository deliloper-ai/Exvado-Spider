import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'

const LOGS_DIR = path.join(process.cwd(), 'worker', 'logs')

type RouteContext = { params: Promise<{ name: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  const { name } = await context.params
  const { searchParams } = new URL(request.url)
  const lines = Math.min(Math.max(parseInt(searchParams.get('lines') || '500'), 1), 10000)
  const full = searchParams.get('full') === '1'

  // Path traversal koruması
  if (name.includes('/') || name.includes('..') || name.includes('\\')) {
    return error('Geçersiz dosya adı', 400)
  }

  const filePath = path.join(LOGS_DIR, name)
  if (!filePath.startsWith(LOGS_DIR)) {
    return error('Yetkisiz path', 403)
  }

  try {
    if (!fs.existsSync(filePath)) {
      return error('Dosya bulunamadı', 404)
    }

    const stat = fs.statSync(filePath)
    const content = fs.readFileSync(filePath, 'utf-8')
    const allLines = content.split('\n')
    const tailLines = full ? allLines : allLines.slice(-lines)

    return success({
      name,
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      totalLines: allLines.length,
      returnedLines: tailLines.length,
      content: tailLines.join('\n'),
    })
  } catch (err: any) {
    console.error('Worker log oku hatası:', err)
    return error('Log okunurken hata oluştu', 500)
  }
}
