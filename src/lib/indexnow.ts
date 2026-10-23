import { kv, hasKv } from './kv';
import { SITE } from './site';

/*
 * IndexNow: сообщаем Bing, Yandex, Seznam и другим поисковикам о новых страницах сразу,
 * не дожидаясь, пока они сами обойдут сайт. Ключ не секретный: он лежит в public/<ключ>.txt,
 * по нему поисковик проверяет, что сайт наш. Уже отправленные адреса помним в Redis (ix:sent),
 * чтобы не слать одно и то же каждый день.
 */
export const INDEXNOW_KEY = '983d6d0721d548e275e818804ea46dcb';
const CHUNK = 1000;      // столько адресов за один запрос к Redis
const PER_POST = 10000;  // предел IndexNow на один запрос

/** Адреса из наших карт сайта: страница с календарями и страницы релизов по странам. */
export async function sitemapUrls(origin: string): Promise<string[]> {
  const robots = await fetch(`${origin}/robots.txt`, { cache: 'no-store' }).then(r => r.text());
  const maps = [...robots.matchAll(/^Sitemap:\s*(\S+)/gm)].map(m => m[1].replace(SITE, origin));
  const xml = await Promise.all(maps.map(u => fetch(u, { cache: 'no-store' }).then(r => (r.ok ? r.text() : '')).catch(() => '')));
  return [...new Set(xml.flatMap(x => [...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])))];
}

/** Отправить в IndexNow только адреса, которых ещё не отправляли. */
export async function submitNew(urls: string[]) {
  if (!hasKv() || !urls.length) return { fresh: 0, sent: 0, errors: [] as string[] };
  const fresh: string[] = [];
  for (let i = 0; i < urls.length; i += CHUNK) {
    const part = urls.slice(i, i + CHUNK);
    const added = await kv(...part.map(u => ['SADD', 'ix:sent', u]));
    part.forEach((u, n) => { if (Number(added[n]) === 1) fresh.push(u); });
  }
  const host = new URL(SITE).host;
  let sent = 0;
  const errors: string[] = [];
  for (let i = 0; i < fresh.length; i += PER_POST) {
    const urlList = fresh.slice(i, i + PER_POST);
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key: INDEXNOW_KEY, keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`, urlList }),
    });
    // не принял — забываем эти адреса, чтобы попробовать завтра снова
    if (res.status >= 300) {
      const why = `${res.status} ${(await res.text().catch(() => '')).slice(0, 200)}`;
      errors.push(why);
      console.error('indexnow', why);
      await kv(['SREM', 'ix:sent', ...urlList]);
      continue;
    }
    sent += urlList.length;
  }
  return { fresh: fresh.length, sent, errors };
}
