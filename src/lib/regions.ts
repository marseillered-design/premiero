import type { CountryCode, Lang } from './types';

export const LANGS: Record<Lang, string> = { uk: 'Українська', en: 'English', es: 'Español', pl: 'Polski', de: 'Deutsch', ru: 'Русский' };
export const LOCALE: Record<Lang, string> = { uk: 'uk-UA', en: 'en-US', es: 'es-MX', pl: 'pl-PL', de: 'de-DE', ru: 'ru-RU' };
export const LANG_CODES = Object.keys(LANGS) as Lang[];

/** Названия на нескольких языках; недостающие берутся из английского. */
export type Names = Partial<Record<Lang, string>> & { en: string };
export const nameIn = (n: Names, lang: Lang) => n[lang] ?? n.en;

export type RegionGroup = 'europe' | 'americas' | 'asia';
export interface City { id: string; name: Names }
export interface Country {
  name: Names;
  group: RegionGroup;
  region: string;     // код страны в TMDB (ISO 3166-1)
  currency: string;
  decimals: number;
  basePrice: number;  // средний билет на дневной 2D-сеанс, для демо-сеансов
  round: number;
  lang: Lang;         // язык интерфейса по умолчанию
  streaming: boolean; // есть ли у TMDB данные о стримингах в стране
  cities: City[];
}

const city = (en: string, o: Partial<Record<Lang, string>> = {}): City => ({ id: en, name: { en, ...o } });

