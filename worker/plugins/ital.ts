import axios from 'axios'
import { PluginBase } from '../plugin-base'
import type { ProductKeyMap, RawProduct } from './_types'
import { logger } from '../helpers/logger'

const ITAL_API_URL = 'https://b4b.italmakina.com.tr/Search/SearchProduct'
const PAGE_SIZE = 24
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000
const REQUEST_TIMEOUT_MS = 30000

/**
 * HTML etiketlerini ve &nbsp; gibi entity'leri temizler.
 * Türkçe sayı formatı (1.234,56) ham hâliyle bırakılır — base mapper parseTurkishNumber ile çevirir.
 */
function cleanPriceString(value: any): string {
  if (value === null || value === undefined) return '0'
  if (typeof value === 'number') return String(value)
  let str = String(value)
  // İlk '&' karakterinden öncesini al (orijinal mantık), HTML & entity'leri temizle
  str = str.split('&')[0]
  str = str.replace(/<[^>]*>/g, '').replace(/\s*&nbsp;/g, '').trim()
  if (str === '-' || str === '') return '0'
  return str
}

export default class ItalPlugin extends PluginBase {
  readonly name = 'Ital'

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
      throw new Error('Ital token bulunamadı (this.supplier.token boş)')
    }

    const fetchWithRetry = async (params: any, retries: number): Promise<any> => {
      try {
        const res = await axios.post(ITAL_API_URL, params, {
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
        manufacturer: null,
        vehicleBrand: null,
        vehicleModel: null,
        productGroup1: null,
        productGroup2: null,
        productGroup3: null,
        campaign: false,
        newArrival: false,
        newProduct: false,
        comparsionProduct: false,
        onQuantity: false,
        onWay: false,
        image: false,
      }

      logger.info(`[${this.name}] Veri çekiliyor: ${dataCount} - ${dataCount + PAGE_SIZE}`)

      let data: any
      try {
        data = await fetchWithRetry(params, MAX_RETRIES)
      } catch (err: any) {
        logger.error(`[${this.name}] Son deneme başarısız, durduruluyor: ${err.message}`)
        break
      }

      const list: any[] = Array.isArray(data) ? data : []
      if (list.length === 0) break

      for (const element of list) {
        allProducts.push(element)
      }

      dataCount += PAGE_SIZE
      if (list.length < PAGE_SIZE) break
    }

    return allProducts
  }
}
