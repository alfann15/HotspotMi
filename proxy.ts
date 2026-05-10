import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, isTokenExpiringSoon, refreshToken } from '@/lib/jwt';

const PUBLIC_PATHS = ['/login', '/api/auth/login'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icons') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check JWT token
  const token = request.cookies.get('hotspot_token')?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Sesi tidak valid. Silakan login kembali.' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = verifyToken(token);
  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Token tidak valid atau sudah expired.' },
        { status: 401 }
      );
    }
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('hotspot_token');
    return response;
  }

  // Auto-refresh token if expiring soon
  const response = NextResponse.next();
  if (isTokenExpiringSoon(token, 30)) {
    const newToken = refreshToken(token);
    if (newToken) {
      response.cookies.set('hotspot_token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24,
        path: '/',
      });
    }
  }

  response.headers.set('x-router-ip', payload.routerIP);
  response.headers.set('x-router-port', String(payload.routerPort));
  response.headers.set('x-router-user', payload.username);

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|images).*)',
  ],
};
