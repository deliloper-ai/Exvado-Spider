import { syncService } from '../lib/services/sync.service'
import { upsertSupplierProduct } from '../lib/services/product-update.service'
import { prisma } from '../lib/db/prisma'
import { calculateProductPrice } from '../lib/utils/pricing'
import { logger } from './helpers/logger'
import { startProgress, updateProgress, endProgress } from './helpers/progress'
import type { PluginBase } from './plugin-base'
import type { SupplierConfig, SyncResult } from './plugins/_types'

export type SyncMode = 'full' | 'inventory-only'

export interface SyncOptions {
  mode?: SyncMode
  enableSafetyThreshold?: boolean   // tedarikci_urunler sayısının %80'inden az gelirse sweep'i atla
  thresholdPercent?: number         // varsayılan 0.80
}

const DEFAULT_OPTIONS: Required<SyncOptions> = {
  mode: 'full',
  enableSafetyThreshold: false,     // şimdilik kapalı — hepsini sweep et
  thresholdPercent: 0.80,
}

/**
 * Plugin classes cache — orchestrator başlatıldığında tüm pluginler eager-load edilir.
 * Sebep: tsx/esbuild service uzun süren sync'lerden sonra idle timeout'a takılıp
 * ölüyor; sonraki dynamic import "The service is no longer running" hatasıyla
 * patlıyor. Eager-load ile tüm import'lar baştan biter, runtime'da yeni
 * compile/spawn olmaz.
 */
const PLUGIN_CLASSES: Record<string, any> = {}
let pluginsPreloaded = false

async function preloadPlugins(): Promise<void> {
  if (pluginsPreloaded) return
  const loaders: Record<string, () => Promise<any>> = {
    'Ital': () => import('./plugins/ital'),
    'Mapas': () => import('./plugins/mapas'),
    'Cullas': () => import('./plugins/cullas'),
    'Akinziraat': () => import('./plugins/akinziraat'),
    'Civaner': () => import('./plugins/civaner'),
    'Catpower': () => import('./plugins/catpower'),
    'AbmHirdavat': () => import('./plugins/abmhirdavat'),
    'Pars': () => import('./plugins/pars'),
    'Bizimhesap': () => import('./plugins/bizimhesap'),
    'GoogleSheets': () => import('./plugins/googlesheets'),
    'Dovizsheet': () => import('./plugins/dovizsheet'),
    'GedizStokSheet': () => import('./plugins/gedizstoksheet'),
  }

  const failures: string[] = []
  for (const [name, loader] of Object.entries(loaders)) {
    try {
      const mod = await loader()
      const PluginClass = mod.default || mod[`${name}Plugin`]
      if (!PluginClass) {
        failures.push(`${name} (default export yok)`)
        continue
      }
      PLUGIN_CLASSES[name] = PluginClass
    } catch (err: any) {
      failures.push(`${name} (${err.message})`)
    }
  }

  const ok = Object.keys(PLUGIN_CLASSES).length
  const total = Object.keys(loaders).length
  // Flag'i sadece HEPSİ başarılıysa true yap; aksi halde bir sonraki sync'te retry etsin.
  // Aksi halde ilk çağrıda geçici bir hata (mysql restart, filesystem lock vs.) tüm
  // plugin'leri boş bırakır ve sticky şekilde tüm sync'ler "Plugin bulunamadı" verir.
  pluginsPreloaded = ok === total
  logger.info(`Plugin preload: ${ok}/${total} başarılı${failures.length ? ' — başarısız: ' + failures.join(', ') : ''}${pluginsPreloaded ? '' : ' (sonraki sync\'te retry edilecek)'}`)
}

function loadPlugin(supplier: SupplierConfig): PluginBase | null {
  const PluginClass = PLUGIN_CLASSES[supplier.name]
  if (!PluginClass) {
    logger.warn(`Plugin bulunamadı veya yüklenmedi: ${supplier.name}`)
    return null
  }
  try {
    return new PluginClass(supplier)
  } catch (err: any) {
    logger.error(`Plugin instance oluşturulamadı (${supplier.name}): ${err.message}`)
    return null
  }
}

/**
 * Sweep: bu sync'te dokunulmayan envanter ürünlerini "tedarikçide yok" sayıp stoğunu 0 yapar.
 *
 * Eşik kontrolü:
 *  - Tedarikçinin tedarikci_urunler tablosundaki TOPLAM ürün sayısı (snapshot baseline)
 *  - Bu sync'te gelen ürün sayısı (received)
 *  - received / baseline >= thresholdPercent → sweep güvenli
 *  - Aksi halde sweep atla (tedarikçide geçici sorun olabilir)
 */
