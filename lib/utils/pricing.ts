import { prisma } from '@/lib/db/prisma'

/**
 * Dinamik kademe seçimi — baseFiyat'a göre doğru kademeyi bul ve komisyon oranını döndür
 */
export async function getCommissionRate(categoryId: number, basePrice: number): Promise<number> {
  const tier = await prisma.priceTier.findFirst({
    where: {
      min_fiyat: { lte: basePrice },
      max_fiyat: { gt: basePrice },
    },
    orderBy: { sira: 'asc' },
  })

  if (!tier) return 0

  const commission = await prisma.categoryCommission.findUnique({
    where: {
      kategori_id_kademe_id: {
        kategori_id: categoryId,
        kademe_id: tier.id,
      },
    },
  })

  return commission?.oran ?? 0
}

export interface PriceCalculationInput {
  basePrice: number         // tedarikçi fiyatı
  categoryId: number
  supplierDiscount: number  // tedarikçi indirimi (%)
  desiPrice: number         // desi/kargo fiyatı
}

export interface PriceCalculationResult {
  baseFiyat: number           // indirim sonrası maliyet
  kategoriOran: number        // uygulanan brüt kâr oranı (%)
  bolbolbulFiyat: number      // iç fiyat
  sopyoFiyat: number          // sopyo platform fiyatı
  n11Fiyat: number
  trendyolFiyat: number
  hepsiburadaFiyat: number
  pazaramaFiyat: number
}

/**
 * Tam fiyat hesaplama
 *
 * 1. baseFiyat = tedarikçiFiyatı - (tedarikçiFiyatı × supplierDiscount / 100)
 * 2. kategoriOran = kademeSeç(baseFiyat)  ← İNDİRİM SONRASI fiyatla
 * 3. bolbolbulFiyat = baseFiyat + (baseFiyat × kategoriOran / 100) + desiFiyat
 * 4. sopyoFiyat = baseFiyat + (baseFiyat × kategoriOran / 100)
 *    sopyoFiyat = sopyoFiyat + (sopyoFiyat × sopyoOran / 100) + desiFiyat
 * 5. n11Fiyat = sopyoFiyat + (sopyoFiyat × n11Oran / 100)
 * 6. trendyolFiyat = sopyoFiyat + (sopyoFiyat × trendyolOran / 100)
 * 7. hepsiburadaFiyat = sopyoFiyat + (sopyoFiyat × hepsiburadaOran / 100)
 * 8. pazaramaFiyat = sopyoFiyat + (sopyoFiyat × pazaramaOran / 100)
 */
export async function calculateProductPrice(input: PriceCalculationInput): Promise<PriceCalculationResult> {
  const { basePrice, categoryId, supplierDiscount, desiPrice } = input

  // 1. İndirim sonrası maliyet
  const baseFiyat = basePrice - (basePrice * supplierDiscount / 100)

  // 2. Kademe oranını bul (İNDİRİM SONRASI fiyatla)
  const kategoriOran = await getCommissionRate(categoryId, baseFiyat)

  // 3. Kategori marketplace oranlarını al
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: {
      sopyo_oran: true,
      n11_oran: true,
      trendyol_oran: true,
      hepsiburada_oran: true,
      pazarama_oran: true,
    },
  })

  const sopyoOran = category?.sopyo_oran ?? 0
  const n11Oran = category?.n11_oran ?? 0
  const trendyolOran = category?.trendyol_oran ?? 0
  const hepsiburadaOran = category?.hepsiburada_oran ?? 0
  const pazaramaOran = category?.pazarama_oran ?? 0

  // 4. BolBolBul fiyatı
  const bolbolbulFiyat = baseFiyat + (baseFiyat * kategoriOran / 100) + desiPrice

  // 5. Sopyo fiyatı
  let sopyoFiyat = baseFiyat + (baseFiyat * kategoriOran / 100)
  sopyoFiyat = sopyoFiyat + (sopyoFiyat * sopyoOran / 100) + desiPrice

  // 6. Marketplace fiyatları
  const n11Fiyat = sopyoFiyat + (sopyoFiyat * n11Oran / 100)
  const trendyolFiyat = sopyoFiyat + (sopyoFiyat * trendyolOran / 100)
  const hepsiburadaFiyat = sopyoFiyat + (sopyoFiyat * hepsiburadaOran / 100)
  const pazaramaFiyat = sopyoFiyat + (sopyoFiyat * pazaramaOran / 100)

  return {
    baseFiyat: Math.round(baseFiyat * 100) / 100,
    kategoriOran,
    bolbolbulFiyat: Math.round(bolbolbulFiyat * 100) / 100,
    sopyoFiyat: Math.round(sopyoFiyat * 100) / 100,
    n11Fiyat: Math.round(n11Fiyat * 100) / 100,
    trendyolFiyat: Math.round(trendyolFiyat * 100) / 100,
    hepsiburadaFiyat: Math.round(hepsiburadaFiyat * 100) / 100,
    pazaramaFiyat: Math.round(pazaramaFiyat * 100) / 100,
  }
}
