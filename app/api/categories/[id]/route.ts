import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'
import { categoryToFrontend, categoryFromFrontend } from '@/lib/utils/transformers'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  const { id } = await context.params

  try {
    const category = await prisma.category.findUnique({
      where: { id: parseInt(id) },
    })

    if (!category) {
      return error('Kategori bulunamadı', 404)
    }

    return success(categoryToFrontend(category))
  } catch (err) {
    console.error('Kategori getirme hatası:', err)
    return error('Kategori yüklenirken bir hata oluştu', 500)
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  const { id } = await context.params

  try {
    const body = await request.json()
    const dbData = categoryFromFrontend(body)

    const category = await prisma.category.update({
      where: { id: parseInt(id) },
      data: dbData as any,
    })

    return success(categoryToFrontend(category))
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return error('Kategori bulunamadı', 404)
    }
    console.error('Kategori güncelleme hatası:', err)
    return error('Kategori güncellenirken bir hata oluştu', 500)
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  const { id } = await context.params

  try {
    const children = await prisma.category.findMany({
      where: { ust_id: id },
    })

    if (children.length > 0) {
      return error('Bu kategorinin alt kategorileri bulunmaktadır. Önce alt kategorileri silin.', 409)
    }

    await prisma.category.delete({
      where: { id: parseInt(id) },
    })

    return success({ message: 'Kategori başarıyla silindi' })
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return error('Kategori bulunamadı', 404)
    }
    console.error('Kategori silme hatası:', err)
    return error('Kategori silinirken bir hata oluştu', 500)
  }
}
