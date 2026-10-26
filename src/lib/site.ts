/**
 * Адрес сайта для канонических ссылок, карты сайта и robots.txt. На Cloudflare его задаёт
 * wrangler.jsonc (vars), а в собранных заранее страницах — запасной вариант для production-сборки.
 */
const HOST = process.env.VERCEL_PROJECT_PRODUCTION_URL || (process.env.NODE_ENV === 'production' ? 'thepremiero.com' : '');
export const SITE = HOST ? `https://${HOST}` : 'http://localhost:3000';

/**
 * Адрес, на котором посетитель видит сайт. Сам запрос может прийти на другой адрес: Cloudflare
 * пересылает thepremiero.com на сервер Google Cloud Run. Поэтому ссылки, которые уходят наружу
 * (возврат после входа через Google, ссылка на календарь), строятся от SITE, а при разработке — от запроса.
 */
export const publicOrigin = (req: { nextUrl: URL }) => (HOST ? SITE : req.nextUrl.origin);
