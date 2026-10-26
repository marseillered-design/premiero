/**
 * Адрес сайта для канонических ссылок, карты сайта и robots.txt. На Cloudflare его задаёт
 * wrangler.jsonc (vars), а в собранных заранее страницах — запасной вариант для production-сборки.
 */
const HOST = process.env.VERCEL_PROJECT_PRODUCTION_URL || (process.env.NODE_ENV === 'production' ? 'thepremiero.com' : '');
export const SITE = HOST ? `https://${HOST}` : 'http://localhost:3000';
