import { cacheLife } from 'next/cache';
import { COUNTRIES, COUNTRY_CODES, LOCALE } from './regions';
import type { CalendarData, CalEvent, CalItem, CountryCode, Episode, Lang, Media, Provider, TitleDetail } from './types';

const BASE = 'https://api.themoviedb.org/3';
// жанры без календарной ценности: новости, реалити, мыльные оперы, ток-шоу
const TV_SKIP_GENRES = '10763,10764,10766,10767';
const MIN_VOTES = 20;

export const hasToken = () => Boolean(process.env.TMDB_TOKEN);

type Params = Record<string, string | number | undefined>;
async function tmdb<T>(path: string, params: Params = {}): Promise<T> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  // TMDB_TOKEN принимает и Read Access Token (Bearer), и короткий API-ключ v3 (32 hex-символа)
  const token = process.env.TMDB_TOKEN!.trim();
  const headers: Record<string, string> = { accept: 'application/json' };
  if (/^[0-9a-f]{32}$/i.test(token)) url.searchParams.set('api_key', token);
  else headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`TMDB ${res.status} ${path}`);
  return res.json() as Promise<T>;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i]); }
  }));
  return out;
}
const safe = async <T>(p: Promise<T>): Promise<T | null> => { try { return await p; } catch { return null; } };

const day = (s: string | null | undefined) => (s ? s.slice(0, 10) : null);
const minDate = (dates: (string | null)[]) => dates.filter(Boolean).sort()[0] ?? null;
const inMonth = (d: string | null | undefined, month: string) => !!d && d.startsWith(month);
const ratingOf = (avg: number, votes: number) => (votes >= MIN_VOTES ? Math.round(avg * 10) / 10 : null);
const ANIMATION = 16;
const isAnime = (genres: number[], lang: string | undefined) => genres.includes(ANIMATION) && lang === 'ja';

/* ---------- raw TMDB shapes (only the fields we read) ---------- */
interface Page<T> { results: T[]; total_results: number }
interface RawMovie { id: number; title: string; poster_path: string | null; backdrop_path: string | null; genre_ids: number[]; popularity: number; vote_average: number; vote_count: number; release_date: string; original_language: string }
interface RawTv { id: number; name: string; poster_path: string | null; backdrop_path: string | null; genre_ids: number[]; popularity: number; vote_average: number; vote_count: number; original_language: string }
interface ReleaseDates { results: { iso_3166_1: string; release_dates: { type: number; release_date: string; certification: string }[] }[] }
interface Providers { results: Record<string, { link: string; flatrate?: { provider_id: number; provider_name: string; logo_path: string | null }[] }> }
interface MovieExtras { release_dates: ReleaseDates; 'watch/providers'?: Providers }
interface TvDetails {
  id: number; name: string; poster_path: string | null; backdrop_path: string | null; genres: { id: number }[]; popularity: number; vote_average: number; vote_count: number;
  original_language: string; networks: { name: string }[];
  last_episode_to_air: { season_number: number } | null; next_episode_to_air: { season_number: number } | null;
  content_ratings?: { results: { iso_3166_1: string; rating: string }[] };
  'watch/providers'?: Providers;
}

/** Стриминги по подписке в стране: id для фильтра и справочник для подписей. */
function flatrate(p: Providers | undefined, region: string, into: Record<number, Provider>) {
  const list = p?.results[region]?.flatrate ?? [];
  for (const x of list) into[x.provider_id] ??= { id: x.provider_id, name: x.provider_name, logo: x.logo_path };
  return list.map(x => x.provider_id);
}
interface Season { season_number: number; episodes: { episode_number: number; name: string; air_date: string | null }[] }

