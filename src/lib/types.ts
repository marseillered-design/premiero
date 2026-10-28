export type Lang = 'uk' | 'en' | 'es' | 'fr' | 'pl' | 'de' | 'ru';
export type CountryCode =
  | 'ua' | 'pl' | 'de' | 'gb' | 'fr' | 'es' | 'it' | 'nl' | 'cz' | 'ro' | 'lt' | 'lv' | 'ee' | 'md' | 'by'
  | 'us' | 'mx'
  | 'ge' | 'am' | 'kz' | 'uz' | 'kg';
export type Media = 'movie' | 'tv' | 'game';
export type TmdbMedia = Exclude<Media, 'game'>;
export type Kind = 'cinema' | 'online' | 'disc' | 'series' | 'game';
/** Семейства игровых платформ для фильтра. */
export type Platform = 'pc' | 'ps' | 'xbox' | 'nintendo' | 'mobile';

export interface Provider { id: number; name: string; logo: string | null }

/** Фильм, сериал или игра в календаре месяца. Ключ: `${media}-${id}`. */
export interface CalItem {
  key: string;
  id: number;
  media: Media;
  title: string;
  poster: string | null;
  backdrop?: string | null;   // кадр из фильма для больших карточек
  genres: number[];
  popularity: number;
  rating: number | null;      // средняя оценка TMDB, если голосов достаточно
  cert: string | null;        // возрастной рейтинг в выбранной стране
  theatrical?: string | null; // дата выхода в кино в выбранной стране (YYYY-MM-DD)
  digital?: string | null;    // дата цифрового релиза
  physical?: string | null;   // выход на Blu-ray/DVD
  platform?: string | null;   // канал или стриминг сериала
  season?: number;
  totalEps?: number;
  anime?: boolean;            // японская анимация: жанр «анимация» + язык оригинала ja
  providers?: number[];       // стриминги по подписке в выбранной стране (id TMDB)
  platforms?: Platform[];     // у игр: семейства платформ релиза в этом месяце
}

export interface CalEvent {
  item: string;
  date: string;              // YYYY-MM-DD
  kind: Kind;
  eps?: number[];
  premiere?: boolean;
  finale?: boolean;
  approx?: boolean;          // дата мировой премьеры, а не страны
  plat?: string[];           // у игр: платформы, на которых игра выходит в этот день
}

export interface CalendarData {
  month: string;             // YYYY-MM
  country: CountryCode;
  lang: Lang;
  items: Record<string, CalItem>;
  events: CalEvent[];
  genres: Record<number, string>;
  providers: Record<number, Provider>;
  approxRegion: boolean;
  want?: Record<string, number>;  // сколько аккаунтов отметили релиз (только больше нуля)
}

/** Человек из титров TMDB; photo — путь к фото TMDB или null. */
export interface Person { id: number; name: string; character?: string; photo: string | null }

export interface Episode { n: number; name: string; date: string | null }

export interface TitleDetail {
  titles: Record<Lang, string>;   // название на каждом языке сайта — для адресов языковых версий
  id: number;
  media: TmdbMedia;
  title: string;
  original: string;
  overview: string;
  poster: string | null;
  backdrop: string | null;
  runtime: number | null;
  year: string | null;
  genres: string[];
  people: Person[];          // режиссёр фильма или авторы сериала
  cast: Person[];            // главные роли: имя, персонаж, фото
  trailer: string | null;    // ключ видео на YouTube
  trailerName: string | null; // название ролика в TMDB, например «… Season 2 Official Trailer»
  trailerDate?: string | null; // когда ролик выложен (для VideoObject в schema.org)
  providers: Provider[];
  providersLink: string | null;
  releases: { country: CountryCode; date: string | null }[];
  cert: string | null;
  rating: number | null;
  network: string | null;
  season: { number: number; episodes: Episode[] } | null;
  theatrical: string | null; // дата в кино в выбранной стране
  digital: string | null;
  physical: string | null;   // Blu-ray, 4K, DVD
  nextEpisode: { date: string; season: number; episode: number } | null;
  popularity: number;
  anime: boolean;
  imdbId: string | null;
  tmdbUrl: string;
}

/** Игра из IGDB для страницы игры. Картинки: `igdb:cover:…` и `igdb:shot:…`, см. IMG(). */
export interface GameDetail {
  id: number;
  title: string;
  summary: string;           // только по-английски: IGDB не переводит описания
  poster: string | null;
  backdrop: string | null;
  screenshots: string[];
  genres: number[];
  modes: string[];
  developers: string[];
  publishers: string[];
  rating: number | null;     // общая оценка IGDB по шкале 10
  ratingCount: number;
  release: string | null;    // первая точная дата выхода
  releases: { platform: string; date: string | null }[];
  trailer: string | null;
  trailerName: string | null;
  stores: { name: string; url: string }[];
  igdbUrl: string;
  popularity: number;
}

/** Запись в «Моём списке»: хватает, чтобы показать карточку без запроса к TMDB или IGDB. */
export interface WatchItem {
  key: string;               // `${media}-${id}`
  media: Media;
  id: number;
  title: string;
  poster: string | null;
  date: string | null;       // ближайшая дата выхода на момент добавления
  ep?: string | null;        // у сериала: номер ближайшей серии, «2×05» (заполняет сервер)
  chk?: string;              // когда сервер последний раз сверял дату, YYYY-MM-DD
}
