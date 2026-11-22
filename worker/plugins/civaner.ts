import axios from 'axios'
import { JSDOM } from 'jsdom'
import { PluginBase } from '../plugin-base'
import type { ProductKeyMap, RawProduct } from './_types'
import { logger } from '../helpers/logger'

const CIVANER_BASE = 'https://b4b.civaner.com'

export default class CivanerPlugin extends PluginBase {
  readonly name = 'Civaner'

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
      throw new Error('Civaner token tanımsız')
    }

    const dolarKur = Number(this.supplier.dolar_kur || 0)
    const euroKur = Number(this.supplier.euro_kur || 0)

    if (!dolarKur || !euroKur) {
      logger.warn(`[${this.name}] dolar_kur veya euro_kur tanımlı değil (USD=${dolarKur}, EUR=${euroKur})`)
    }

    const allProducts: RawProduct[] = []
    let page = 0
    let detectLastPage = false

    while (!detectLastPage) {
      const url = `${CIVANER_BASE}/Arama/_Prbx?q=&Page=${page}&page=0&Cat=&_StokBoxCount=&Paging=true`
      logger.info(`[${this.name}] Sayfa çekiliyor: page=${page}`)

      let response
      try {
        response = await axios.get(url, {
          headers: { Cookie: token },
          timeout: 60000,
        })
      } catch (err: any) {
        throw new Error(`Civaner sayfa çekilemedi (page=${page}): ${err.message}`)
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
        const productCode = item.querySelector('.prbx-alt-ad')?.textContent?.trim() ?? ''
        const productPicturesRaw = item.querySelector('.prbx-image img')?.getAttribute('data-src') ?? ''
        const stockStatusRaw = item.querySelector('.prbx-fiyat.clr1.text-center .prbx-value')?.textContent?.trim() ?? ''
        const brand = item.querySelector('.prbx-fiyat.clr1 .prbx-value')?.textContent?.trim() ?? ''

        // Fiyat: USD veya EUR span'ı bul
        const priceElements = item.querySelectorAll('.price.net-price.tl-fiyat')
        let priceRaw = ''
        priceElements.forEach((priceElement: any) => {
          const priceText = priceElement?.textContent?.trim()
          if (priceText && (priceText.includes('USD') || priceText.includes('EUR'))) {
            priceRaw = priceText.replace('.', '').replace(',', '.').trim()
          }
        })

        const priceParts = priceRaw.split(' ')
        const priceValue = parseFloat(priceParts[0]) || 0
        const currency = priceParts[1] ?? ''

        // Para birimine göre TRY'ye çevir
        const kur = currency === 'USD' ? dolarKur : currency === 'EUR' ? euroKur : 0
        const netPriceWithVAT = priceValue * kur

        // Stok durumu normalize
        const stockStatus = stockStatusRaw === 'Yok' ? 'Yok' : 'Var'
        const stock = stockStatusRaw === 'Yok' ? 0 : 10

        // Resim URL'i tam yola çevir
        const productPictures = productPicturesRaw
          ? `${CIVANER_BASE}/${productPicturesRaw.replace(/^\/+/, '')}`
          : ''

        allProducts.push({
          productTitle,
          productCode,
          netPriceWithVAT,
          productPictures,
          productStockStatus: stockStatus,
          stock,
          brand,
          currency,
        })
      })

      page++
    }

    logger.info(`[${this.name}] Toplam çekilen ürün: ${allProducts.length}`)
    return allProducts
  }
}