/* ---------- genres ---------- */
async function getGenres(lang: Lang): Promise<Record<number, string>> {
  'use cache';
  cacheLife('days');
  const language = LOCALE[lang];
  const [m, t] = await Promise.all([
    tmdb<{ genres: { id: number; name: string }[] }>('/genre/movie/list', { language }),
    tmdb<{ genres: { id: number; name: string }[] }>('/genre/tv/list', { language }),
  ]);
  return Object.fromEntries([...m.genres, ...t.genres].map(g => [g.id, g.name.toLowerCase()]));
}

/* ---------- month calendar ---------- */
export async function getCalendar(country: CountryCode, lang: Lang, month: string): Promise<CalendarData> {
  'use cache';
  cacheLife('hours');

  const C = COUNTRIES[country];
  const language = LOCALE[lang];
  const [y, m] = month.split('-').map(Number);
  const start = `${month}-01`;
  const end = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
  const items: Record<string, CalItem> = {};
  const events: CalEvent[] = [];
  const providers: Record<number, Provider> = {};

  // Фильмы: кинопрокат и цифровые релизы в выбранной стране
  const discover = (type: string, page: number) => tmdb<Page<RawMovie>>('/discover/movie', {
    region: C.region, language, with_release_type: type, 'release_date.gte': start, 'release_date.lte': end,
    sort_by: 'popularity.desc', include_adult: 'false', page,
  });
  const pages = await Promise.all([discover('2|3', 1), discover('2|3', 2), discover('2|3', 3), discover('4', 1), discover('4', 2)].map(safe));
  const theatricalFound = pages[0]?.total_results ?? 0;

  // В странах с редкими региональными датами показываем мировые премьеры
  const approxRegion = theatricalFound < 5;
  let worldwide: RawMovie[] = [];
  if (approxRegion) {
    const ww = await Promise.all([1, 2].map(page => safe(tmdb<Page<RawMovie>>('/discover/movie', {
      language, with_release_type: '2|3', 'primary_release_date.gte': start, 'primary_release_date.lte': end,
      sort_by: 'popularity.desc', include_adult: 'false', page,
    }))));
    worldwide = ww.flatMap(p => p?.results ?? []);
  }

  const movies = new Map<number, RawMovie>();
  for (const p of pages) for (const r of p?.results ?? []) movies.set(r.id, r);
  for (const r of worldwide) if (!movies.has(r.id)) movies.set(r.id, r);
  const approxIds = new Set(worldwide.map(r => r.id));

  const list = [...movies.values()].slice(0, 80);
  const extras = await mapLimit(list, 8, mv => safe(tmdb<MovieExtras>(`/movie/${mv.id}`, { append_to_response: 'release_dates,watch/providers' })));
  list.forEach((mv, i) => {
    const regional = extras[i]?.release_dates.results.find(r => r.iso_3166_1 === C.region)?.release_dates ?? [];
    let theatrical = minDate(regional.filter(r => r.type === 2 || r.type === 3).map(r => day(r.release_date)));
    const digital = minDate(regional.filter(r => r.type === 4).map(r => day(r.release_date)));
    const approx = !theatrical && approxIds.has(mv.id);
    if (approx) theatrical = day(mv.release_date);
    const key = `movie-${mv.id}`;
    const item: CalItem = {
      key, id: mv.id, media: 'movie', title: mv.title, poster: mv.poster_path, backdrop: mv.backdrop_path, genres: mv.genre_ids,
      popularity: mv.popularity, rating: ratingOf(mv.vote_average, mv.vote_count),
      cert: regional.map(r => r.certification).find(Boolean) || null, theatrical, digital,
      anime: isAnime(mv.genre_ids, mv.original_language),
      providers: flatrate(extras[i]?.['watch/providers'], C.region, providers),
    };
    let used = false;
    if (inMonth(theatrical, month)) { events.push({ item: key, date: theatrical!, kind: 'cinema', approx }); used = true; }
    if (inMonth(digital, month)) { events.push({ item: key, date: digital!, kind: 'online' }); used = true; }
    if (used) items[key] = item;
  });

  // Сериалы: серии, которые выходят в этом месяце
  const tvParams: Params = {
    language, 'air_date.gte': start, 'air_date.lte': end, sort_by: 'popularity.desc', without_genres: TV_SKIP_GENRES,
    ...(C.streaming ? { watch_region: C.region, with_watch_monetization_types: 'flatrate' } : {}),
  };
  const tvPages = await Promise.all([1, 2].map(page => safe(tmdb<Page<RawTv>>('/discover/tv', { ...tvParams, page }))));
  const shows = tvPages.flatMap(p => p?.results ?? []).slice(0, 30);
  await mapLimit(shows, 6, async show => {
    const det = await safe(tmdb<TvDetails>(`/tv/${show.id}`, { language, append_to_response: 'content_ratings,watch/providers' }));
    if (!det) return;
    const seasonNums = [...new Set([det.last_episode_to_air?.season_number, det.next_episode_to_air?.season_number].filter((n): n is number => typeof n === 'number' && n > 0))];
    for (const sn of seasonNums) {
      const season = await safe(tmdb<Season>(`/tv/${show.id}/season/${sn}`, { language }));
      if (!season) continue;
      const total = season.episodes.length;
      const byDate = new Map<string, number[]>();
      for (const ep of season.episodes) if (inMonth(ep.air_date, month)) {
        const d = ep.air_date!;
        byDate.set(d, [...(byDate.get(d) ?? []), ep.episode_number]);
      }
      if (!byDate.size) continue;
      const key = `tv-${show.id}`;
      items[key] = {
        key, id: show.id, media: 'tv', title: det.name || show.name, poster: det.poster_path ?? show.poster_path, backdrop: det.backdrop_path ?? show.backdrop_path,
        genres: det.genres.map(g => g.id), popularity: det.popularity, rating: ratingOf(det.vote_average, det.vote_count),
        cert: det.content_ratings?.results.find(r => r.iso_3166_1 === C.region)?.rating || null,
        platform: det.networks[0]?.name ?? null, season: sn, totalEps: total,
        anime: isAnime(det.genres.map(g => g.id), det.original_language ?? show.original_language),
        providers: flatrate(det['watch/providers'], C.region, providers),
      };
      for (const [date, eps] of byDate) {
        events.push({ item: key, date, kind: 'series', eps: eps.sort((a, b) => a - b), premiere: eps.includes(1), finale: eps.includes(total) });
      }
    }
  });

  const genres = await safe(getGenres(lang)) ?? {};
  return { month, country, lang, items, events, genres, providers, approxRegion };
}

