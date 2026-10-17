import type { NextRequest } from 'next/server';
import { COUNTRIES, COUNTRY_CODES } from '@/lib/regions';

export const maxDuration = 300;

/**
 * Прогрев кэша по расписанию (vercel.json → crons): запрашиваем свой же API для текущего
 * и следующего месяца каждой страны на её основном языке, чтобы CDN держал готовые ответы.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const origin = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : req.nextUrl.origin;
  const now = new Date();
  const months = [0, 1].map(n => {
    const d = new Date(now.getFullYear(), now.getMonth() + n, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const urls = COUNTRY_CODES.flatMap(c => [
    ...months.map(m => `${origin}/api/calendar?country=${c}&lang=${COUNTRIES[c].lang}&month=${m}`),
    `${origin}/api/now-playing?country=${c}&lang=${COUNTRIES[c].lang}`,
  ]);

  const results: { url: string; status: number }[] = [];
  let next = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < urls.length) {
      const url = urls[next++];
      try { results.push({ url, status: (await fetch(url, { cache: 'no-store' })).status }); }
      catch { results.push({ url, status: 0 }); }
    }
  }));
  const failed = results.filter(r => r.status !== 200);
  return Response.json({ warmed: results.length - failed.length, failed });
}
