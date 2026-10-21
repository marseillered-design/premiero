import { getCalendar, hasToken } from './tmdb';
import { GAME_GENRE_OFFSET, getGameCalendar, hasIgdb } from './igdb';
import { GAME_GENRES, gameGenreName } from './game-genres';
import type { CalendarData, CountryCode, Lang } from './types';

export const hasAnySource = () => hasToken() || hasIgdb();

/*
 * Один жанр — одна кнопка. У сериалов в TMDB составные жанры («Боевик и приключения»,
 * «Фантастика и фэнтези»), у игр свои «Приключения» и «Музыка»: сводим их к жанрам фильмов.
 */
const A = GAME_GENRE_OFFSET;
const SAME_GENRE: Record<number, number[]> = {
  10759: [28, 12],     // Action & Adventure → боевик, приключения
  10765: [878, 14],    // Sci-Fi & Fantasy → фантастика, фэнтези
  10768: [10752],      // War & Politics → военный
  10762: [10751],      // Kids → семейный
  [A + 31]: [12],      // игры: Adventure → приключения
  [A + 7]: [10402],    // игры: Music → музыка
};
function mergeGenres(data: CalendarData): CalendarData {
  const items = Object.fromEntries(Object.entries(data.items).map(([k, it]) => [k, { ...it, genres: [...new Set(it.genres.flatMap(g => SAME_GENRE[g] ?? [g]))] }]));
  const genres = { ...data.genres };
  for (const id of Object.keys(SAME_GENRE)) delete genres[Number(id)];
  return { ...data, items, genres };
}

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
  if (games.status !== 'fulfilled') return mergeGenres(base);

  const genres = { ...base.genres };
  for (const id of Object.keys(GAME_GENRES).map(Number)) genres[id + GAME_GENRE_OFFSET] = gameGenreName(id, lang)!;
  return mergeGenres({ ...base, items: { ...base.items, ...games.value.items }, events: [...base.events, ...games.value.events], genres });
}
