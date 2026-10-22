import type { NextRequest } from 'next/server';
import { getReleases, hasAnySource } from '@/lib/releases';
import { isCountry, isLang } from '@/lib/regions';
import { CDN_CACHE } from '@/lib/http';
import { hasKv } from '@/lib/kv';
import { wantCounts } from '@/lib/account';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const country = sp.get('country'), lang = sp.get('lang'), month = sp.get('month') ?? '';
  if (!isCountry(country) || !isLang(lang) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  if (!hasAnySource()) return Response.json({ error: 'no_token' }, { status: 503 });
  try {
    const data = await getReleases(country, lang, month);
    // счётчики «хотят посмотреть»; ответ кэшируется на час, этого хватает
    const want = hasKv() ? await wantCounts(Object.keys(data.items)).catch(() => ({})) : {};
    return Response.json({ ...data, want }, { headers: CDN_CACHE });
  } catch (e) {
    console.error('calendar', e);
    return Response.json({ error: 'tmdb' }, { status: 502 });
  }
}
