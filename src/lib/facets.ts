import { GAME_GENRE_OFFSET as G } from './igdb';
import type { CountryCode, Platform } from './types';

/*
 * Отдельные календари, как у releases.com: «Игры для PlayStation», «Сериалы Netflix», «Фильмы ужасов».
 * У каждого свой адрес /{раздел}/{slug}, заголовок и место в карте сайта, а внутри — обычный
 * календарь раздела с уже включённым фильтром.
 */
export type FacetSection = 'movies' | 'series' | 'games';
export type Facet =
  | { slug: string; kind: 'platform'; platform: Platform }
  | { slug: string; kind: 'provider'; name: string; ids: number[]; countries?: CountryCode[] }
  | { slug: string; kind: 'genre'; ids: number[] };

// id сервисов в TMDB; у одного сервиса бывает несколько id (с рекламой, через Amazon, детский)
const PROVIDERS: Extract<Facet, { kind: 'provider' }>[] = [
  { slug: 'netflix', kind: 'provider', name: 'Netflix', ids: [8, 175, 1796] },
  { slug: 'prime-video', kind: 'provider', name: 'Prime Video', ids: [9, 119, 613, 2100] },
  { slug: 'disney-plus', kind: 'provider', name: 'Disney+', ids: [337] },
  { slug: 'apple-tv', kind: 'provider', name: 'Apple TV', ids: [350, 2243] },
  { slug: 'max', kind: 'provider', name: 'Max', ids: [1899, 1825, 384] },
  { slug: 'paramount-plus', kind: 'provider', name: 'Paramount+', ids: [531, 2303, 2616, 1853] },
  { slug: 'crunchyroll', kind: 'provider', name: 'Crunchyroll', ids: [283, 1968] },
  { slug: 'hulu', kind: 'provider', name: 'Hulu', ids: [15], countries: ['us'] },
  { slug: 'peacock', kind: 'provider', name: 'Peacock', ids: [386, 387, 2553], countries: ['us'] },
  { slug: 'skyshowtime', kind: 'provider', name: 'SkyShowtime', ids: [1773], countries: ['pl', 'cz', 'ro', 'nl', 'es', 'lt', 'lv', 'ee', 'md'] },
];

const genre = (slug: string, ...ids: number[]): Facet => ({ slug, kind: 'genre', ids });

export const FACETS: Record<FacetSection, Facet[]> = {
  games: [
    { slug: 'pc', kind: 'platform', platform: 'pc' },
    { slug: 'playstation', kind: 'platform', platform: 'ps' },
    { slug: 'xbox', kind: 'platform', platform: 'xbox' },
    { slug: 'nintendo', kind: 'platform', platform: 'nintendo' },
    { slug: 'mobile', kind: 'platform', platform: 'mobile' },
    genre('rpg', G + 12), genre('shooter', G + 5), genre('strategy', G + 15, G + 11, G + 16), genre('adventure', 12),
    genre('indie', G + 32), genre('simulator', G + 13), genre('racing', G + 10), genre('fighting', G + 4),
    genre('platformer', G + 8), genre('puzzle', G + 9), genre('sport', G + 14),
  ],
  movies: [
    ...PROVIDERS,
    genre('action', 28), genre('adventure', 12), genre('animation', 16), genre('comedy', 35), genre('crime', 80),
    genre('documentary', 99), genre('drama', 18), genre('family', 10751), genre('fantasy', 14), genre('horror', 27),
    genre('romance', 10749), genre('science-fiction', 878), genre('thriller', 53), genre('history', 36), genre('war', 10752), genre('mystery', 9648),
  ],
  series: [
    ...PROVIDERS,
    genre('drama', 18), genre('comedy', 35), genre('crime', 80), genre('animation', 16), genre('documentary', 99),
    genre('mystery', 9648), genre('action', 28), genre('science-fiction', 878), genre('fantasy', 14), genre('family', 10751), genre('war', 10752),
  ],
};

export const findFacet = (section: FacetSection, slug: string) => FACETS[section].find(f => f.slug === slug) ?? null;
/** Сервисы, которых нет в стране, не показываем и не кладём в карту сайта. */
export const facetsFor = (section: FacetSection, country: CountryCode) =>
  FACETS[section].filter(f => f.kind !== 'provider' || !f.countries || f.countries.includes(country));

/** Что календарь включает сразу: платформу, жанры или стриминг. */
export type FacetFilter = { platform?: Platform; genres?: number[]; providers?: number[]; label: string };
