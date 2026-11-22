import type {
  Category as CategoryDTO,
  Brand as BrandDTO,
  Supplier as SupplierDTO,
  Product as ProductDTO,
} from '@/lib/api/types'
import type {
  Category as CategoryDB,
  Brand as BrandDB,
  Supplier as SupplierDB,
  Desi as DesiDB,
  SpecificationGroup as SpecGroupDB,
  Specification as SpecDB,
  SupplierCron as SupplierCronDB,
  Product as ProductDB,
  SupplierProduct as SupplierProductDB,
} from '@prisma/client'

// ============= CATEGORY =============

export function categoryToFrontend(db: CategoryDB): CategoryDTO {
  return {
    id: String(db.id),
    name: db.baslik || '',
    slug: db.seo_url || '',
    description: db.spot || null,
    imageUrl: null,
    imageTitle: null,
    imageAlt: null,
    icon: db.ikon || null,
    color: null,
    parentId: db.ust_id && db.ust_id !== '0' ? db.ust_id : null,
    isActive: db.durum === '1',
    showInMenu: true,
    showInHome: db.anasayfa === '1',
    order: db.sira ?? 0,
    metaTitle: db.baslik_seo || null,
    metaDescription: db.meta_desc || null,
    metaKeywords: db.tags || null,
    ogImage: null,
    ogTitle: null,
    ogDescription: null,
    twitterTitle: null,
    twitterDescription: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function categoryFromFrontend(data: Partial<CategoryDTO>): Partial<CategoryDB> {
  const result: Record<string, unknown> = {}

  if (data.name !== undefined) result.baslik = data.name
  if (data.slug !== undefined) result.seo_url = data.slug
  if (data.description !== undefined) result.spot = data.description
  if (data.icon !== undefined) result.ikon = data.icon
  if (data.parentId !== undefined) result.ust_id = data.parentId || '0'
  if (data.isActive !== undefined) result.durum = data.isActive ? '1' : '0'
  if (data.showInHome !== undefined) result.anasayfa = data.showInHome ? '1' : '0'
  if (data.order !== undefined) result.sira = data.order
  if (data.metaTitle !== undefined) result.baslik_seo = data.metaTitle
  if (data.metaDescription !== undefined) result.meta_desc = data.metaDescription
  if (data.metaKeywords !== undefined) result.tags = data.metaKeywords

  return result as Partial<CategoryDB>
}

// ============= BRAND =============

export function brandToFrontend(db: BrandDB): BrandDTO {
  return {
    id: String(db.id),
    name: db.baslik || '',
    slug: db.seo_url || '',
    description: db.spot || null,
    logo: db.gorsel || null,
    logoTitle: null,
    logoAlt: null,
    order: db.sira ?? 0,
    isActive: db.durum === '1',
    metaTitle: db.baslik_seo || null,
    metaDescription: db.meta_desc || null,
    metaKeywords: db.tags || null,
    ogImage: null,
    ogTitle: null,
    ogDescription: null,
    twitterTitle: null,
    twitterDescription: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function brandFromFrontend(data: Partial<BrandDTO>): Partial<BrandDB> {
  const result: Record<string, unknown> = {}

  if (data.name !== undefined) result.baslik = data.name
  if (data.slug !== undefined) result.seo_url = data.slug
  if (data.description !== undefined) result.spot = data.description
  if (data.logo !== undefined) result.gorsel = data.logo
  if (data.isActive !== undefined) result.durum = data.isActive ? '1' : '0'
  if (data.order !== undefined) result.sira = data.order
  if (data.metaTitle !== undefined) result.baslik_seo = data.metaTitle
  if (data.metaDescription !== undefined) result.meta_desc = data.metaDescription
  if (data.metaKeywords !== undefined) result.tags = data.metaKeywords

  return result as Partial<BrandDB>
}

// ============= SUPPLIER =============

export function supplierToFrontend(db: SupplierDB): SupplierDTO {
  return {
    id: String(db.id),
    name: db.name || '',
    contactName: null,
    email: null,
    phone: null,
    address: null,
    taxNumber: null,
    taxOffice: null,
    paymentTerms: null,
    notes: null,
    isActive: db.status === 1,
    discount: db.discount ?? 0,
    euroKur: db.euro_kur ? Number(db.euro_kur) : null,
    dolarKur: db.dolar_kur ? Number(db.dolar_kur) : null,
    sira: db.sira ?? null,
    token: db.token ?? null,
    tokenUpdatedAt: db.token_updated_at ? db.token_updated_at.toISOString() : null,
    username: db.username ?? null,
    password: db.password ?? null,
    loginUrl: db.login_url ?? null,
    createdAt: db.updated_at?.toISOString() || new Date().toISOString(),
    updatedAt: db.updated_at?.toISOString() || new Date().toISOString(),
  }
}

export function supplierFromFrontend(data: Partial<SupplierDTO>): Partial<SupplierDB> {
  const result: Record<string, unknown> = {}

  if (data.name !== undefined) result.name = data.name
  if (data.isActive !== undefined) result.status = data.isActive ? 1 : 0
  if (data.discount !== undefined) result.discount = data.discount
  if (data.euroKur !== undefined) result.euro_kur = data.euroKur
  if (data.dolarKur !== undefined) result.dolar_kur = data.dolarKur
  if (data.sira !== undefined) result.sira = data.sira
  if (data.token !== undefined) result.token = data.token
  if (data.username !== undefined) result.username = data.username
  if (data.password !== undefined) result.password = data.password
  if (data.loginUrl !== undefined) result.login_url = data.loginUrl

  return result as Partial<SupplierDB>
}

// ============= DESI =============

export interface DesiDTO {
  id: string
  name: string
  price: number
}

export function desiToFrontend(db: DesiDB): DesiDTO {
  return {
    id: String(db.id),
    name: db.name || '',
    price: db.price ? Number(db.price) : 0,
  }
}

export function desiFromFrontend(data: Partial<DesiDTO>): Partial<DesiDB> {
  const result: Record<string, unknown> = {}

  if (data.name !== undefined) result.name = data.name
  if (data.price !== undefined) result.price = data.price

  return result as Partial<DesiDB>
}

// ============= SPECIFICATION GROUP =============

export interface SpecGroupDTO {
  id: string
  name: string
  isActive: boolean
  order: number
}

export function specGroupToFrontend(db: SpecGroupDB): SpecGroupDTO {
  return {
    id: String(db.id),
    name: db.baslik || '',
    isActive: db.durum === '1',
    order: db.sira ?? 0,
  }
}

export function specGroupFromFrontend(data: Partial<SpecGroupDTO>): Partial<SpecGroupDB> {
  const result: Record<string, unknown> = {}

  if (data.name !== undefined) result.baslik = data.name
  if (data.isActive !== undefined) result.durum = data.isActive ? '1' : '0'
  if (data.order !== undefined) result.sira = data.order

  return result as Partial<SpecGroupDB>
}

// ============= SPECIFICATION =============

export interface SpecDTO {
  id: string
  name: string
  groupId: string | null
  order: number
}

export function specToFrontend(db: SpecDB): SpecDTO {
  return {
    id: String(db.id),
    name: db.baslik || '',
    groupId: db.grup_id || null,
    order: db.sira ?? 0,
  }
}

export function specFromFrontend(data: Partial<SpecDTO>): Partial<SpecDB> {
  const result: Record<string, unknown> = {}

  if (data.name !== undefined) result.baslik = data.name
  if (data.groupId !== undefined) result.grup_id = data.groupId
  if (data.order !== undefined) result.sira = data.order

  return result as Partial<SpecDB>
}

// ============= PRODUCT =============

function safeParseJson<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback
  try { return JSON.parse(val) } catch { return fallback }
}

export function productToFrontend(db: ProductDB): ProductDTO {
  return {
    id: String(db.id),
    name: db.name,
    supplier: db.supplier || null,
    stockCode: db.stock_code || null,
    brand: db.brand || null,
    barcode: db.barcode || null,
    desi: db.desi ? Number(db.desi) : null,
    categoryId: db.kategori_id ? String(db.kategori_id) : null,
    tedarikciProductId: db.tedarikci_product_id ? String(db.tedarikci_product_id) : null,
    sopyoId: db.sopyo_id ?? null,
    tedarikciFiyat: db.tedarikci_fiyat ? Number(db.tedarikci_fiyat) : null,
    productDiscount: db.product_discount ? Number(db.product_discount) : null,
    bolbolbulFiyat: db.bolbolbul_fiyat ? Number(db.bolbolbul_fiyat) : null,
    sopyoFiyat: db.sopyo_fiyat ? Number(db.sopyo_fiyat) : null,
    n11Fiyat: db.n11_fiyat ? Number(db.n11_fiyat) : null,
    trendyolFiyat: db.trendyol_fiyat ? Number(db.trendyol_fiyat) : null,
    hepsiburadaFiyat: db.hepsiburada_fiyat ? Number(db.hepsiburada_fiyat) : null,
    pazaramaFiyat: db.pazarama_fiyat ? Number(db.pazarama_fiyat) : null,
    toplamStock: db.toplam_stock ?? null,
    bolbolbulStock: db.bolbolbul_stock ?? null,
    sopyoStock: db.sopyo_stock ?? null,
    bizimhesapStock: db.bizimhesap_stock ?? null,
    kdv: db.kdv ?? null,
    eticaret: db.eticaret ?? false,
    sopyo: db.sopyo === 1,
    sendSopyoCheck: db.send_sopyo_check === 1,
    sendEticaretCheck: db.send_eticaret_check === 1,
    isFiyatTercih: db.isFiyatTercih === 1,
    // Aktif kriteri: ya eticaret ya da send_eticaret_check işaretli
    isActive: db.eticaret === true || db.send_eticaret_check === 1,
    metaTitle: db.meta_title || null,
    metaDescription: db.meta_desc || null,
    detayBilgileri: db.detay_bilgileri || null,
    attributes: safeParseJson(db.attributes, []),
    images: safeParseJson(db.images, []),
  }
}

export function productFromFrontend(data: Record<string, unknown>): Partial<ProductDB> {
  const result: Record<string, unknown> = {}

  if (data.name !== undefined) result.name = data.name
  if (data.supplier !== undefined) result.supplier = data.supplier
  if (data.stockCode !== undefined) result.stock_code = data.stockCode
  if (data.brand !== undefined) result.brand = data.brand
  if (data.barcode !== undefined) result.barcode = data.barcode
  if (data.desi !== undefined) result.desi = data.desi
  if (data.categoryId !== undefined) result.kategori_id = data.categoryId ? parseInt(data.categoryId as string) : null
  if (data.tedarikciProductId !== undefined) result.tedarikci_product_id = data.tedarikciProductId ? parseInt(data.tedarikciProductId as string) : null
  if (data.tedarikciFiyat !== undefined) result.tedarikci_fiyat = data.tedarikciFiyat
  if (data.productDiscount !== undefined) result.product_discount = data.productDiscount
  if (data.bolbolbulFiyat !== undefined) result.bolbolbul_fiyat = data.bolbolbulFiyat
  if (data.sopyoFiyat !== undefined) result.sopyo_fiyat = data.sopyoFiyat
  if (data.n11Fiyat !== undefined) result.n11_fiyat = data.n11Fiyat
  if (data.trendyolFiyat !== undefined) result.trendyol_fiyat = data.trendyolFiyat
  if (data.hepsiburadaFiyat !== undefined) result.hepsiburada_fiyat = data.hepsiburadaFiyat
  if (data.pazaramaFiyat !== undefined) result.pazarama_fiyat = data.pazaramaFiyat
  if (data.toplamStock !== undefined) result.toplam_stock = data.toplamStock
  if (data.bolbolbulStock !== undefined) result.bolbolbul_stock = data.bolbolbulStock
  if (data.sopyoStock !== undefined) result.sopyo_stock = data.sopyoStock
  if (data.bizimhesapStock !== undefined) result.bizimhesap_stock = data.bizimhesapStock
  if (data.kdv !== undefined) result.kdv = data.kdv
  if (data.eticaret !== undefined) result.eticaret = data.eticaret
  if (data.sopyo !== undefined) result.sopyo = data.sopyo ? 1 : 0
  if (data.sendSopyoCheck !== undefined) result.send_sopyo_check = data.sendSopyoCheck ? 1 : 0
  if (data.sendEticaretCheck !== undefined) result.send_eticaret_check = data.sendEticaretCheck ? 1 : 0
  if (data.isFiyatTercih !== undefined) result.isFiyatTercih = data.isFiyatTercih ? 1 : 0
  if (data.metaTitle !== undefined) result.meta_title = data.metaTitle
  if (data.metaDescription !== undefined) result.meta_desc = data.metaDescription
  if (data.detayBilgileri !== undefined) result.detay_bilgileri = data.detayBilgileri
  if (data.attributes !== undefined) result.attributes = JSON.stringify(data.attributes)
  if (data.images !== undefined) result.images = JSON.stringify(data.images)

  return result as Partial<ProductDB>
}

// ============= SUPPLIER PRODUCT =============

export interface SupplierProductDTO {
  id: string
  supplierName: string | null
  productTitle: string | null
  productCode: string | null
  netPriceWithVAT: number | null
  productPictures: string | null
  productStockStatus: string | null
  envanterStatus: boolean
  stock: number | null
  brand: string | null
  bizimhesapFiyat: number | null
  bizimhesapStock: number | null
  isFiyatTercih: boolean
  updatedAt: string
}

export function supplierProductToFrontend(db: SupplierProductDB): SupplierProductDTO {
  return {
    id: String(db.id),
    supplierName: db.supplier_name || null,
    productTitle: db.productTitle || null,
    productCode: db.productCode || null,
    netPriceWithVAT: db.netPriceWithVAT ? Number(db.netPriceWithVAT) : null,
    productPictures: db.productPictures || null,
    productStockStatus: db.productStockStatus || null,
    envanterStatus: db.envanter_status === 1,
    stock: db.stock ?? null,
    brand: db.brand || null,
    bizimhesapFiyat: db.bizimhesap_fiyat ? Number(db.bizimhesap_fiyat) : null,
    bizimhesapStock: db.bizimhesap_stock ?? null,
    isFiyatTercih: db.isFiyatTercih === 1,
    updatedAt: db.updated_at.toISOString(),
  }
}

// ============= SUPPLIER CRON =============

export interface SupplierCronDTO {
  id: string
  supplierName: string
  status: 'success' | 'error' | 'warning' | 'pending'
  createdAt: string
  error: string | null
  createdCount: number
  updatedCount: number
  time: string | null
  totalCount: number
  existCount: number
  responseTime: number
  errorCategory: string | null
  productsProcessed: number
}

export function supplierCronToFrontend(db: SupplierCronDB): SupplierCronDTO {
  let status: SupplierCronDTO['status'] = 'pending'
  if (db.status === 1) status = 'success'
  else if (db.status === 0) status = 'error'
  else if (db.status === 2) status = 'warning'

  return {
    id: String(db.id),
    supplierName: db.name || '',
    status,
    createdAt: db.created_at?.toISOString() || new Date().toISOString(),
    error: db.error || null,
    createdCount: db.created_count ?? 0,
    updatedCount: db.updated_count ?? 0,
    time: db.time || null,
    totalCount: db.total_count ?? 0,
    existCount: db.exist_count ?? 0,
    responseTime: db.response_time ? Number(db.response_time) : 0,
    errorCategory: db.error_category || null,
    productsProcessed: db.products_processed ?? 0,
  }
}
