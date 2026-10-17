import type { NextRequest } from 'next/server';
import { getNowPlaying, hasToken } from '@/lib/tmdb';
import { isCountry, isLang } from '@/lib/regions';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const country = sp.get('country'), lang = sp.get('lang');
  if (!isCountry(country) || !isLang(lang)) return Response.json({ error: 'bad_request' }, { status: 400 });
  if (!hasToken()) return Response.json({ error: 'no_token' }, { status: 503 });
  try {
    return Response.json(await getNowPlaying(country, lang));
  } catch (e) {
    console.error('now-playing', e);
    return Response.json({ error: 'tmdb' }, { status: 502 });
  }
}
