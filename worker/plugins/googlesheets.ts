import path from 'path'
import { google } from 'googleapis'
import { PluginBase } from '../plugin-base'
import type { ProductKeyMap, RawProduct } from './_types'
import { logger } from '../helpers/logger'

/**
 * Türk para formatını ('1.234,56') ya da düz string'i float'a çevirir.
 * HTML etiketlerini ve &nbsp; karakterlerini de temizler.
 */
function parseSheetPrice(value: any): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value

  let cleaned = String(value)
    .replace(/<[^>]*>/g, '')
    .replace(/\s*&nbsp;/g, '')
    .trim()

  // Türk formatı: binlik ayırıcı '.', ondalık ','
  if (cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  }

  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

export default class GoogleSheetsPlugin extends PluginBase {
  readonly name = 'GoogleSheets'

  protected readonly keyMap: ProductKeyMap = {
    productTitle: 'Urun Adi',
    productCode: 'Stok Kodu',
    netPriceWithVAT: (raw) => parseSheetPrice(raw['Alis Fiyati']),
    productPictures: 'Urun Gorseli',
    productStockStatus: 'Stok Durumu',
    stock: 'Stok Adedi',
    brand: 'Marka',
  }

  protected async fetchProducts(): Promise<RawProduct[]> {
    const credPath = process.env.GOOGLE_CREDENTIALS_PATH
    const sheetId = process.env.GOOGLE_SHEETS_ID

    if (!credPath) {
      throw new Error(
        `[${this.name}] GOOGLE_CREDENTIALS_PATH env değişkeni gerekli (Google service account JSON yolu)`,
      )
    }
    if (!sheetId) {
      throw new Error(`[${this.name}] GOOGLE_SHEETS_ID env değişkeni gerekli`)
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: path.resolve(credPath),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })

    const sheets = google.sheets({ version: 'v4', auth })
    const range = 'Sayfa1!A1:H10000'

    logger.info(`[${this.name}] Google Sheets çekiliyor: ${range}`)

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    })

    const rows = response.data.values
    if (!rows || rows.length <= 1) {
      logger.warn(`[${this.name}] Sheet boş veya yalnızca başlık var`)
      return []
    }

    const headers = rows[0] as string[]
    const dataRows = rows.slice(1)

    const products: RawProduct[] = dataRows
      .map((row) => {
        const obj: RawProduct = {}
        headers.forEach((header, idx) => {
          if (header) obj[header] = row[idx]
        })
        return obj
      })
      .filter((item) => Object.keys(item).length > 0)

    logger.info(`[${this.name}] Sheet'ten ${products.length} ham ürün okundu`)
    return products
  }
}
