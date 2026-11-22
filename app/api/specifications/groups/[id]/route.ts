import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'
import { specGroupToFrontend, specGroupFromFrontend } from '@/lib/utils/transformers'

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  const { id } = await context.params

  try {
    const body = await request.json()
    const dbData = specGroupFromFrontend(body)

    const group = await prisma.specificationGroup.update({
      where: { id: parseInt(id) },
      data: dbData as any,
    })

    return success(specGroupToFrontend(group))
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return error('Özellik grubu bulunamadı', 404)
    }
    console.error('Özellik grubu güncelleme hatası:', err)
    return error('Özellik grubu güncellenirken bir hata oluştu', 500)
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  const { id } = await context.params

  try {
    // Alt özellikleri kontrol et
    const specs = await prisma.specification.findMany({
      where: { grup_id: id },
    })

    if (specs.length > 0) {
      return error('Bu grubun altında özellikler bulunmaktadır. Önce özellikleri silin.', 409)
    }

    await prisma.specificationGroup.delete({
      where: { id: parseInt(id) },
    })

    return success({ message: 'Özellik grubu başarıyla silindi' })
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return error('Özellik grubu bulunamadı', 404)
    }
    console.error('Özellik grubu silme hatası:', err)
    return error('Özellik grubu silinirken bir hata oluştu', 500)
  }
}
