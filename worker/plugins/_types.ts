/**
 * Worker plugin tip tanımları
 */

export interface RawProduct {
  [key: string]: any
}

/**
 * Tedarikçi'den gelen ham ürün → standart formata dönüştürülmüş
 */
export interface NormalizedProduct {
  productTitle: string
  productCode: string
  netPriceWithVAT: number
  productPictures: string
  productStockStatus: string
  stock: number
  brand: string
  bizimhesap_fiyat?: number | null
  bizimhesap_stock?: number | null
  isFiyatTercih?: number
}

/**
 * Plugin'in productKeyMap alanı — ham ürün field'larını standart format'a eşler
 * Değer "string" ise alan ismidir, fonksiyonsa custom dönüşüm yapar
 */
export type FieldMapper = string | ((raw: RawProduct) => any)

export interface ProductKeyMap {
  productTitle: FieldMapper
  productCode: FieldMapper
  netPriceWithVAT: FieldMapper
  productPictures: FieldMapper
  productStockStatus: FieldMapper
  stock: FieldMapper
  brand: FieldMapper
}

export interface SupplierConfig {
  id: number
  name: string
  status: number
  discount: number
  token?: string | null
  euro_kur?: number | null
  dolar_kur?: number | null
  sira?: number
}

export interface SyncResult {
  supplierName: string
  status: 'success' | 'error'
  createdCount: number
  updatedCount: number
  totalCount: number
  existCount: number
  duration: number
  error?: string
}
