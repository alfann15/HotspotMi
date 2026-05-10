import { NextRequest, NextResponse } from 'next/server';
import { createMikrotikClient } from '@/lib/mikrotik';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('hotspot_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const password = cookieStore.get('router_pwd')?.value ?? '';
  const client = createMikrotikClient({
    host: payload.routerIP,
    port: payload.routerPort,
    user: payload.username,
    password,
  });

  try {
    const profiles = await client.getList('/ip/hotspot/user/profile');
    return NextResponse.json({
      profiles: profiles.map((p: Record<string, string>) => ({
        id: p['.id'],
        name: p['name'],
        rateLimit: p['rate-limit'] || 'unlimited',
        sharedUsers: p['shared-users'] || '1',
        sessionTimeout: p['session-timeout'] || 'unlimited',
        idleTimeout: p['idle-timeout'] || 'unlimited',
        keepaliveTimeout: p['keepalive-timeout'] || 'unlimited',
        onLogin: p['on-login'] || '',
        onLogout: p['on-logout'] || '',
      })),
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ error: 'Failed', message: error.message }, { status: 503 });
  } finally {
    await client.disconnect();
  }
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('hotspot_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const client = createMikrotikClient({
    host: payload.routerIP,
    port: payload.routerPort,
    user: payload.username,
    password: '',
  });

  try {
    await client.addEntry('/ip/hotspot/user/profile', {
      name: body.name,
      'rate-limit': body.rateLimit || '',
      'shared-users': String(body.sharedUsers || 1),
      'session-timeout': body.sessionTimeout || '',
      'idle-timeout': body.idleTimeout || '',
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ error: 'Failed', message: error.message }, { status: 503 });
  } finally {
    await client.disconnect();
  }
}
