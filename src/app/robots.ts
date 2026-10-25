import type { MetadataRoute } from 'next';
import { COUNTRY_CODES } from '@/lib/regions';
import { SITE } from '@/lib/site';

/*
 * Краулеры, которые собирают сайты для обучения нейросетей. Посетителей они не приводят,
 * а запросов делали больше, чем все люди и поисковики вместе (GPTBot — 90 тыс. за 12 часов),
 * съедая бесплатный лимит Vercel. Поисковики и ИИ-поиск (Googlebot, Bingbot, OAI-SearchBot) пускаем.
 */
const AI_TRAINING = ['GPTBot', 'ClaudeBot', 'anthropic-ai', 'CCBot', 'Google-Extended', 'Applebot-Extended', 'Bytespider', 'meta-externalagent', 'Amazonbot', 'cohere-ai', 'Diffbot', 'img2dataset'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: '/api/' },
      { userAgent: AI_TRAINING, disallow: '/' },
    ],
    sitemap: ['pages', ...COUNTRY_CODES].map(id => `${SITE}/sitemap/${id}.xml`),
  };
}
