import { LOCALE } from './regions';
import type { Lang } from './types';

/*
 * Фраза о дате выхода для страницы релиза — как у releases.com, только на семи языках:
 * «Фильм „X“ выходит в кино в четверг, 29 октября 2026 г.». Поисковики любят такие ответы
 * на запрос «дата выхода X», а посетителю сразу понятно главное.
 */
type When = { date: string; future: boolean } | null;
export type ReleaseFacts =
  | { kind: 'movie'; title: string; country: string; cinema: When; online: When }
  | { kind: 'tv'; title: string; next: (When & { s: number; e: number }) | null }
  | { kind: 'game'; title: string; release: When; platforms: string[] };

type Words = {
  movieCinema: (t: string, d: string, future: boolean) => string;
  movieOnline: (d: string, future: boolean) => string;
  movieTba: (t: string, c: string) => string;
  tvNext: (t: string, s: number, e: number, d: string, future: boolean) => string;
  tvNone: (t: string) => string;
  game: (t: string, d: string, p: string, future: boolean) => string;
  gameTba: (t: string) => string;
};

const W: Record<Lang, Words> = {
  uk: {
    movieCinema: (t, d, f) => f ? `Фільм «${t}» виходить у кіно ${d}.` : `Фільм «${t}» вийшов у кіно ${d}.`,
    movieOnline: (d, f) => f ? `Онлайн-реліз — ${d}.` : `Онлайн-реліз відбувся ${d}.`,
    movieTba: (t, c) => `Дату виходу фільму «${t}» у країні «${c}» ще не оголошено.`,
    tvNext: (t, s, e, d, f) => f ? `Наступна серія «${t}» (${s}×${e}) виходить ${d}.` : `Остання серія «${t}» (${s}×${e}) вийшла ${d}.`,
    tvNone: t => `Нових серій «${t}» поки не заплановано.`,
    game: (t, d, p, f) => f ? `Гра «${t}» виходить ${d}${p ? ` на ${p}` : ''}.` : `Гра «${t}» вийшла ${d}${p ? ` на ${p}` : ''}.`,
    gameTba: t => `Дату виходу гри «${t}» ще не оголошено.`,
  },
  en: {
    movieCinema: (t, d, f) => f ? `${t} opens in theaters on ${d}.` : `${t} opened in theaters on ${d}.`,
    movieOnline: (d, f) => f ? `The digital release is on ${d}.` : `The digital release came out on ${d}.`,
    movieTba: (t, c) => `The release date of ${t} in ${c} has not been announced yet.`,
    tvNext: (t, s, e, d, f) => f ? `The next episode of ${t} (${s}×${e}) airs on ${d}.` : `The latest episode of ${t} (${s}×${e}) aired on ${d}.`,
    tvNone: t => `No new episodes of ${t} are scheduled yet.`,
    game: (t, d, p, f) => f ? `${t} releases on ${d}${p ? ` for ${p}` : ''}.` : `${t} was released on ${d}${p ? ` for ${p}` : ''}.`,
    gameTba: t => `The release date of ${t} has not been announced yet.`,
  },
  es: {
    movieCinema: (t, d, f) => f ? `${t} se estrena en cines el ${d}.` : `${t} se estrenó en cines el ${d}.`,
    movieOnline: (d, f) => f ? `El estreno digital es el ${d}.` : `El estreno digital fue el ${d}.`,
    movieTba: (t, c) => `La fecha de estreno de ${t} en ${c} aún no se ha anunciado.`,
    tvNext: (t, s, e, d, f) => f ? `El próximo episodio de ${t} (${s}×${e}) se emite el ${d}.` : `El último episodio de ${t} (${s}×${e}) se emitió el ${d}.`,
    tvNone: t => `Aún no hay nuevos episodios de ${t} programados.`,
    game: (t, d, p, f) => f ? `${t} sale el ${d}${p ? ` para ${p}` : ''}.` : `${t} salió el ${d}${p ? ` para ${p}` : ''}.`,
    gameTba: t => `La fecha de lanzamiento de ${t} aún no se ha anunciado.`,
  },
  fr: {
    movieCinema: (t, d, f) => f ? `« ${t} » sort au cinéma le ${d}.` : `« ${t} » est sorti au cinéma le ${d}.`,
    movieOnline: (d, f) => f ? `La sortie en ligne est prévue le ${d}.` : `La sortie en ligne a eu lieu le ${d}.`,
    movieTba: (t, c) => `La date de sortie de « ${t} » (${c}) n’a pas encore été annoncée.`,
    tvNext: (t, s, e, d, f) => f ? `Le prochain épisode de « ${t} » (${s}×${e}) sort le ${d}.` : `Le dernier épisode de « ${t} » (${s}×${e}) est sorti le ${d}.`,
    tvNone: t => `Aucun nouvel épisode de « ${t} » n’est encore prévu.`,
    game: (t, d, p, f) => f ? `« ${t} » sort le ${d}${p ? ` sur ${p}` : ''}.` : `« ${t} » est sorti le ${d}${p ? ` sur ${p}` : ''}.`,
    gameTba: t => `La date de sortie de « ${t} » n’a pas encore été annoncée.`,
  },
  pl: {
    movieCinema: (t, d, f) => f ? `Film „${t}” wchodzi do kin ${d}.` : `Film „${t}” wszedł do kin ${d}.`,
    movieOnline: (d, f) => f ? `Premiera online — ${d}.` : `Premiera online odbyła się ${d}.`,
    movieTba: (t, c) => `Data premiery filmu „${t}” w kraju „${c}” nie została jeszcze ogłoszona.`,
    tvNext: (t, s, e, d, f) => f ? `Kolejny odcinek „${t}” (${s}×${e}) zadebiutuje ${d}.` : `Ostatni odcinek „${t}” (${s}×${e}) ukazał się ${d}.`,
    tvNone: t => `Nowe odcinki „${t}” nie są jeszcze zaplanowane.`,
    game: (t, d, p, f) => f ? `Gra „${t}” ukaże się ${d}${p ? ` na ${p}` : ''}.` : `Gra „${t}” ukazała się ${d}${p ? ` na ${p}` : ''}.`,
    gameTba: t => `Data premiery gry „${t}” nie została jeszcze ogłoszona.`,
  },
  de: {
    movieCinema: (t, d, f) => f ? `„${t}“ startet am ${d} im Kino.` : `„${t}“ ist am ${d} im Kino gestartet.`,
    movieOnline: (d, f) => f ? `Der Digitalstart ist am ${d}.` : `Der Digitalstart war am ${d}.`,
    movieTba: (t, c) => `Ein Starttermin für „${t}“ in ${c} steht noch nicht fest.`,
    tvNext: (t, s, e, d, f) => f ? `Die nächste Folge von „${t}“ (${s}×${e}) erscheint am ${d}.` : `Die letzte Folge von „${t}“ (${s}×${e}) erschien am ${d}.`,
    tvNone: t => `Neue Folgen von „${t}“ sind noch nicht angekündigt.`,
    game: (t, d, p, f) => f ? `„${t}“ erscheint am ${d}${p ? ` für ${p}` : ''}.` : `„${t}“ ist am ${d}${p ? ` für ${p}` : ''} erschienen.`,
    gameTba: t => `Ein Release-Termin für „${t}“ steht noch nicht fest.`,
  },
  ru: {
    movieCinema: (t, d, f) => f ? `Фильм «${t}» выходит в кино ${d}.` : `Фильм «${t}» вышел в кино ${d}.`,
    movieOnline: (d, f) => f ? `Онлайн-релиз — ${d}.` : `Онлайн-релиз состоялся ${d}.`,
    movieTba: (t, c) => `Дата выхода фильма «${t}» в стране «${c}» пока не объявлена.`,
    tvNext: (t, s, e, d, f) => f ? `Следующая серия «${t}» (${s}×${e}) выходит ${d}.` : `Последняя серия «${t}» (${s}×${e}) вышла ${d}.`,
    tvNone: t => `Новых серий «${t}» пока не запланировано.`,
    game: (t, d, p, f) => f ? `Игра «${t}» выходит ${d}${p ? ` на ${p}` : ''}.` : `Игра «${t}» вышла ${d}${p ? ` на ${p}` : ''}.`,
    gameTba: t => `Дата выхода игры «${t}» пока не объявлена.`,
  },
};

