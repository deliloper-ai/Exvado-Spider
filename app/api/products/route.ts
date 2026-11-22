import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, paginated, error } from '@/lib/utils/response'
import { productToFrontend, productFromFrontend } from '@/lib/utils/transformers'

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')
    const supplier = searchParams.get('supplier')
    const categoryId = searchParams.get('categoryId')
    const stockStatus = searchParams.get('stockStatus')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const sortBy = searchParams.get('sortBy') || 'id'
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { stock_code: { contains: search } },
        { barcode: { contains: search } },
        { brand: { contains: search } },
      ]
    }

    if (supplier && supplier !== 'all') {
      where.supplier = supplier
    }

    if (categoryId) {
      where.kategori_id = parseInt(categoryId)
    }

    if (stockStatus === 'in_stock') {
      where.toplam_stock = { gt: 0 }
    } else if (stockStatus === 'out_of_stock') {
      where.toplam_stock = { lte: 0 }
    }

    if (minPrice) {
      where.tedarikci_fiyat = { ...(where.tedarikci_fiyat as object || {}), gte: parseFloat(minPrice) }
    }
    if (maxPrice) {
      where.tedarikci_fiyat = { ...(where.tedarikci_fiyat as object || {}), lte: parseFloat(maxPrice) }
    }

    const sortFieldMap: Record<string, string> = {
      name: 'name',
      tedarikciFiyat: 'tedarikci_fiyat',
      toplamStock: 'toplam_stock',
      id: 'id',
    }
    const dbSortField = sortFieldMap[sortBy] || 'id'

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: where as any,
        orderBy: { [dbSortField]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where: where as any }),
    ])

    return paginated(
      products.map(productToFrontend),
      { page, limit, total }
    )
  } catch (err) {
    console.error('Ürün listeleme hatası:', err)
    return error('Ürünler yüklenirken bir hata oluştu', 500)
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const body = await request.json()

    if (!body.name) {
      return error('Ürün adı zorunludur')
    }

    const dbData = productFromFrontend(body)

    const product = await prisma.product.create({
      data: dbData as any,
    })

    // tedarikci_product_id varsa, tedarikci_urunler'de envanter_status güncelle
    if (body.tedarikciProductId) {
      await prisma.supplierProduct.update({
        where: { id: parseInt(body.tedarikciProductId) },
        data: { envanter_status: 1 },
      }).catch(() => {}) // ürün bulunamazsa sessizce devam et
    }

    return success(productToFrontend(product), 201)
  } catch (err) {
    console.error('Ürün oluşturma hatası:', err)
    return error('Ürün oluşturulurken bir hata oluştu', 500)
  }
}
