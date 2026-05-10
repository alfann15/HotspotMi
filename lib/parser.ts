/**
 * Parser & Serializer untuk metadata comment RouterOS
 * Format: vc-{prefix}-{timestamp}-{profileCode}-{status}
 * Contoh: vc-WARNET-1704067200-p1d-NEW
 */

export type VoucherStatus = 'NEW' | 'ACTIVE' | 'EXPIRED';
export type ProfileCode = '1m' | '1h' | '2h' | '4h' | '8h' | '1d' | '3d' | '7d' | '14d' | '30d';

export interface VoucherMetadata {
  isVoucher: boolean;
  prefix: string;
  createdAt: Date;
  profileCode: ProfileCode | string;
  price: number;          // harga dalam Rupiah, 0 jika tidak diset
  status: VoucherStatus;
  activatedAt?: Date;
  expiredAt?: Date;
  lastSeen?: Date;
  raw: string;
}

export const PROFILE_DURATIONS: Record<string, number> = {
  '1m': 1 * 60,
  '1h': 1 * 60 * 60,
  '2h': 2 * 60 * 60,
  '4h': 4 * 60 * 60,
  '8h': 8 * 60 * 60,
  '1d': 24 * 60 * 60,
  '3d': 3 * 24 * 60 * 60,
  '7d': 7 * 24 * 60 * 60,
  '14d': 14 * 24 * 60 * 60,
  '30d': 30 * 24 * 60 * 60,
};

export const PROFILE_LABELS: Record<string, string> = {
  '1m': '1 Menit (Test)',
  '1h': '1 Jam',
  '2h': '2 Jam',
  '4h': '4 Jam',
  '8h': '8 Jam',
  '1d': '1 Hari',
  '3d': '3 Hari',
  '7d': '7 Hari',
  '14d': '14 Hari',
  '30d': '30 Hari',
};

/**
 * Format comment: vc-{PREFIX}-{TIMESTAMP}-{PROFILE}-{PRICE}-{STATUS}
 * Contoh: vc-WARNET-1704067200-p1d-5000-NEW
 * Backward compatible: vc-{PREFIX}-{TIMESTAMP}-{PROFILE}-{STATUS} (price=0)
 */
export function parseComment(raw: string): VoucherMetadata {
  const empty: VoucherMetadata = {
    isVoucher: false, prefix: '', createdAt: new Date(0),
    profileCode: '', price: 0, status: 'NEW', raw,
  };

  if (!raw || !raw.startsWith('vc-')) return empty;

  const parts = raw.split('-');
  if (parts.length < 5) return { ...empty, isVoucher: false };

  const status = parts[parts.length - 1] as VoucherStatus;
  if (!['NEW', 'ACTIVE', 'EXPIRED'].includes(status)) return { ...empty, isVoucher: false };

  // Cek apakah ada price (parts.length >= 6 dan part ke-2 dari belakang adalah angka)
  const maybePricePart = parts[parts.length - 2];
  const hasPrice = /^\d+$/.test(maybePricePart) && parts.length >= 6;

  let price = 0;
  let profileCode: string;
  let timestamp: number;
  let prefix: string;

  if (hasPrice) {
    // Format baru: vc-PREFIX-TIMESTAMP-PROFILE-PRICE-STATUS
    price = parseInt(maybePricePart);
    profileCode = parts[parts.length - 3];
    timestamp = parseInt(parts[parts.length - 4]);
    prefix = parts.slice(1, parts.length - 4).join('-');
  } else {
    // Format lama: vc-PREFIX-TIMESTAMP-PROFILE-STATUS
    profileCode = parts[parts.length - 2];
    timestamp = parseInt(parts[parts.length - 3]);
    prefix = parts.slice(1, parts.length - 3).join('-');
  }

  if (isNaN(timestamp) || timestamp <= 0) return { ...empty, isVoucher: false };

  const createdAt = new Date(timestamp * 1000);
  const meta: VoucherMetadata = { isVoucher: true, prefix, createdAt, profileCode, price, status, raw };

  const duration = PROFILE_DURATIONS[profileCode];

  // Cek -exp{timestamp} suffix (ada saat voucher diaktifkan dengan durasi diketahui)
  // Format: vc-...-ACTIVE-exp1234567890 atau vc-...-EXPIRED-exp1234567890
  const expMatch = raw.match(/-exp(\d+)$/);
  if (expMatch) {
    const expTs = parseInt(expMatch[1]);
    meta.expiredAt = new Date(expTs * 1000);
    // Derive activatedAt = expiredAt - duration
    if (duration) {
      meta.activatedAt = new Date((expTs - duration) * 1000);
    }
  } else if (duration && status === 'NEW') {
    // Untuk voucher NEW: expiredAt berdasarkan createdAt (masa berlaku stok)
    meta.expiredAt = new Date((timestamp + duration) * 1000);
  }

  return meta;
}

export function serializeComment(meta: Omit<VoucherMetadata, 'isVoucher' | 'raw'>): string {
  const timestamp = Math.floor(meta.createdAt.getTime() / 1000);
  const price = meta.price ?? 0;
  return `vc-${meta.prefix}-${timestamp}-${meta.profileCode}-${price}-${meta.status}`;
}

export function updateCommentStatus(
  raw: string,
  status: VoucherStatus,
  activatedAt?: Date
): string {
  const meta = parseComment(raw);
  if (!meta.isVoucher) return raw;

  const parts = raw.split('-');
  parts[parts.length - 1] = status;
  const updated = parts.join('-');

  if (status === 'ACTIVE' && activatedAt) {
    // Append activated timestamp
    const duration = PROFILE_DURATIONS[meta.profileCode];
    if (duration) {
      const expTs = Math.floor(activatedAt.getTime() / 1000) + duration;
      return updated + `-exp${expTs}`;
    }
  }

  return updated;
}

export function isExpired(meta: VoucherMetadata): boolean {
  if (meta.status === 'EXPIRED') return true;
  if (meta.status === 'NEW') return false;
  if (meta.expiredAt && meta.expiredAt < new Date()) return true;
  return false;
}

export function getStatusBadge(status: VoucherStatus): {
  label: string;
  color: string;
} {
  switch (status) {
    case 'NEW':
      return { label: 'Belum Dipakai', color: 'blue' };
    case 'ACTIVE':
      return { label: 'Aktif', color: 'green' };
    case 'EXPIRED':
      return { label: 'Expired', color: 'red' };
    default:
      return { label: status, color: 'gray' };
  }
}
