import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'
import { brandToFrontend, brandFromFrontend } from '@/lib/utils/transformers'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  const { id } = await context.params

  try {
    const brand = await prisma.brand.findUnique({
      where: { id: parseInt(id) },
    })

    if (!brand) {
      return error('Marka bulunamadı', 404)
    }

    return success(brandToFrontend(brand))
  } catch (err) {
    console.error('Marka getirme hatası:', err)
    return error('Marka yüklenirken bir hata oluştu', 500)
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  const { id } = await context.params

  try {
    const body = await request.json()
    const dbData = brandFromFrontend(body)

    const brand = await prisma.brand.update({
      where: { id: parseInt(id) },
      data: dbData as any,
    })

    return success(brandToFrontend(brand))
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return error('Marka bulunamadı', 404)
    }
    console.error('Marka güncelleme hatası:', err)
    return error('Marka güncellenirken bir hata oluştu', 500)
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  const { id } = await context.params

  try {
    await prisma.brand.delete({
      where: { id: parseInt(id) },
    })

    return success({ message: 'Marka başarıyla silindi' })
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return error('Marka bulunamadı', 404)
    }
    console.error('Marka silme hatası:', err)
    return error('Marka silinirken bir hata oluştu', 500)
  }
}
