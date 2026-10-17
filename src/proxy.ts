import { NextResponse, type NextRequest } from 'next/server';
import { COUNTRIES, GEO_CITY_COOKIE, PREF_COOKIE, isCountry, isLang } from '@/lib/regions';
import type { CountryCode, Lang } from '@/lib/types';

// Соседние страны, которых нет в списке, ведём на ближайший поддерживаемый рынок
const NEAREST: Record<string, CountryCode> = {
  at: 'de', ch: 'de', li: 'de', lu: 'de', be: 'nl', ie: 'gb', pt: 'es', ad: 'es', sm: 'it', va: 'it', mc: 'fr',
  sk: 'cz', hu: 'cz', si: 'it', hr: 'it', rs: 'ro', bg: 'ro', gr: 'it', fi: 'ee', se: 'gb', no: 'gb', dk: 'de', is: 'gb',
  ca: 'us', ar: 'mx', br: 'mx', cl: 'mx', co: 'mx', pe: 'mx', ve: 'mx', ec: 'mx', gt: 'mx', cu: 'mx', do: 'mx', bo: 'mx', py: 'mx', uy: 'mx', cr: 'mx', pa: 'mx',
  az: 'ge', tj: 'uz', tm: 'uz', tr: 'ge',
};
const YEAR = 60 * 60 * 24 * 365;

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

/** Город по IP запоминаем в куке, чтобы страница выбрала его, если посетитель ещё не выбирал сам. */
function withGeoCity(req: NextRequest, res: NextResponse) {
  const raw = req.headers.get('x-vercel-ip-city');
  if (raw && !req.cookies.has(GEO_CITY_COOKIE)) {
    res.cookies.set(GEO_CITY_COOKIE, decodeURIComponent(raw), { maxAge: YEAR, path: '/', sameSite: 'lax' });
  }
  return res;
}

export function proxy(req: NextRequest) {
  const seg = req.nextUrl.pathname.split('/').filter(Boolean);
  if (seg.length >= 2 && isLang(seg[0]) && isCountry(seg[1])) return withGeoCity(req, NextResponse.next());

  // Дополняем адрес недостающими языком и страной: «/» → «/uk/ua», «/uk» → «/uk/ua»
  const pref = preferred(req);
  const lang = isLang(seg[0]) ? seg[0] : pref.lang;
  let rest = isLang(seg[0]) ? seg.slice(1) : seg;
  if (isCountry(rest[0])) rest = rest.slice(1);
  const url = req.nextUrl.clone();
  url.pathname = `/${lang}/${pref.country}${rest.length ? '/' + rest.join('/') : ''}`;
  return withGeoCity(req, NextResponse.redirect(url));
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};

