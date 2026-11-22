import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'
import { specGroupToFrontend } from '@/lib/utils/transformers'

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const body = await request.json()

    if (!body.name) {
      return error('Grup adı zorunludur')
    }

    const group = await prisma.specificationGroup.create({
      data: {
        baslik: body.name,
        durum: body.isActive !== false ? '1' : '0',
        sira: body.order ?? 0,
      },
    })

    return success(specGroupToFrontend(group), 201)
  } catch (err) {
    console.error('Özellik grubu oluşturma hatası:', err)
    return error('Özellik grubu oluşturulurken bir hata oluştu', 500)
  }
}