/* ---------- now playing (для кинотеатров и сеансов) ---------- */
export async function getNowPlaying(country: CountryCode, lang: Lang): Promise<CalItem[]> {
  'use cache';
  cacheLife('hours');

  const C = COUNTRIES[country];
  const language = LOCALE[lang];
  const pages = await Promise.all([1, 2].map(page => safe(tmdb<Page<RawMovie>>('/movie/now_playing', { region: C.region, language, page }))));
  const list = [...new Map(pages.flatMap(p => p?.results ?? []).map(r => [r.id, r])).values()].slice(0, 30);
  const dates = await mapLimit(list, 8, mv => safe(tmdb<ReleaseDates>(`/movie/${mv.id}/release_dates`)));
  return list.map((mv, i) => {
    const regional = dates[i]?.results.find(r => r.iso_3166_1 === C.region)?.release_dates ?? [];
    return {
      key: `movie-${mv.id}`, id: mv.id, media: 'movie' as const, title: mv.title, poster: mv.poster_path, backdrop: mv.backdrop_path, genres: mv.genre_ids,
      popularity: mv.popularity, rating: ratingOf(mv.vote_average, mv.vote_count),
      cert: regional.map(r => r.certification).find(Boolean) || null,
      theatrical: minDate(regional.filter(r => r.type === 2 || r.type === 3).map(r => day(r.release_date))) ?? day(mv.release_date),
      digital: minDate(regional.filter(r => r.type === 4).map(r => day(r.release_date))),
      anime: isAnime(mv.genre_ids, mv.original_language),
    };
  });
}

