import { cacheLife } from 'next/cache';
import { COUNTRIES } from './regions';
import type { CalEvent, CalItem, CountryCode, GameDetail, Platform } from './types';

/*
 * Игры из IGDB (принадлежит Twitch). Ключи — приложение на dev.twitch.tv:
 * IGDB_CLIENT_ID и IGDB_CLIENT_SECRET. Без них календарь работает без игр.
 * Условия IGDB: бесплатно, для коммерческого проекта нужно партнёрство (partner@igdb.com)
 * и видимая ссылка на IGDB.com как источник данных.
 */
const API = 'https://api.igdb.com/v4';
export const hasIgdb = () => Boolean(process.env.IGDB_CLIENT_ID && process.env.IGDB_CLIENT_SECRET);

/* ---------- токен Twitch: живёт около двух месяцев, держим в памяти процесса ---------- */
let token: { value: string; until: number } | null = null;
async function accessToken(force = false) {
  if (!force && token && token.until > Date.now()) return token.value;
  const url = new URL('https://id.twitch.tv/oauth2/token');
  url.searchParams.set('client_id', process.env.IGDB_CLIENT_ID!.trim());
  url.searchParams.set('client_secret', process.env.IGDB_CLIENT_SECRET!.trim());
  url.searchParams.set('grant_type', 'client_credentials');
  const res = await fetch(url, { method: 'POST', cache: 'no-store' });
  if (!res.ok) throw new Error(`Twitch token ${res.status}`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: j.access_token, until: Date.now() + (j.expires_in - 600) * 1000 };
  return token.value;
}

/** Запрос на языке IGDB (Apicalypse): `fields …; where …; sort …; limit …;` */
async function igdb<T>(endpoint: string, body: string, retry = true): Promise<T> {
  const res = await fetch(`${API}/${endpoint}`, {
    method: 'POST', body, cache: 'no-store',
    headers: { 'Client-ID': process.env.IGDB_CLIENT_ID!.trim(), Authorization: `Bearer ${await accessToken()}`, Accept: 'application/json' },
  });
  if (res.status === 401 && retry) { await accessToken(true); return igdb<T>(endpoint, body, false); }
  if (res.status === 429 && retry) { await new Promise(r => setTimeout(r, 1100)); return igdb<T>(endpoint, body, false); }
  if (!res.ok) throw new Error(`IGDB ${res.status} ${endpoint}`);
  return res.json() as Promise<T>;
}

/* ---------- справочники ---------- */
// Регионы релиза IGDB: 1 Европа, 2 Северная Америка, 8 весь мир
const REGION_EU = 1, REGION_NA = 2, REGION_WW = 8;
const regionsFor = (country: CountryCode) => (COUNTRIES[country].group === 'americas' ? [REGION_NA, REGION_WW] : [REGION_EU, REGION_WW]);
// Типы игр: основная игра, самостоятельное дополнение, ремейк, ремастер, расширенное издание
const GAME_TYPES = '(0,4,8,9,10)';
const EROTIC_THEME = 42;
// Жанры IGDB живут рядом с жанрами TMDB, поэтому сдвигаем их номера
export const GAME_GENRE_OFFSET = 100000;

/** Семейство платформы для фильтра: по названию надёжнее, чем по номерам. */
export function platformFamily(name: string): Platform | null {
  const n = name.toLowerCase();
  if (/playstation|ps vita|psp/.test(n)) return 'ps';
  if (/xbox/.test(n)) return 'xbox';
  if (/nintendo|switch|wii/.test(n)) return 'nintendo';
  if (/android|ios|iphone|ipad/.test(n)) return 'mobile';
  if (/pc \(microsoft windows\)|windows|mac|linux|steamos|pc dos/.test(n)) return 'pc';
  return null;
}
/** Короткая подпись платформы: «PS5», «Switch 2», «PC». */
export function platformLabel(p: { name: string; abbreviation?: string }) {
  if (/microsoft windows/i.test(p.name)) return 'PC';
  if (/xbox series/i.test(p.name)) return 'Xbox Series';
  if (/nintendo switch 2/i.test(p.name)) return 'Switch 2';
  if (/nintendo switch/i.test(p.name)) return 'Switch';
  return p.abbreviation || p.name;
}

const day = (unix: number) => new Date(unix * 1000).toISOString().slice(0, 10);
const shot = (id: string | undefined) => (id ? `igdb:shot:${id}` : null);
const cover = (id: string | undefined) => (id ? `igdb:cover:${id}` : null);
/**
 * Шкала, сравнимая с популярностью TMDB: ожидание до выхода плюс оценки после.
 * Переиздания и порты старых игр (вышли больше трёх месяцев назад) опускаем ниже новинок.
 */
