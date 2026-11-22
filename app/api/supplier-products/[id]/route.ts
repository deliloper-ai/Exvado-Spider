import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'
import { supplierProductToFrontend } from '@/lib/utils/transformers'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/supplier-products/[id]
 * Tek bir tedarikçi ürünün detayı (envantere eklerken prefill için)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  const { id } = await context.params

  try {
    const product = await prisma.supplierProduct.findUnique({
      where: { id: parseInt(id) },
    })

    if (!product) {
      return error('Tedarikçi ürünü bulunamadı', 404)
    }

    return success(supplierProductToFrontend(product))
  } catch (err) {
    console.error('Tedarikçi ürün getirme hatası:', err)
    return error('Tedarikçi ürünü yüklenemedi', 500)
  }
}
