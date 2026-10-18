export type Lang = 'uk' | 'en' | 'es' | 'pl' | 'de' | 'ru';
export type CountryCode =
  | 'ua' | 'pl' | 'de' | 'gb' | 'fr' | 'es' | 'it' | 'nl' | 'cz' | 'ro' | 'lt' | 'lv' | 'ee' | 'md' | 'by'
  | 'us' | 'mx'
  | 'ge' | 'am' | 'kz' | 'uz' | 'kg';
export type Media = 'movie' | 'tv';
export type Kind = 'cinema' | 'online' | 'series';

export interface Provider { id: number; name: string; logo: string | null }

/** Фильм или сериал в календаре месяца. Ключ: `${media}-${id}`. */
export interface CalItem {
  key: string;
  id: number;
  media: Media;
  title: string;
  poster: string | null;
  backdrop?: string | null;   // кадр из фильма для больших карточек
  seasonArt?: boolean;        // poster — постер нового сезона, а backdrop остался от прошлых
  genres: number[];
  popularity: number;
  rating: number | null;      // средняя оценка TMDB, если голосов достаточно
  cert: string | null;        // возрастной рейтинг в выбранной стране
  theatrical?: string | null; // дата выхода в кино в выбранной стране (YYYY-MM-DD)
  digital?: string | null;    // дата цифрового релиза
  platform?: string | null;   // канал или стриминг сериала
  season?: number;
  totalEps?: number;
  anime?: boolean;            // японская анимация: жанр «анимация» + язык оригинала ja
  providers?: number[];       // стриминги по подписке в выбранной стране (id TMDB)
}

export interface CalEvent {
  item: string;
  date: string;              // YYYY-MM-DD
  kind: Kind;
  eps?: number[];
  premiere?: boolean;
  finale?: boolean;
  approx?: boolean;          // дата мировой премьеры, а не страны
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
}

export interface Episode { n: number; name: string; date: string | null }

export interface TitleDetail {
  id: number;
  media: Media;
  title: string;
  original: string;
  overview: string;
  poster: string | null;
  backdrop: string | null;
  runtime: number | null;
  year: string | null;
  genres: string[];
  people: string[];          // режиссёр фильма или авторы сериала
  cast: string[];
  trailer: string | null;    // ключ видео на YouTube
  trailerName: string | null; // название ролика в TMDB, например «… Season 2 Official Trailer»
  providers: Provider[];
  providersLink: string | null;
  releases: { country: CountryCode; date: string | null }[];
  cert: string | null;
  rating: number | null;
  network: string | null;
  season: { number: number; episodes: Episode[] } | null;
  theatrical: string | null; // дата в кино в выбранной стране
  digital: string | null;
  nextEpisode: { date: string; season: number; episode: number } | null;
  popularity: number;
  anime: boolean;
  imdbId: string | null;
  imdb: { rating: number; votes: number } | null;
  tmdbUrl: string;
}
