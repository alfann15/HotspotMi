import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'hotspot-manager-secret-key';
const JWT_EXPIRES_IN = '24h';

export interface JWTPayload {
  routerIP: string;
  routerPort: number;
  username: string;
  password: string;   // disimpan di JWT (HTTP-Only cookie) — aman dari XSS
  routerLabel?: string;
  iat?: number;
  exp?: number;
}

export interface SessionInfo {
  routerIP: string;
  routerPort: number;
  username: string;
  routerLabel?: string;
  expiresAt: Date;
  issuedAt: Date;
}

export function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    }) as JWTPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}

export function getSessionInfo(token: string): SessionInfo | null {
  const payload = verifyToken(token);
  if (!payload || !payload.iat || !payload.exp) return null;

  return {
    routerIP: payload.routerIP,
    routerPort: payload.routerPort,
    username: payload.username,
    routerLabel: payload.routerLabel,
    expiresAt: new Date(payload.exp * 1000),
    issuedAt: new Date(payload.iat * 1000),
  };
}

export function isTokenExpiringSoon(token: string, thresholdMinutes = 30): boolean {
  const payload = verifyToken(token);
  if (!payload || !payload.exp) return true;

  const now = Math.floor(Date.now() / 1000);
  const remainingSeconds = payload.exp - now;
  return remainingSeconds < thresholdMinutes * 60;
}

export function refreshToken(token: string): string | null {
  const payload = verifyToken(token);
  if (!payload) return null;

  return signToken({
    routerIP: payload.routerIP,
    routerPort: payload.routerPort,
    username: payload.username,
    password: payload.password,
    routerLabel: payload.routerLabel,
  });
}
