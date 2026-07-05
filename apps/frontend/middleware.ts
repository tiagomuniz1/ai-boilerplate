import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_SEGMENTS = ['/login', '/register', '/set-password', '/verify']
const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN // ex: 'umi.com' em prod, vazio em dev

function extractSlugFromSubdomain(hostname: string): string | null {
  if (!BASE_DOMAIN) return null
  if (hostname === BASE_DOMAIN || hostname === `www.${BASE_DOMAIN}`) return null
  if (hostname.endsWith(`.${BASE_DOMAIN}`)) {
    return hostname.slice(0, hostname.length - BASE_DOMAIN.length - 1)
  }
  return null
}

function extractSlugFromPath(pathname: string): string | null {
  return pathname.split('/').filter(Boolean)[0] ?? null
}

function isPublicPath(pathWithoutSlug: string): boolean {
  return PUBLIC_SEGMENTS.some(
    (s) => pathWithoutSlug === s || pathWithoutSlug.startsWith(s + '/'),
  )
}

function withSlugHeader(response: NextResponse, slug: string): NextResponse {
  response.headers.set('X-Clinic-Slug', slug)
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.nextUrl.hostname

  const subdomainSlug = extractSlugFromSubdomain(hostname)
  const isSubdomainMode = subdomainSlug !== null

  const slug = isSubdomainMode ? subdomainSlug : extractSlugFromPath(pathname)

  // Rota raiz
  if (pathname === '/') {
    if (isSubdomainMode) {
      return NextResponse.redirect(`https://backoffice.${BASE_DOMAIN}/login`)
    }
    return NextResponse.redirect(new URL('/backoffice/login', request.url))
  }

  // Em modo subdomínio, o path visível não tem o slug — adicionar internamente
  const effectivePathname = isSubdomainMode ? `/${slug}${pathname}` : pathname

  const segments = effectivePathname.split('/').filter(Boolean)
  const pathWithoutSlug = '/' + segments.slice(1).join('/')

  const loginRedirectUrl = isSubdomainMode
    ? new URL('/login', request.url)          // mantém o subdomínio atual
    : new URL(`/${slug}/login`, request.url)

  function buildResponse(base: 'next' | 'rewrite'): NextResponse {
    const requestHeaders = new Headers(request.headers)
    if (slug) requestHeaders.set('X-Clinic-Slug', slug)

    if (base === 'rewrite' || isSubdomainMode) {
      const url = request.nextUrl.clone()
      url.pathname = effectivePathname
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
    }

    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  if (isPublicPath(pathWithoutSlug)) {
    return buildResponse('next')
  }

  const isClinic = slug && slug !== 'backoffice'
  const accessCookieName = isClinic ? `access_token_${slug}` : 'access_token'
  const refreshCookieName = isClinic ? `refresh_token_${slug}` : 'refresh_token'

  const accessToken = request.cookies.get(accessCookieName)
  if (accessToken) {
    return buildResponse('next')
  }

  const refreshToken = request.cookies.get(refreshCookieName)
  if (!refreshToken) {
    return NextResponse.redirect(loginRedirectUrl)
  }

  try {
    const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${refreshCookieName}=${refreshToken.value}`,
        ...(isClinic ? { 'x-clinic-slug': slug! } : {}),
      },
    })

    if (!refreshResponse.ok) {
      return NextResponse.redirect(loginRedirectUrl)
    }

    const response = buildResponse('next')
    const setCookies = refreshResponse.headers.getSetCookie()
    for (const cookie of setCookies) {
      response.headers.append('Set-Cookie', cookie)
    }
    return response
  } catch {
    return NextResponse.redirect(loginRedirectUrl)
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
