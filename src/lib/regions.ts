import type { CountryCode, Lang } from './types';

export const LANGS: Record<Lang, string> = { uk: 'Українська', en: 'English', es: 'Español', pl: 'Polski', de: 'Deutsch', ru: 'Русский' };
export const LOCALE: Record<Lang, string> = { uk: 'uk-UA', en: 'en-US', es: 'es-MX', pl: 'pl-PL', de: 'de-DE', ru: 'ru-RU' };
export const LANG_CODES = Object.keys(LANGS) as Lang[];

/** Названия на нескольких языках; недостающие берутся из английского. */
export type Names = Partial<Record<Lang, string>> & { en: string };
export const nameIn = (n: Names, lang: Lang) => n[lang] ?? n.en;

export type RegionGroup = 'europe' | 'americas' | 'asia';
export interface Country {
  name: Names;
  group: RegionGroup;
  region: string;     // код страны в TMDB (ISO 3166-1)
  lang: Lang;         // язык интерфейса по умолчанию
  streaming: boolean; // есть ли у TMDB данные о стримингах в стране
}

export const COUNTRIES: Record<CountryCode, Country> = {
  ua: { name: { en: 'Ukraine', uk: 'Україна', es: 'Ucrania', pl: 'Ukraina', de: 'Ukraine', ru: 'Украина' }, group: 'europe', region: 'UA', lang: 'uk', streaming: true },
  pl: { name: { en: 'Poland', uk: 'Польща', es: 'Polonia', pl: 'Polska', de: 'Polen', ru: 'Польша' }, group: 'europe', region: 'PL', lang: 'pl', streaming: true },
  de: { name: { en: 'Germany', uk: 'Німеччина', es: 'Alemania', pl: 'Niemcy', de: 'Deutschland', ru: 'Германия' }, group: 'europe', region: 'DE', lang: 'de', streaming: true },
  gb: { name: { en: 'United Kingdom', uk: 'Велика Британія', es: 'Reino Unido', pl: 'Wielka Brytania', de: 'Vereinigtes Königreich', ru: 'Великобритания' }, group: 'europe', region: 'GB', lang: 'en', streaming: true },
  fr: { name: { en: 'France', uk: 'Франція', es: 'Francia', pl: 'Francja', de: 'Frankreich', ru: 'Франция' }, group: 'europe', region: 'FR', lang: 'en', streaming: true },
  es: { name: { en: 'Spain', uk: 'Іспанія', es: 'España', pl: 'Hiszpania', de: 'Spanien', ru: 'Испания' }, group: 'europe', region: 'ES', lang: 'es', streaming: true },
  it: { name: { en: 'Italy', uk: 'Італія', es: 'Italia', pl: 'Włochy', de: 'Italien', ru: 'Италия' }, group: 'europe', region: 'IT', lang: 'en', streaming: true },
  nl: { name: { en: 'Netherlands', uk: 'Нідерланди', es: 'Países Bajos', pl: 'Holandia', de: 'Niederlande', ru: 'Нидерланды' }, group: 'europe', region: 'NL', lang: 'en', streaming: true },
  cz: { name: { en: 'Czechia', uk: 'Чехія', es: 'Chequia', pl: 'Czechy', de: 'Tschechien', ru: 'Чехия' }, group: 'europe', region: 'CZ', lang: 'en', streaming: true },
  ro: { name: { en: 'Romania', uk: 'Румунія', es: 'Rumania', pl: 'Rumunia', de: 'Rumänien', ru: 'Румыния' }, group: 'europe', region: 'RO', lang: 'en', streaming: true },
  lt: { name: { en: 'Lithuania', uk: 'Литва', es: 'Lituania', pl: 'Litwa', de: 'Litauen', ru: 'Литва' }, group: 'europe', region: 'LT', lang: 'en', streaming: true },
  lv: { name: { en: 'Latvia', uk: 'Латвія', es: 'Letonia', pl: 'Łotwa', de: 'Lettland', ru: 'Латвия' }, group: 'europe', region: 'LV', lang: 'en', streaming: true },
  ee: { name: { en: 'Estonia', uk: 'Естонія', pl: 'Estonia', de: 'Estland', ru: 'Эстония' }, group: 'europe', region: 'EE', lang: 'en', streaming: true },
  md: { name: { en: 'Moldova', uk: 'Молдова', es: 'Moldavia', pl: 'Mołdawia', de: 'Moldau', ru: 'Молдова' }, group: 'europe', region: 'MD', lang: 'en', streaming: false },
  by: { name: { en: 'Belarus', uk: 'Білорусь', es: 'Bielorrusia', pl: 'Białoruś', de: 'Belarus', ru: 'Беларусь' }, group: 'europe', region: 'BY', lang: 'ru', streaming: false },
  us: { name: { en: 'United States', uk: 'США', es: 'Estados Unidos', pl: 'Stany Zjednoczone', de: 'Vereinigte Staaten', ru: 'США' }, group: 'americas', region: 'US', lang: 'en', streaming: true },
  mx: { name: { en: 'Mexico', uk: 'Мексика', es: 'México', pl: 'Meksyk', de: 'Mexiko', ru: 'Мексика' }, group: 'americas', region: 'MX', lang: 'es', streaming: true },
  ge: { name: { en: 'Georgia', uk: 'Грузія', es: 'Georgia', pl: 'Gruzja', de: 'Georgien', ru: 'Грузия' }, group: 'asia', region: 'GE', lang: 'en', streaming: false },
  am: { name: { en: 'Armenia', uk: 'Вірменія', pl: 'Armenia', de: 'Armenien', ru: 'Армения' }, group: 'asia', region: 'AM', lang: 'ru', streaming: false },
  kz: { name: { en: 'Kazakhstan', uk: 'Казахстан', es: 'Kazajistán', pl: 'Kazachstan', de: 'Kasachstan', ru: 'Казахстан' }, group: 'asia', region: 'KZ', lang: 'ru', streaming: false },
  uz: { name: { en: 'Uzbekistan', uk: 'Узбекистан', es: 'Uzbekistán', pl: 'Uzbekistan', de: 'Usbekistan', ru: 'Узбекистан' }, group: 'asia', region: 'UZ', lang: 'ru', streaming: false },
  kg: { name: { en: 'Kyrgyzstan', uk: 'Киргизстан', es: 'Kirguistán', pl: 'Kirgistan', de: 'Kirgisistan', ru: 'Кыргызстан' }, group: 'asia', region: 'KG', lang: 'ru', streaming: false },
};

