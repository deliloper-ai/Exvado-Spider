import axios from 'axios'
import { PluginBase } from '../plugin-base'
import type { ProductKeyMap, RawProduct } from './_types'
import { logger } from '../helpers/logger'
import { updateProgress } from '../helpers/progress'

/**
 * AkinZiraat B4B plugin
 *
 * Çalışma akışı (kategori-bazlı tarama):
 *   1) GetCategoryMenuList({categoryCode:"102"}) → ana kategoriler (Mamül, Aksesuar, Yedek Parça)
 *   2) Her ana kategori için GetCategoryMenuList({categoryCode:"104", subCategoryCode:<ana>}) → alt kategoriler
 *   3) Her (ana, alt) çifti için SearchProduct'a productType1/productType2 + subCategoryCode array gönder
 *   4) productCode bazında dedupe et (aynı ürün birden fazla kategoride olabilir)
 *
 * Sebep: ana SearchProduct (filter'sız) tüm ürünleri döndürmüyor — kategori filter'ı
 * olmadığında bazı ürünler liste dışı kalıyor.
 *
 * Auth: tedarikciler.token DB sütunundaki session cookie kullanılır.
 */

const BASE_URL = 'https://b4b.akinziraat.com'
const CATEGORY_URL = `${BASE_URL}/Search/GetCategoryMenuList`
const SEARCH_URL = `${BASE_URL}/Search/SearchProduct`
const PAGE_SIZE = 24
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000
const REQUEST_TIMEOUT_MS = 30000

const COMMON_HEADERS = {
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  'Referer': `${BASE_URL}/Search/Index`,
}

function cleanPriceString(value: any): string {
  if (value === null || value === undefined) return '0'
  if (typeof value === 'number') return String(value)
  let str = String(value)
  str = str.replace(/<[^>]*>/g, '').replace(/\s*&nbsp;/g, '').trim()
  if (str === '-' || str === '') return '0'
  return str
}

function pickPrice(raw: RawProduct): string {
  const campaign = raw.CampaignPriceWithVatCustomerStr
  const net = raw.PriceNetWithVatCustomerStr
  const campaignClean = cleanPriceString(campaign)
  if (campaignClean && campaignClean !== '0' && campaignClean !== '-') {
    return campaignClean
  }
  return cleanPriceString(net)
}

interface CategoryNode {
  code: string
  name: string
}

interface CategoryPair {
  ana: CategoryNode
  alt: CategoryNode
}

export default class AkinziraatPlugin extends PluginBase {
  readonly name = 'Akinziraat'

  protected readonly keyMap: ProductKeyMap = {
    productTitle: 'Name',
    productCode: 'Code',
    netPriceWithVAT: (raw) => pickPrice(raw),
    productPictures: 'PicturePath',
    productStockStatus: 'AvailabilityText',
    stock: 'AvailabilityText',
    brand: 'Manufacturer',
  }

