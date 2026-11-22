import type { ProductKeyMap, NormalizedProduct, SupplierConfig, RawProduct } from './plugins/_types'
import { mapProducts } from './helpers/product-mapper'
import { logger } from './helpers/logger'

/**
 * Tüm tedarikçi plugin'lerinin extend ettiği soyut sınıf.
 *
 * Her plugin:
 *  1. productKeyMap tanımlar (ham → standart eşleme)
 *  2. fetchProducts() metodunu implement eder (tedarikçiden ürünleri çeker)
 *
 * Orchestrator plugin.run() çağırarak normalize edilmiş ürün listesini alır.
 */
export abstract class PluginBase {
  abstract readonly name: string
  protected abstract readonly keyMap: ProductKeyMap

  protected supplier: SupplierConfig

  constructor(supplier: SupplierConfig) {
    this.supplier = supplier
  }

  /**
   * Tedarikçinin API/scraping/sheet kaynağından ham ürünleri çeker.
   * Her plugin override eder.
   */
  protected abstract fetchProducts(): Promise<RawProduct[]>

  /**
   * Public entry point — orchestrator bunu çağırır.
   * Ham veriyi çeker, standart formata dönüştürür.
   */
  async run(): Promise<NormalizedProduct[]> {
    logger.info(`[${this.name}] Plugin başladı`)
    try {
      const raw = await this.fetchProducts()
      logger.info(`[${this.name}] Ham ürün sayısı: ${raw.length}`)

      const normalized = mapProducts(raw, this.keyMap)
      logger.info(`[${this.name}] Normalize edilmiş ürün sayısı: ${normalized.length}`)

      return normalized
    } catch (err: any) {
      logger.error(`[${this.name}] HATA: ${err.message}`)
      throw err
    }
  }
}
