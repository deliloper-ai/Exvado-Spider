import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'
import { desiToFrontend, desiFromFrontend } from '@/lib/utils/transformers'

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    // name VARCHAR olduğu için ('1','2','10','20') string sort yanlış sıra verir
    // → numeric cast ile sırala (1, 2, 3, ..., 10, 11, ..., 100)
    const desiList = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, name, price FROM desi ORDER BY CAST(name AS UNSIGNED) ASC, name ASC`
    )

    return success(desiList.map(desiToFrontend))
  } catch (err) {
    console.error('Desi listeleme hatası:', err)
    return error('Desi listesi yüklenirken bir hata oluştu', 500)
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const body = await request.json()

    if (!body.name) {
      return error('Desi adı zorunludur')
    }

    const dbData = desiFromFrontend(body)

    const desi = await prisma.desi.create({
      data: dbData as any,
    })

    return success(desiToFrontend(desi), 201)
  } catch (err) {
    console.error('Desi oluşturma hatası:', err)
    return error('Desi oluşturulurken bir hata oluştu', 500)
  }
}
