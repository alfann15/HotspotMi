import { NextRequest, NextResponse } from 'next/server';
import { createMikrotikClient } from '@/lib/mikrotik';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { parseComment, PROFILE_LABELS } from '@/lib/parser';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('hotspot_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Parameter year/month tidak valid' }, { status: 400 });
  }

  const password = cookieStore.get('router_pwd')?.value ?? '';
  const client = createMikrotikClient({
    host: payload.routerIP,
    port: payload.routerPort,
    user: payload.username,
    password,
  });

  try {
    const rawUsers = await client.getList('/ip/hotspot/user');

    // Filter voucher yang relevan dengan bulan ini:
    // - NEW: berdasarkan bulan DIBUAT
    // - ACTIVE/EXPIRED: berdasarkan bulan DIAKTIFKAN (activatedAt) atau fallback createdAt
    const vouchers = rawUsers
      .map((u: Record<string, string>) => ({
        username: u['name'],
        password: u['password'] || '',
        profile: u['profile'] || '',
        meta: parseComment(u['comment'] || ''),
      }))
      .filter(({ meta }) => {
        if (!meta.isVoucher) return false;
        if (meta.status === 'NEW') {
          return meta.createdAt.getFullYear() === year && meta.createdAt.getMonth() + 1 === month;
        }
        // ACTIVE/EXPIRED: gunakan activatedAt jika ada, fallback ke createdAt
        const usedDate = meta.activatedAt || meta.createdAt;
        return usedDate.getFullYear() === year && usedDate.getMonth() + 1 === month;
      });

    // Summary bulan ini
    const summary = {
      total: vouchers.length,
      new: vouchers.filter(v => v.meta.status === 'NEW').length,
      active: vouchers.filter(v => v.meta.status === 'ACTIVE').length,
      expired: vouchers.filter(v => v.meta.status === 'EXPIRED').length,
      revenue: vouchers
        .filter(v => v.meta.status === 'ACTIVE' || v.meta.status === 'EXPIRED')
        .reduce((s, v) => s + (v.meta.price ?? 0), 0),
    };

    // Breakdown per Prefix (semua voucher bulan ini)
    const prefixMap: Record<string, { total: number; new: number; active: number; expired: number; revenue: number }> = {};
    for (const v of vouchers) {
      const key = v.meta.prefix || '(tanpa prefix)';
      if (!prefixMap[key]) prefixMap[key] = { total: 0, new: 0, active: 0, expired: 0, revenue: 0 };
      prefixMap[key].total++;
      if (v.meta.status === 'NEW') prefixMap[key].new++;
      else if (v.meta.status === 'ACTIVE') { prefixMap[key].active++; prefixMap[key].revenue += v.meta.price ?? 0; }
      else if (v.meta.status === 'EXPIRED') { prefixMap[key].expired++; prefixMap[key].revenue += v.meta.price ?? 0; }
    }
    const byPrefix = Object.entries(prefixMap)
      .map(([prefix, d]) => ({ prefix, ...d }))
      .sort((a, b) => b.total - a.total);

    // Breakdown per Profile — diurutkan dari terlaris (hanya terjual)
    const profileMap: Record<string, { total: number; new: number; active: number; expired: number; revenue: number; sold: number }> = {};
    for (const v of vouchers) {
      const key = v.profile || '(tanpa profil)';
      if (!profileMap[key]) profileMap[key] = { total: 0, new: 0, active: 0, expired: 0, revenue: 0, sold: 0 };
      profileMap[key].total++;
      if (v.meta.status === 'NEW') profileMap[key].new++;
      else if (v.meta.status === 'ACTIVE') { profileMap[key].active++; profileMap[key].revenue += v.meta.price ?? 0; profileMap[key].sold++; }
      else if (v.meta.status === 'EXPIRED') { profileMap[key].expired++; profileMap[key].revenue += v.meta.price ?? 0; profileMap[key].sold++; }
    }
    const byProfile = Object.entries(profileMap)
      .map(([profile, d]) => ({ profile, ...d }))
      .sort((a, b) => b.sold - a.sold); // urutkan dari terlaris

    // List voucher detail
    const voucherList = vouchers.map(v => ({
      username: v.username,
      password: v.password,
      profile: v.profile,
      profileLabel: PROFILE_LABELS[v.meta.profileCode] || v.meta.profileCode,
      prefix: v.meta.prefix,
      status: v.meta.status,
      price: v.meta.price ?? 0,
      createdAt: v.meta.createdAt.toISOString(),
      activatedAt: v.meta.activatedAt?.toISOString() || null,
    })).sort((a, b) => {
      // Urutkan: yang terjual (ACTIVE/EXPIRED) dulu, lalu stok baru
      if (a.status !== 'NEW' && b.status === 'NEW') return -1;
      if (a.status === 'NEW' && b.status !== 'NEW') return 1;
      return 0;
    });

    const monthName = new Date(year, month - 1, 1).toLocaleString('id-ID', { month: 'long' });

    return NextResponse.json({ year, month, monthName, summary, byPrefix, byProfile, vouchers: voucherList });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ error: 'Failed', message: error.message }, { status: 503 });
  } finally {
    await client.disconnect();
  }
}
