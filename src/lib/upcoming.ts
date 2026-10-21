import { getReleases } from './releases';
import type { CalItem, CountryCode, Kind, Lang } from './types';

export type UpcomingGroup = 'movies' | 'series' | 'games';
export interface UpcomingEntry { item: CalItem; date: string; kind: Kind }

const TOP = 20;
const GROUP_KINDS: Record<UpcomingGroup, Kind[]> = { movies: ['cinema', 'online'], series: ['series'], games: ['game'] };

/**
 * Самые ожидаемые релизы ближайших трёх месяцев в стране посетителя, отдельно для фильмов,
 * сериалов (только старты сезонов) и игр. Порядок — по популярности в TMDB и ожиданию в IGDB.
 * Календари месяцев кэшируются, поэтому страница почти ничего не стоит.
 */
export async function getUpcoming(country: CountryCode, lang: Lang, now: Date): Promise<Record<UpcomingGroup, UpcomingEntry[]>> {
  const today = now.toISOString().slice(0, 10);
  const months = [0, 1, 2].map(n => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + n, 1)).toISOString().slice(0, 7));
  const calendars = await Promise.all(months.map(m => getReleases(country, lang, m).catch(() => null)));

  const out = { movies: [], series: [], games: [] } as Record<UpcomingGroup, UpcomingEntry[]>;
  for (const group of Object.keys(GROUP_KINDS) as UpcomingGroup[]) {
    const first = new Map<string, UpcomingEntry>();
    for (const cal of calendars) {
      if (!cal) continue;
      for (const ev of cal.events) {
        if (ev.date < today || !GROUP_KINDS[group].includes(ev.kind)) continue;
        if (ev.kind === 'series' && !ev.premiere) continue;
        const item = cal.items[ev.item];
        const seen = first.get(ev.item);
        if (item && (!seen || ev.date < seen.date)) first.set(ev.item, { item, date: ev.date, kind: ev.kind });
      }
    }
    out[group] = [...first.values()].sort((a, b) => b.item.popularity - a.item.popularity).slice(0, TOP);
  }
  return out;
}
