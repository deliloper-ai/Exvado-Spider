import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'

// POST — Seçili kategorilere aynı oranları toplu uygula
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const body = await request.json()
    const { categoryIds, marketplaceRates, tiers } = body

    // categoryIds boş array ise tüm kategorilere uygula
    let targetCategoryIds: number[]

    if (!categoryIds || (Array.isArray(categoryIds) && categoryIds.length === 0)) {
      const allCategories = await prisma.category.findMany({ select: { id: true } })
      targetCategoryIds = allCategories.map((c) => c.id)
    } else {
      targetCategoryIds = (categoryIds as string[]).map((id) => parseInt(id))
    }

    if (targetCategoryIds.length === 0) {
      return error('Güncellenecek kategori bulunamadı')
    }

    await prisma.$transaction(async (tx) => {
      for (const categoryId of targetCategoryIds) {
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
      }
    })

    return success({
      message: `${targetCategoryIds.length} kategori için komisyon oranları başarıyla güncellendi`,
      updatedCount: targetCategoryIds.length,
    })
  } catch (err) {
    console.error('Toplu komisyon güncelleme hatası:', err)
    return error('Toplu komisyon güncelleme sırasında bir hata oluştu', 500)
  }
}
