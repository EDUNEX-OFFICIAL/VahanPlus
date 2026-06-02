import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose/jwt/verify';
import { SESSION_COOKIE_NAME } from '@vahanplus/contracts';
import { isPathAllowed } from '@/lib/nav-config';
import { safeNextPath } from '@/lib/safe-next-path';

const PUBLIC_PATHS = new Set(['/login']);

function getJwtSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');
}

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, getJwtSecret(), { algorithms: ['HS256'] });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = normalizePathname(request.nextUrl.pathname);
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  const authed = await hasValidSession(request);

  if (PUBLIC_PATHS.has(pathname)) {
    if (authed) {
      const destination = safeNextPath(request.nextUrl.searchParams.get('next'));
      return NextResponse.redirect(new URL(destination, request.url));
    }
    if (hasSessionCookie && !authed) {
      const response = NextResponse.next();
      clearSessionCookie(response);
      return response;
    }
    return NextResponse.next();
  }

  if (!isPathAllowed(pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!authed) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    const response = NextResponse.redirect(loginUrl);
    if (hasSessionCookie) {
      clearSessionCookie(response);
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\..*).*)'],
};
