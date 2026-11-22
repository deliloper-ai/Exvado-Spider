import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'
import { calculateProductPrice } from '@/lib/utils/pricing'

/**
 * Tüm ürünlerin fiyatlarını yeniden hesapla
 * Tedarikçi iskontosu veya kategori oranları değiştiğinde kullanılır
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        tedarikci_fiyat: true,
        kategori_id: true,
        desi: true,
        supplier: true,
      },
    })

    let updated = 0
    let skipped = 0

    for (const product of products) {
      if (!product.tedarikci_fiyat || !product.kategori_id || !product.desi) {
        skipped++
        continue
      }

      // Desi fiyatını bul
      const desiRecord = await prisma.desi.findFirst({
        where: { name: String(Math.floor(Number(product.desi))) },
      })
      const desiPrice = desiRecord?.price ? Number(desiRecord.price) : 0

      // Tedarikçi iskontosunu bul
      let supplierDiscount = 0
      if (product.supplier) {
        const supplierRecord = await prisma.supplier.findFirst({
          where: { name: product.supplier },
        })
        supplierDiscount = supplierRecord?.discount ?? 0
      }

      const result = await calculateProductPrice({
        basePrice: Number(product.tedarikci_fiyat),
        categoryId: product.kategori_id,
        supplierDiscount,
        desiPrice,
      })

      await prisma.product.update({
        where: { id: product.id },
        data: {
          product_discount: supplierDiscount,
          bolbolbul_fiyat: result.bolbolbulFiyat,
          sopyo_fiyat: result.sopyoFiyat,
          n11_fiyat: result.n11Fiyat,
          trendyol_fiyat: result.trendyolFiyat,
          hepsiburada_fiyat: result.hepsiburadaFiyat,
          pazarama_fiyat: result.pazaramaFiyat,
        },
      })

      updated++
    }

    return success({
      message: `${updated} ürün güncellendi, ${skipped} ürün atlandı (eksik veri)`,
      updated,
      skipped,
      total: products.length,
    })
  } catch (err) {
    console.error('Toplu fiyat güncelleme hatası:', err)
    return error('Fiyatlar güncellenirken bir hata oluştu', 500)
  }
}