/* ---------- IMDb rating via OMDb (нужен OMDB_API_KEY, бесплатно до 1000 запросов в день) ---------- */
async function fetchImdbRating(imdbId: string): Promise<{ rating: number; votes: number } | null> {
  'use cache';
  cacheLife('days');
  const res = await fetch(`https://www.omdbapi.com/?i=${encodeURIComponent(imdbId)}&apikey=${process.env.OMDB_API_KEY}`);
  // ошибку ключа или лимита бросаем, чтобы она не попала в суточный кэш
  if (!res.ok) throw new Error(`OMDb ${res.status}`);
  const j = await res.json() as { Response?: string; imdbRating?: string; imdbVotes?: string };
  const rating = Number(j.imdbRating);
  if (j.Response !== 'True' || !Number.isFinite(rating) || rating <= 0) return null;
  return { rating, votes: Number((j.imdbVotes ?? '0').replace(/[^\d]/g, '')) || 0 };
}
async function getImdbRating(imdbId: string | null | undefined) {
  if (!imdbId || !process.env.OMDB_API_KEY) return null;
  return safe(fetchImdbRating(imdbId));
}

/* ---------- title details ---------- */
interface Credits { cast: { name: string }[]; crew: { name: string; job: string }[] }
interface Videos { results: { key: string; site: string; type: string; iso_639_1: string; official: boolean }[] }
interface EpisodeRef { air_date: string | null; season_number: number; episode_number: number }
interface MovieFull {
  id: number; title: string; original_title: string; overview: string; poster_path: string | null; backdrop_path: string | null;
  runtime: number | null; release_date: string; genres: { id: number; name: string }[]; vote_average: number; vote_count: number;
  popularity: number; original_language: string; imdb_id: string | null;
  credits: Credits; videos: Videos; release_dates: ReleaseDates; 'watch/providers': Providers;
}
interface TvFull {
  id: number; name: string; original_name: string; overview: string; poster_path: string | null; backdrop_path: string | null;
  episode_run_time: number[]; first_air_date: string; genres: { id: number; name: string }[]; vote_average: number; vote_count: number;
  popularity: number; original_language: string; created_by: { name: string }[]; networks: { name: string }[];
  external_ids: { imdb_id: string | null };
  last_episode_to_air: EpisodeRef | null; next_episode_to_air: EpisodeRef | null;
  credits: Credits; videos: Videos; 'watch/providers': Providers; content_ratings: { results: { iso_3166_1: string; rating: string }[] };
}

