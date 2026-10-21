/** Адрес сайта для канонических ссылок, карты сайта и robots.txt. После покупки домена его укажет Vercel. */
export const SITE = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000';
