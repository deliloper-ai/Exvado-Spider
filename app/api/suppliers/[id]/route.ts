import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'
import { supplierToFrontend, supplierFromFrontend } from '@/lib/utils/transformers'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  const { id } = await context.params

  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: parseInt(id) },
    })

    if (!supplier) {
      return error('Tedarikçi bulunamadı', 404)
    }

    return success(supplierToFrontend(supplier))
  } catch (err) {
    console.error('Tedarikçi getirme hatası:', err)
    return error('Tedarikçi yüklenirken bir hata oluştu', 500)
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  const { id } = await context.params

  try {
    const body = await request.json()
    const dbData = supplierFromFrontend(body)

    const supplier = await prisma.supplier.update({
      where: { id: parseInt(id) },
      data: dbData as any,
    })

    return success(supplierToFrontend(supplier))
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return error('Tedarikçi bulunamadı', 404)
    }
    console.error('Tedarikçi güncelleme hatası:', err)
    return error('Tedarikçi güncellenirken bir hata oluştu', 500)
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  const { id } = await context.params

  try {
    await prisma.supplier.delete({
      where: { id: parseInt(id) },
    })

    return success({ message: 'Tedarikçi başarıyla silindi' })
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return error('Tedarikçi bulunamadı', 404)
    }
    console.error('Tedarikçi silme hatası:', err)
    return error('Tedarikçi silinirken bir hata oluştu', 500)
  }
}
