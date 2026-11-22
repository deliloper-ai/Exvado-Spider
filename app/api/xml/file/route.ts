import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { error } from '@/lib/utils/response'

/**
 * GET /api/xml/file
 * Üretilen XML dosyasını indirir.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  const xmlPath = path.join(process.cwd(), 'public', 'tum_urunler.xml')

  if (!fs.existsSync(xmlPath)) {
    return error('XML dosyası henüz oluşturulmamış. Önce üretim tetikleyin.', 404)
  }

  const data = fs.readFileSync(xmlPath, 'utf-8')

  return new NextResponse(data, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': 'attachment; filename="tum_urunler.xml"',
    },
  })
}
