import type { CountryCode, Lang, Media } from './types';

// Транслитерация кириллицы для адресов: «Термінатор 3» → terminator-3
const CYR: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ye', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'yi', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n',
  о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'yu', я: 'ya',
  ё: 'yo', ы: 'y', э: 'e', ъ: '', ł: 'l', ß: 'ss', æ: 'ae', ø: 'o',
};

export function slugify(title: string, lang?: Lang) {
  const map = lang === 'ru' ? { ...CYR, г: 'g', и: 'i', х: 'kh' } : CYR;
  return title
    .toLowerCase()
    .split('').map(ch => map[ch] ?? ch).join('')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

/** Сегмент адреса: `999-terminator-3`, или просто `999`, если название не латинизируется. */
export const titleSlug = (id: number, title: string, lang?: Lang) => {
  const s = slugify(title, lang);
  return s ? `${id}-${s}` : String(id);
};
export const idFromSlug = (slug: string) => { const m = /^(\d+)/.exec(slug); return m ? Number(m[1]) : null; };

export const titlePath = (lang: Lang, country: CountryCode, media: Media, id: number, title: string) =>
  `/${lang}/${country}/${media}/${titleSlug(id, title, lang)}`;
export const calendarPath = (lang: Lang, country: CountryCode) => `/${lang}/${country}`;
