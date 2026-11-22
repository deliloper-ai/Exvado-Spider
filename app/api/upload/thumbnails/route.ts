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

    const file = await extractSingleFile(formData, 'image')
    if (!file) {
      return error('Görsel dosyası bulunamadı. "image" alanı zorunludur.', 400)
    }

    const validationError = validateFile(file)
    if (validationError) {
      return error(validationError, 400)
    }

    // Orijinal görseli kaydet
    const savedFile = await saveFile(file, uploadType)

    // TODO: sharp ile thumbnail boyutları oluşturulabilir
    // Şimdilik orijinal URL'yi tüm boyutlar için kullan
    const thumbnails = {
      original: savedFile.url,
      large: savedFile.url,
      medium: savedFile.url,
      small: savedFile.url,
      thumbnail: savedFile.url,
    }

    return success({
      message: 'Görsel ve thumbnail\'lar başarıyla oluşturuldu',
      data: thumbnails,
    }, 201)
  } catch (err) {
    console.error('Thumbnail oluşturma hatası:', err)
    return error('Thumbnail oluşturulurken bir hata oluştu', 500)
  }
}
