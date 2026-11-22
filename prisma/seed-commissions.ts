import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PRICE_TIERS = [
  { sira: 1, min_fiyat: 0, max_fiyat: 40 },
  { sira: 2, min_fiyat: 40, max_fiyat: 110 },
  { sira: 3, min_fiyat: 110, max_fiyat: 175 },
  { sira: 4, min_fiyat: 175, max_fiyat: 300 },
  { sira: 5, min_fiyat: 300, max_fiyat: 500 },
  { sira: 6, min_fiyat: 500, max_fiyat: 800 },
  { sira: 7, min_fiyat: 800, max_fiyat: 1300 },
  { sira: 8, min_fiyat: 1300, max_fiyat: 1800 },
  { sira: 9, min_fiyat: 1800, max_fiyat: 3000 },
  { sira: 10, min_fiyat: 3000, max_fiyat: 5000 },
  { sira: 11, min_fiyat: 5000, max_fiyat: 9500 },
  { sira: 12, min_fiyat: 9500, max_fiyat: 12500 },
  { sira: 13, min_fiyat: 12500, max_fiyat: 18000 },
  { sira: 14, min_fiyat: 18000, max_fiyat: 27000 },
  { sira: 15, min_fiyat: 27000, max_fiyat: 50000 },
  { sira: 16, min_fiyat: 50000, max_fiyat: 100000 },
  { sira: 17, min_fiyat: 100000, max_fiyat: 999999 },
]

// kategori_oran_1..17 sütunlarının sıra eşlemesi
const ORAN_FIELD_ORDER = [
  'kategori_oran_1',
  'kategori_oran_2',
  'kategori_oran_3',
  'kategori_oran_4',
  'kategori_oran_5',
  'kategori_oran_6',
  'kategori_oran_7',
  'kategori_oran_8',
  'kategori_oran_9',
  'kategori_oran_10',
  'kategori_oran_11',
  'kategori_oran_12',
  'kategori_oran_13',
  'kategori_oran_14',
  'kategori_oran_15',
  'kategori_oran_16',
  'kategori_oran_17',
] as const

async function main() {
  console.log('Fiyat kademeleri oluşturuluyor...')

  // 1. Fiyat kademelerini upsert et
  const tierMap = new Map<number, number>() // sira -> id

  for (const tier of PRICE_TIERS) {
    const existing = await prisma.priceTier.findFirst({
      where: { sira: tier.sira },
    })

    if (existing) {
      await prisma.priceTier.update({
        where: { id: existing.id },
        data: { min_fiyat: tier.min_fiyat, max_fiyat: tier.max_fiyat },
      })
      tierMap.set(tier.sira, existing.id)
      console.log(`  Kademe ${tier.sira} güncellendi: ${tier.min_fiyat} - ${tier.max_fiyat}`)
    } else {
      const created = await prisma.priceTier.create({
        data: {
          min_fiyat: tier.min_fiyat,
          max_fiyat: tier.max_fiyat,
          sira: tier.sira,
        },
      })
      tierMap.set(tier.sira, created.id)
      console.log(`  Kademe ${tier.sira} oluşturuldu: ${tier.min_fiyat} - ${tier.max_fiyat}`)
    }
  }

  // 2. Tüm kategorileri al
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      baslik: true,
      kategori_oran_1: true,
      kategori_oran_2: true,
      kategori_oran_3: true,
      kategori_oran_4: true,
      kategori_oran_5: true,
      kategori_oran_6: true,
      kategori_oran_7: true,
      kategori_oran_8: true,
      kategori_oran_9: true,
      kategori_oran_10: true,
      kategori_oran_11: true,
      kategori_oran_12: true,
      kategori_oran_13: true,
      kategori_oran_14: true,
      kategori_oran_15: true,
      kategori_oran_16: true,
      kategori_oran_17: true,
    },
  })

  console.log(`\n${categories.length} kategori için komisyon oranları aktarılıyor...`)

  let migratedCount = 0

  for (const cat of categories) {
    const catData = cat as Record<string, unknown>

    for (let i = 0; i < ORAN_FIELD_ORDER.length; i++) {
      const fieldName = ORAN_FIELD_ORDER[i]
      const sira = i + 1
      const kademeId = tierMap.get(sira)
      const oran = (catData[fieldName] as number | null) ?? 0

      if (!kademeId) continue

      await prisma.categoryCommission.upsert({
        where: {
          kategori_id_kademe_id: {
            kategori_id: cat.id,
            kademe_id: kademeId,
          },
        },
        update: { oran },
        create: {
          kategori_id: cat.id,
          kademe_id: kademeId,
          oran,
        },
      })
    }

    migratedCount++
    if (migratedCount % 50 === 0) {
      console.log(`  ${migratedCount}/${categories.length} kategori aktarıldı`)
    }
  }

  console.log(`\nTamamlandı! ${migratedCount} kategori × 17 kademe = ${migratedCount * 17} komisyon kaydı`)
}

main()
  .catch((e) => {
    console.error('Seed hatası:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
