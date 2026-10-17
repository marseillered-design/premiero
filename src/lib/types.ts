export type Lang = 'uk' | 'en' | 'es' | 'ru';
export type CountryCode = 'ua' | 'us' | 'mx' | 'kz' | 'uz' | 'am' | 'kg' | 'by';
export type Media = 'movie' | 'tv';
export type Kind = 'cinema' | 'online' | 'series';

/** Фильм или сериал в календаре месяца. Ключ: `${media}-${id}`. */
export interface CalItem {
  key: string;
  id: number;
  media: Media;
  title: string;
  poster: string | null;
  genres: number[];
  popularity: number;
  rating: number | null;      // средняя оценка TMDB, если голосов достаточно
  cert: string | null;        // возрастной рейтинг в выбранной стране
  theatrical?: string | null; // дата выхода в кино в выбранной стране (YYYY-MM-DD)
  digital?: string | null;    // дата цифрового релиза
  platform?: string | null;   // канал или стриминг сериала
  season?: number;
  totalEps?: number;
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
  providers: { name: string; logo: string | null }[];
  providersLink: string | null;
  releases: { country: CountryCode; date: string | null }[];
  cert: string | null;
  rating: number | null;
  network: string | null;
  season: { number: number; episodes: Episode[] } | null;
  tmdbUrl: string;
}