/** Будущая дата — с днём недели в скобках: «29 октября 2026 г. (четверг)»; так не нужен предлог перед днём недели. */
function dateWords(lang: Lang, key: string, future: boolean) {
  const d = new Date(key + 'T12:00:00Z');
  const date = new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
  return future ? `${date} (${new Intl.DateTimeFormat(LOCALE[lang], { weekday: 'long', timeZone: 'UTC' }).format(d)})` : date;
}

export const whenOf = (date: string | null | undefined, today: string): When => (date ? { date, future: date >= today } : null);

export function releaseSentence(lang: Lang, f: ReleaseFacts): string {
  const w = W[lang];
  const dw = (x: { date: string; future: boolean }) => dateWords(lang, x.date, x.future);
  if (f.kind === 'movie') {
    const parts: string[] = [];
    if (f.cinema) parts.push(w.movieCinema(f.title, dw(f.cinema), f.cinema.future));
    if (f.online) parts.push(w.movieOnline(dw(f.online), f.online.future));
    return parts.length ? parts.join(' ') : w.movieTba(f.title, f.country);
  }
  if (f.kind === 'tv') return f.next ? w.tvNext(f.title, f.next.s, f.next.e, dw(f.next), f.next.future) : w.tvNone(f.title);
  const plats = f.platforms.slice(0, 5).join(', ');
  return f.release ? w.game(f.title, dw(f.release), plats, f.release.future) : w.gameTba(f.title);
}
