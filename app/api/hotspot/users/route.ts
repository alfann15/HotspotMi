import { NextRequest, NextResponse } from 'next/server';
import { createMikrotikClient } from '@/lib/mikrotik';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { parseComment, VoucherMetadata } from '@/lib/parser';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('hotspot_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const prefix = searchParams.get('prefix') || '';
  const status = searchParams.get('status') || '';
  const profile = searchParams.get('profile') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  const password = cookieStore.get('router_pwd')?.value ?? '';
  const client = createMikrotikClient({
    host: payload.routerIP,
    port: payload.routerPort,
    user: payload.username,
    password,
  });

  try {
    const rawUsers = await client.getList('/ip/hotspot/user');
    
    const users = rawUsers.map((u: Record<string, string>) => {
      const meta = parseComment(u['comment'] || '');
      return {
        id: u['.id'],
        username: u['name'],
        password: u['password'],
        profile: u['profile'],
        comment: u['comment'] || '',
        disabled: u['disabled'] === 'true',
        bytesIn: u['bytes-in'] || '0',
        bytesOut: u['bytes-out'] || '0',
        packetsIn: u['packets-in'] || '0',
        packetsOut: u['packets-out'] || '0',
        uptime: u['uptime'] || '0s',
        metadata: meta,
      };
    });

    // Apply filters
    let filtered = users;
    if (prefix) {
      filtered = filtered.filter((u) => u.metadata.isVoucher && u.metadata.prefix === prefix.toUpperCase());
    }
    if (status) {
      filtered = filtered.filter((u) => u.metadata.status === status.toUpperCase());
    }
    if (profile) {
      filtered = filtered.filter((u) => u.profile === profile);
    }

    // Pagination
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    return NextResponse.json({
      users: paginated,
      pagination: { page, pageSize, total, totalPages },
      summary: {
        total: users.length,
        new: users.filter((u) => u.metadata.status === 'NEW').length,
        active: users.filter((u) => u.metadata.status === 'ACTIVE').length,
        expired: users.filter((u) => u.metadata.status === 'EXPIRED').length,
      },
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ error: 'Failed', message: error.message }, { status: 503 });
  } finally {
    await client.disconnect();
  }
}

export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('hotspot_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  const pwd = cookieStore.get('router_pwd')?.value ?? '';
  const client = createMikrotikClient({
    host: payload.routerIP,
    port: payload.routerPort,
    user: payload.username,
    password: pwd,
  });

  try {
    await client.removeEntry('/ip/hotspot/user', id);
    return NextResponse.json({ success: true });
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
  const { username, password, profile, profileCode, price = 0, comment: customComment } = body;

  if (!username || !profile) {
    return NextResponse.json({ error: 'Username dan profil wajib diisi' }, { status: 422 });
  }

  const { buildVoucherComment } = await import('@/lib/voucher');
  const finalComment = customComment || buildVoucherComment('MANUAL', profileCode || 'custom', price);

  const routerPwd = cookieStore.get('router_pwd')?.value ?? '';
  const client = createMikrotikClient({
    host: payload.routerIP,
    port: payload.routerPort,
    user: payload.username,
    password: routerPwd,
  });

  try {
    await client.addEntry('/ip/hotspot/user', {
      name: username,
      password: password || username,   // default: same as username
      profile,
      comment: finalComment,
    });
    return NextResponse.json({ success: true, username, password: password || username });
  } catch (err: unknown) {
    const error = err as { message?: string };
    // Duplicate user error
    if (error.message?.includes('already')) {
      return NextResponse.json({ error: 'Username sudah digunakan', message: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed', message: error.message }, { status: 503 });
  } finally {
    await client.disconnect();
  }
}
