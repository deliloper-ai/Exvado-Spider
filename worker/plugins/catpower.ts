import axios from 'axios'
import { JSDOM } from 'jsdom'
import { PluginBase } from '../plugin-base'
import type { ProductKeyMap, RawProduct } from './_types'
import { logger } from '../helpers/logger'

const CATPOWER_BASE = 'https://bayi.catpower.com.tr'

export default class CatpowerPlugin extends PluginBase {
  readonly name = 'Catpower'

  protected readonly keyMap: ProductKeyMap = {
    productTitle: 'productTitle',
    productCode: 'productCode',
    netPriceWithVAT: 'netPriceWithVAT',
    productPictures: 'productPictures',
    productStockStatus: 'productStockStatus',
    stock: 'stock',
    brand: 'brand',
  }

  protected async fetchProducts(): Promise<RawProduct[]> {
    const token = this.supplier.token
    if (!token) {
      throw new Error('Catpower token tanımsız')
    }

    const allProducts: RawProduct[] = []
    let page = 1
    let detectLastPage = false

    while (!detectLastPage) {
      const url = `${CATPOWER_BASE}/Arama/_Prbx?page=${page}`
      logger.info(`[${this.name}] Sayfa çekiliyor: page=${page}`)

      let response
      try {
        response = await axios.get(url, {
          headers: { Cookie: token },
          timeout: 60000,
        })
      } catch (err: any) {
        throw new Error(`Catpower sayfa çekilemedi (page=${page}): ${err.message}`)
      }

      const dom = new JSDOM(response.data)
      const document = dom.window.document

      const items = document.querySelectorAll('.prbx-item')
      if (items.length === 0) {
        detectLastPage = true
        break
      }

      items.forEach((item: any) => {
        const productTitle = item.querySelector('.prbx-ad.detay')?.textContent?.trim() ?? ''
        const productCode = item.querySelector('.prbx-value[title]')?.textContent?.trim() ?? ''
        const productPicturesRaw = item.querySelector('.prbx-image img')?.getAttribute('data-src') ?? ''
        const stockStatusRaw = item.querySelector('.prbx-value.bg-success')?.textContent?.trim() ?? ''
        const brand = item.querySelector('.prbx-fiyat .prbx-value.text-right')?.textContent?.trim() ?? ''

        // Fiyat çıkarma (önce normal alan, yoksa popup)
        let priceText = item.querySelector('.stkbox-kdv-text-up .prbx-value')?.textContent?.trim() ?? ''
        if (!priceText) {
          const popupEl = item.querySelector('.stkbox-kdv-pop-up .stkbox-kdv-text-up .prbx-value')
          priceText = popupEl?.textContent?.trim() ?? ''
        }
        if (priceText) {
          priceText = priceText.replace('TL', '').trim()
        }

        const netPriceWithVAT = priceText
          ? parseFloat(priceText.replace(/\./g, '').replace(',', '.')) || 0
          : 0

        // Stok durumu normalize: STOK VAR → Var/20, aksi → Yok/0
        const stockStatus = stockStatusRaw === 'STOK VAR' ? 'Var' : 'Yok'
        const stock = stockStatusRaw === 'STOK VAR' ? 20 : 0

        // Resim URL'i tam yola çevir
        const productPictures = productPicturesRaw
          ? `${CATPOWER_BASE}/${productPicturesRaw.replace(/^\/+/, '')}`
          : ''

        allProducts.push({
          productTitle,
          productCode,
          netPriceWithVAT,
          productPictures,
          productStockStatus: stockStatus,
          stock,
          brand,
        })
      })

      page++
    }

    logger.info(`[${this.name}] Toplam çekilen ürün: ${allProducts.length}`)
    return allProducts
  }
}
