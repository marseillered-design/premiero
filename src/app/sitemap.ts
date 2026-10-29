import type { MetadataRoute } from 'next';
import { connection } from 'next/server';
import { COUNTRIES, COUNTRY_CODES, indexedLangs, isCountry, hreflangs } from '@/lib/regions';
import { getReleases, hasAnySource } from '@/lib/releases';
import { titlePath } from '@/lib/slug';
import { SITE } from '@/lib/site';
import { facetsFor, type FacetSection } from '@/lib/facets';

/*
 * Карта сайта из нескольких файлов: /sitemap/pages.xml — календари всех стран на всех языках,
 * /sitemap/ua.xml и т. д. — страницы фильмов, сериалов и игр этого и следующего месяца
 * на основном языке страны. Список всех файлов отдаёт robots.txt.
 */
export async function generateSitemaps() {
  return [{ id: 'pages' }, ...COUNTRY_CODES.map(id => ({ id }))];
}

const SECTIONS = ['', '/movies', '/series', '/games', '/upcoming'];
const FACET_SECTIONS: FacetSection[] = ['movies', 'series', 'games'];

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const key = await id;
  if (key === 'pages') {
    const paths = (country: (typeof COUNTRY_CODES)[number]) => [...SECTIONS, ...FACET_SECTIONS.flatMap(sec => facetsFor(sec, country).map(f => `/${sec}/${f.slug}`))];
    return COUNTRY_CODES.flatMap(country => paths(country).flatMap(section => indexedLangs(country).map(lang => ({
      url: `${SITE}/${lang}/${country}${section}`,
      changeFrequency: 'daily' as const,
      priority: !section ? 1 : section.split('/').length > 2 ? 0.7 : 0.8,
      alternates: { languages: hreflangs(country, l => `${SITE}/${l}/${country}${section}`) },
    }))));
  }
  // Строится по запросу, а не при сборке: иначе сборка ходила бы в TMDB и IGDB за всеми странами.
  // Сами данные берутся из кэша календаря, который каждую ночь прогревает /api/warm.
  // connection() — до проверки ключей: на Google Cloud ключи есть только у работающего сервера,
  // а не при сборке, и пустая карта иначе застыла бы в сборке.
  await connection();
  if (!isCountry(key) || !hasAnySource()) return [];
  const lang = COUNTRIES[key].lang;
  const now = new Date();
  const months = [0, 1].map(n => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + n, 1));
    return d.toISOString().slice(0, 7);
  });
  const calendars = await Promise.all(months.map(m => getReleases(key, lang, m).catch(() => null)));

  const seen = new Set<string>();
  const out: MetadataRoute.Sitemap = [];
  for (const data of calendars) {
    if (!data) continue;
    for (const it of Object.values(data.items)) {
      if (seen.has(it.key)) continue;
      seen.add(it.key);
      out.push({ url: SITE + titlePath(lang, key, it.media, it.id, it.title), changeFrequency: 'weekly', priority: 0.6 });
    }
  }
  return out;
}