async function sweepMissingProducts(
  supplier: SupplierConfig,
  touchedProductCodes: Set<string>,
  receivedCount: number,
  opts: Required<SyncOptions>
): Promise<{ swept: number; skipped: boolean; reason?: string }> {
  // Bu tedarikçinin tedarikci_urunler tablosundaki toplam mevcut kayıt sayısı (referans)
  const baselineCount = await prisma.supplierProduct.count({
    where: { supplier_name: supplier.name },
  })

  // Eşik kontrolü
  if (opts.enableSafetyThreshold && baselineCount > 0) {
    const ratio = receivedCount / baselineCount
    if (ratio < opts.thresholdPercent) {
      const reason = `Sweep atlandı: tedarikçi ${(ratio * 100).toFixed(1)}% ürün gönderdi (eşik: ${(opts.thresholdPercent * 100).toFixed(0)}%)`
      logger.warn(`[${supplier.name}] ${reason}`)
      return { swept: 0, skipped: true, reason }
    }
  }

  // 1) Envanterdeki ürünleri çek (bu tedarikçinin)
  const inventoryProducts = await prisma.product.findMany({
    where: {
      supplier: supplier.name,
      tedarikci_product_id: { not: null },
    },
    select: { id: true, stock_code: true, toplam_stock: true },
  })

  // Touched edilmemiş olanları bul → "tedarikçide yok"
  const missing = inventoryProducts.filter(p =>
    p.stock_code && !touchedProductCodes.has(p.stock_code) && (p.toplam_stock ?? 0) > 0
  )

  // 2) Bu tedarikçinin tedarikci_urunler kayıtları arasında da gelmemiş olanlar (envantere alınmamışlar dahil)
  const supplierProductsToSweep = await prisma.supplierProduct.findMany({
    where: {
      supplier_name: supplier.name,
      OR: [
        { stock: { gt: 0 } },
        { productStockStatus: { not: 'Yok' } },
      ],
    },
    select: { id: true, productCode: true },
  })
  const missingSupplierProducts = supplierProductsToSweep.filter(sp =>
    sp.productCode && !touchedProductCodes.has(sp.productCode)
  )

  if (missing.length === 0 && missingSupplierProducts.length === 0) {
    return { swept: 0, skipped: false }
  }

  // products tablosu sweep
  if (missing.length > 0) {
    const ids = missing.map(p => p.id)
    await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: {
        toplam_stock: 0,
        bolbolbul_stock: 0,
        sopyo_stock: 0,
      },
    })
  }

  // tedarikci_urunler tablosu sweep
  if (missingSupplierProducts.length > 0) {
    const spIds = missingSupplierProducts.map(sp => sp.id)
    await prisma.supplierProduct.updateMany({
      where: { id: { in: spIds } },
      data: {
        stock: 0,
        productStockStatus: 'Yok',
      },
    })
  }

  logger.warn(
    `[${supplier.name}] Sweep: products=${missing.length}, ` +
    `tedarikci_urunler=${missingSupplierProducts.length} stok=0 yapıldı (tedarikçide bulunmadı)`
  )
  return { swept: missing.length, skipped: false }
}

/**
 * Inventory-only mod için: gelen üründen sadece envanterimde olanları işler.
 * Yeni ürünleri tedarikci_urunler tablosuna eklemez.
 */
