import { NextResponse, type NextRequest } from 'next/server';
import { FLOW_COOKIE, finishFlow, sessionCookie } from '@/lib/auth';
import { hasKv } from '@/lib/kv';
import { saveProfile } from '@/lib/account';

export async function GET(req: NextRequest) {
  const done = await finishFlow(req);
  const back = new URL(done.next, req.url);
  if ('failed' in done) {
    console.error('sign-in failed:', done.failed);
    back.searchParams.set('login', 'failed');
    back.searchParams.set('why', done.failed);
  }
  const res = NextResponse.redirect(back);
  res.cookies.delete({ name: FLOW_COOKIE, path: '/api/auth' });
  if ('user' in done) {
    if (hasKv()) await saveProfile(done.user).catch(e => console.error('profile', e));
    const c = await sessionCookie(done.user);
    res.cookies.set(c.name, c.value, c.options);
  }
  return res;
}
