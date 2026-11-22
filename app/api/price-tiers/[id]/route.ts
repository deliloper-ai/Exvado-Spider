import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'

type RouteContext = { params: Promise<{ id: string }> }

// PUT — Kademe aralığını güncelle
export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  const { id } = await context.params

  try {
    const body = await request.json()

    if (body.minPrice != null && body.maxPrice != null && Number(body.minPrice) >= Number(body.maxPrice)) {
      return error('minPrice, maxPrice değerinden küçük olmalıdır')
    }

    const updateData: Record<string, unknown> = {}
    if (body.minPrice != null) updateData.min_fiyat = body.minPrice
    if (body.maxPrice != null) updateData.max_fiyat = body.maxPrice
    if (body.order != null) updateData.sira = body.order

    const tier = await prisma.priceTier.update({
      where: { id: parseInt(id) },
      data: updateData,
    })

    return success({
      id: String(tier.id),
      minPrice: Number(tier.min_fiyat),
      maxPrice: Number(tier.max_fiyat),
      order: tier.sira,
    })
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return error('Fiyat kademesi bulunamadı', 404)
    }
    console.error('Fiyat kademesi güncelleme hatası:', err)
    return error('Fiyat kademesi güncellenirken bir hata oluştu', 500)
  }
}

// DELETE — Kademe sil (cascade ile ilişkili komisyonlar da silinir)
export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  const { id } = await context.params

  try {
    await prisma.priceTier.delete({
      where: { id: parseInt(id) },
    })

    return success({ message: 'Fiyat kademesi başarıyla silindi' })
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return error('Fiyat kademesi bulunamadı', 404)
    }
    console.error('Fiyat kademesi silme hatası:', err)
    return error('Fiyat kademesi silinirken bir hata oluştu', 500)
  }
}
