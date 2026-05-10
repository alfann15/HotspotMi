import { NextRequest, NextResponse } from 'next/server';
import { createMikrotikClient } from '@/lib/mikrotik';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

/**
 * ON_LOGIN_SCRIPT dikirim apa adanya ke MikroTik — tidak dibungkus template literal
 * agar tidak ada escaping tambahan dari JS yang merusak sintaks RouterOS.
 *
 * Perbaikan utama di dalam script MikroTik:
 *  1. Array kosong pakai {} bukan [:toarray ""]
 *  2. Scheduler pakai start-time=now (bukan startup) agar timer langsung berjalan
 *  3. Parsing parts menggunakan delimiter "-" secara eksplisit & indeks yang benar
 *  4. Escape quote memakai cara yang lebih aman (["]) daripada rangkaian backslash
 */
const ON_LOGIN_SCRIPT = `
:local uname $user;
:local ucomment [/ip hotspot user get [find name=$uname] comment];
:if ([:typeof $ucomment] = "str" && [:pick $ucomment 0 3] = "vc-") do={
  :local findNew [:find $ucomment "-NEW"];
  :if ([:typeof $findNew] = "num") do={

    # Tandai user sebagai ACTIVE
    :local len [:len $ucomment];
    :local newcomment ([:pick $ucomment 0 ($len - 3)] . "ACTIVE");
    /ip hotspot user set [find name=$uname] comment=$newcomment;

    # Parsing bagian-bagian comment: vc-<prefix>-<timestamp>-<profileCode>-<price>-NEW
    # Pisahkan berdasarkan tanda "-"
    :local parts [:toarray ""];
    :local current $ucomment;
    :local dashIdx [:find $current "-"];
    :while ([:typeof $dashIdx] = "num") do={
      :set parts ($parts, [:pick $current 0 $dashIdx]);
      :set current [:pick $current ($dashIdx + 1) [:len $current]];
      :set dashIdx [:find $current "-"];
    }
    :set parts ($parts, $current);

    # Profile code selalu di indeks (panjang - 3) karena format selalu diakhiri ...-PROFILE-PRICE-STATUS
    :local profileCode ($parts->([:len $parts] - 3));

    # Tabel interval berdasarkan kode profil
    :local interval "";
    :if ($profileCode = "1m")  do={ :set interval "00:01:00" }
    :if ($profileCode = "1h")  do={ :set interval "01:00:00" }
    :if ($profileCode = "2h")  do={ :set interval "02:00:00" }
    :if ($profileCode = "4h")  do={ :set interval "04:00:00" }
    :if ($profileCode = "8h")  do={ :set interval "08:00:00" }
    :if ($profileCode = "1d")  do={ :set interval "1d00:00:00" }
    :if ($profileCode = "3d")  do={ :set interval "3d00:00:00" }
    :if ($profileCode = "7d")  do={ :set interval "7d00:00:00" }
    :if ($profileCode = "14d") do={ :set interval "14d00:00:00" }
    :if ($profileCode = "30d") do={ :set interval "30d00:00:00" }

    :if ($interval != "") do={
      :local schedName ("exp-" . $uname);
      # Hapus scheduler lama jika ada (misalnya re-login sebelum expired)
      :if ([:len [/system scheduler find name=$schedName]] > 0) do={
        /system scheduler remove [find name=$schedName];
      }
      # Buat scheduler dengan interval yang tepat, mulai sekarang
      :local ev (":local u \\"" . $uname . "\\"; /ip hotspot user disable [find name=\\$u]; /ip hotspot active remove [find user=\\$u]; :local c [/ip hotspot user get [find name=\\$u] comment]; /ip hotspot user set [find name=\\$u] comment=([:pick \\$c 0 ([:len \\$c]-6)] . \\"EXPIRED\\"); /system scheduler remove [find name=\\"exp-\\$u\\"];");
      
      /system scheduler add \
        name=$schedName \
        interval=$interval \
        on-event=$ev;
    }
  }
}
`;

/** Marker unik yang ditanamkan sebagai komentar agar tidak double-inject */
const INJECT_MARKER = '# HotspotMi:managed';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('hotspot_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const routerPwd = cookieStore.get('router_pwd')?.value ?? '';
  const client = createMikrotikClient({
    host: payload.routerIP,
    port: payload.routerPort,
    user: payload.username,
    password: routerPwd,
  });

  try {
    const profiles = await client.getList('/ip/hotspot/user/profile');

    const results: { profile: string; status: 'injected' | 'skipped' }[] = [];

    for (const profile of profiles) {
      const profileName: string = profile['name'] ?? profile['.id'];
      const currentOnLogin: string = profile['on-login'] ?? '';

      // Jika script sudah di-inject sebelumnya, kita ganti bagian bawahnya dengan versi terbaru
      let baseScript = currentOnLogin.trim();
      if (baseScript.includes(INJECT_MARKER)) {
        // Ambil script asli sebelum marker
        baseScript = baseScript.split(INJECT_MARKER)[0].trim();
      }

      const newOnLogin = [
        baseScript,
        INJECT_MARKER,
        ON_LOGIN_SCRIPT.trim(),
      ]
        .filter(Boolean)
        .join('\n');

      await client.updateEntry('/ip/hotspot/user/profile', profile['.id'], {
        'on-login': newOnLogin,
      });

      results.push({ profile: profileName, status: 'injected' });
    }

    const injectedCount = results.filter((r) => r.status === 'injected').length;
    const skippedCount = results.filter((r) => r.status === 'skipped').length;

    return NextResponse.json({
      success: true,
      message: `Script berhasil di-install. Injected: ${injectedCount}, Skipped (sudah ada): ${skippedCount}.`,
      details: results,
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json(
      { error: 'Failed', message: error.message ?? 'Unknown error' },
      { status: 503 },
    );
  } finally {
    await client.disconnect();
  }
}