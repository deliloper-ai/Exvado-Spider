import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(_request: NextRequest) {
  const filePath = path.join(process.cwd(), 'public', 'tum_urunler.xml')

  if (!fs.existsSync(filePath)) {
    return new Response('XML dosyası henüz oluşturulmadı', { status: 404 })
  }

  const stat = fs.statSync(filePath)
  const stream = fs.createReadStream(filePath)

  return new Response(stream as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Length': String(stat.size),
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}
