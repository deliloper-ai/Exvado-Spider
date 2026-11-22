import axios from 'axios'
import xml2js from 'xml2js'
import { PluginBase } from '../plugin-base'
import type { ProductKeyMap, RawProduct } from './_types'
import { logger } from '../helpers/logger'

const PARS_XML_URL = 'https://b2b.parsendustri.com.tr/export/1/45S4586M43'

export default class ParsPlugin extends PluginBase {
  readonly name = 'Pars'

  protected readonly keyMap: ProductKeyMap = {
    productTitle: 'productTitle',
    productCode: 'productCode',
    netPriceWithVAT: (raw) => parseFloat(raw.netPriceWithVAT),
    productPictures: 'productPictures',
    productStockStatus: 'productStockStatus',
    stock: 'productStockStatus',
    brand: 'brand',
  }

  protected async fetchProducts(): Promise<RawProduct[]> {
    try {
      logger.info(`[${this.name}] XML çekiliyor: ${PARS_XML_URL}`)

      const response = await axios.get(PARS_XML_URL, { timeout: 60000 })
      const parser = new xml2js.Parser()
      const result = await parser.parseStringPromise(response.data)

      if (!result?.products?.product) {
        logger.warn(`[${this.name}] XML içinde ürün bulunamadı`)
        return []
      }

      const products: RawProduct[] = result.products.product.map((element: any) => {
        const quantity = parseFloat(element.quantity?.[0] ?? '0') || 0
        return {
          productTitle: element.name?.[0] ?? '',
          productCode: element.productCode?.[0] ?? '',
          netPriceWithVAT: element.price?.[0] ?? '0',
          productPictures: element.image1?.[0] ?? '',
          productStockStatus: quantity > 0 ? 'Var' : 'Yok',
          brand: element.brand?.[0] ?? '',
        }
      })

      return products
    } catch (err: any) {
      throw new Error(`Pars XML çekme/parse hatası: ${err.message}`)
    }
  }
}
