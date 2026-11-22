import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, paginated, error } from '@/lib/utils/response'
import { supplierCronToFrontend } from '@/lib/utils/transformers'

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const supplier = searchParams.get('supplier')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    if (status) {
      const statusMap: Record<string, number> = {
        success: 1,
        error: 0,
        warning: 2,
      }
      if (statusMap[status] !== undefined) {
        where.status = statusMap[status]
      }
    }

    if (supplier && supplier !== 'all') {
      where.name = supplier
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { error: { contains: search } },
      ]
    }

    const [logs, total] = await Promise.all([
      prisma.supplierCron.findMany({
        where: where as any,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.supplierCron.count({ where: where as any }),
    ])

    return paginated(
      logs.map(supplierCronToFrontend),
      { page, limit, total }
    )
  } catch (err) {
    console.error('Tedarikçi log listeleme hatası:', err)
    return error('Loglar yüklenirken bir hata oluştu', 500)
  }
}
