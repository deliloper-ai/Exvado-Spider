/**
 * XML Generator — Envanter ürünlerinden tum_urunler.xml üretir.
 *
 * Eski projedeki Ticimax UrunService.generateUrunXml çıktısıyla BİREBİR aynı
 * format. xmlbuilder2 + aynı sanitize/kategori-tree/isFiyatTercih mantığı.
 *
 * Performans: tüm lookup tabloları tek seferde belleğe alınır (N+1 yok).
 */

import fs from 'fs'
import path from 'path'
import { create } from 'xmlbuilder2'
import { prisma } from '../../lib/db/prisma'
import { logger } from '../helpers/logger'

const OUTPUT_DIR = path.join(process.cwd(), 'public')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'tum_urunler.xml')
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || 'https://panel.bolbolbul.com').replace(/\/$/, '')

/**
 * Relative görsel yolunu (örn /uploads/products/xxx.png) tam URL'e çevirir.
 * Zaten http(s):// ile başlıyorsa olduğu gibi döner.
 */
function absoluteImageUrl(src: string): string {
  if (!src) return src
  if (/^https?:\/\//i.test(src)) return src
  if (src.startsWith('/')) return PUBLIC_BASE_URL + src
  return `${PUBLIC_BASE_URL}/${src}`
}

interface GenerateResult {
  success: boolean
  totalProducts: number
  generatedProducts: number
  failedProducts: number
  fileSize: number
  filePath: string
  durationMs: number
  errors: { sku: string; name: string; error: string }[]
}

function sanitizeText(input: any): string {
  if (input == null) return ''
  return String(input)
    .replace(/&nbsp;/g, ' ')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;')
}

function buildKategoriTree(
  startId: number,
  startBaslik: string,
  catById: Map<number, { id: number; baslik: string | null; ust_id: string | null }>
): string {
  let current = catById.get(startId)
  if (!current) return startBaslik
  let tree = startBaslik

  while (current?.ust_id && current.ust_id !== '0') {
    const ustId = parseInt(current.ust_id)
    if (isNaN(ustId)) break
    const parent = catById.get(ustId)
    if (!parent) break
    tree = `${parent.baslik}/${tree}`
    current = parent
  }
  return tree
}

async function generateUrunArray() {
  // Filter: envanterdeki aktif ürünler
  const urunList = await prisma.product.findMany({
    where: {
      OR: [
        { eticaret: true },
        { send_eticaret_check: 1 },
      ],
    },
  })
  logger.info(`[XML] ${urunList.length} ham ürün çekildi, lookup tabloları yükleniyor...`)

  // Lookup tabloları tek seferde belleğe
  const [tedarikciler, categories, ozellikGroups, ozellikValues] = await Promise.all([
    prisma.supplier.findMany(),
    prisma.category.findMany({ select: { id: true, baslik: true, ust_id: true } }),
    prisma.specificationGroup.findMany({ select: { id: true, baslik: true } }),
    prisma.specification.findMany({ select: { id: true, baslik: true } }),
  ])

  const tedarikciObj: Record<string, { discount: number | null }> = {}
  for (const t of tedarikciler) {
    if (t.name) tedarikciObj[t.name] = { discount: t.discount as any }
  }

  const catById = new Map<number, { id: number; baslik: string | null; ust_id: string | null }>()
  for (const c of categories) catById.set(c.id, c)

  const grupByBaslik = new Map<string, number>()
  for (const g of ozellikGroups) if (g.baslik) grupByBaslik.set(g.baslik, g.id)

  const degerByBaslik = new Map<string, number>()
  for (const v of ozellikValues) if (v.baslik) degerByBaslik.set(v.baslik, v.id)

  // isFiyatTercih=1 ürünler için bizimhesap fiyatlarını batch çek
  const fiyatTercihStockCodes = urunList
    .filter(p => p.isFiyatTercih === 1 && p.stock_code)
    .map(p => p.stock_code as string)

  const bizimhesapMap = new Map<string, { fiyat: number | null; stock: number | null }>()
  if (fiyatTercihStockCodes.length > 0) {
    const sps = await prisma.supplierProduct.findMany({
      where: { productCode: { in: fiyatTercihStockCodes } },
      select: { productCode: true, bizimhesap_fiyat: true, bizimhesap_stock: true },
    })
    for (const sp of sps) {
      if (sp.productCode) {
        bizimhesapMap.set(sp.productCode, {
          fiyat: sp.bizimhesap_fiyat as any,
          stock: sp.bizimhesap_stock,
        })
      }
    }
  }

  logger.info(
    `[XML] Lookup hazır — Kategori: ${categories.length}, Tedarikçi: ${tedarikciler.length}, ` +
    `OzellikGrup: ${ozellikGroups.length}, OzellikDeger: ${ozellikValues.length}, ` +
    `BizimHesap: ${bizimhesapMap.size}`
  )

  const products: any[] = []
  let processed = 0

  for (const element of urunList) {
    processed++
    if (processed % 1000 === 0) {
      logger.info(`[XML] İşleniyor: ${processed}/${urunList.length}`)
    }

    if (element.images == null || !element.bolbolbul_fiyat) continue

    let images: string[] = []
    try { images = JSON.parse(element.images) } catch { continue }
    if (!Array.isArray(images) || images.length === 0) continue
    // Relative path'leri full URL'e çevir (sunucumuzdaki upload'lar /uploads/... formatında)
    images = images.map(absoluteImageUrl)

    if (!element.kategori_id) continue
    const kategoriDetay = catById.get(element.kategori_id)
    if (!kategoriDetay) {
      logger.warn(`hatali ürün id: ${element.id}`)
      continue
    }

    const katTree = buildKategoriTree(element.kategori_id, kategoriDetay.baslik || '', catById)

    // TeknikDetaylar
    // İki format desteklenir:
    //   Eski: { Name: grup_adı, Value: değer }
    //   Yeni: { Group: grup_adı, Name: değer, Value: "" }  (UI'daki spec seçimi)
    const teknikDetayArr: any[] = []
    let attr: any[] = []
    try { attr = JSON.parse(element.attributes || '[]') } catch { attr = [] }

    for (const a of attr) {
      const hasGroup = typeof a.Group === 'string' && a.Group.trim().length > 0
      const grupBaslik = hasGroup ? a.Group.trim() : String(a.Name || '').trim()
      const degerBaslik = hasGroup
        ? String(a.Name || '').trim()           // yeni format
        : String(a.Value || '').trim()           // eski format
      if (!grupBaslik || !degerBaslik) continue

      const ozellikId = grupByBaslik.get(grupBaslik)
      const degerId = degerByBaslik.get(degerBaslik)
      // DB'de tanım yoksa bile string'lerle bas; ID boş kalır
      teknikDetayArr.push({
        OzellikID: ozellikId || '',
        OzellikTanim: grupBaslik,
        DegerId: degerId || '',
        DegerTanim: degerBaslik,
      })
    }

    const product: any = {
      id: element.id,
      UrunAdi: element.name,
      OnYazi: element.meta_title,
      Aciklama: sanitizeText(element.detay_bilgileri),
      Marka: element.brand,
      SatisBirimi: 'Adet',
      Kategori: kategoriDetay.baslik || '',
      KategoriTree: katTree,
      UrunUrl: images[0],
      Resimler: images,
      SeoTitle: element.meta_title || '',
      marketplace: element.send_sopyo_check,
      desi: parseInt(String(element.desi ?? 0)),
      SeoDescription: element.meta_desc || '',
      UrunSecenek: [
        {
          VaryasyonID: 1,
          gtin: element.barcode,
          StokKodu: element.stock_code,
          StokAdedi: element.send_eticaret_check === 0 ? 0 : (element.bolbolbul_stock ?? 0),
          KdvOrani: element.kdv ?? 20,
          AlisFiyati: parseFloat(String(element.tedarikci_fiyat ?? 0)),
          SatisFiyati: parseFloat(String(element.bolbolbul_fiyat ?? 0)),
          UyeTipiFiyat1: element.send_sopyo_check === 0 ? 0 : parseFloat(String(element.trendyol_fiyat ?? 0)),
          UyeTipiFiyat2: element.send_sopyo_check === 0 ? 0 : parseFloat(String(element.n11_fiyat ?? 0)),
          UyeTipiFiyat3: element.send_sopyo_check === 0 ? 0 : parseFloat(String(element.pazarama_fiyat ?? 0)),
          UyeTipiFiyat4: element.send_sopyo_check === 0 ? 0 : parseFloat(String(element.hepsiburada_fiyat ?? 0)),
          ParaBirimi: 'TRY',
        },
      ],
      TeknikDetaylar: teknikDetayArr,
    }

    if (element.isFiyatTercih) {
      const bh = element.stock_code ? bizimhesapMap.get(element.stock_code) : null
      if (bh) {
        product.UrunSecenek[0].AlisFiyati = parseFloat(String(bh.fiyat ?? 0))
        product.UrunSecenek[0].StokAdedi = bh.stock ?? 0
      }
    } else {
      const supplier = element.supplier ? tedarikciObj[element.supplier] : null
      const discount = supplier?.discount ? parseFloat(String(supplier.discount)) : 0
      const tedFiyat = parseFloat(String(element.tedarikci_fiyat ?? 0))
      product.UrunSecenek[0].AlisFiyati = tedFiyat - (discount * tedFiyat / 100)
    }

    products.push(product)
  }

  logger.info(`[XML] ${products.length} ürün XML için hazırlandı (${urunList.length - products.length} atlandı)`)
  return products
}

function createXML(products: any[]): string {
  const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('Root')
  const urunler = root.ele('Urunler')

  products.forEach((product) => {
    const urun = urunler.ele('Urun')
    urun.ele('UrunKartiID').txt(product.id.toString()).up()
    urun.ele('UrunAdi').txt(product.UrunAdi).up()
    urun.ele('OnYazi').txt(`<![CDATA[]]>`).up()
    urun.ele('Aciklama').txt(`<![CDATA[${product.Aciklama}]]>`).up()
    urun.ele('Marka').txt(product.Marka).up()
    urun.ele('SatisBirimi').txt(product.SatisBirimi).up()
    urun.ele('Kategori').txt(product.Kategori).up()
    urun.ele('KategoriTree').txt(product.KategoriTree).up()
    urun.ele('UrunUrl').txt(product.UrunUrl).up()
    urun.ele('Desi').txt(product.desi.toString()).up()
    urun.ele('Marketplace').txt(product.marketplace.toString()).up()
    urun.ele('SeoTitle').txt(product.SeoTitle).up()
    urun.ele('SeoDescription').txt(product.SeoDescription).up()

    const images = urun.ele('Resimler')
    product.Resimler.forEach((resim: string) => {
      images.ele('Resim').txt(resim).up()
    })
    images.up()

    const options = urun.ele('UrunSecenek')
    product.UrunSecenek.forEach((option: any) => {
      const secenek = options.ele('Secenek')
      secenek.ele('gtin').txt(option.gtin?.toString() ?? '').up()
      secenek.ele('VaryasyonID').txt(option.VaryasyonID.toString()).up()
      secenek.ele('StokKodu').txt(option.StokKodu ?? '').up()
      secenek.ele('StokAdedi').txt(option.StokAdedi.toString()).up()
      secenek.ele('KdvOrani').txt(option.KdvOrani.toString()).up()
      secenek.ele('AlisFiyati').txt(option.AlisFiyati.toFixed(2)).up()
      secenek.ele('SatisFiyati').txt(option.SatisFiyati.toFixed(2)).up()
      secenek.ele('UyeTipiFiyat1').txt(option.UyeTipiFiyat1.toFixed(2)).up()
      secenek.ele('UyeTipiFiyat2').txt(option.UyeTipiFiyat2.toFixed(2)).up()
      secenek.ele('UyeTipiFiyat3').txt(option.UyeTipiFiyat3.toFixed(2)).up()
      secenek.ele('UyeTipiFiyat4').txt(option.UyeTipiFiyat4.toFixed(2)).up()
      secenek.ele('ParaBirimi').txt(option.ParaBirimi).up()
      secenek.up()
    })
    options.up()

    const details = urun.ele('TeknikDetaylar')
    product.TeknikDetaylar.forEach((detail: any) => {
      const tech = details.ele('TeknikDetay')
      tech.ele('OzellikID').txt(String(detail.OzellikID ?? '')).up()
      tech.ele('OzellikTanim').txt(detail.OzellikTanim || '').up()
      tech.ele('DegerId').txt(String(detail.DegerId ?? '')).up()
      tech.ele('DegerTanim').txt(detail.DegerTanim || '').up()
      tech.up()
    })
    details.up()
  })

  return root.end({ prettyPrint: true })
}

export async function generateProductsXml(): Promise<GenerateResult> {
  const start = Date.now()
  logger.info('========== XML Generator başladı ==========')

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const errors: { sku: string; name: string; error: string }[] = []

  const urunList = await generateUrunArray()
  logger.info(`[XML] XML serileştirme başlıyor (${urunList.length} ürün)...`)

  const xmlContent = createXML(urunList)
  fs.writeFileSync(OUTPUT_FILE, xmlContent, 'utf-8')
  const stat = fs.statSync(OUTPUT_FILE)
  const durationMs = Date.now() - start

  await prisma.supplierCron.create({
    data: {
      name: 'XML Generator',
      status: 1,
      created_count: 0,
      updated_count: 0,
      total_count: urunList.length,
      exist_count: 0,
      time: String(Math.round(durationMs / 1000)),
      response_time: durationMs / 1000,
      products_processed: urunList.length,
    } as any,
  })

  logger.info(
    `========== XML TAMAMLANDI ==========\n` +
    `  Süre        : ${(durationMs / 1000).toFixed(1)}s\n` +
    `  Toplam      : ${urunList.length}\n` +
    `  Boyut       : ${(stat.size / 1024 / 1024).toFixed(2)} MB\n` +
    `  Dosya       : ${OUTPUT_FILE}`
  )

  return {
    success: true,
    totalProducts: urunList.length,
    generatedProducts: urunList.length,
    failedProducts: errors.length,
    fileSize: stat.size,
    filePath: OUTPUT_FILE,
    durationMs,
    errors,
  }
}

const __isXmlEntry = !!process.argv[1]?.match(/xml-generator[\/\\]index\.(js|ts)$/)
if (__isXmlEntry) {
  ;(async () => {
    try {
      const result = await generateProductsXml()
      process.exit(result.success ? 0 : 1)
    } catch (err: any) {
      logger.error(`XML hatası: ${err.message}`)
      process.exit(1)
    }
  })()
}