const gamePopularity = (g: { hypes?: number; total_rating_count?: number; first_release_date?: number }, monthStart: number) => {
  const base = (g.hypes ?? 0) * 3 + (g.total_rating_count ?? 0) * 0.5;
  const rerelease = !!g.first_release_date && g.first_release_date < monthStart - 90 * 86400;
  return Math.round(base * (rerelease ? 0.2 : 1));
};
const rating10 = (r: number | undefined, n: number | undefined) => (r && (n ?? 0) >= 3 ? Math.round(r) / 10 : null);

/* ---------- сырые ответы IGDB (только то, что читаем) ---------- */
interface RawPlatform { name: string; abbreviation?: string }
interface RawRelease { date?: number; date_format?: number; release_region?: number; platform?: RawPlatform }
interface RawImage { image_id: string }
interface RawGame {
  id: number; name: string; slug: string; summary?: string; storyline?: string;
  cover?: RawImage; artworks?: RawImage[]; screenshots?: RawImage[];
  genres?: number[]; hypes?: number; total_rating?: number; total_rating_count?: number; first_release_date?: number;
  release_dates?: RawRelease[];
}

/** Самые ожидаемые игры месяца: релизы с точной датой в Европе/мире или в Америке/мире. */
export async function getGameCalendar(country: CountryCode, month: string): Promise<{ items: Record<string, CalItem>; events: CalEvent[] }> {
  'use cache';
  cacheLife('hours');
  const [y, m] = month.split('-').map(Number);
  const from = Date.UTC(y, m - 1, 1) / 1000, to = Date.UTC(y, m, 1) / 1000;
  const regions = regionsFor(country);

  const fields = 'name,slug,cover.image_id,artworks.image_id,screenshots.image_id,genres,hypes,total_rating,total_rating_count,first_release_date,'
    + 'release_dates.date,release_dates.date_format,release_dates.release_region,release_dates.platform.name,release_dates.platform.abbreviation';
  const where = `release_dates.date >= ${from} & release_dates.date < ${to} & game_type = ${GAME_TYPES} & themes != (${EROTIC_THEME}) & cover != null`;
  // ожидание до выхода (hypes) и число оценок после: берём лучшее по обоим
  const [byHype, byRating] = await Promise.all([
    igdb<RawGame[]>('games', `fields ${fields}; where ${where} & hypes > 0; sort hypes desc; limit 70;`),
    igdb<RawGame[]>('games', `fields ${fields}; where ${where} & total_rating_count > 0; sort total_rating_count desc; limit 25;`),
  ]);

  const items: Record<string, CalItem> = {};
  const events: CalEvent[] = [];
  const seen = new Set<number>();
  for (const g of [...byHype, ...byRating]) {
    if (seen.has(g.id)) continue;
    seen.add(g.id);
    // релизы в этом месяце: точный день, наш регион; одна дата может объединять несколько платформ
    const byDate = new Map<string, Set<string>>();
    const families = new Set<Platform>();
    for (const r of g.release_dates ?? []) {
      if (!r.date || r.date < from || r.date >= to || (r.date_format ?? 0) !== 0) continue;
      if (r.release_region && !regions.includes(r.release_region)) continue;
      if (!r.platform) continue;
      const d = day(r.date);
      byDate.set(d, (byDate.get(d) ?? new Set()).add(platformLabel(r.platform)));
      const fam = platformFamily(r.platform.name);
      if (fam) families.add(fam);
    }
    if (!byDate.size) continue;
    const key = `game-${g.id}`;
    items[key] = {
      key, id: g.id, media: 'game', title: g.name, poster: cover(g.cover?.image_id),
      backdrop: shot(g.artworks?.[0]?.image_id ?? g.screenshots?.[0]?.image_id),
      genres: (g.genres ?? []).map(x => x + GAME_GENRE_OFFSET),
      popularity: gamePopularity(g, from),
      rating: rating10(g.total_rating, g.total_rating_count), cert: null,
      platforms: [...families],
    };
    for (const [date, plats] of byDate) events.push({ item: key, date, kind: 'game', plat: [...plats].sort() });
  }
  return { items, events };
}

/* ---------- страница игры ---------- */
interface RawGameFull extends RawGame {
  url?: string;
  involved_companies?: { developer: boolean; publisher: boolean; company?: { name: string } }[];
  videos?: { video_id: string; name?: string }[];
  websites?: { url: string }[];
  game_modes?: { name: string }[];
}

const STORES: [RegExp, string][] = [
  [/store\.steampowered\.com/, 'Steam'], [/epicgames\.com/, 'Epic Games Store'], [/gog\.com/, 'GOG'],
  [/store\.playstation\.com|playstation\.com/, 'PlayStation Store'], [/xbox\.com|microsoft\.com\/.*store/, 'Microsoft Store'],
  [/nintendo\.com|nintendo\.co/, 'Nintendo eShop'], [/apps\.apple\.com/, 'App Store'], [/play\.google\.com/, 'Google Play'], [/itch\.io/, 'itch.io'],
];

