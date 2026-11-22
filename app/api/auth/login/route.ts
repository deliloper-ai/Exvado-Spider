import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db/prisma'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'E-posta ve şifre gereklidir' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz e-posta veya şifre' },
        { status: 401 }
      )
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz e-posta veya şifre' },
        { status: 401 }
      )
    }

    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      return NextResponse.json(
        { success: false, error: 'Sunucu yapılandırma hatası' },
        { status: 500 }
      )
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'] }
    )

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: String(user.id),
        email: user.email,
        name: user.full_name,
        role: 'admin',
        createdAt: user.created_at.toISOString(),
      },
    })
  } catch (error: any) {
    console.error('Login hatası:', error)
    return NextResponse.json(
      { success: false, error: 'Giriş işlemi sırasında bir hata oluştu' },
      { status: 500 }
    )
  }
}
