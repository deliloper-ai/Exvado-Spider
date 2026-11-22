import axios from 'axios'
import { PluginBase } from '../plugin-base'
import type { ProductKeyMap, RawProduct } from './_types'
import { logger } from '../helpers/logger'

const BIZIMHESAP_URL = 'https://bizimhesap.com/api/b2b/products'
const BIZIMHESAP_KEY = 'BZMHB2B724018943908D0B82491F203F'

export default class BizimhesapPlugin extends PluginBase {
  readonly name = 'Bizimhesap'

  protected readonly keyMap: ProductKeyMap = {
    productTitle: 'title',
    productCode: 'code',
    netPriceWithVAT: (raw) => parseFloat(raw.buyingPrice) || 0,
    productPictures: (raw) => {
      if (!raw.photo) return ''
      try {
        const photos = JSON.parse(raw.photo)
        return photos?.[0]?.PhotoUrlOriginal ?? ''
      } catch {
        return ''
      }
    },
    productStockStatus: () => 'Var',
    stock: (raw) => {
      const price = parseFloat(raw.buyingPrice) || 0
      if (price === 0) return 0
      return parseInt(raw.quantity, 10) || 0
    },
    brand: 'brand',
  }

  protected async fetchProducts(): Promise<RawProduct[]> {
    const token = this.supplier.token
    if (!token) {
      throw new Error('Bizimhesap token tanımlı değil (supplier.token)')
    }

    try {
      logger.info(`[${this.name}] API çağrısı: ${BIZIMHESAP_URL}`)

      const response = await axios.get(BIZIMHESAP_URL, {
        timeout: 60000,
        headers: {
          Key: BIZIMHESAP_KEY,
          Token: token,
        },
      })

      const products = response.data?.data?.products
      if (!Array.isArray(products)) {
        logger.warn(`[${this.name}] API yanıtında ürün listesi bulunamadı`)
        return []
      }

      return products.filter((item: any) => item) as RawProduct[]
    } catch (err: any) {
      throw new Error(`Bizimhesap API hatası: ${err.message}`)
    }
  }
}