export async function getGame(id: number, country: CountryCode): Promise<GameDetail | null> {
  'use cache';
  cacheLife('hours');
  const list = await igdb<RawGameFull[]>('games', `fields name,slug,summary,storyline,url,cover.image_id,artworks.image_id,screenshots.image_id,genres,`
    + `total_rating,total_rating_count,first_release_date,hypes,game_modes.name,involved_companies.developer,involved_companies.publisher,involved_companies.company.name,`
    + `videos.video_id,videos.name,websites.url,release_dates.date,release_dates.date_format,release_dates.release_region,release_dates.platform.name,release_dates.platform.abbreviation;`
    + ` where id = ${id} & themes != (${EROTIC_THEME});`);
  const g = list[0];
  if (!g) return null;
  const regions = regionsFor(country);

  // по каждой платформе берём дату нашего региона, иначе самую раннюю
  const perPlatform = new Map<string, { date: string | null; exact: boolean; regional: boolean }>();
  for (const r of g.release_dates ?? []) {
    if (!r.platform) continue;
    const label = platformLabel(r.platform);
    const regional = !r.release_region || regions.includes(r.release_region);
    const cand = { date: r.date ? day(r.date) : null, exact: (r.date_format ?? 0) === 0, regional };
    const cur = perPlatform.get(label);
    if (!cur || (cand.regional && !cur.regional) || (cand.regional === cur.regional && cand.date && (!cur.date || cand.date < cur.date))) perPlatform.set(label, cand);
  }
  const releases = [...perPlatform].map(([platform, r]) => ({ platform, date: r.exact ? r.date : null }))
    .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999') || a.platform.localeCompare(b.platform));
  const dated = releases.map(r => r.date).filter((d): d is string => !!d);

  const stores = new Map<string, string>();
  for (const w of g.websites ?? []) {
    const hit = STORES.find(([re]) => re.test(w.url));
    if (hit && !stores.has(hit[1])) stores.set(hit[1], w.url);
  }
  const companies = g.involved_companies ?? [];
  const names = (pick: (c: (typeof companies)[number]) => boolean) => [...new Set(companies.filter(pick).map(c => c.company?.name).filter((n): n is string => !!n))];
  const video = g.videos?.[0];

  return {
    id: g.id, title: g.name, summary: g.summary ?? g.storyline ?? '',
    poster: cover(g.cover?.image_id), backdrop: shot(g.artworks?.[0]?.image_id ?? g.screenshots?.[0]?.image_id),
    screenshots: (g.screenshots ?? []).slice(0, 6).map(s => shot(s.image_id)!),
    genres: (g.genres ?? []).map(x => x + GAME_GENRE_OFFSET),
    modes: (g.game_modes ?? []).map(x => x.name),
    developers: names(c => c.developer), publishers: names(c => c.publisher && !c.developer),
    rating: rating10(g.total_rating, g.total_rating_count), ratingCount: g.total_rating_count ?? 0,
    release: dated.sort()[0] ?? (g.first_release_date ? day(g.first_release_date) : null),
    releases, trailer: video?.video_id ?? null, trailerName: video?.name ?? null,
    stores: [...stores].map(([name, url]) => ({ name, url })),
    igdbUrl: g.url ?? `https://www.igdb.com/games/${g.slug}`,
    popularity: gamePopularity(g, 0),
  };
}

/* ---------- поиск игр по названию ---------- */
export async function searchGames(q: string): Promise<{ key: string; media: 'game'; id: number; title: string; poster: string | null; year: string | null; popularity: number }[]> {
  'use cache';
  cacheLife('hours');
  // кавычки и обратную косую черту убираем: запрос IGDB пишется строкой
  const safeQ = q.replace(/["\\]/g, ' ').slice(0, 80);
  const list = await igdb<RawGame[]>('games', `search "${safeQ}"; fields name,cover.image_id,first_release_date,hypes,total_rating_count; where game_type = ${GAME_TYPES} & themes != (${EROTIC_THEME}) & cover != null; limit 20;`);
  // IGDB ищет по совпадению названия; из найденного показываем самые известные
  return list.map(g => ({
    key: `game-${g.id}`, media: 'game' as const, id: g.id, title: g.name, poster: cover(g.cover?.image_id),
    year: g.first_release_date ? day(g.first_release_date).slice(0, 4) : null, popularity: (g.hypes ?? 0) * 3 + (g.total_rating_count ?? 0),
  })).filter(g => g.popularity > 0).sort((a, b) => b.popularity - a.popularity).slice(0, 5);
}
