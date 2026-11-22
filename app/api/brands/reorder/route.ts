import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const { brands } = await request.json()

    if (!Array.isArray(brands)) {
      return error('Geçersiz veri formatı')
    }

    await prisma.$transaction(
      brands.map((item: { id: string; order: number }) =>
        prisma.brand.update({
          where: { id: parseInt(item.id) },
          data: { sira: item.order },
        })
      )
    )

    return success({ message: 'Sıralama başarıyla güncellendi' })
  } catch (err) {
    console.error('Marka sıralama hatası:', err)
    return error('Sıralama güncellenirken bir hata oluştu', 500)
  }
}
