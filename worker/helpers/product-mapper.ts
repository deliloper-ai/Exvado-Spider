import type { ProductKeyMap, RawProduct, NormalizedProduct } from '../plugins/_types'

/**
 * Türkçe sayı formatını ('1.234,56') normal float'a çevirir
 */
export function parseTurkishNumber(value: any): number {
  if (typeof value === 'number') return value
  if (!value) return 0
  const str = String(value).replace(/\./g, '').replace(',', '.')
  const num = parseFloat(str)
  return isNaN(num) ? 0 : num
}

/**
 * productStockStatus → stock numerik dönüşümü (eski projedeki mantık)
 * 'Var' → 50, 'Az Var' → 1, 'Yok' → 0
 */
export function stockStatusToNumber(status: any): number {
  if (typeof status === 'number') return status
  const s = String(status || '').toLowerCase().trim()
  if (s === 'var' || s === 'available' || s === 'stokta') return 50
  if (s === 'az var' || s.includes('az')) return 1
  if (s === 'yok' || s === 'tükendi' || s === 'out of stock') return 0
  // Sayısal string olabilir
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

function getMappedValue(raw: RawProduct, mapper: any): any {
  if (typeof mapper === 'function') return mapper(raw)
  if (typeof mapper === 'string') {
    // "field.subfield" desteği
    return mapper.split('.').reduce((obj: any, key: string) => obj?.[key], raw)
  }
  return mapper
}

/**
 * Ham tedarikçi ürünlerini standart NormalizedProduct formatına çevirir
 */
export function mapProducts(rawProducts: RawProduct[], keyMap: ProductKeyMap): NormalizedProduct[] {
  return rawProducts
    .map(raw => {
      try {
        const product: NormalizedProduct = {
          productTitle: String(getMappedValue(raw, keyMap.productTitle) || '').trim(),
          productCode: String(getMappedValue(raw, keyMap.productCode) || '').trim(),
          netPriceWithVAT: parseTurkishNumber(getMappedValue(raw, keyMap.netPriceWithVAT)),
          productPictures: String(getMappedValue(raw, keyMap.productPictures) || ''),
          productStockStatus: String(getMappedValue(raw, keyMap.productStockStatus) || 'Yok'),
          stock: stockStatusToNumber(getMappedValue(raw, keyMap.stock)),
          brand: String(getMappedValue(raw, keyMap.brand) || '').trim(),
        }
        return product
      } catch {
        return null
      }
    })
    .filter((p): p is NormalizedProduct => p !== null && !!p.productCode)
}
