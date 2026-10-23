import { getTitle, hasToken } from './tmdb';
import { getGame, hasIgdb } from './igdb';
import type { CountryCode, Lang, WatchItem } from './types';

/** Свежие данные релиза из списка: дата и, у сериала, номер ближайшей серии («2×05»). */
export interface FreshInfo { date: string | null; ep: string | null }

/**
 * Текущая дата релиза из списка: её могли перенести с тех пор, как его отметили,
 * а у сериала после выхода серии появляется дата следующей. undefined — узнать не удалось.
 */
export async function currentInfo(it: WatchItem, lang: Lang, country: CountryCode): Promise<FreshInfo | undefined> {
  try {
    if (it.media === 'game') {
      if (!hasIgdb()) return undefined;
      const g = await getGame(it.id, country);
      return g ? { date: g.release, ep: null } : undefined;
    }
    if (!hasToken()) return undefined;
    const d = await getTitle(it.media, it.id, lang, country);
    if (!d) return undefined;
    if (it.media === 'tv') {
      // сезон закончился — следующей серии нет, оставляем сохранённую дату
      const n = d.nextEpisode;
      return n ? { date: n.date, ep: `${n.season}×${String(n.episode).padStart(2, '0')}` } : { date: it.date, ep: null };
    }
    // у фильма — кино, иначе онлайн-релиз
    return { date: d.theatrical ?? d.digital, ep: null };
  } catch { return undefined; }
}

export const currentDate = async (it: WatchItem, lang: Lang, country: CountryCode) => (await currentInfo(it, lang, country))?.date;
