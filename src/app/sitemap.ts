import type { MetadataRoute } from 'next';
import { connection } from 'next/server';
import { COUNTRIES, COUNTRY_CODES, LANG_CODES, isCountry } from '@/lib/regions';
import { getReleases, hasAnySource } from '@/lib/releases';
import { titlePath } from '@/lib/slug';
import { SITE } from '@/lib/site';

/*
 * Карта сайта из нескольких файлов: /sitemap/pages.xml — календари всех стран на всех языках,
 * /sitemap/ua.xml и т. д. — страницы фильмов, сериалов и игр этого и следующего месяца
 * на основном языке страны. Список всех файлов отдаёт robots.txt.
 */
export async function generateSitemaps() {
  return [{ id: 'pages' }, ...COUNTRY_CODES.map(id => ({ id }))];
}

const SECTIONS = ['', '/games'];

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const key = await id;
  if (key === 'pages') {
    return COUNTRY_CODES.flatMap(country => SECTIONS.flatMap(section => LANG_CODES.map(lang => ({
      url: `${SITE}/${lang}/${country}${section}`,
      changeFrequency: 'daily' as const,
      priority: section ? 0.8 : 1,
      alternates: { languages: Object.fromEntries(LANG_CODES.map(l => [`${l}-${country.toUpperCase()}`, `${SITE}/${l}/${country}${section}`])) },
    }))));
  }
  if (!isCountry(key) || !hasAnySource()) return [];

  // Строится по запросу, а не при сборке: иначе сборка ходила бы в TMDB и IGDB за всеми странами.
  // Сами данные берутся из кэша календаря, который каждую ночь прогревает /api/warm.
  await connection();
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
