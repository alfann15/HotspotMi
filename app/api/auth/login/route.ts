import { NextRequest, NextResponse } from 'next/server';
import { createMikrotikClient } from '@/lib/mikrotik';
import { signToken } from '@/lib/jwt';
import { z } from 'zod';

const loginSchema = z.object({
  // Terima IPv4, IPv6, atau hostname — jangan pakai .ip() yang terlalu ketat
  routerIP: z.string().min(1, 'IP Router wajib diisi').trim(),
  routerPort: z.number().int().min(1).max(65535).default(8728),
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().default(''),
  routerLabel: z.string().optional(),
});

// Rate limiting sederhana (in-memory)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || record.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }

  if (record.count >= 5) return false;

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const clientIP = request.headers.get('x-forwarded-for') || 'unknown';

  // Rate limit check
  if (!checkRateLimit(clientIP)) {
    return NextResponse.json(
      { error: 'Too Many Requests', message: 'Terlalu banyak percobaan login. Coba lagi dalam 1 menit.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
    // DEBUG: log apa yang diterima dari client
    console.log('[Login] Received body:', JSON.stringify(body));
  } catch {
    return NextResponse.json({ error: 'Bad Request', message: 'Request body tidak valid.' }, { status: 400 });
  }

  // Validate input
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    // Ambil pesan error pertama yang human-readable
    const firstIssue = parsed.error.issues[0];
    const fieldName = firstIssue?.path?.[0] ?? 'input';
    const message = firstIssue?.message ?? 'Data tidak valid';
    console.error('[Login] Validation error:', parsed.error.issues);
    return NextResponse.json(
      {
        error: 'Validation Error',
        message: `${message} (field: ${fieldName})`,
        issues: parsed.error.issues,
      },
      { status: 422 }
    );
  }

  const { routerIP, routerPort, username, password, routerLabel } = parsed.data;

  // Connect to MikroTik to verify credentials
  const client = createMikrotikClient({
    host: routerIP,
    port: routerPort,
    user: username,
    password,
    timeout: 8000,
  });

  try {
    const isConnected = await client.testConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Connection Failed', message: 'Tidak dapat terhubung ke router.' },
        { status: 503 }
      );
    }
  } catch (err: unknown) {
    const mikrotikError = err as { type?: string; message?: string };
    return NextResponse.json(
      {
        error: mikrotikError.type || 'Connection Failed',
        message: mikrotikError.message || 'Gagal terhubung ke MikroTik.',
      },
      { status: 503 }
    );
  }

  // Generate JWT — password disimpan di cookie terpisah
  const token = signToken({
    routerIP,
    routerPort,
    username,
    password,
    routerLabel: routerLabel || routerIP,
  });
  console.log('[Login] signToken password field:', password ? '***set***' : 'EMPTY');

  const response = NextResponse.json({
    success: true,
    message: 'Login berhasil',
    router: { ip: routerIP, port: routerPort, label: routerLabel || routerIP },
  });

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24,
    path: '/',
  };
  response.cookies.set('hotspot_token', token, cookieOpts);
  // Simpan password di cookie terpisah agar mudah diakses route handlers
  response.cookies.set('router_pwd', password, cookieOpts);

  return response;
}
