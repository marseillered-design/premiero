import { getTitle, hasToken } from './tmdb';
import { getGame, hasIgdb } from './igdb';
import type { CountryCode, Lang, WatchItem } from './types';

/**
 * Текущая дата релиза из списка: её могли перенести с тех пор, как его отметили.
 * undefined — узнать не удалось (тогда оставляем сохранённую дату).
 */
export async function currentDate(it: WatchItem, lang: Lang, country: CountryCode): Promise<string | null | undefined> {
  try {
    if (it.media === 'game') return hasIgdb() ? (await getGame(it.id, country))?.release : undefined;
    if (!hasToken()) return undefined;
    const d = await getTitle(it.media, it.id, lang, country);
    if (!d) return undefined;
    // у сериала — следующая серия, у фильма — кино, иначе онлайн-релиз
    return it.media === 'tv' ? d.nextEpisode?.date ?? it.date : d.theatrical ?? d.digital;
  } catch { return undefined; }
}
