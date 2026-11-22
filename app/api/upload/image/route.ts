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

    const savedFile = await saveFile(file, uploadType)

    return success({
      message: 'Görsel başarıyla yüklendi',
      data: savedFile,
    }, 201)
  } catch (err) {
    console.error('Görsel yükleme hatası:', err)
    return error('Görsel yüklenirken bir hata oluştu', 500)
  }
}