export const COUNTRIES: Record<CountryCode, Country> = {
  ua: { name: { en: 'Ukraine', uk: 'Україна', es: 'Ucrania', pl: 'Ukraina', de: 'Ukraine', ru: 'Украина' }, group: 'europe', region: 'UA', currency: 'UAH', decimals: 0, basePrice: 200, round: 10, lang: 'uk', streaming: true,
    cities: [city('Kyiv', { uk: 'Київ', es: 'Kiev', pl: 'Kijów', de: 'Kiew', ru: 'Киев' }), city('Lviv', { uk: 'Львів', es: 'Leópolis', pl: 'Lwów', de: 'Lwiw', ru: 'Львов' }), city('Odesa', { uk: 'Одеса', pl: 'Odessa', de: 'Odessa', ru: 'Одесса' }), city('Kharkiv', { uk: 'Харків', es: 'Járkov', pl: 'Charków', de: 'Charkiw', ru: 'Харьков' }), city('Dnipro', { uk: 'Дніпро', es: 'Dnipró', pl: 'Dniepr', ru: 'Днепр' })] },
  pl: { name: { en: 'Poland', uk: 'Польща', es: 'Polonia', pl: 'Polska', de: 'Polen', ru: 'Польша' }, group: 'europe', region: 'PL', currency: 'PLN', decimals: 0, basePrice: 28, round: 1, lang: 'pl', streaming: true,
    cities: [city('Warsaw', { uk: 'Варшава', es: 'Varsovia', pl: 'Warszawa', de: 'Warschau', ru: 'Варшава' }), city('Kraków', { uk: 'Краків', es: 'Cracovia', de: 'Krakau', ru: 'Краков' }), city('Wrocław', { uk: 'Вроцлав', es: 'Breslavia', ru: 'Вроцлав' }), city('Gdańsk', { uk: 'Гданськ', ru: 'Гданьск' }), city('Poznań', { uk: 'Познань', ru: 'Познань' })] },
  de: { name: { en: 'Germany', uk: 'Німеччина', es: 'Alemania', pl: 'Niemcy', de: 'Deutschland', ru: 'Германия' }, group: 'europe', region: 'DE', currency: 'EUR', decimals: 2, basePrice: 12, round: 0.5, lang: 'de', streaming: true,
    cities: [city('Berlin', { uk: 'Берлін', es: 'Berlín', ru: 'Берлин' }), city('Munich', { uk: 'Мюнхен', es: 'Múnich', pl: 'Monachium', de: 'München', ru: 'Мюнхен' }), city('Hamburg', { uk: 'Гамбург', es: 'Hamburgo', ru: 'Гамбург' }), city('Frankfurt', { uk: 'Франкфурт', es: 'Fráncfort', ru: 'Франкфурт' }), city('Cologne', { uk: 'Кельн', es: 'Colonia', pl: 'Kolonia', de: 'Köln', ru: 'Кёльн' })] },
  gb: { name: { en: 'United Kingdom', uk: 'Велика Британія', es: 'Reino Unido', pl: 'Wielka Brytania', de: 'Vereinigtes Königreich', ru: 'Великобритания' }, group: 'europe', region: 'GB', currency: 'GBP', decimals: 2, basePrice: 11, round: 0.5, lang: 'en', streaming: true,
    cities: [city('London', { uk: 'Лондон', es: 'Londres', pl: 'Londyn', ru: 'Лондон' }), city('Manchester', { uk: 'Манчестер', es: 'Mánchester', ru: 'Манчестер' }), city('Birmingham', { uk: 'Бірмінгем', ru: 'Бирмингем' }), city('Edinburgh', { uk: 'Единбург', es: 'Edimburgo', pl: 'Edynburg', ru: 'Эдинбург' })] },
  fr: { name: { en: 'France', uk: 'Франція', es: 'Francia', pl: 'Francja', de: 'Frankreich', ru: 'Франция' }, group: 'europe', region: 'FR', currency: 'EUR', decimals: 2, basePrice: 11, round: 0.5, lang: 'en', streaming: true,
    cities: [city('Paris', { uk: 'Париж', es: 'París', pl: 'Paryż', ru: 'Париж' }), city('Lyon', { uk: 'Ліон', ru: 'Лион' }), city('Marseille', { uk: 'Марсель', es: 'Marsella', pl: 'Marsylia', ru: 'Марсель' }), city('Toulouse', { uk: 'Тулуза', pl: 'Tuluza', ru: 'Тулуза' })] },
  es: { name: { en: 'Spain', uk: 'Іспанія', es: 'España', pl: 'Hiszpania', de: 'Spanien', ru: 'Испания' }, group: 'europe', region: 'ES', currency: 'EUR', decimals: 2, basePrice: 9, round: 0.5, lang: 'es', streaming: true,
    cities: [city('Madrid', { uk: 'Мадрид', pl: 'Madryt', ru: 'Мадрид' }), city('Barcelona', { uk: 'Барселона', ru: 'Барселона' }), city('Valencia', { uk: 'Валенсія', pl: 'Walencja', ru: 'Валенсия' }), city('Seville', { uk: 'Севілья', es: 'Sevilla', pl: 'Sewilla', de: 'Sevilla', ru: 'Севилья' })] },
  it: { name: { en: 'Italy', uk: 'Італія', es: 'Italia', pl: 'Włochy', de: 'Italien', ru: 'Италия' }, group: 'europe', region: 'IT', currency: 'EUR', decimals: 2, basePrice: 9, round: 0.5, lang: 'en', streaming: true,
    cities: [city('Rome', { uk: 'Рим', es: 'Roma', pl: 'Rzym', de: 'Rom', ru: 'Рим' }), city('Milan', { uk: 'Мілан', es: 'Milán', pl: 'Mediolan', de: 'Mailand', ru: 'Милан' }), city('Naples', { uk: 'Неаполь', es: 'Nápoles', pl: 'Neapol', de: 'Neapel', ru: 'Неаполь' }), city('Turin', { uk: 'Турин', es: 'Turín', pl: 'Turyn', ru: 'Турин' })] },
  nl: { name: { en: 'Netherlands', uk: 'Нідерланди', es: 'Países Bajos', pl: 'Holandia', de: 'Niederlande', ru: 'Нидерланды' }, group: 'europe', region: 'NL', currency: 'EUR', decimals: 2, basePrice: 13, round: 0.5, lang: 'en', streaming: true,
    cities: [city('Amsterdam', { uk: 'Амстердам', es: 'Ámsterdam', ru: 'Амстердам' }), city('Rotterdam', { uk: 'Роттердам', es: 'Róterdam', ru: 'Роттердам' }), city('The Hague', { uk: 'Гаага', es: 'La Haya', pl: 'Haga', de: 'Den Haag', ru: 'Гаага' }), city('Utrecht', { uk: 'Утрехт', ru: 'Утрехт' })] },
  cz: { name: { en: 'Czechia', uk: 'Чехія', es: 'Chequia', pl: 'Czechy', de: 'Tschechien', ru: 'Чехия' }, group: 'europe', region: 'CZ', currency: 'CZK', decimals: 0, basePrice: 220, round: 10, lang: 'en', streaming: true,
    cities: [city('Prague', { uk: 'Прага', es: 'Praga', pl: 'Praga', de: 'Prag', ru: 'Прага' }), city('Brno', { uk: 'Брно', ru: 'Брно' }), city('Ostrava', { uk: 'Острава', pl: 'Ostrawa', ru: 'Острава' })] },
  ro: { name: { en: 'Romania', uk: 'Румунія', es: 'Rumania', pl: 'Rumunia', de: 'Rumänien', ru: 'Румыния' }, group: 'europe', region: 'RO', currency: 'RON', decimals: 0, basePrice: 35, round: 1, lang: 'en', streaming: true,
    cities: [city('Bucharest', { uk: 'Бухарест', es: 'Bucarest', pl: 'Bukareszt', de: 'Bukarest', ru: 'Бухарест' }), city('Cluj-Napoca', { uk: 'Клуж-Напока', ru: 'Клуж-Напока' }), city('Timișoara', { uk: 'Тімішоара', ru: 'Тимишоара' }), city('Iași', { uk: 'Ясси', pl: 'Jassy', ru: 'Яссы' })] },
  lt: { name: { en: 'Lithuania', uk: 'Литва', es: 'Lituania', pl: 'Litwa', de: 'Litauen', ru: 'Литва' }, group: 'europe', region: 'LT', currency: 'EUR', decimals: 2, basePrice: 8, round: 0.5, lang: 'en', streaming: true,
    cities: [city('Vilnius', { uk: 'Вільнюс', es: 'Vilna', pl: 'Wilno', ru: 'Вильнюс' }), city('Kaunas', { uk: 'Каунас', pl: 'Kowno', ru: 'Каунас' })] },
  lv: { name: { en: 'Latvia', uk: 'Латвія', es: 'Letonia', pl: 'Łotwa', de: 'Lettland', ru: 'Латвия' }, group: 'europe', region: 'LV', currency: 'EUR', decimals: 2, basePrice: 8, round: 0.5, lang: 'en', streaming: true,
    cities: [city('Riga', { uk: 'Рига', pl: 'Ryga', ru: 'Рига' })] },
  ee: { name: { en: 'Estonia', uk: 'Естонія', pl: 'Estonia', de: 'Estland', ru: 'Эстония' }, group: 'europe', region: 'EE', currency: 'EUR', decimals: 2, basePrice: 9, round: 0.5, lang: 'en', streaming: true,
    cities: [city('Tallinn', { uk: 'Таллінн', ru: 'Таллин' }), city('Tartu', { uk: 'Тарту', ru: 'Тарту' })] },
  md: { name: { en: 'Moldova', uk: 'Молдова', es: 'Moldavia', pl: 'Mołdawia', de: 'Moldau', ru: 'Молдова' }, group: 'europe', region: 'MD', currency: 'MDL', decimals: 0, basePrice: 100, round: 5, lang: 'en', streaming: false,
    cities: [city('Chișinău', { uk: 'Кишинів', es: 'Chisináu', pl: 'Kiszyniów', ru: 'Кишинёв' }), city('Bălți', { uk: 'Бєльці', pl: 'Bielce', ru: 'Бельцы' })] },
  by: { name: { en: 'Belarus', uk: 'Білорусь', es: 'Bielorrusia', pl: 'Białoruś', de: 'Belarus', ru: 'Беларусь' }, group: 'europe', region: 'BY', currency: 'BYN', decimals: 0, basePrice: 14, round: 1, lang: 'ru', streaming: false,
    cities: [city('Minsk', { uk: 'Мінськ', ru: 'Минск', pl: 'Mińsk' }), city('Gomel', { uk: 'Гомель', es: 'Gómel', pl: 'Homel', de: 'Homel', ru: 'Гомель' })] },
  us: { name: { en: 'United States', uk: 'США', es: 'Estados Unidos', pl: 'Stany Zjednoczone', de: 'Vereinigte Staaten', ru: 'США' }, group: 'americas', region: 'US', currency: 'USD', decimals: 2, basePrice: 14, round: 0.5, lang: 'en', streaming: true,
    cities: [city('New York', { uk: 'Нью-Йорк', es: 'Nueva York', pl: 'Nowy Jork', ru: 'Нью-Йорк' }), city('Los Angeles', { uk: 'Лос-Анджелес', es: 'Los Ángeles', ru: 'Лос-Анджелес' }), city('Chicago', { uk: 'Чикаго', ru: 'Чикаго' }), city('Houston', { uk: 'Г’юстон', ru: 'Хьюстон' }), city('Miami', { uk: 'Маямі', ru: 'Майами' })] },
  mx: { name: { en: 'Mexico', uk: 'Мексика', es: 'México', pl: 'Meksyk', de: 'Mexiko', ru: 'Мексика' }, group: 'americas', region: 'MX', currency: 'MXN', decimals: 0, basePrice: 90, round: 5, lang: 'es', streaming: true,
    cities: [city('Mexico City', { uk: 'Мехіко', es: 'Ciudad de México', pl: 'Meksyk', de: 'Mexiko-Stadt', ru: 'Мехико' }), city('Guadalajara', { uk: 'Гвадалахара', ru: 'Гвадалахара' }), city('Monterrey', { uk: 'Монтеррей', ru: 'Монтеррей' }), city('Cancún', { uk: 'Канкун', ru: 'Канкун' })] },
  ge: { name: { en: 'Georgia', uk: 'Грузія', es: 'Georgia', pl: 'Gruzja', de: 'Georgien', ru: 'Грузия' }, group: 'asia', region: 'GE', currency: 'GEL', decimals: 0, basePrice: 15, round: 1, lang: 'en', streaming: false,
    cities: [city('Tbilisi', { uk: 'Тбілісі', es: 'Tiflis', de: 'Tiflis', ru: 'Тбилиси' }), city('Batumi', { uk: 'Батумі', ru: 'Батуми' })] },
  am: { name: { en: 'Armenia', uk: 'Вірменія', pl: 'Armenia', de: 'Armenien', ru: 'Армения' }, group: 'asia', region: 'AM', currency: 'AMD', decimals: 0, basePrice: 2800, round: 100, lang: 'ru', streaming: false,
    cities: [city('Yerevan', { uk: 'Єреван', es: 'Ereván', pl: 'Erywań', de: 'Jerewan', ru: 'Ереван' })] },
  kz: { name: { en: 'Kazakhstan', uk: 'Казахстан', es: 'Kazajistán', pl: 'Kazachstan', de: 'Kasachstan', ru: 'Казахстан' }, group: 'asia', region: 'KZ', currency: 'KZT', decimals: 0, basePrice: 2300, round: 100, lang: 'ru', streaming: false,
    cities: [city('Almaty', { uk: 'Алмати', es: 'Almatý', pl: 'Ałmaty', ru: 'Алматы' }), city('Astana', { uk: 'Астана', es: 'Astaná', ru: 'Астана' }), city('Shymkent', { uk: 'Шимкент', pl: 'Szymkent', de: 'Schymkent', ru: 'Шымкент' })] },
  uz: { name: { en: 'Uzbekistan', uk: 'Узбекистан', es: 'Uzbekistán', pl: 'Uzbekistan', de: 'Usbekistan', ru: 'Узбекистан' }, group: 'asia', region: 'UZ', currency: 'UZS', decimals: 0, basePrice: 52000, round: 1000, lang: 'ru', streaming: false,
    cities: [city('Tashkent', { uk: 'Ташкент', es: 'Taskent', pl: 'Taszkent', de: 'Taschkent', ru: 'Ташкент' }), city('Samarkand', { uk: 'Самарканд', es: 'Samarcanda', pl: 'Samarkanda', ru: 'Самарканд' })] },
  kg: { name: { en: 'Kyrgyzstan', uk: 'Киргизстан', es: 'Kirguistán', pl: 'Kirgistan', de: 'Kirgisistan', ru: 'Кыргызстан' }, group: 'asia', region: 'KG', currency: 'KGS', decimals: 0, basePrice: 360, round: 10, lang: 'ru', streaming: false,
    cities: [city('Bishkek', { uk: 'Бішкек', es: 'Biskek', pl: 'Biszkek', de: 'Bischkek', ru: 'Бишкек' })] },
};

export const COUNTRY_CODES = Object.keys(COUNTRIES) as CountryCode[];
export const GROUPS: RegionGroup[] = ['europe', 'americas', 'asia'];
export const isCountry = (v: unknown): v is CountryCode => typeof v === 'string' && v in COUNTRIES;
export const isLang = (v: unknown): v is Lang => typeof v === 'string' && v in LANGS;
export const cityName = (id: string, lang: Lang) => {
  for (const c of Object.values(COUNTRIES)) { const x = c.cities.find(y => y.id === id); if (x) return nameIn(x.name, lang); }
  return id;
};

export const IMG = (path: string | null, size = 'w342') => (path ? `https://image.tmdb.org/t/p/${size}${path}` : null);

/** Куки с выбором посетителя: proxy на «/» уводит по ним, а не по IP. */
export const PREF_COOKIE = 'premiero_loc';
export const GEO_CITY_COOKIE = 'premiero_geo_city';
