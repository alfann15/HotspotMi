import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logout berhasil' });
  
  const expired = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 0,
    expires: new Date(0),
    path: '/',
  };
  response.cookies.set('hotspot_token', '', expired);
  response.cookies.set('router_pwd', '', expired);

  return response;
}

export async function GET() {
  return POST();
}
