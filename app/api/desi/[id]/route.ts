import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'
import { desiToFrontend, desiFromFrontend } from '@/lib/utils/transformers'

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  const { id } = await context.params

  try {
    const body = await request.json()
    const dbData = desiFromFrontend(body)

    const desi = await prisma.desi.update({
      where: { id: parseInt(id) },
      data: dbData as any,
    })

    return success(desiToFrontend(desi))
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return error('Desi bulunamadı', 404)
    }
    console.error('Desi güncelleme hatası:', err)
    return error('Desi güncellenirken bir hata oluştu', 500)
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  const { id } = await context.params

  try {
    await prisma.desi.delete({
      where: { id: parseInt(id) },
    })

    return success({ message: 'Desi başarıyla silindi' })
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return error('Desi bulunamadı', 404)
    }
    console.error('Desi silme hatası:', err)
    return error('Desi silinirken bir hata oluştu', 500)
  }
}
