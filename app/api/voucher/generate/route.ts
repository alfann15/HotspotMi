import { NextRequest, NextResponse } from 'next/server';
import { createMikrotikClient } from '@/lib/mikrotik';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { generateVouchers, buildVoucherComment } from '@/lib/voucher';
import { z } from 'zod';

const generateSchema = z.object({
  count: z.number().int().min(1).max(500),
  profile: z.string().min(1),
  profileCode: z.string().min(1),
  prefix: z.string().min(1).max(20),
  price: z.number().int().min(0).default(0),
  sameAsUsername: z.boolean().default(false),
  usernameLength: z.number().int().min(4).max(16).default(8),
  passwordLength: z.number().int().min(4).max(16).default(8),
  format: z.enum(['numeric', 'alphanumeric', 'alpha']).default('alphanumeric'),
});

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('hotspot_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation Error', issues: parsed.error.issues }, { status: 422 });
  }

  const { count, profile, profileCode, prefix, price, sameAsUsername, usernameLength, passwordLength, format } = parsed.data;

  const password = cookieStore.get('router_pwd')?.value ?? '';
  const client = createMikrotikClient({
    host: payload.routerIP,
    port: payload.routerPort,
    user: payload.username,
    password,
  });

  try {
    // Get existing usernames to avoid duplicates
    const existingUsers = await client.getList('/ip/hotspot/user');
    const existingUsernames = new Set(existingUsers.map((u: Record<string, string>) => u['name']));

    // Generate vouchers
    const vouchers = generateVouchers({
      count, profileCode, prefix, price, sameAsUsername,
      usernameLength, passwordLength, format,
      existingUsernames,
    });

    // Batch insert with rate limiting (10 per batch)
    const BATCH_SIZE = 10;
    const results = [];

    for (let i = 0; i < vouchers.length; i += BATCH_SIZE) {
      const batch = vouchers.slice(i, i + BATCH_SIZE);
      
      for (const voucher of batch) {
        try {
          await client.addEntry('/ip/hotspot/user', {
            name: voucher.username,
            password: voucher.password,
            profile: profile,
            comment: voucher.comment,
          });
          results.push({ ...voucher, success: true });
        } catch {
          results.push({ ...voucher, success: false });
        }
      }

      // Small delay between batches to not overload router
      if (i + BATCH_SIZE < vouchers.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    const successful = results.filter((r) => r.success);
    return NextResponse.json({
      success: true,
      generated: successful.length,
      total: count,
      vouchers: successful,
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ error: 'Failed', message: error.message }, { status: 503 });
  } finally {
    await client.disconnect();
  }
}
