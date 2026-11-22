import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'
import { supplierToFrontend, supplierFromFrontend } from '@/lib/utils/transformers'

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { sira: 'asc' },
    })

    return success(suppliers.map(supplierToFrontend))
  } catch (err) {
    console.error('Tedarikçi listeleme hatası:', err)
    return error('Tedarikçiler yüklenirken bir hata oluştu', 500)
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const body = await request.json()

    if (!body.name) {
      return error('Tedarikçi adı zorunludur')
    }

    const dbData = supplierFromFrontend(body)

    const supplier = await prisma.supplier.create({
      data: dbData as any,
    })

    return success(supplierToFrontend(supplier), 201)
  } catch (err) {
    console.error('Tedarikçi oluşturma hatası:', err)
    return error('Tedarikçi oluşturulurken bir hata oluştu', 500)
  }
}
