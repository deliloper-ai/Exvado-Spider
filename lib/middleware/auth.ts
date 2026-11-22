import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db/prisma'

interface JwtPayload {
  userId: number
  email: string
  iat?: number
  exp?: number
}

interface AuthSuccess {
  user: {
    id: number
    email: string
    full_name: string | null
  }
}

interface AuthError {
  error: string
  status: number
}

type AuthResult = AuthSuccess | AuthError

export function isAuthError(result: AuthResult): result is AuthError {
  return 'error' in result
}

export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Yetkilendirme token\'ı bulunamadı', status: 401 }
  }

  const token = authHeader.slice(7)

  if (!token) {
    return { error: 'Geçersiz token formatı', status: 401 }
  }

  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    return { error: 'Sunucu yapılandırma hatası', status: 500 }
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        full_name: true,
      },
    })

    if (!user) {
      return { error: 'Kullanıcı bulunamadı', status: 401 }
    }

    return { user }
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return { error: 'Token süresi dolmuş', status: 401 }
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return { error: 'Geçersiz token', status: 401 }
    }
    return { error: 'Kimlik doğrulama hatası', status: 500 }
  }
}
