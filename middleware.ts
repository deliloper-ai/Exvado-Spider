import { NextRequest, NextResponse } from 'next/server'

const publicPaths = ['/login', '/register', '/password-reset', '/verification']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API route'ları ve statik dosyaları atla
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  )

  const token = request.cookies.get('token')?.value

  // Token yoksa ve korumalı route → login'e redirect
  if (!isPublicPath && !token) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Token varsa ve login sayfasındaysa → dashboard'a redirect
  if (isPublicPath && token && pathname === '/login') {
    const dashboardUrl = new URL('/', request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
