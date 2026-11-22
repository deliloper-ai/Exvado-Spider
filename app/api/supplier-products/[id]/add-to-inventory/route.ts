import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'
import { productToFrontend } from '@/lib/utils/transformers'
import { calculateProductPrice } from '@/lib/utils/pricing'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Tedarikçi ürünü → Envantere ekle
 * Body'de categoryId, desi zorunlu (fiyat hesaplama için)
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  const { id } = await context.params

  try {
    // Tedarikçi ürününü bul
    const supplierProduct = await prisma.supplierProduct.findUnique({
      where: { id: parseInt(id) },
    })

    if (!supplierProduct) {
      return error('Tedarikçi ürünü bulunamadı', 404)
    }

    if (supplierProduct.envanter_status === 1) {
      return error('Bu ürün zaten envantere eklenmiş', 409)
    }

    const body = await request.json()
    const { categoryId, desi, kdv, brand, barcode } = body

    if (!categoryId) {
      return error('Kategori seçimi zorunludur')
    }

    // Tedarikçi iskontosunu bul
    let supplierDiscount = 0
    if (supplierProduct.supplier_name) {
      const supplier = await prisma.supplier.findFirst({
        where: { name: supplierProduct.supplier_name },
      })
      supplierDiscount = supplier?.discount ?? 0
    }

    // Desi fiyatını bul
    let desiPrice = 0
    if (desi) {
      const desiRecord = await prisma.desi.findFirst({
        where: { name: String(Math.floor(Number(desi))) },
      })
      desiPrice = desiRecord?.price ? Number(desiRecord.price) : 0
    }

    // Fiyat hesapla
    const basePrice = supplierProduct.netPriceWithVAT ? Number(supplierProduct.netPriceWithVAT) : 0
    const prices = await calculateProductPrice({
      basePrice,
      categoryId: parseInt(categoryId),
      supplierDiscount,
      desiPrice,
    })

    // Products tablosuna ekle
    const product = await prisma.product.create({
      data: {
        name: supplierProduct.productTitle || 'İsimsiz Ürün',
        supplier: supplierProduct.supplier_name,
        stock_code: supplierProduct.productCode,
        brand: brand || supplierProduct.brand,
        barcode: barcode || null,
        desi: desi ? parseFloat(desi) : null,
        kategori_id: parseInt(categoryId),
        tedarikci_product_id: supplierProduct.id,
        tedarikci_fiyat: basePrice,
        product_discount: supplierDiscount,
        bolbolbul_fiyat: prices.bolbolbulFiyat,
        sopyo_fiyat: prices.sopyoFiyat,
        n11_fiyat: prices.n11Fiyat,
        trendyol_fiyat: prices.trendyolFiyat,
        hepsiburada_fiyat: prices.hepsiburadaFiyat,
        pazarama_fiyat: prices.pazaramaFiyat,
        toplam_stock: supplierProduct.stock ?? 0,
        bolbolbul_stock: supplierProduct.stock ?? 0,
        sopyo_stock: supplierProduct.stock ?? 0,
        kdv: kdv ? parseInt(kdv) : 20,
        eticaret: true,
        sopyo: 0,
        images: supplierProduct.productPictures ? JSON.stringify([supplierProduct.productPictures]) : null,
        isFiyatTercih: supplierProduct.isFiyatTercih ?? 0,
      } as any,
    })

    // Tedarikçi ürününde envanter_status güncelle
    await prisma.supplierProduct.update({
      where: { id: supplierProduct.id },
      data: { envanter_status: 1 },
    })

    return success(productToFrontend(product), 201)
  } catch (err: any) {
    console.error('Envantere ekleme hatası:', err)
    return error('Ürün envantere eklenirken bir hata oluştu', 500)
  }
}
