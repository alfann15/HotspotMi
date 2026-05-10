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
  console.log('[Resource] Connecting:', payload.routerIP, payload.routerPort, payload.username, 'pwd:', password ? '***' : 'EMPTY');

  try {
    const resources = await client.getList('/system/resource');
    const data = resources[0] as Record<string, string>;

    return NextResponse.json({
      boardName: data['board-name'] || 'Unknown',
      platform: data['platform'] || 'Unknown',
      version: data['version'] || 'Unknown',
      uptime: data['uptime'] || '0s',
      cpuLoad: parseInt(data['cpu-load'] || '0'),
      cpuCount: parseInt(data['cpu-count'] || '1'),
      totalMemory: parseInt(data['total-memory'] || '0'),
      freeMemory: parseInt(data['free-memory'] || '0'),
      totalHddSpace: parseInt(data['total-hdd-space'] || '0'),
      freeHddSpace: parseInt(data['free-hdd-space'] || '0'),
      architecture: data['architecture-name'] || 'Unknown',
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json(
      { error: 'Failed to fetch resources', message: error.message },
      { status: 503 }
    );
  } finally {
    await client.disconnect();
  }
}
