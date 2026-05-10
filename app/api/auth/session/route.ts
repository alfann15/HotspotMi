import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionInfo } from '@/lib/jwt';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('hotspot_token')?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const session = getSessionInfo(token);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    session: {
      routerIP: session.routerIP,
      routerPort: session.routerPort,
      username: session.username,
      routerLabel: session.routerLabel,
      expiresAt: session.expiresAt,
    },
  });
}