async function applyInventoryOnlyUpdate(
  supplier: SupplierConfig,
  product: { productTitle: string; productCode: string; netPriceWithVAT: number; stock: number; productStockStatus: string; bizimhesap_fiyat?: number | null },
  inventoryProductCodeSet: Set<string>
): Promise<'updated' | 'skipped'> {
  if (!inventoryProductCodeSet.has(product.productCode)) return 'skipped'

  // tedarikci_urunler kaydı zaten var (envanterde olduğu için), sadece güncelle
  // Tedarikçi kırılımı kaldırıldı — productCode unique
  const existing = await prisma.supplierProduct.findFirst({
    where: { productCode: product.productCode },
    select: { id: true },
  })
  if (!existing) return 'skipped'

  await prisma.supplierProduct.update({
    where: { id: existing.id },
    data: {
      supplier_name: supplier.name,  // son yazan kazanır
      netPriceWithVAT: product.netPriceWithVAT,
      productStockStatus: product.productStockStatus || null,
      stock: product.stock,
      bizimhesap_fiyat: product.bizimhesap_fiyat ?? null,
    },
  })

  // Envanterdeki ürünü bul, fiyat/stok recalculate et
  // stock_code artık global eşleme — supplier filter kaldırıldı
  const invProduct = await prisma.product.findFirst({
    where: { stock_code: product.productCode },
  })
  if (!invProduct || !invProduct.kategori_id) return 'updated'

  const supplierDiscount = supplier.discount ?? 0
  let desiPrice = 0
  if (invProduct.desi) {
    const desiRecord = await prisma.desi.findFirst({
      where: { name: String(Math.floor(Number(invProduct.desi))) },
    })
    desiPrice = desiRecord?.price ? Number(desiRecord.price) : 0
  }

  let basePrice = product.netPriceWithVAT
  let effectiveDiscount = supplierDiscount
  if (invProduct.isFiyatTercih === 1 && product.bizimhesap_fiyat) {
    basePrice = Number(product.bizimhesap_fiyat)
    effectiveDiscount = 0
  }

  const prices = await calculateProductPrice({
    basePrice,
    categoryId: invProduct.kategori_id,
    supplierDiscount: effectiveDiscount,
    desiPrice,
  })

  await prisma.product.update({
    where: { id: invProduct.id },
    data: {
      supplier: supplier.name,  // son yazan kazanır
      tedarikci_fiyat: basePrice,
      product_discount: effectiveDiscount,
      bolbolbul_fiyat: prices.bolbolbulFiyat,
      sopyo_fiyat: prices.sopyoFiyat,
      n11_fiyat: prices.n11Fiyat,
      trendyol_fiyat: prices.trendyolFiyat,
      hepsiburada_fiyat: prices.hepsiburadaFiyat,
      pazarama_fiyat: prices.pazaramaFiyat,
      toplam_stock: product.stock,
      bolbolbul_stock: product.stock,
      sopyo_stock: product.stock,
    } as any,
  })

  return 'updated'
}

/**
 * Tek bir tedarikçi için sync çalıştır
 */
export async function syncSupplier(
  supplier: SupplierConfig,
  options: SyncOptions = {}
): Promise<SyncResult & { sweptCount?: number; sweepSkipped?: boolean; mode: SyncMode }> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const startTime = Date.now()
  let createdCount = 0
  let updatedCount = 0
  let totalCount = 0
  let existCount = 0
  const touchedProductCodes = new Set<string>()

  logger.info(`========== ${supplier.name} sync başladı (mode=${opts.mode}) ==========`)

  try {
    updateProgress({
      currentSupplier: supplier.name,
      currentStep: 'fetching',
      processed: 0,
      total: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      message: `${supplier.name}: Plugin yükleniyor (${opts.mode})`,
    }, true)

    const plugin = loadPlugin(supplier)
    if (!plugin) {
      throw new Error('Plugin yüklenemedi')
    }

    updateProgress({ message: `${supplier.name}: Tedarikçiden ürünler çekiliyor` }, true)

    // Heartbeat: plugin.run() uzun sürebilir (Akinziraat 5-15 dk), bu sırada
    // progress.updatedAt yenilensin ki frontend "running" görmeye devam etsin
    const heartbeatId = setInterval(() => {
      updateProgress({}, true)
    }, 5000)

    let products
    try {
      products = await plugin.run()
    } finally {
      clearInterval(heartbeatId)
    }
    totalCount = products.length

    if (totalCount === 0) {
      logger.warn(`[${supplier.name}] Hiç ürün gelmedi, sync atlandı`)
    }

    // Inventory-only modu için envanter productCode set'i hazırla
    let inventoryProductCodeSet: Set<string> | null = null
    if (opts.mode === 'inventory-only') {
      const invProducts = await prisma.product.findMany({
        where: { supplier: supplier.name, tedarikci_product_id: { not: null } },
        select: { stock_code: true },
      })
      inventoryProductCodeSet = new Set(
        invProducts.map(p => p.stock_code).filter((c): c is string => !!c)
      )
      logger.info(`[${supplier.name}] Inventory-only: ${inventoryProductCodeSet.size} envanter ürünü hedeflenecek`)
    }

    updateProgress({
      currentStep: 'upserting',
      total: totalCount,
      message: `${supplier.name}: ${totalCount} ürün işleniyor (${opts.mode})`,
    }, true)

    // Her ürünü işle
    let i = 0
    for (const product of products) {
      try {
        if (opts.mode === 'inventory-only') {
          const result = await applyInventoryOnlyUpdate(supplier, product, inventoryProductCodeSet!)
          if (result === 'updated') updatedCount++
          else existCount++
        } else {
          // full mode: mevcut akış
          const result = await upsertSupplierProduct(supplier.name, product)
          if (result === 'created') createdCount++
          else if (result === 'updated') updatedCount++
          else existCount++
        }
        // Her durumda touched'a ekle (sweep için kritik)
        if (product.productCode) touchedProductCodes.add(product.productCode)
      } catch (err: any) {
        logger.error(`[${supplier.name}] Ürün işlenemedi (${product.productCode}): ${err.message}`)
      }
      i++
      updateProgress({
        processed: i,
        createdCount,
        updatedCount,
        skippedCount: existCount,
      })
    }

    updateProgress({ processed: totalCount, currentStep: 'finalizing', message: `${supplier.name}: Eksik ürünler tespit ediliyor` }, true)

    // SWEEP: tedarikçide bulunmayan envanter ürünlerinin stoğunu sıfırla
    let sweepResult = { swept: 0, skipped: false as boolean, reason: undefined as string | undefined }
    if (totalCount > 0) {
      sweepResult = await sweepMissingProducts(supplier, touchedProductCodes, totalCount, opts)
    }

    const duration = (Date.now() - startTime) / 1000
    logger.info(
      `[${supplier.name}] ✓ Tamamlandı — ${duration.toFixed(1)}s | ` +
      `Yeni: ${createdCount}, Güncel: ${updatedCount}, Atlandı: ${existCount}, ` +
      `Sweep: ${sweepResult.skipped ? 'atlandı' : sweepResult.swept + ' stok=0'}, Toplam: ${totalCount}`
    )

    await syncService.logSync({
      name: supplier.name,
      status: 1,
      createdCount,
      updatedCount,
      totalCount,
      existCount,
      durationSeconds: duration,
      productsProcessed: createdCount + updatedCount + sweepResult.swept,
    })

    return {
      supplierName: supplier.name,
      status: 'success',
      createdCount,
      updatedCount,
      totalCount,
      existCount,
      duration,
      sweptCount: sweepResult.swept,
      sweepSkipped: sweepResult.skipped,
      mode: opts.mode,
    }
  } catch (err: any) {
    const duration = (Date.now() - startTime) / 1000
    logger.error(`[${supplier.name}] HATA: ${err.message}`)

    await syncService.logSync({
      name: supplier.name,
      status: 0,
      error: err.message?.substring(0, 500),
      createdCount,
      updatedCount,
      totalCount,
      durationSeconds: duration,
      errorCategory: 'plugin_error',
    })

    return {
      supplierName: supplier.name,
      status: 'error',
      createdCount,
      updatedCount,
      totalCount,
      existCount,
      duration,
      error: err.message,
      mode: opts.mode,
    }
  }
}

