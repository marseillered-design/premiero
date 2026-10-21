import type { MetadataRoute } from 'next';
import { COUNTRY_CODES } from '@/lib/regions';
import { SITE } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: ['pages', ...COUNTRY_CODES].map(id => `${SITE}/sitemap/${id}.xml`),
  };
}
