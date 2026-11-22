import { NextRequest } from 'next/server'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'
import { validateFile, saveFile, extractMultipleFiles } from '@/lib/utils/upload'

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const formData = await request.formData()
    const uploadType = (formData.get('uploadType') as string) || 'temp'

    const files = await extractMultipleFiles(formData, 'images')
    if (files.length === 0) {
      return error('Görsel dosyaları bulunamadı. "images" alanı zorunludur.', 400)
    }

    // Tüm dosyaları doğrula
    for (const file of files) {
      const validationError = validateFile(file)
      if (validationError) {
        return error(`${file.name}: ${validationError}`, 400)
      }
    }

    // Tüm dosyaları kaydet
    const savedFiles = await Promise.all(
      files.map((file) => saveFile(file, uploadType))
    )

    return success({
      message: `${savedFiles.length} görsel başarıyla yüklendi`,
      data: savedFiles,
    }, 201)
  } catch (err) {
    console.error('Çoklu görsel yükleme hatası:', err)
    return error('Görseller yüklenirken bir hata oluştu', 500)
  }
}