/** Карточка фильма или сериала; `null`, если такого тайтла в TMDB нет. */
export async function getTitle(media: Media, id: number, lang: Lang, country: CountryCode): Promise<TitleDetail | null> {
  'use cache';
  cacheLife('hours');

  const C = COUNTRIES[country];
  const language = LOCALE[lang];
  const videoLangs = [...new Set([lang, 'en'])].join(',');
  const pickTrailer = (v: Videos) => {
    const yt = v.results.filter(x => x.site === 'YouTube' && (x.type === 'Trailer' || x.type === 'Teaser'));
    const best = yt.find(x => x.iso_639_1 === lang && x.type === 'Trailer') ?? yt.find(x => x.type === 'Trailer') ?? yt[0];
    return best?.key ?? null;
  };
  const providersOf = (p: Providers) => {
    const r = p.results[C.region];
    return {
      providers: (r?.flatrate ?? []).map<Provider>(x => ({ id: x.provider_id, name: x.provider_name, logo: x.logo_path })),
      providersLink: r?.link ?? null,
    };
  };

  if (media === 'movie') {
    const m = await safe(tmdb<MovieFull>(`/movie/${id}`, { language, append_to_response: 'credits,videos,release_dates,watch/providers', include_video_language: videoLangs }));
    if (!m) return null;
    const releases = COUNTRY_CODES.map(code => {
      const rd = m.release_dates.results.find(r => r.iso_3166_1 === COUNTRIES[code].region)?.release_dates ?? [];
      return { country: code, date: minDate(rd.filter(r => r.type === 2 || r.type === 3).map(r => day(r.release_date))) };
    });
    const regional = m.release_dates.results.find(r => r.iso_3166_1 === C.region)?.release_dates ?? [];
    return {
      id, media, title: m.title, original: m.original_title, overview: m.overview, poster: m.poster_path, backdrop: m.backdrop_path,
      runtime: m.runtime || null, year: m.release_date?.slice(0, 4) || null, genres: m.genres.map(g => g.name.toLowerCase()),
      people: m.credits.crew.filter(c => c.job === 'Director').map(c => c.name).slice(0, 2),
      cast: m.credits.cast.slice(0, 5).map(c => c.name), trailer: pickTrailer(m.videos), ...providersOf(m['watch/providers']),
      releases, cert: regional.map(r => r.certification).find(Boolean) || null, rating: ratingOf(m.vote_average, m.vote_count),
      network: null, season: null,
      theatrical: minDate(regional.filter(r => r.type === 2 || r.type === 3).map(r => day(r.release_date))) ?? day(m.release_date),
      digital: minDate(regional.filter(r => r.type === 4).map(r => day(r.release_date))),
      nextEpisode: null, popularity: m.popularity, anime: isAnime(m.genres.map(g => g.id), m.original_language),
      imdbId: m.imdb_id || null, imdb: await getImdbRating(m.imdb_id),
      tmdbUrl: `https://www.themoviedb.org/movie/${id}`,
    };
  }

  const t = await safe(tmdb<TvFull>(`/tv/${id}`, { language, append_to_response: 'credits,videos,watch/providers,content_ratings,external_ids', include_video_language: videoLangs }));
  if (!t) return null;
  // показываем сезон, который выходит сейчас или вышел последним
  const seasonNo = t.next_episode_to_air?.season_number || t.last_episode_to_air?.season_number || null;
  let season: TitleDetail['season'] = null;
  if (seasonNo) {
    const s = await safe(tmdb<Season>(`/tv/${id}/season/${seasonNo}`, { language }));
    if (s) season = { number: s.season_number, episodes: s.episodes.map<Episode>(e => ({ n: e.episode_number, name: e.name, date: e.air_date })) };
  }
  const nx = t.next_episode_to_air;
  return {
    id, media, title: t.name, original: t.original_name, overview: t.overview, poster: t.poster_path, backdrop: t.backdrop_path,
    runtime: t.episode_run_time[0] ?? null, year: t.first_air_date?.slice(0, 4) || null, genres: t.genres.map(g => g.name.toLowerCase()),
    people: t.created_by.map(c => c.name).slice(0, 3), cast: t.credits.cast.slice(0, 5).map(c => c.name),
    trailer: pickTrailer(t.videos), ...providersOf(t['watch/providers']), releases: [],
    cert: t.content_ratings.results.find(r => r.iso_3166_1 === C.region)?.rating || null, rating: ratingOf(t.vote_average, t.vote_count),
    network: t.networks[0]?.name ?? null, season, theatrical: null, digital: null,
    nextEpisode: nx?.air_date ? { date: nx.air_date, season: nx.season_number, episode: nx.episode_number } : null,
    popularity: t.popularity, anime: isAnime(t.genres.map(g => g.id), t.original_language),
    imdbId: t.external_ids?.imdb_id || null, imdb: await getImdbRating(t.external_ids?.imdb_id),
    tmdbUrl: `https://www.themoviedb.org/tv/${id}`,
  };
}