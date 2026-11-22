import { NextRequest } from 'next/server'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'
import { calculateProductPrice } from '@/lib/utils/pricing'

/**
 * Tek ürün için fiyat hesaplama
 * Frontend'den desi/kategori değiştiğinde çağrılır
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const body = await request.json()

    const { tedarikciFiyat, categoryId, supplierDiscount, desiPrice } = body

    if (tedarikciFiyat === undefined || !categoryId) {
      return error('tedarikciFiyat ve categoryId zorunludur')
    }

    const result = await calculateProductPrice({
      basePrice: parseFloat(tedarikciFiyat),
      categoryId: parseInt(categoryId),
      supplierDiscount: parseFloat(supplierDiscount || '0'),
      desiPrice: parseFloat(desiPrice || '0'),
    })

    return success(result)
  } catch (err) {
    console.error('Fiyat hesaplama hatası:', err)
    return error('Fiyat hesaplanırken bir hata oluştu', 500)
  }
}
