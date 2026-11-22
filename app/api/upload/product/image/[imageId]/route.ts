import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'
import { unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const { imageId } = await params

    // images alanında bu ID'yi içeren ürünü bul
    // Tüm ürünlerde arama yap (images JSON text olarak saklanıyor)
    const products = await prisma.product.findMany({
      where: {
        images: { contains: imageId },
      },
      select: { id: true, images: true },
    })

    let found = false

    for (const product of products) {
      if (!product.images) continue

      let images: StoredImage[]
      try {
        images = JSON.parse(product.images)
      } catch {
        continue
      }

      const imageIndex = images.findIndex((img) => img.id === imageId)
      if (imageIndex === -1) continue

      found = true
      const deletedImage = images[imageIndex]

      // Dosyayı diskten sil
      if (deletedImage.imageUrl) {
        const filePath = path.join(process.cwd(), 'public', deletedImage.imageUrl)
        if (existsSync(filePath)) {
          try {
            await unlink(filePath)
          } catch (fsErr) {
            console.error('Dosya silme hatası:', fsErr)
            // Dosya silinemese de devam et
          }
        }
      }

      // Görseli listeden kaldır
      images.splice(imageIndex, 1)

      // Silinen görsel ana görsel ise ve başka görseller varsa, ilkini ana yap
      if (deletedImage.isMain && images.length > 0) {
        images[0].isMain = true
        images[0].updatedAt = new Date().toISOString()
      }

      // Sıralamayı yeniden düzenle
      images.forEach((img, idx) => {
        img.order = idx
      })

      // Kaydet
      await prisma.product.update({
        where: { id: product.id },
        data: { images: JSON.stringify(images) },
      })

      break
    }

    if (!found) {
      return error('Görsel bulunamadı', 404)
    }

    return success({
      message: 'Görsel başarıyla silindi',
    })
  } catch (err) {
    console.error('Görsel silme hatası:', err)
    return error('Görsel silinirken bir hata oluştu', 500)
  }
}
