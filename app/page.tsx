import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';

export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('hotspot_token')?.value;

  if (token && verifyToken(token)) {
    redirect('/dashboard');
  }

  redirect('/login');
}
