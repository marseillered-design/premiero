import { NextResponse, type NextRequest } from 'next/server';
import { COUNTRIES, PREF_COOKIE, isCountry, isLang } from '@/lib/regions';
import type { CountryCode, Lang } from '@/lib/types';

// Соседние страны, которых нет в списке, ведём на ближайший поддерживаемый рынок
const NEAREST: Record<string, CountryCode> = {
  at: 'de', ch: 'de', li: 'de', lu: 'de', be: 'nl', ie: 'gb', pt: 'es', ad: 'es', sm: 'it', va: 'it', mc: 'fr',
  sk: 'cz', hu: 'cz', si: 'it', hr: 'it', rs: 'ro', bg: 'ro', gr: 'it', fi: 'ee', se: 'gb', no: 'gb', dk: 'de', is: 'gb',
  ca: 'us', ar: 'mx', br: 'mx', cl: 'mx', co: 'mx', pe: 'mx', ve: 'mx', ec: 'mx', gt: 'mx', cu: 'mx', do: 'mx', bo: 'mx', py: 'mx', uy: 'mx', cr: 'mx', pa: 'mx',
  az: 'ge', tj: 'uz', tm: 'uz', tr: 'ge',
};

function langFromHeader(header: string | null): Lang | null {
  if (!header) return null;
  for (const part of header.split(',')) {
    const code = part.split(';')[0].trim().slice(0, 2).toLowerCase();
    if (isLang(code)) return code;
  }
  return null;
}

function preferred(req: NextRequest): { lang: Lang; country: CountryCode } {
  const [pl, pc] = (req.cookies.get(PREF_COOKIE)?.value ?? '').split('/');
  if (isLang(pl) && isCountry(pc)) return { lang: pl, country: pc };
  const ip = req.headers.get('x-vercel-ip-country')?.toLowerCase() ?? '';
  const country: CountryCode = isCountry(ip) ? ip : NEAREST[ip] ?? 'us';
  return { lang: langFromHeader(req.headers.get('accept-language')) ?? COUNTRIES[country].lang, country };
}

/*
 * Сервер на Cloud Run доступен по адресу *.run.app всем, но ходить к нему должен только Worker
 * на thepremiero.com: иначе мимо Cloudflare (правила для ботов, кэш, лимиты) ходили бы напрямую.
 * Worker добавляет секрет ORIGIN_SECRET в x-origin-auth; без секрета на сервере проверка выключена.
 */
const fromEdge = (req: NextRequest) => {
  const secret = process.env.ORIGIN_SECRET;
  return !secret || req.headers.get('x-origin-auth') === secret;
};

export function proxy(req: NextRequest) {
  if (!fromEdge(req)) return new NextResponse('Forbidden', { status: 403 });
  if (req.nextUrl.pathname.startsWith('/api/')) return NextResponse.next();
  const seg = req.nextUrl.pathname.split('/').filter(Boolean);
  if (seg.length >= 2 && isLang(seg[0]) && isCountry(seg[1])) return NextResponse.next();

  // Дополняем адрес недостающими языком и страной: «/» → «/uk/ua», «/uk» → «/uk/ua»
  const pref = preferred(req);
  const lang = isLang(seg[0]) ? seg[0] : pref.lang;
  let rest = isLang(seg[0]) ? seg.slice(1) : seg;
  if (isCountry(rest[0])) rest = rest.slice(1);
  const url = req.nextUrl.clone();
  url.pathname = `/${lang}/${pref.country}${rest.length ? '/' + rest.join('/') : ''}`;
  return NextResponse.redirect(url);
}

export const config = {
  // страницы (кроме файлов вроде robots.txt и /_next/static) и весь /api, включая /api/cal/….ics
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)', '/api/:path*'],
};

