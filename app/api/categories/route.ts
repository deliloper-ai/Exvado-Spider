import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'
import { categoryToFrontend, categoryFromFrontend } from '@/lib/utils/transformers'
import { generateSlug } from '@/lib/utils/slug'

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const categories = await prisma.category.findMany({
      orderBy: { sira: 'asc' },
    })

    return success(categories.map(categoryToFrontend))
  } catch (err) {
    console.error('Kategori listeleme hatası:', err)
    return error('Kategoriler yüklenirken bir hata oluştu', 500)
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const body = await request.json()

    if (!body.name) {
      return error('Kategori adı zorunludur')
    }

    const dbData = categoryFromFrontend(body) as Record<string, unknown>
    dbData.seo_url = body.slug || generateSlug(body.name)
    dbData.baslik_seo = body.metaTitle || body.name

    const category = await prisma.category.create({
      data: dbData as any,
    })

    return success(categoryToFrontend(category), 201)
  } catch (err) {
    console.error('Kategori oluşturma hatası:', err)
    return error('Kategori oluşturulurken bir hata oluştu', 500)
  }
}
