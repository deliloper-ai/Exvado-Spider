import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { paginated, error } from '@/lib/utils/response'
import { supplierProductToFrontend } from '@/lib/utils/transformers'

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')
    const supplier = searchParams.get('supplier')
    const envanterStatus = searchParams.get('envanterStatus')
    const stockStatus = searchParams.get('stockStatus')
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { productTitle: { contains: search } },
        { productCode: { contains: search } },
        { brand: { contains: search } },
      ]
    }

    if (supplier && supplier !== 'all') {
      where.supplier_name = supplier
    }

    if (envanterStatus === '0') {
      where.envanter_status = 0
    } else if (envanterStatus === '1') {
      where.envanter_status = 1
    }

    if (stockStatus === 'in_stock') {
      where.stock = { gt: 0 }
    } else if (stockStatus === 'out_of_stock') {
      where.OR = [
        { stock: 0 },
        { stock: null },
        { productStockStatus: 'Yok' },
      ]
    }

    const [products, total] = await Promise.all([
      prisma.supplierProduct.findMany({
        where: where as any,
        orderBy: { id: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.supplierProduct.count({ where: where as any }),
    ])

    return paginated(
      products.map(supplierProductToFrontend),
      { page, limit, total }
    )
  } catch (err) {
    console.error('Tedarikçi ürün listeleme hatası:', err)
    return error('Tedarikçi ürünleri yüklenirken bir hata oluştu', 500)
  }
}
