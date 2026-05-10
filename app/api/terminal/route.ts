import { NextRequest, NextResponse } from 'next/server';
import { createMikrotikClient } from '@/lib/mikrotik';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

// Perintah yang butuh konfirmasi sebelum dieksekusi
const DANGEROUS_COMMANDS = [
  '/system/reboot',
  '/system/shutdown',
  '/system/reset-configuration',
  '/system/backup/restore',
  '/ip/firewall/filter/remove',
  '/ip/firewall/nat/remove',
  '/user/remove',
];

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('hotspot_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { command?: string; sentences?: string[]; force?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 });
  }

  const { command, sentences = [], force = false } = body;

  if (!command || typeof command !== 'string') {
    return NextResponse.json({ error: 'Perintah wajib diisi' }, { status: 400 });
  }

  // Normalize: pastikan dimulai dengan /
  const normalizedCmd = command.startsWith('/') ? command : `/${command}`;
  // Ganti spasi dengan / untuk path-style commands
  const routerCmd = normalizedCmd.replace(/\s+/g, '/');

  // Cek perintah berbahaya
  const isDangerous = DANGEROUS_COMMANDS.some(d => routerCmd.startsWith(d));
  if (isDangerous && !force) {
    return NextResponse.json({
      requireConfirm: true,
      command: routerCmd,
      message: `Perintah "${routerCmd}" bersifat berbahaya dan tidak dapat dibatalkan. Yakin ingin melanjutkan?`,
    });
  }

  const password = cookieStore.get('router_pwd')?.value ?? '';
  const client = createMikrotikClient({
    host: payload.routerIP,
    port: payload.routerPort,
    user: payload.username,
    password,
  });

  try {
    const result = await client.executeCommand(routerCmd, sentences);
    return NextResponse.json({ success: true, result, command: routerCmd });
  } catch (err: unknown) {
    const error = err as { message?: string; type?: string };
    // Return 200 agar error bisa ditampilkan di terminal, bukan crash
    return NextResponse.json({
      success: false,
      error: error.message || 'Perintah gagal dieksekusi',
      errorType: error.type || 'UNKNOWN',
    });
  } finally {
    await client.disconnect();
  }
}
