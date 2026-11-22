import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'
import { categoryToFrontend } from '@/lib/utils/transformers'
import type { Category as CategoryDTO, CategoryTree } from '@/lib/api/types'

function buildTree(categories: CategoryDTO[]): CategoryTree[] {
  const map = new Map<string, CategoryTree>()
  const roots: CategoryTree[] = []

  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] })
  }

  for (const cat of categories) {
    const node = map.get(cat.id)!
    if (cat.parentId && map.has(cat.parentId)) {
      map.get(cat.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const categories = await prisma.category.findMany({
      orderBy: { sira: 'asc' },
    })

    const frontendCategories = categories.map(categoryToFrontend)
    const tree = buildTree(frontendCategories)

    return success(tree)
  } catch (err) {
    console.error('Kategori ağacı hatası:', err)
    return error('Kategori ağacı yüklenirken bir hata oluştu', 500)
  }
}
