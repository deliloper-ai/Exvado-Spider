import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'
import { validateFile, saveFile, extractMultipleFiles } from '@/lib/utils/upload'
import crypto from 'crypto'

interface StoredImage {
  id: string
  productId: string
  imageUrl: string
  altText: string | null
  order: number
  isMain: boolean
  createdAt: string
  updatedAt: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const { productId } = await params

    // Ürünün var olup olmadığını kontrol et
    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId, 10) },
      select: { id: true, images: true },
    })

    if (!product) {
      return error('Ürün bulunamadı', 404)
    }

    const formData = await request.formData()
    const altText = (formData.get('altText') as string) || null

    const files = await extractMultipleFiles(formData, 'images')
    if (files.length === 0) {
      return error('Görsel dosyaları bulunamadı. "images" alanı zorunludur.', 400)
    }

    // Doğrulama
    for (const file of files) {
      const validationError = validateFile(file)
      if (validationError) {
        return error(`${file.name}: ${validationError}`, 400)
      }
    }

    // Mevcut görselleri parse et
    let existingImages: StoredImage[] = []
    if (product.images) {
      try {
        existingImages = JSON.parse(product.images)
      } catch {
        existingImages = []
      }
    }

    // Dosyaları kaydet
    const savedFiles = await Promise.all(
      files.map((file) => saveFile(file, 'product'))
    )

    const now = new Date().toISOString()
    const isFirstBatch = existingImages.length === 0

    // Yeni görselleri ProductImage formatında oluştur
    const newImages: StoredImage[] = savedFiles.map((saved, index) => ({
      id: crypto.randomUUID(),
      productId,
      imageUrl: saved.url,
      altText,
      order: existingImages.length + index,
      isMain: isFirstBatch && index === 0,
      createdAt: now,
      updatedAt: now,
    }))

    // Ürünün images alanını güncelle
    const allImages = [...existingImages, ...newImages]
    await prisma.product.update({
      where: { id: parseInt(productId, 10) },
      data: { images: JSON.stringify(allImages) },
    })

    return success({
      message: `${newImages.length} görsel ürüne başarıyla eklendi`,
      data: newImages,
    }, 201)
  } catch (err) {
    console.error('Ürün görsel ekleme hatası:', err)
    return error('Ürüne görsel eklenirken bir hata oluştu', 500)
  }
}
