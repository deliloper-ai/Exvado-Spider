import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'

// GET — Tüm fiyat kademelerini sıralı listele
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const tiers = await prisma.priceTier.findMany({
      orderBy: { sira: 'asc' },
    })

    return success(
      tiers.map((t) => ({
        id: String(t.id),
        minPrice: Number(t.min_fiyat),
        maxPrice: Number(t.max_fiyat),
        order: t.sira,
      }))
    )
  } catch (err) {
    console.error('Fiyat kademeleri listeleme hatası:', err)
    return error('Fiyat kademeleri yüklenirken bir hata oluştu', 500)
  }
}

// POST — Yeni kademe ekle
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const body = await request.json()

    if (body.minPrice == null || body.maxPrice == null) {
      return error('minPrice ve maxPrice zorunludur')
    }

    if (Number(body.minPrice) >= Number(body.maxPrice)) {
      return error('minPrice, maxPrice değerinden küçük olmalıdır')
    }

    // Sıra numarası: mevcut en büyük sıradan bir fazla
    const maxOrder = await prisma.priceTier.aggregate({ _max: { sira: true } })
    const nextOrder = (maxOrder._max.sira ?? 0) + 1

    const tier = await prisma.priceTier.create({
      data: {
        min_fiyat: body.minPrice,
        max_fiyat: body.maxPrice,
        sira: body.order ?? nextOrder,
      },
    })

    return success(
      {
        id: String(tier.id),
        minPrice: Number(tier.min_fiyat),
        maxPrice: Number(tier.max_fiyat),
        order: tier.sira,
      },
      201
    )
  } catch (err) {
    console.error('Fiyat kademesi oluşturma hatası:', err)
    return error('Fiyat kademesi oluşturulurken bir hata oluştu', 500)
  }
}
