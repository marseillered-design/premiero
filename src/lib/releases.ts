import { getCalendar, hasToken } from './tmdb';
import { GAME_GENRE_OFFSET, getGameCalendar, hasIgdb } from './igdb';
import { GAME_GENRES, gameGenreName } from './game-genres';
import type { CalendarData, CountryCode, Lang } from './types';

export const hasAnySource = () => hasToken() || hasIgdb();

/**
 * Календарь месяца: фильмы и сериалы из TMDB плюс игры из IGDB.
 * Если один источник не ответил, показываем то, что пришло из другого.
 */
export async function getReleases(country: CountryCode, lang: Lang, month: string): Promise<CalendarData> {
  const [screen, games] = await Promise.allSettled([
    hasToken() ? getCalendar(country, lang, month) : Promise.reject(new Error('no TMDB token')),
    hasIgdb() ? getGameCalendar(country, month) : Promise.reject(new Error('no IGDB keys')),
  ]);
  if (screen.status === 'rejected' && games.status === 'rejected') throw screen.reason;
  if (screen.status === 'rejected' && hasToken()) console.error('tmdb calendar', screen.reason);
  if (games.status === 'rejected' && hasIgdb()) console.error('igdb calendar', games.reason);

  const base: CalendarData = screen.status === 'fulfilled'
    ? screen.value
    : { month, country, lang, items: {}, events: [], genres: {}, providers: {}, approxRegion: false };
  if (games.status !== 'fulfilled') return base;

  const genres = { ...base.genres };
  for (const id of Object.keys(GAME_GENRES).map(Number)) genres[id + GAME_GENRE_OFFSET] = gameGenreName(id, lang)!;
  return { ...base, items: { ...base.items, ...games.value.items }, events: [...base.events, ...games.value.events], genres };
}
