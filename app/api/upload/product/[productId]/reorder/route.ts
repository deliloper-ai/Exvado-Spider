import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'

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

interface ReorderItem {
  id: string
  order: number
  isMain?: boolean
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const { productId } = await params
    const body = await request.json()

    if (!body.images || !Array.isArray(body.images)) {
      return error('Görsel sıralama verisi geçersiz. "images" dizisi zorunludur.', 400)
    }

    const reorderItems: ReorderItem[] = body.images

    // Ürünü bul
    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId, 10) },
      select: { id: true, images: true },
    })

    if (!product) {
      return error('Ürün bulunamadı', 404)
    }

    // Mevcut görselleri parse et
    let existingImages: StoredImage[] = []
    if (product.images) {
      try {
        existingImages = JSON.parse(product.images)
      } catch {
        return error('Mevcut görsel verileri okunamadı', 500)
      }
    }

    // Sıralama uygula
    const now = new Date().toISOString()
    const updatedImages = existingImages.map((img) => {
      const reorderItem = reorderItems.find((item) => item.id === img.id)
      if (reorderItem) {
        return {
          ...img,
          order: reorderItem.order,
          isMain: reorderItem.isMain !== undefined ? reorderItem.isMain : img.isMain,
          updatedAt: now,
        }
      }
      return img
    })

    // Sıralama alanına göre sort et
    updatedImages.sort((a, b) => a.order - b.order)

    // Kaydet
    await prisma.product.update({
      where: { id: parseInt(productId, 10) },
      data: { images: JSON.stringify(updatedImages) },
    })

    return success({
      message: 'Görsel sıralaması başarıyla güncellendi',
      data: updatedImages,
    })
  } catch (err) {
    console.error('Görsel sıralama hatası:', err)
    return error('Görsel sıralaması güncellenirken bir hata oluştu', 500)
  }
}
