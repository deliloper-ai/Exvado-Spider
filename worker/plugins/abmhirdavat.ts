import axios from 'axios'
import xml2js from 'xml2js'
import { PluginBase } from '../plugin-base'
import type { ProductKeyMap, RawProduct } from './_types'
import { logger } from '../helpers/logger'

const ABM_XML_URL = 'https://b2b.abmhirdavat.com.tr/Genel/Xml/8E5500B7-FA76-40A1-99C6-741C4E7D10B2'
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 5000
const RATE_LIMIT_WAIT_MS = 15 * 60 * 1000 // 15 dakika

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function parsePrice(price: any): number {
  if (!price) return 0
  if (typeof price === 'string') {
    const clean = price.replace(/[^\d.,]/g, '').replace(',', '.')
    return parseFloat(clean) || 0
  }
  return parseFloat(price) || 0
}

function parseStockStatus(status: any): string {
  if (!status) return 'Yok'
  const s = status.toString().toLowerCase()
  if (s.includes('var') || s.includes('mevcut') || s === 'true' || s === '1') {
    if (s.includes('az') || s.includes('düşük')) return 'Az Var'
    return 'Var'
  }
  if (s.includes('az') || s.includes('düşük')) return 'Az Var'
  return 'Yok'
}

export default class AbmHirdavatPlugin extends PluginBase {
  readonly name = 'AbmHirdavat'

  protected readonly keyMap: ProductKeyMap = {
    productTitle: 'Adi',
    productCode: 'Kod',
    netPriceWithVAT: (raw) => parsePrice(raw.KdvDahilNetFiyat),
    productPictures: 'Resim1',
    productStockStatus: (raw) => parseStockStatus(raw.StokDurumu),
    stock: (raw) => parseStockStatus(raw.StokDurumu),
    brand: (raw) => raw.Marka || 'Genel',
  }

  protected async fetchProducts(): Promise<RawProduct[]> {
    const xmlData = await this.fetchXmlData()
    return await this.parseXmlData(xmlData)
  }

  private async fetchXmlData(): Promise<string> {
    let lastError: any
    let lastDetails: string = ''

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.info(`[${this.name}] XML çekme denemesi ${attempt}/${MAX_RETRIES}`)

        const response = await axios.get(ABM_XML_URL, {
          timeout: 30000,
          // axios non-2xx durumda da response döndürsün, böylece status kodunu loglarız
          validateStatus: () => true,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/xml, text/xml, */*',
            'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
          },
        })

        const status = response.status
        const contentType = response.headers?.['content-type'] || 'unknown'
        const dataLength =
          typeof response.data === 'string'
            ? response.data.length
            : JSON.stringify(response.data || '').length

        logger.info(
          `[${this.name}] HTTP ${status} | content-type: ${contentType} | uzunluk: ${dataLength} byte`,
        )

        // HTTP hata kodu (4xx/5xx)
        if (status >= 400) {
          lastDetails = `HTTP ${status} ${contentType} (${dataLength}b)`
          throw new Error(`ABM sunucusu ${status} döndü`)
        }

        // Boş response kontrolü
        if (!response.data || dataLength === 0) {
          lastDetails = `Boş response (HTTP ${status}, content-type: ${contentType})`
          throw new Error(`ABM boş cevap döndü (HTTP ${status})`)
        }

        // Çok küçük response → muhtemelen anlamlı XML değil
        if (dataLength < 50) {
          const preview = String(response.data).substring(0, 200)
          lastDetails = `Anormal kısa response (${dataLength}b): ${preview}`
          throw new Error(`ABM kısa cevap döndü (${dataLength} byte): ${preview}`)
        }

        const responseText =
          typeof response.data === 'string' ? response.data : JSON.stringify(response.data)

        // Rate limit kontrolü
        if (
          responseText.includes('Maximum Sorgu Limitine Ulaştınız') ||
          responseText.includes('Maxmimum Sorgu Limitine Ulaştınız')
        ) {
          let nextTime = 'Bilinmiyor'
          try {
            const parser = new xml2js.Parser({ explicitArray: false, trim: true })
            const errorResult = await parser.parseStringPromise(response.data)
            if (errorResult?.Hata?.HataMi === 'True') {
              nextTime = errorResult.Hata.SonrakiXmlTarihi || nextTime
            }
          } catch {
            // parse edilemezse fallback
          }

          logger.warn(
            `[${this.name}] Rate limit. Sonraki deneme: ${nextTime}. 15dk bekleniyor...`,
          )

          if (attempt < MAX_RETRIES) {
            await sleep(RATE_LIMIT_WAIT_MS)
            continue
          }
          throw new Error(
            `ABM Hırdavat rate limit aşıldı. Sonraki deneme: ${nextTime}`,
          )
        }

        logger.info(`[${this.name}] XML başarıyla çekildi (${dataLength} byte)`)
        return response.data
      } catch (err: any) {
        lastError = err
        // Axios hata detaylarını çıkart
        const code = err.code || 'UNKNOWN'
        const errMsg = err.message || '(boş hata mesajı)'
        const status = err.response?.status
        const respPreview = err.response?.data ? String(err.response.data).substring(0, 200) : ''

        const details: string[] = []
        details.push(`code=${code}`)
        if (status) details.push(`status=${status}`)
        if (errMsg) details.push(`msg="${errMsg}"`)
        if (lastDetails) details.push(`detay="${lastDetails}"`)
        if (respPreview) details.push(`response="${respPreview}"`)

        logger.error(
          `[${this.name}] Deneme ${attempt} başarısız: ${details.join(' | ')}`,
        )

        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS)
        }
      }
    }

    const finalMsg = lastError?.message || lastDetails || 'tüm denemeler başarısız (sebep belirsiz)'
    throw new Error(`ABM Hırdavat XML çekilemedi: ${finalMsg}`)
  }

  private async parseXmlData(xmlData: string): Promise<RawProduct[]> {
    try {
      const parser = new xml2js.Parser({
        explicitArray: false,
        ignoreAttrs: false,
        trim: true,
      })

      const result = await parser.parseStringPromise(xmlData)

      // Hata içeriyor mu?
      if (result?.Hata?.HataMi === 'True') {
        const errorMsg = result.Hata.HataMesaj || 'Bilinmeyen hata'
        const nextTime = result.Hata.SonrakiXmlTarihi || 'Bilinmiyor'
        throw new Error(`ABM Hırdavat API hatası: ${errorMsg}. Sonraki: ${nextTime}`)
      }

      let products: any[] = []

      // Standart format: <Stoklar><Stok>...</Stok></Stoklar>
      if (result?.Stoklar?.Stok) {
        products = Array.isArray(result.Stoklar.Stok)
          ? result.Stoklar.Stok
          : [result.Stoklar.Stok]
      } else {
        // Fallback: ilk array bulunan node
        for (const key of Object.keys(result || {})) {
          const node = result[key]
          if (node && typeof node === 'object') {
            for (const subKey of Object.keys(node)) {
              if (Array.isArray(node[subKey])) {
                products = node[subKey]
                logger.info(`[${this.name}] Ürünler fallback ile bulundu: ${key}.${subKey}`)
                break
              }
            }
            if (products.length > 0) break
          }
        }
      }

      if (products.length === 0) {
        logger.warn(`[${this.name}] XML içinde ürün bulunamadı`)
      }

      return products as RawProduct[]
    } catch (err: any) {
      throw new Error(`ABM Hırdavat XML parse hatası: ${err.message}`)
    }
  }
}
