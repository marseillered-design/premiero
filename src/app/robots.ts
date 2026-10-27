import type { MetadataRoute } from 'next';
import { COUNTRY_CODES } from '@/lib/regions';
import { SITE } from '@/lib/site';

/*
 * Краулеры, которые собирают сайты для обучения нейросетей. Посетителей они не приводят,
 * а запросов делали больше, чем все люди и поисковики вместе (GPTBot — 90 тыс. за 12 часов),
 * съедая бесплатный лимит Vercel. Поисковики и ИИ-поиск (Googlebot, Bingbot, OAI-SearchBot) пускаем.
 * PerplexityBot тоже закрыт: на MovieMood он делал 2–3 запроса в секунду, почти весь трафик.
 * Тех, кто robots.txt не слушает, отсекает правило «Block AI crawlers» в Cloudflare WAF.
 */
const AI_TRAINING = ['PerplexityBot', 'GPTBot','ClaudeBot', 'anthropic-ai', 'CCBot', 'Google-Extended', 'Applebot-Extended', 'Bytespider', 'meta-externalagent', 'Amazonbot', 'cohere-ai', 'Diffbot', 'img2dataset'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: '/api/' },
      { userAgent: AI_TRAINING, disallow: '/' },
    ],
    sitemap: ['pages', ...COUNTRY_CODES].map(id => `${SITE}/sitemap/${id}.xml`),
  };
}
