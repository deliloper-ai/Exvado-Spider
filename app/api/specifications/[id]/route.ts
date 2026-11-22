import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'
import { specToFrontend, specFromFrontend } from '@/lib/utils/transformers'

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  const { id } = await context.params

  try {
    const body = await request.json()
    const dbData = specFromFrontend(body)

    const spec = await prisma.specification.update({
      where: { id: parseInt(id) },
      data: dbData as any,
    })

    return success(specToFrontend(spec))
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return error('Özellik bulunamadı', 404)
    }
    console.error('Özellik güncelleme hatası:', err)
    return error('Özellik güncellenirken bir hata oluştu', 500)
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  const { id } = await context.params

  try {
    await prisma.specification.delete({
      where: { id: parseInt(id) },
    })

    return success({ message: 'Özellik başarıyla silindi' })
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return error('Özellik bulunamadı', 404)
    }
    console.error('Özellik silme hatası:', err)
    return error('Özellik silinirken bir hata oluştu', 500)
  }
}
