import axios from 'axios'
import { PluginBase } from '../plugin-base'
import type { ProductKeyMap, RawProduct } from './_types'
import { logger } from '../helpers/logger'

const MAPAS_API_URL = 'https://b4b.mapas.com.tr/Search/SearchProduct'
const PAGE_SIZE = 24
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000
const REQUEST_TIMEOUT_MS = 30000

/**
 * HTML etiketlerini ve &nbsp; gibi entity'leri temizler.
 * Türkçe sayı formatı base mapper parseTurkishNumber ile float'a çevrilir.
 */
function cleanPriceString(value: any): string {
  if (value === null || value === undefined) return '0'
  if (typeof value === 'number') return String(value)
  let str = String(value)
  str = str.replace(/<[^>]*>/g, '').replace(/\s*&nbsp;/g, '').trim()
  if (str === '-' || str === '') return '0'
  return str
}

export default class MapasPlugin extends PluginBase {
  readonly name = 'Mapas'

  protected readonly keyMap: ProductKeyMap = {
    productTitle: 'Name',
    productCode: 'Code',
    netPriceWithVAT: (raw) => cleanPriceString(raw.PriceNetWithVatCustomerStr),
    productPictures: 'PicturePath',
    productStockStatus: 'AvailabilityText',
    stock: 'AvailabilityText',
    brand: 'Manufacturer',
  }

  protected async fetchProducts(): Promise<RawProduct[]> {
    const token = this.supplier.token
    if (!token) {
      throw new Error('Mapas token bulunamadı (this.supplier.token boş)')
    }

    const fetchWithRetry = async (params: any, retries: number): Promise<any> => {
      try {
        const res = await axios.post(MAPAS_API_URL, params, {
          headers: { Cookie: token },
          timeout: REQUEST_TIMEOUT_MS,
        })
        return res.data
      } catch (err: any) {
        logger.warn(`[${this.name}] İstek hatası: ${err.message}`)
        if (retries > 0) {
          logger.warn(`[${this.name}] Tekrar denenecek (${retries} hak kaldı)`)
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
          return fetchWithRetry(params, retries - 1)
        }
        throw err
      }
    }

    const allProducts: RawProduct[] = []
    let dataCount = 0

    while (true) {
      const params = {
        dataCount,
        manufacturer: 'Seçiniz',
        vehicleBrand: null,
        vehicleModel: null,
        productGroup1: null,
        productGroup2: null,
        productGroup3: null,
        campaign: false,
        chkMamul: false,
        chkSpare: false,
        chkOther: false,
        newArrival: false,
        newProduct: false,
        comparsionProduct: false,
        onQuantity: false,
        onWay: false,
        isEndofSeries: false,
      }

      logger.info(`[${this.name}] Veri çekiliyor: ${dataCount} - ${dataCount + PAGE_SIZE}`)

      let data: any
      try {
        data = await fetchWithRetry(params, MAX_RETRIES)
      } catch (err: any) {
        logger.error(`[${this.name}] Son deneme başarısız, durduruluyor: ${err.message}`)
        break
      }

      const list: any[] = Array.isArray(data?.ProductList) ? data.ProductList : []
      const total = typeof data?.TotalDataCount === 'number' ? data.TotalDataCount : null

      if (list.length === 0) break

      for (const element of list) {
        allProducts.push(element)
      }

      dataCount += PAGE_SIZE
      // Mapaş API ilk sayfada bazen PAGE_SIZE'dan az ürün döndürüyor (22) ama
      // TotalDataCount gerçek toplamı veriyor. list.length < PAGE_SIZE ile
      // kesmek yanlış — TotalDataCount ulaşıldığında dur.
      if (total !== null && dataCount >= total) break
    }

    return allProducts
  }
}
