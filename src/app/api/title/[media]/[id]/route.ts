import type { NextRequest } from 'next/server';
import { getTitle, hasToken } from '@/lib/tmdb';
import { isCountry, isLang } from '@/lib/regions';

export async function GET(req: NextRequest, ctx: RouteContext<'/api/title/[media]/[id]'>) {
  const { media, id } = await ctx.params;
  const sp = req.nextUrl.searchParams;
  const country = sp.get('country'), lang = sp.get('lang');
  const season = Number(sp.get('season')) || null;
  if ((media !== 'movie' && media !== 'tv') || !/^\d+$/.test(id) || !isCountry(country) || !isLang(lang)) {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  if (!hasToken()) return Response.json({ error: 'no_token' }, { status: 503 });
  try {
    return Response.json(await getTitle(media, Number(id), lang, country, season));
  } catch (e) {
    console.error('title', e);
    return Response.json({ error: 'tmdb' }, { status: 502 });
  }
}
