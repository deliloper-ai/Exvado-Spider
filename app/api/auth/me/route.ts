import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db/prisma'

interface JwtPayload {
  userId: number
  email: string
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: 'Yetkilendirme token\'ı bulunamadı' },
      { status: 401 }
    )
  }

  const token = authHeader.slice(7)
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    return NextResponse.json(
      { success: false, error: 'Sunucu yapılandırma hatası' },
      { status: 500 }
    )
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Kullanıcı bulunamadı' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: String(user.id),
        email: user.email,
        name: user.full_name,
        role: 'admin',
        createdAt: user.created_at.toISOString(),
        updatedAt: user.updated_at?.toISOString() || null,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: 'Geçersiz veya süresi dolmuş token' },
      { status: 401 }
    )
  }
}
