import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'
import { specGroupToFrontend, specToFrontend } from '@/lib/utils/transformers'

/**
 * GET /api/specifications
 *
 * Modlar:
 *   - Eski (param yok)         : tüm grup tree dizisi döner (geriye dönük uyum)
 *   - paginated (page/limit)   : { items, total, page, limit } döner
 *   - search (search query)    : grup veya spec adına eşleşenleri tree formatta paginate eder
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const { searchParams } = new URL(request.url)
    const search = (searchParams.get('search') || '').trim()
    const pageParam = searchParams.get('page')
    const limitParam = searchParams.get('limit')

    // Eski davranış: hiçbir query yoksa tüm tree (backward compat)
    if (!pageParam && !limitParam && !search) {
      const [groups, specs] = await Promise.all([
        prisma.specificationGroup.findMany({ orderBy: { sira: 'asc' } }),
        prisma.specification.findMany({ orderBy: { sira: 'asc' } }),
      ])
      const result = groups.map(group => ({
        ...specGroupToFrontend(group),
        isGroup: true,
        productCount: 0,
        children: specs
          .filter(s => s.grup_id === String(group.id))
          .map(specToFrontend)
          .map(c => ({ ...c, isGroup: false, isActive: true, productCount: 0 })),
      }))
      return success(result)
    }

    const page = Math.max(1, parseInt(pageParam || '1'))
    const limit = Math.min(200, Math.max(1, parseInt(limitParam || '20')))

    if (search) {
      // Search modu: grup veya spec adına eşleşen tüm grupları bul, ilgili children ile sun
      const [matchedGroups, matchedSpecs] = await Promise.all([
        prisma.specificationGroup.findMany({
          where: { baslik: { contains: search } },
          orderBy: { sira: 'asc' },
        }),
        prisma.specification.findMany({
          where: { baslik: { contains: search } },
          orderBy: { sira: 'asc' },
        }),
      ])

      const matchedGroupIds = new Set(matchedGroups.map(g => g.id))
      const specGroupIdsRaw = new Set(matchedSpecs.map(s => s.grup_id).filter(Boolean) as string[])
      // Tüm ilgili grup id'leri (grup match + spec'in grubu)
      const allRelevantIds = new Set<number>([
        ...matchedGroupIds,
        ...[...specGroupIdsRaw].map(id => parseInt(id)).filter(n => !isNaN(n)),
      ])

      if (allRelevantIds.size === 0) {
        return success({ items: [], total: 0, page, limit })
      }

      const idArray = [...allRelevantIds]
      const allGroups = await prisma.specificationGroup.findMany({
        where: { id: { in: idArray } },
        orderBy: { sira: 'asc' },
      })

      // Her grup için children
      const allChildren = await prisma.specification.findMany({
        where: { grup_id: { in: idArray.map(String) } },
        orderBy: { sira: 'asc' },
      })

      const matchedSpecIdSet = new Set(matchedSpecs.map(s => s.id))

      const result = allGroups.map(group => {
        const groupMatched = matchedGroupIds.has(group.id)
        // Grup adıyla eşleştiyse tüm children, sadece spec eşleşmiş ise yalnızca eşleşen spec
        const children = allChildren
          .filter(s => s.grup_id === String(group.id))
          .filter(s => groupMatched || matchedSpecIdSet.has(s.id))
          .map(specToFrontend)
          .map(c => ({ ...c, isGroup: false, isActive: true, productCount: 0 }))

        return {
          ...specGroupToFrontend(group),
          isGroup: true,
          productCount: 0,
          children,
        }
      })

      const total = result.length
      const paginated = result.slice((page - 1) * limit, page * limit)
      return success({ items: paginated, total, page, limit })
    }

    // Pagination modu (search yok): grupları sayfalı çek, her birinin children'ı dahil
    const total = await prisma.specificationGroup.count()
    const groups = await prisma.specificationGroup.findMany({
      orderBy: { sira: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const groupIds = groups.map(g => String(g.id))
    const specs = groupIds.length === 0 ? [] : await prisma.specification.findMany({
      where: { grup_id: { in: groupIds } },
      orderBy: { sira: 'asc' },
    })

    const items = groups.map(group => ({
      ...specGroupToFrontend(group),
      isGroup: true,
      productCount: 0,
      children: specs
        .filter(s => s.grup_id === String(group.id))
        .map(specToFrontend)
        .map(c => ({ ...c, isGroup: false, isActive: true, productCount: 0 })),
    }))

    return success({ items, total, page, limit })
  } catch (err) {
    console.error('Özellik listeleme hatası:', err)
    return error('Özellikler yüklenirken bir hata oluştu', 500)
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const body = await request.json()

    if (!body.name) {
      return error('Özellik adı zorunludur')
    }

    if (!body.groupId) {
      return error('Grup ID zorunludur')
    }

    const spec = await prisma.specification.create({
      data: {
        baslik: body.name,
        grup_id: body.groupId,
        sira: body.order ?? 0,
      },
    })

    return success(specToFrontend(spec), 201)
  } catch (err) {
    console.error('Özellik oluşturma hatası:', err)
    return error('Özellik oluşturulurken bir hata oluştu', 500)
  }
}