/**
 * Tüm aktif tedarikçileri sırayla sync et
 */
export async function syncAllSuppliers(options: SyncOptions = {}): Promise<SyncResult[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const acquired = await syncService.acquireLock()
  if (!acquired) {
    logger.warn('Sync zaten çalışıyor, atlandı')
    throw new Error('Sync zaten çalışıyor')
  }

  startProgress(null)
  const results: SyncResult[] = []

  try {
    // Tüm pluginleri eager-load et — sync sırasında esbuild service ölse de
    // pluginler bellekte kalır (dynamic import tekrar çağrılmaz)
    await preloadPlugins()

    const suppliers = await syncService.getActiveSuppliers()
    logger.info(`Aktif tedarikçi: ${suppliers.length} (mode=${opts.mode})`)

    for (const supplier of suppliers) {
      const result = await syncSupplier(supplier as any, opts)
      results.push(result)
    }

    logger.info(`========== TÜM SYNC TAMAMLANDI (${opts.mode}) ==========`)
    logger.info(`Toplam: ${results.length} | ` +
      `Başarılı: ${results.filter(r => r.status === 'success').length} | ` +
      `Hatalı: ${results.filter(r => r.status === 'error').length}`)

    endProgress(`${results.filter(r => r.status === 'success').length}/${results.length} tedarikçi başarılı (${opts.mode})`)
  } finally {
    await syncService.releaseLock()
  }

  return results
}

/**
 * Tek bir tedarikçi adıyla sync (lock kontrolü ile)
 */
export async function syncSingleSupplier(
  supplierName: string,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const acquired = await syncService.acquireLock()
  if (!acquired) {
    throw new Error('Sync zaten çalışıyor')
  }

  startProgress(supplierName)

  try {
    await preloadPlugins()

    const suppliers = await syncService.getActiveSuppliers()
    const supplier = suppliers.find((s: any) => s.name === supplierName)
    if (!supplier) {
      throw new Error(`Tedarikçi bulunamadı veya pasif: ${supplierName}`)
    }

    const result = await syncSupplier(supplier as any, opts)
    endProgress(result.status === 'success'
      ? `${supplierName} (${opts.mode}) tamamlandı: ${result.createdCount} yeni, ${result.updatedCount} güncel`
      : `${supplierName} hata: ${result.error}`)
    return result
  } catch (err) {
    endProgress('Hata oluştu')
    throw err
  } finally {
    await syncService.releaseLock()
  }
}
