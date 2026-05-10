import { ProfileCode, PROFILE_DURATIONS } from './parser';

export interface VoucherGenerateOptions {
  count: number;
  profileCode: ProfileCode | string;
  prefix: string;
  price?: number;
  sameAsUsername?: boolean;   // password = username
  usernameLength?: number;
  passwordLength?: number;
  format?: 'numeric' | 'alphanumeric' | 'alpha';
  existingUsernames?: Set<string>;
}

export interface GeneratedVoucher {
  username: string;
  password: string;
  comment: string;
  profile?: string;
}

const NUMERIC_CHARS = '0123456789';
const ALPHA_CHARS = 'abcdefghijklmnopqrstuvwxyz';
const ALPHANUM_CHARS = ALPHA_CHARS + NUMERIC_CHARS;
const UPPER_ALPHANUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude confusing chars (0,O,1,I)

function generateSecureString(length: number, charset: string): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((byte) => charset[byte % charset.length])
    .join('');
}

export function generateUsername(
  length: number = 8,
  format: 'numeric' | 'alphanumeric' | 'alpha' = 'alphanumeric'
): string {
  let charset: string;
  switch (format) {
    case 'numeric':
      charset = NUMERIC_CHARS;
      break;
    case 'alpha':
      charset = ALPHA_CHARS;
      break;
    case 'alphanumeric':
    default:
      charset = UPPER_ALPHANUM;
      break;
  }
  return generateSecureString(length, charset);
}

export function generatePassword(
  length: number = 8,
  format: 'numeric' | 'alphanumeric' | 'alpha' = 'alphanumeric'
): string {
  return generateUsername(length, format);
}

export function buildVoucherComment(prefix: string, profileCode: string, price: number = 0): string {
  const timestamp = Math.floor(Date.now() / 1000);
  return `vc-${prefix.toUpperCase()}-${timestamp}-${profileCode}-${price}-NEW`;
}

export function generateVouchers(options: VoucherGenerateOptions): GeneratedVoucher[] {
  const {
    count, profileCode, prefix,
    price = 0,
    sameAsUsername = false,
    usernameLength = 8,
    passwordLength = 8,
    format = 'alphanumeric',
    existingUsernames = new Set(),
  } = options;

  const vouchers: GeneratedVoucher[] = [];
  const generated = new Set<string>([...existingUsernames]);
  let attempts = 0;
  const maxAttempts = count * 10;

  while (vouchers.length < count && attempts < maxAttempts) {
    attempts++;

    const username = generateUsername(usernameLength, format);
    if (generated.has(username)) continue;

    generated.add(username);
    const password = sameAsUsername ? username : generatePassword(passwordLength, format);
    const comment = buildVoucherComment(prefix, profileCode, price);

    vouchers.push({ username, password, comment });
  }

  if (vouchers.length < count) {
    console.warn(`[Voucher] Hanya berhasil generate ${vouchers.length}/${count} voucher unik.`);
  }

  return vouchers;
}

export function estimateExpiry(profileCode: string, from?: Date): Date | null {
  const duration = PROFILE_DURATIONS[profileCode];
  if (!duration) return null;
  const base = from || new Date();
  return new Date(base.getTime() + duration * 1000);
}

export function formatVoucherForPrint(voucher: GeneratedVoucher & { profile?: string; ssid?: string }) {
  return {
    username: voucher.username,
    password: voucher.password,
    profile: voucher.profile || 'Standard',
    ssid: voucher.ssid || 'Hotspot',
    qrData: `WIFI:T:WPA;S:${voucher.ssid || 'Hotspot'};P:${voucher.password};;`,
  };
}
