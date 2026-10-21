import type { NextRequest } from 'next/server';
import { hasToken, searchTmdb, type SearchHit } from '@/lib/tmdb';
import { hasIgdb, searchGames } from '@/lib/igdb';
import { isLang } from '@/lib/regions';
import { CDN_CACHE } from '@/lib/http';

/** Поиск по всем фильмам, сериалам и играм, не только по месяцу в календаре. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get('q') ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
  const lang = sp.get('lang');
  if (!isLang(lang) || q.length < 2) return Response.json({ results: [] });
  const [screen, games] = await Promise.all([
    hasToken() ? searchTmdb(q.toLowerCase(), lang).catch(() => [] as SearchHit[]) : [],
    hasIgdb() ? searchGames(q.toLowerCase()).catch(() => [] as SearchHit[]) : [],
  ]);
  return Response.json({ results: [...screen, ...games] }, { headers: CDN_CACHE });
}
