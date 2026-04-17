import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { PUBLIC_ROUTES } from '@/lib/constants'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))

  if (isPublicRoute) {
    return NextResponse.next()
  }

  const accessToken = request.cookies.get('access_token')
  if (!accessToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
