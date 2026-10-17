'use client';

import { Suspense, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { COUNTRIES, COUNTRY_CODES, GEO_CITY_COOKIE, GROUPS, LANGS, LANG_CODES, LOCALE, PREF_COOKIE, cityName as cityNameOf, nameIn } from '@/lib/regions';
import { translator, type T } from '@/lib/i18n';
import { dateFmt, sod, type DateFmt } from '@/lib/dates';
import { calendarPath } from '@/lib/slug';
import type { CountryCode, Lang } from '@/lib/types';

export interface Env {
  ready: boolean;            // дата и localStorage доступны только после монтирования
  t: T;
  f: DateFmt;
  lang: Lang;
  country: CountryCode;
  city: string;
  today: Date;
  nowMin: number;
  cityName: (id: string) => string;
  countryName: (c: CountryCode) => string;
  watch: Set<string>;
  toggleWatch: (key: string, title: string) => void;
  subs: Set<number>;
  setSubs: (s: Set<number>) => void;
  toast: (msg: string) => void;
  money: (v: number) => string;
}

export const store = {
  get<V>(k: string, d: V): V { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as V) : d; } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* приватный режим */ } },
};
const readCookie = (name: string) => {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
};

const EPOCH = new Date(2000, 0, 1); // заглушка до монтирования, на экран не попадает
const Ctx = createContext<Env | null>(null);
export const useEnv = () => { const v = useContext(Ctx); if (!v) throw new Error('useEnv outside AppProvider'); return v; };

export default function AppProvider({ lang, country, children }: { lang: Lang; country: CountryCode; children: React.ReactNode }) {
  const router = useRouter();
  const [boot, setBoot] = useState<{ today: Date; nowMin: number } | null>(null);
  const [city, setCity] = useState(COUNTRIES[country].cities[0].id);
  const [watch, setWatch] = useState<Set<string>>(new Set());
  const [subs, setSubsState] = useState<Set<number>>(new Set());
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const C = COUNTRIES[country];
    // город: выбор посетителя, иначе город по IP, если он есть в списке, иначе первый
    const saved = store.get<string | null>(`premiero.city.${country}`, null);
    const geo = readCookie(GEO_CITY_COOKIE)?.toLowerCase();
    const byGeo = geo ? C.cities.find(c => Object.values(c.name).some(n => n?.toLowerCase() === geo)) : undefined;
    /* eslint-disable react-hooks/set-state-in-effect */
    setCity(C.cities.some(c => c.id === saved) ? saved! : byGeo?.id ?? C.cities[0].id);
    setWatch(new Set(store.get<string[]>('premiero.watch', [])));
    setSubsState(new Set(store.get<number[]>(`premiero.subs.${country}`, [])));
    setBoot({ today: sod(now), nowMin: now.getHours() * 60 + now.getMinutes() });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [country]);

  useEffect(() => {
    if (!toastMsg) return;
    const id = setTimeout(() => setToastMsg(null), 3200);
    return () => clearTimeout(id);
  }, [toastMsg]);

  const t = useMemo(() => translator(lang), [lang]);
  const today = boot?.today ?? EPOCH;
  const f = useMemo(() => dateFmt(lang, today), [lang, today]);

  const toggleWatch = useCallback((key: string, title: string) => {
    setWatch(prev => {
      const next = new Set(prev);
      const on = !next.has(key);
      if (on) next.add(key); else next.delete(key);
      store.set('premiero.watch', [...next]);
      setToastMsg(on ? t('added', title) : t('removed', title));
      return next;
    });
  }, [t]);
  const setSubs = useCallback((s: Set<number>) => { setSubsState(s); store.set(`premiero.subs.${country}`, [...s]); }, [country]);
  const money = useCallback((v: number) => {
    const C = COUNTRIES[country];
    return new Intl.NumberFormat(LOCALE[lang], { style: 'currency', currency: C.currency, minimumFractionDigits: C.decimals, maximumFractionDigits: C.decimals }).format(v);
  }, [country, lang]);

  const env: Env = {
    ready: !!boot, t, f, lang, country, city, today, nowMin: boot?.nowMin ?? 0,
    cityName: id => cityNameOf(id, lang), countryName: c => nameIn(COUNTRIES[c].name, lang),
    watch, toggleWatch, subs, setSubs, toast: setToastMsg, money,
  };

  // Смена языка или страны меняет начало адреса, остальная часть пути сохраняется
  const go = (l: Lang, c: CountryCode) => {
    document.cookie = `${PREF_COOKIE}=${l}/${c}; path=/; max-age=31536000; samesite=lax`;
    const rest = location.pathname.split('/').filter(Boolean).slice(2).join('/');
    router.push(`/${l}/${c}${rest ? '/' + rest : ''}${location.search}`);
  };
  const onCity = (id: string) => { setCity(id); store.set(`premiero.city.${country}`, id); };
  const home = calendarPath(lang, country);

  return (
    <Ctx.Provider value={env}>
      <header className="top">
        <div className="wrap">
          <Link href={home} className="brand"><span className="bulbs" aria-hidden>{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</span>Premiero<small>{t('tagline')}</small></Link>
          <nav className="nav" aria-label={t('nav')}>
            <Suspense fallback={<NavLinks home={home} t={t} pathname="" />}><CurrentNav home={home} t={t} /></Suspense>
          </nav>
          <div className="region">
            <select id="country" aria-label={t('country')} value={country} onChange={e => go(lang, e.target.value as CountryCode)}>
              {GROUPS.map(g => (
                <optgroup key={g} label={t('rg_' + g)}>
                  {COUNTRY_CODES.filter(k => COUNTRIES[k].group === g).map(k => <option key={k} value={k}>{nameIn(COUNTRIES[k].name, lang)}</option>)}
                </optgroup>
              ))}
            </select>
            <select id="city" aria-label={t('city')} value={city} onChange={e => onCity(e.target.value)}>
              {COUNTRIES[country].cities.map(c => <option key={c.id} value={c.id}>{nameIn(c.name, lang)}</option>)}
            </select>
            <select id="lang" aria-label={t('lang')} value={lang} onChange={e => go(e.target.value as Lang, country)}>
              {LANG_CODES.map(k => <option key={k} value={k}>{LANGS[k]}</option>)}
            </select>
          </div>
        </div>
      </header>

      {children}

      <footer className="foot"><div className="wrap">
        <span>{t('attr')} This product uses the TMDB API but is not endorsed or certified by TMDB.</span>
        <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">themoviedb.org</a>
      </div></footer>
      <div className={`toast${toastMsg ? ' show' : ''}`} role="status">{toastMsg}</div>
    </Ctx.Provider>
  );
}

/* Подсветка текущего раздела зависит от адреса, поэтому живёт внутри Suspense */
function CurrentNav({ home, t }: { home: string; t: T }) {
  return <NavLinks home={home} t={t} pathname={usePathname()} />;
}
function NavLinks({ home, t, pathname }: { home: string; t: T; pathname: string }) {
  const onCinemas = pathname.endsWith('/cinemas');
  return <>
    <Link href={home} aria-current={pathname === home ? 'page' : undefined}>{t('nav_cal')}</Link>
    <Link href={`${home}/cinemas`} aria-current={onCinemas ? 'page' : undefined}>{t('nav_cin')}</Link>
  </>;
}