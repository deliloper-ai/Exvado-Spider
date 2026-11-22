import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'
import { productToFrontend, productFromFrontend } from '@/lib/utils/transformers'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  const { id } = await context.params

  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
    })

    if (!product) {
      return error('Ürün bulunamadı', 404)
    }

    return success(productToFrontend(product))
  } catch (err) {
    console.error('Ürün getirme hatası:', err)
    return error('Ürün yüklenirken bir hata oluştu', 500)
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  const { id } = await context.params

  try {
    const body = await request.json()
    const dbData = productFromFrontend(body)

    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: dbData as any,
    })

    return success(productToFrontend(product))
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return error('Ürün bulunamadı', 404)
    }
    console.error('Ürün güncelleme hatası:', err)
    return error('Ürün güncellenirken bir hata oluştu', 500)
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  const { id } = await context.params

  try {
    await prisma.product.delete({
      where: { id: parseInt(id) },
    })

    return success({ message: 'Ürün başarıyla silindi' })
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return error('Ürün bulunamadı', 404)
    }
    console.error('Ürün silme hatası:', err)
    return error('Ürün silinirken bir hata oluştu', 500)
  }
}
