import { prisma } from '@/lib/db/prisma'
import { calculateProductPrice } from '@/lib/utils/pricing'

// Worker dışı (API) kullanımı için tipi burada da tanımlıyoruz — worker tarafıyla aynı şekil
export interface NormalizedProduct {
  productTitle: string
  productCode: string
  netPriceWithVAT: number
  productPictures: string
  productStockStatus: string
  stock: number
  brand: string
  bizimhesap_fiyat?: number | null
  bizimhesap_stock?: number | null
  isFiyatTercih?: number
}

/**
 * Tek tedarikçi ürünü için tedarikci_urunler kaydı oluştur veya güncelle
 * Eski projedeki updateProduct() ve insertProductArray() birleşimi.
 *
 * Geri dönüş: 'created' | 'updated' | 'skipped'
 */
export async function upsertSupplierProduct(
  supplierName: string,
  product: NormalizedProduct
): Promise<'created' | 'updated' | 'skipped'> {
  if (!product.productCode) return 'skipped'

  // productCode artık global unique — tedarikçi kırılımı kaldırıldı
  // Aynı productCode farklı tedarikçide görülürse: son yazan kazanır (tedarikçi adı dahil overwrite)
  const existing = await prisma.supplierProduct.findFirst({
    where: { productCode: product.productCode },
    select: { id: true, netPriceWithVAT: true, stock: true, productStockStatus: true, supplier_name: true },
  })

  const data = {
    supplier_name: supplierName,
    productTitle: product.productTitle || null,
    productCode: product.productCode,
    netPriceWithVAT: product.netPriceWithVAT,
    productPictures: product.productPictures || null,
    productStockStatus: product.productStockStatus || null,
    stock: product.stock,
    brand: product.brand || null,
    bizimhesap_fiyat: product.bizimhesap_fiyat ?? null,
    bizimhesap_stock: product.bizimhesap_stock ?? null,
    isFiyatTercih: product.isFiyatTercih ?? 0,
  }

  if (!existing) {
    await prisma.supplierProduct.create({ data: data as any })
    return 'created'
  }

  // Sadece değişen alanları kontrol et (tedarikçi adı değişimi de "değişiklik" sayılır)
  const hasChange =
    Number(existing.netPriceWithVAT) !== Number(product.netPriceWithVAT) ||
    existing.stock !== product.stock ||
    existing.productStockStatus !== product.productStockStatus ||
    existing.supplier_name !== supplierName

  if (!hasChange) return 'skipped'

  await prisma.supplierProduct.update({
    where: { id: existing.id },
    data: data as any,
  })

  // Bu ürün envantere alınmışsa products tablosundaki fiyat/stok da güncellenmeli
  await recalculateProductForSupplierProduct(supplierName, existing.id, product)

  return 'updated'
}

/**
 * Bir tedarikçi ürünü güncellendiğinde, eğer envantere eklenmişse (envanter_status=1)
 * products tablosundaki fiyatları yeniden hesapla ve stoğu güncelle.
 *
 * Eski projedeki updateProductsInDb() eşdeğeri.
 */
async function recalculateProductForSupplierProduct(
  supplierName: string,
  supplierProductId: number,
  newData: NormalizedProduct
) {
  const product = await prisma.product.findFirst({
    where: { tedarikci_product_id: supplierProductId },
  })
  if (!product || !product.kategori_id) return

  // Tedarikçi iskontosu
  const supplier = await prisma.supplier.findFirst({ where: { name: supplierName } })
  const supplierDiscount = supplier?.discount ?? 0

  // Desi fiyatı
  let desiPrice = 0
  if (product.desi) {
    const desiRecord = await prisma.desi.findFirst({
      where: { name: String(Math.floor(Number(product.desi))) },
    })
    desiPrice = desiRecord?.price ? Number(desiRecord.price) : 0
  }

  // isFiyatTercih ile BizimHesap override
  let basePrice = newData.netPriceWithVAT
  let effectiveDiscount = supplierDiscount
  if (product.isFiyatTercih === 1 && newData.bizimhesap_fiyat) {
    basePrice = Number(newData.bizimhesap_fiyat)
    effectiveDiscount = 0
  }

  const prices = await calculateProductPrice({
    basePrice,
    categoryId: product.kategori_id,
    supplierDiscount: effectiveDiscount,
    desiPrice,
  })

  await prisma.product.update({
    where: { id: product.id },
    data: {
      // Son yazan tedarikçi kazanır — products.supplier de güncellenir
      supplier: supplierName,
      tedarikci_fiyat: basePrice,
      product_discount: effectiveDiscount,
      bolbolbul_fiyat: prices.bolbolbulFiyat,
      sopyo_fiyat: prices.sopyoFiyat,
      n11_fiyat: prices.n11Fiyat,
      trendyol_fiyat: prices.trendyolFiyat,
      hepsiburada_fiyat: prices.hepsiburadaFiyat,
      pazarama_fiyat: prices.pazaramaFiyat,
      // Stok eşitleme: eski projeyle aynı (tüm pazaryeri stokları = supplier stok)
      toplam_stock: newData.stock,
      bolbolbul_stock: newData.stock,
      sopyo_stock: newData.stock,
    } as any,
  })
}
