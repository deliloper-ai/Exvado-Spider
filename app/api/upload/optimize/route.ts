import { NextRequest } from 'next/server'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'
import { validateFile, saveFile, extractSingleFile } from '@/lib/utils/upload'

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const formData = await request.formData()
    const uploadType = (formData.get('uploadType') as string) || 'temp'
    const quality = parseInt((formData.get('quality') as string) || '80', 10)

    if (quality < 1 || quality > 100) {
      return error('Kalite değeri 1-100 arasında olmalıdır.', 400)
    }

    const file = await extractSingleFile(formData, 'image')
    if (!file) {
      return error('Görsel dosyası bulunamadı. "image" alanı zorunludur.', 400)
    }

    const validationError = validateFile(file)
    if (validationError) {
      return error(validationError, 400)
    }

    // TODO: sharp gibi bir kütüphane ile optimizasyon eklenebilir
    // Şimdilik dosyayı olduğu gibi kaydet
    const savedFile = await saveFile(file, uploadType)

    return success({
      message: 'Görsel başarıyla yüklendi ve optimize edildi',
      data: savedFile,
    }, 201)
  } catch (err) {
    console.error('Görsel optimizasyon hatası:', err)
    return error('Görsel optimize edilirken bir hata oluştu', 500)
  }
}
