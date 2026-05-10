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
    const profiles = await client.getList('/ip/hotspot/profile');
    return NextResponse.json({
      serverProfiles: profiles.map((p: Record<string, string>) => ({
        id: p['.id'],
        name: p['name'],
        dnsName: p['dns-name'] || '',
        loginPage: p['login-page'] || '',
        useRadius: p['use-radius'] || 'false',
        httpCookieLifetime: p['http-cookie-lifetime'] || '',
        splitUserDomain: p['split-user-domain'] || 'false',
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
  const { name, dnsName, loginPage } = body;

  if (!name) {
    return NextResponse.json({ error: 'Nama server profile wajib diisi' }, { status: 422 });
  }

  const routerPwd = cookieStore.get('router_pwd')?.value ?? '';
  const client = createMikrotikClient({
    host: payload.routerIP,
    port: payload.routerPort,
    user: payload.username,
    password: routerPwd,
  });

  try {
    await client.addEntry('/ip/hotspot/profile', {
      name,
      ...(dnsName ? { 'dns-name': dnsName } : {}),
      ...(loginPage ? { 'login-page': loginPage } : {}),
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ error: 'Failed', message: error.message }, { status: 503 });
  } finally {
    await client.disconnect();
  }
}