export const COUNTRY_CODES = Object.keys(COUNTRIES) as CountryCode[];
export const GROUPS: RegionGroup[] = ['europe', 'americas', 'asia'];
export const isCountry = (v: unknown): v is CountryCode => typeof v === 'string' && v in COUNTRIES;
export const isLang = (v: unknown): v is Lang => typeof v === 'string' && v in LANGS;

/**
 * Адрес картинки по размеру TMDB (w92…w1280). Картинки игр приходят как `igdb:cover:ID`
 * или `igdb:shot:ID`, для них подбираем ближайший размер IGDB.
 */
export const IMG = (path: string | null, size = 'w342') => {
  if (!path) return null;
  if (!path.startsWith('igdb:')) return `https://image.tmdb.org/t/p/${size}${path}`;
  const [, type, id] = path.split(':');
  const w = Number(size.slice(1)) || 342;
  const t = type === 'cover'
    ? (w <= 92 ? 'cover_small' : w <= 264 ? 'cover_big' : 'cover_big_2x')
    : (w <= 569 ? 'screenshot_med' : w <= 889 ? 'screenshot_big' : '1080p');
  return `https://images.igdb.com/igdb/image/upload/t_${t}/${id}.jpg`;
};

/** Куки с выбором посетителя: proxy на «/» уводит по ним, а не по IP. */
export const PREF_COOKIE = 'premiero_loc';