  private async postWithRetry(url: string, body: any, token: string, retries = MAX_RETRIES): Promise<any> {
    try {
      const res = await axios.post(url, body, {
        headers: { ...COMMON_HEADERS, Cookie: token },
        timeout: REQUEST_TIMEOUT_MS,
        maxRedirects: 0,
        validateStatus: (s) => s >= 200 && s < 400,
      })
      return res.data
    } catch (err: any) {
      // 302 redirect = session expired
      if (err.response?.status === 302) {
        throw new Error('Akinziraat session expired (302 → /Login/Logout). Token yenilemesi gerek.')
      }
      logger.warn(`[${this.name}] İstek hatası (${url}): ${err.message}`)
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
        return this.postWithRetry(url, body, token, retries - 1)
      }
      throw err
    }
  }

  /**
   * Kategori ağacını iki seviyeli olarak çeker.
   * Dönüş: tüm (ana, alt) çiftlerinin düz listesi
   */
  private async fetchCategoryPairs(token: string): Promise<CategoryPair[]> {
    // Level 0: ana kategoriler (categoryCode=102)
    const rootList: any[] = await this.postWithRetry(CATEGORY_URL, { categoryCode: '102' }, token)
    if (!Array.isArray(rootList) || rootList.length === 0) {
      throw new Error('Ana kategori listesi alınamadı (root=102 boş)')
    }

    const pairs: CategoryPair[] = []

    for (const root of rootList) {
      const anaCode = root.SubCategoryCode
      const anaName = root.CategoryValue
      if (!anaCode) continue

      // Level 1: alt kategoriler (categoryCode=104, subCategoryCode=<ana>)
      const subList: any[] = await this.postWithRetry(
        CATEGORY_URL,
        { categoryCode: '104', subCategoryCode: anaCode },
        token,
      )

      if (!Array.isArray(subList) || subList.length === 0) {
        logger.warn(`[${this.name}] Alt kategori bulunamadı: ${anaCode} (${anaName})`)
        continue
      }

      for (const sub of subList) {
        if (!sub.SubCategoryCode) continue
        pairs.push({
          ana: { code: anaCode, name: anaName || '' },
          alt: { code: sub.SubCategoryCode, name: sub.CategoryValue || '' },
        })
      }
    }

    logger.info(`[${this.name}] Kategori ağacı: ${rootList.length} ana, ${pairs.length} (ana,alt) çifti`)
    return pairs
  }

  /**
   * Belirli bir (ana, alt) kategori için tüm sayfaları çek
   */
  private async fetchProductsForCategory(
    token: string,
    pair: CategoryPair,
  ): Promise<RawProduct[]> {
    const collected: RawProduct[] = []
    let dataCount = 0

    while (true) {
      const params = {
        dataCount,
        mainSearch: true,
        productType1: pair.ana.code,
        productType2: pair.alt.code,
        productType3: '',
        t9Text: '',
        productBrand: 'Seçiniz',
        campaign: false,
        newArrival: false,
        newProduct: false,
        comparsionProduct: false,
        onQuantity: false,
        onWay: false,
        orderBy: null,
        subCategoryCode: [pair.ana.code, pair.alt.code],
        specialCode1: null,
        categoryList: [] as any[],
      }

      let data: any
      try {
        data = await this.postWithRetry(SEARCH_URL, params, token)
      } catch (err: any) {
        logger.error(`[${this.name}] [${pair.ana.name}/${pair.alt.name}] sayfa hatası dataCount=${dataCount}: ${err.message}`)
        break
      }

      const list: any[] = Array.isArray(data?.ProductList) ? data.ProductList : []
      if (list.length === 0) break

      for (const item of list) collected.push(item)

      dataCount += PAGE_SIZE
      if (list.length < PAGE_SIZE) break
    }

    return collected
  }

  protected async fetchProducts(): Promise<RawProduct[]> {
    const token = this.supplier.token
    if (!token) {
      throw new Error(
        'Akinziraat token bulunamadı. tedarikciler.token DB sütununa session cookie kaydedilmelidir.',
      )
    }

    const pairs = await this.fetchCategoryPairs(token)

    // productCode bazında dedupe — aynı ürün birden fazla kategoride listelenebilir
    const dedupe = new Map<string, RawProduct>()
    let pairIdx = 0

    for (const pair of pairs) {
      pairIdx++
      const list = await this.fetchProductsForCategory(token, pair)
      let added = 0
      for (const item of list) {
        const code = (item as any).Code
        if (code && !dedupe.has(code)) {
          dedupe.set(code, item)
          added++
        }
      }
      logger.info(
        `[${this.name}] (${pairIdx}/${pairs.length}) ${pair.ana.name}/${pair.alt.name}: ` +
        `${list.length} ürün geldi, ${added} yeni (toplam: ${dedupe.size})`,
      )
      updateProgress({
        message: `Akinziraat: ${pairIdx}/${pairs.length} ${pair.ana.name}/${pair.alt.name} (${dedupe.size} ürün)`,
      }, true)
    }

    logger.info(`[${this.name}] Toplam tekil ürün: ${dedupe.size}`)
    return Array.from(dedupe.values())
  }
}
