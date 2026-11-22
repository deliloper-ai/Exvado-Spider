import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'

type RouteContext = { params: Promise<{ id: string }> }

// GET — Kategorinin tüm kademe komisyonlarını getir
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  const { id } = await context.params
  const categoryId = parseInt(id)

  try {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        baslik: true,
        n11_oran: true,
        trendyol_oran: true,
        hepsiburada_oran: true,
        pazarama_oran: true,
        sopyo_oran: true,
      },
    })

    if (!category) {
      return error('Kategori bulunamadı', 404)
    }

    // Tüm kademe bilgilerini al
    const tiers = await prisma.priceTier.findMany({
      orderBy: { sira: 'asc' },
    })

    // Bu kategorinin komisyon oranlarını al
    const commissions = await prisma.categoryCommission.findMany({
      where: { kategori_id: categoryId },
    })

    // Komisyonları kademe ID'sine göre map'le
    const commissionMap = new Map(commissions.map((c) => [c.kademe_id, c.oran]))

    return success({
      categoryId: String(category.id),
      categoryName: category.baslik || '',
      marketplaceRates: {
        n11: category.n11_oran ?? 0,
        trendyol: category.trendyol_oran ?? 0,
        hepsiburada: category.hepsiburada_oran ?? 0,
        pazarama: category.pazarama_oran ?? 0,
        sopyo: category.sopyo_oran ?? 0,
      },
      tiers: tiers.map((t) => ({
        tierId: String(t.id),
        minPrice: Number(t.min_fiyat),
        maxPrice: Number(t.max_fiyat),
        rate: commissionMap.get(t.id) ?? 0,
      })),
    })
  } catch (err) {
    console.error('Komisyon oranları getirme hatası:', err)
    return error('Komisyon oranları yüklenirken bir hata oluştu', 500)
  }
}

// PUT — Kategorinin komisyon oranlarını + marketplace oranlarını güncelle
export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  const { id } = await context.params
  const categoryId = parseInt(id)

  try {
    const body = await request.json()
    const { marketplaceRates, tiers } = body

    // Transaction ile atomik güncelleme
    await prisma.$transaction(async (tx) => {
      // 1. Marketplace oranlarını güncelle
      if (marketplaceRates) {
        const updateData: Record<string, unknown> = {}
        if (marketplaceRates.n11 != null) updateData.n11_oran = marketplaceRates.n11
        if (marketplaceRates.trendyol != null) updateData.trendyol_oran = marketplaceRates.trendyol
        if (marketplaceRates.hepsiburada != null) updateData.hepsiburada_oran = marketplaceRates.hepsiburada
        if (marketplaceRates.pazarama != null) updateData.pazarama_oran = marketplaceRates.pazarama
        if (marketplaceRates.sopyo != null) updateData.sopyo_oran = marketplaceRates.sopyo

        if (Object.keys(updateData).length > 0) {
          await tx.category.update({
            where: { id: categoryId },
            data: updateData,
          })
        }
      }

      // 2. Kademe komisyon oranlarını upsert et
      if (tiers && Array.isArray(tiers)) {
        for (const tier of tiers) {
          await tx.categoryCommission.upsert({
            where: {
              kategori_id_kademe_id: {
                kategori_id: categoryId,
                kademe_id: parseInt(tier.tierId),
              },
            },
            update: { oran: tier.rate },
            create: {
              kategori_id: categoryId,
              kademe_id: parseInt(tier.tierId),
              oran: tier.rate,
            },
          })
        }
      }
    })

    return success({ message: 'Komisyon oranları başarıyla güncellendi' })
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return error('Kategori bulunamadı', 404)
    }
    console.error('Komisyon oranları güncelleme hatası:', err)
    return error('Komisyon oranları güncellenirken bir hata oluştu', 500)
  }
}
