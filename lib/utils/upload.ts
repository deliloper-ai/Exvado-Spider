import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'

const ALLOWED_MIMETYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export interface SavedFile {
  filename: string
  originalName: string
  mimetype: string
  size: number
  path: string
  url: string
}

/**
 * Benzersiz dosya adı oluştur: timestamp + random string + extension
 */
function generateUniqueFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase()
  const timestamp = Date.now()
  const random = crypto.randomBytes(8).toString('hex')
  return `${timestamp}-${random}${ext}`
}

/**
 * Upload tipine göre alt dizin belirle
 */
function getUploadSubdir(uploadType: string): string {
  switch (uploadType) {
    case 'product':
      return 'products'
    case 'brand':
      return 'brands'
    case 'category':
      return 'categories'
    default:
      return 'temp'
  }
}

/**
 * Tek bir File nesnesini doğrula
 */
export function validateFile(file: File): string | null {
  if (!ALLOWED_MIMETYPES.includes(file.type)) {
    return `Desteklenmeyen dosya formatı: ${file.type}. Sadece JPG, PNG, WebP ve GIF formatları kabul edilir.`
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
    return `Dosya boyutu çok büyük: ${sizeMB}MB. Maksimum dosya boyutu 5MB olabilir.`
  }

  return null
}

/**
 * Tek bir dosyayı diske kaydet ve bilgilerini döndür
 */
export async function saveFile(
  file: File,
  uploadType: string = 'temp'
): Promise<SavedFile> {
  const subdir = getUploadSubdir(uploadType)
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', subdir)

  // Dizin yoksa oluştur
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true })
  }

  const filename = generateUniqueFilename(file.name)
  const filePath = path.join(uploadDir, filename)

  // Dosyayı yaz
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filePath, buffer)

  const relativePath = `/uploads/${subdir}/${filename}`

  return {
    filename,
    originalName: file.name,
    mimetype: file.type,
    size: file.size,
    path: relativePath,
    url: relativePath,
  }
}

/**
 * FormData'dan tek bir dosya çıkar (field name: 'image')
 */
export async function extractSingleFile(formData: FormData, fieldName: string = 'image'): Promise<File | null> {
  const file = formData.get(fieldName)
  if (!file || !(file instanceof File)) {
    return null
  }
  return file
}

/**
 * FormData'dan birden fazla dosya çıkar (field name: 'images')
 */
export async function extractMultipleFiles(formData: FormData, fieldName: string = 'images'): Promise<File[]> {
  const files: File[] = []
  const entries = formData.getAll(fieldName)

  for (const entry of entries) {
    if (entry instanceof File) {
      files.push(entry)
    }
  }

  return files
}
