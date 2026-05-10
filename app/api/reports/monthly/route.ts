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

  const password = cookieStore.get('router_pwd')?.value ?? '';
  const client = createMikrotikClient({
    host: payload.routerIP,
    port: payload.routerPort,
    user: payload.username,
    password,
  });

  try {
    const rawUsers = await client.getList('/ip/hotspot/user');

    const allVouchers = rawUsers
      .map((u: Record<string, string>) => ({
        comment: u['comment'] || '',
        meta: parseComment(u['comment'] || ''),
      }))
      .filter(({ meta }) => meta.isVoucher);

    // Inisialisasi data per bulan
    const monthlyData: Record<number, {
      total: number; new: number; active: number; expired: number; revenue: number;
      byProfile: Record<string, number>; // hanya terjual (active+expired)
    }> = {};
    for (let m = 1; m <= 12; m++) {
      monthlyData[m] = { total: 0, new: 0, active: 0, expired: 0, revenue: 0, byProfile: {} };
    }

    for (const { meta } of allVouchers) {
      if (meta.status === 'NEW') {
        // NEW: dikelompokkan berdasarkan bulan DIBUAT (stok)
        const createdYear = meta.createdAt.getFullYear();
        const createdMonth = meta.createdAt.getMonth() + 1;
        if (createdYear === year && monthlyData[createdMonth]) {
          monthlyData[createdMonth].total++;
          monthlyData[createdMonth].new++;
        }
      } else if (meta.status === 'ACTIVE' || meta.status === 'EXPIRED') {
        // ACTIVE/EXPIRED: dikelompokkan berdasarkan bulan DIAKTIFKAN (revenue)
        // Gunakan activatedAt jika tersedia, fallback ke createdAt
        const usedDate = meta.activatedAt || meta.createdAt;
        const usedYear = usedDate.getFullYear();
        const usedMonth = usedDate.getMonth() + 1;

        if (usedYear === year && monthlyData[usedMonth]) {
          const d = monthlyData[usedMonth];
          d.total++;
          if (meta.status === 'ACTIVE') d.active++;
          else d.expired++;
          d.revenue += meta.price ?? 0;

          // Paket terlaris: hanya dari yang terjual (active+expired)
          const label = PROFILE_LABELS[meta.profileCode] || meta.profileCode;
          d.byProfile[label] = (d.byProfile[label] || 0) + 1;
        }
      }
    }

    // Summary keseluruhan tahun (berdasarkan logika yang sama)
    const yearlyVouchers = allVouchers.filter(({ meta }) => {
      if (meta.status === 'NEW') return meta.createdAt.getFullYear() === year;
      const usedDate = meta.activatedAt || meta.createdAt;
      return usedDate.getFullYear() === year;
    });

    const sold = yearlyVouchers.filter(({ meta }) => meta.status === 'ACTIVE' || meta.status === 'EXPIRED');
    const yearly = {
      total: yearlyVouchers.length,
      revenue: sold.reduce((s, { meta }) => s + (meta.price ?? 0), 0),
      sold: sold.length,
      new: yearlyVouchers.filter(({ meta }) => meta.status === 'NEW').length,
      active: yearlyVouchers.filter(({ meta }) => meta.status === 'ACTIVE').length,
      expired: yearlyVouchers.filter(({ meta }) => meta.status === 'EXPIRED').length,
    };

    const months = Object.entries(monthlyData).map(([m, d]) => ({
      month: parseInt(m),
      monthName: new Date(year, parseInt(m) - 1, 1).toLocaleString('id-ID', { month: 'long' }),
      ...d,
    }));

    return NextResponse.json({ year, yearly, months });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ error: 'Failed', message: error.message }, { status: 503 });
  } finally {
    await client.disconnect();
  }
}
