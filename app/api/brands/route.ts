import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'
import { brandToFrontend, brandFromFrontend } from '@/lib/utils/transformers'
import { generateSlug } from '@/lib/utils/slug'

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const brands = await prisma.brand.findMany({
      orderBy: { sira: 'asc' },
    })

    return success(brands.map(brandToFrontend))
  } catch (err) {
    console.error('Marka listeleme hatası:', err)
    return error('Markalar yüklenirken bir hata oluştu', 500)
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const body = await request.json()

    if (!body.name) {
      return error('Marka adı zorunludur')
    }

    const dbData = brandFromFrontend(body) as Record<string, unknown>
    dbData.seo_url = body.slug || generateSlug(body.name)
    dbData.baslik_seo = body.metaTitle || body.name

    const brand = await prisma.brand.create({
      data: dbData as any,
    })

    return success(brandToFrontend(brand), 201)
  } catch (err) {
    console.error('Marka oluşturma hatası:', err)
    return error('Marka oluşturulurken bir hata oluştu', 500)
  }
}
