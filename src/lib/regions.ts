import type { CountryCode, Lang } from './types';

export const LANGS: Record<Lang, string> = { uk: 'Українська', en: 'English', es: 'Español', ru: 'Русский' };
export const LOCALE: Record<Lang, string> = { uk: 'uk-UA', en: 'en-US', es: 'es-MX', ru: 'ru-RU' };

type L4 = Record<Lang, string>;
export interface City { id: string; name: L4 }
export interface Country {
  name: L4;
  region: string;     // код страны в TMDB (ISO 3166-1)
  currency: string;
  decimals: number;
  basePrice: number;  // средний билет на дневной 2D-сеанс, для демо-сеансов
  round: number;
  lang: Lang;         // язык интерфейса по умолчанию
  streaming: boolean; // есть ли у TMDB данные о стримингах в стране
  cities: City[];
}

const city = (uk: string, en: string, es: string, ru: string): City => ({ id: en, name: { uk, en, es, ru } });

export const COUNTRIES: Record<CountryCode, Country> = {
  ua: { name: { uk: 'Україна', en: 'Ukraine', es: 'Ucrania', ru: 'Украина' }, region: 'UA', currency: 'UAH', decimals: 0, basePrice: 200, round: 10, lang: 'uk', streaming: true,
    cities: [city('Київ', 'Kyiv', 'Kiev', 'Киев'), city('Львів', 'Lviv', 'Leópolis', 'Львов'), city('Одеса', 'Odesa', 'Odesa', 'Одесса'), city('Харків', 'Kharkiv', 'Járkov', 'Харьков'), city('Дніпро', 'Dnipro', 'Dnipró', 'Днепр')] },
  us: { name: { uk: 'США', en: 'United States', es: 'Estados Unidos', ru: 'США' }, region: 'US', currency: 'USD', decimals: 2, basePrice: 14, round: 0.5, lang: 'en', streaming: true,
    cities: [city('Нью-Йорк', 'New York', 'Nueva York', 'Нью-Йорк'), city('Лос-Анджелес', 'Los Angeles', 'Los Ángeles', 'Лос-Анджелес'), city('Чикаго', 'Chicago', 'Chicago', 'Чикаго'), city('Г’юстон', 'Houston', 'Houston', 'Хьюстон'), city('Маямі', 'Miami', 'Miami', 'Майами')] },
  mx: { name: { uk: 'Мексика', en: 'Mexico', es: 'México', ru: 'Мексика' }, region: 'MX', currency: 'MXN', decimals: 0, basePrice: 90, round: 5, lang: 'es', streaming: true,
    cities: [city('Мехіко', 'Mexico City', 'Ciudad de México', 'Мехико'), city('Гвадалахара', 'Guadalajara', 'Guadalajara', 'Гвадалахара'), city('Монтеррей', 'Monterrey', 'Monterrey', 'Монтеррей'), city('Канкун', 'Cancún', 'Cancún', 'Канкун')] },
  kz: { name: { uk: 'Казахстан', en: 'Kazakhstan', es: 'Kazajistán', ru: 'Казахстан' }, region: 'KZ', currency: 'KZT', decimals: 0, basePrice: 2300, round: 100, lang: 'ru', streaming: false,
    cities: [city('Алмати', 'Almaty', 'Almatý', 'Алматы'), city('Астана', 'Astana', 'Astaná', 'Астана'), city('Шимкент', 'Shymkent', 'Shymkent', 'Шымкент')] },
  uz: { name: { uk: 'Узбекистан', en: 'Uzbekistan', es: 'Uzbekistán', ru: 'Узбекистан' }, region: 'UZ', currency: 'UZS', decimals: 0, basePrice: 52000, round: 1000, lang: 'ru', streaming: false,
    cities: [city('Ташкент', 'Tashkent', 'Taskent', 'Ташкент'), city('Самарканд', 'Samarkand', 'Samarcanda', 'Самарканд')] },
  am: { name: { uk: 'Вірменія', en: 'Armenia', es: 'Armenia', ru: 'Армения' }, region: 'AM', currency: 'AMD', decimals: 0, basePrice: 2800, round: 100, lang: 'ru', streaming: false,
    cities: [city('Єреван', 'Yerevan', 'Ereván', 'Ереван')] },
  kg: { name: { uk: 'Киргизстан', en: 'Kyrgyzstan', es: 'Kirguistán', ru: 'Кыргызстан' }, region: 'KG', currency: 'KGS', decimals: 0, basePrice: 360, round: 10, lang: 'ru', streaming: false,
    cities: [city('Бішкек', 'Bishkek', 'Biskek', 'Бишкек')] },
  by: { name: { uk: 'Білорусь', en: 'Belarus', es: 'Bielorrusia', ru: 'Беларусь' }, region: 'BY', currency: 'BYN', decimals: 0, basePrice: 14, round: 1, lang: 'ru', streaming: false,
    cities: [city('Мінськ', 'Minsk', 'Minsk', 'Минск'), city('Гомель', 'Gomel', 'Gómel', 'Гомель')] },
};

export const COUNTRY_CODES = Object.keys(COUNTRIES) as CountryCode[];
export const isCountry = (v: unknown): v is CountryCode => typeof v === 'string' && v in COUNTRIES;
export const isLang = (v: unknown): v is Lang => typeof v === 'string' && v in LANGS;

export const IMG = (path: string | null, size = 'w342') => (path ? `https://image.tmdb.org/t/p/${size}${path}` : null);
