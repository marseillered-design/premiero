'use client';

import { Suspense, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Logo from './Logo';
import AccountMenu from './AccountMenu';
import { THEME_KEY } from '@/lib/theme';
import { usePathname, useRouter } from 'next/navigation';
import { COUNTRIES, COUNTRY_CODES, GROUPS, LANGS, LANG_CODES, PREF_COOKIE, nameIn } from '@/lib/regions';
import { translator, type T } from '@/lib/i18n';
import { dateFmt, sod, type DateFmt } from '@/lib/dates';
import { calendarPath } from '@/lib/slug';
import type { CountryCode, Lang, WatchItem } from '@/lib/types';

export interface Account { enabled: boolean; user: { name: string; email: string; picture: string | null } | null }

export interface Env {
  ready: boolean;            // дата и localStorage доступны только после монтирования
  t: T;
  f: DateFmt;
  lang: Lang;
  country: CountryCode;
  today: Date;
  countryName: (c: CountryCode) => string;
  watch: Set<string>;
  watchItems: Record<string, WatchItem>;
  toggleWatch: (item: WatchItem) => void;
  subs: Set<number>;
  setSubs: (s: Set<number>) => void;
  toast: (msg: string) => void;
  account: Account;
  signOut: () => void;
  deleteAccount: () => void;
}

export const store = {
  get<V>(k: string, d: V): V { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as V) : d; } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* приватный режим */ } },
};

const EPOCH = new Date(2000, 0, 1); // заглушка до монтирования, на экран не попадает
const Ctx = createContext<Env | null>(null);
export const useEnv = () => { const v = useContext(Ctx); if (!v) throw new Error('useEnv outside AppProvider'); return v; };

export default function AppProvider({ lang, country, children }: { lang: Lang; country: CountryCode; children: React.ReactNode }) {
  const router = useRouter();
  const [boot, setBoot] = useState<{ today: Date } | null>(null);
  const [watch, setWatch] = useState<Set<string>>(new Set());
  const [watchItems, setWatchItems] = useState<Record<string, WatchItem>>({});
  const [account, setAccount] = useState<Account>({ enabled: false, user: null });
  const serverSubs = useRef<Record<string, number[]> | null>(null);
  const [subs, setSubsState] = useState<Set<number>>(new Set());
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setWatch(new Set(store.get<string[]>('premiero.watch', [])));
    setWatchItems(store.get<Record<string, WatchItem>>('premiero.watchItems', {}));
    setSubsState(new Set(serverSubs.current?.[country] ?? store.get<number[]>(`premiero.subs.${country}`, [])));
    setBoot({ today: sod(new Date()) });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [country]);

  // Аккаунт: при входе список из браузера добавляется к сохранённому, дальше всё пишется и туда, и туда
  useEffect(() => {
    const ac = new AbortController();
    fetch('/api/me', { signal: ac.signal }).then(r => r.json()).then((d: { enabled: boolean; user: Account['user']; watch?: Record<string, WatchItem>; subs?: Record<string, number[]> }) => {
      setAccount({ enabled: !!d.enabled, user: d.user ?? null });
      if (new URLSearchParams(location.search).get('login') === 'failed') setToastMsg(translator(lang)('login_failed'));
      if (!d.user) return;
      const localItems = store.get<Record<string, WatchItem>>('premiero.watchItems', {});
      const missing = Object.values(localItems).filter(i => !d.watch?.[i.key]);
      if (missing.length) fetch('/api/me/watch', { method: 'POST', body: JSON.stringify({ add: missing }) }).catch(() => {});
      const items = { ...localItems, ...d.watch };
      store.set('premiero.watchItems', items);
      setWatchItems(items);
      setWatch(prev => { const n = new Set([...prev, ...Object.keys(items)]); store.set('premiero.watch', [...n]); return n; });
      serverSubs.current = d.subs ?? {};
      const local = store.get<number[]>(`premiero.subs.${country}`, []);
      if (d.subs?.[country]) setSubsState(new Set(d.subs[country]));
      else if (local.length) fetch('/api/me/subs', { method: 'PUT', body: JSON.stringify({ country, ids: local }) }).catch(() => {});
    }).catch(() => {});
    return () => ac.abort();
    // проверяем один раз за загрузку страницы
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const id = setTimeout(() => setToastMsg(null), 3200);
    return () => clearTimeout(id);
  }, [toastMsg]);

  const t = useMemo(() => translator(lang), [lang]);
  const today = boot?.today ?? EPOCH;
  const f = useMemo(() => dateFmt(lang, today), [lang, today]);

  const signedIn = !!account.user;
  const toggleWatch = useCallback((item: WatchItem) => {
    const on = !watch.has(item.key);
    const next = new Set(watch);
    const items = { ...store.get<Record<string, WatchItem>>('premiero.watchItems', {}) };
    if (on) { next.add(item.key); items[item.key] = item; } else { next.delete(item.key); delete items[item.key]; }
    setWatch(next); setWatchItems(items);
    store.set('premiero.watch', [...next]); store.set('premiero.watchItems', items);
    setToastMsg(on ? t('added', item.title) : t('removed', item.title));
    if (signedIn) fetch('/api/me/watch', { method: 'POST', body: JSON.stringify(on ? { add: [item] } : { remove: item.key }) }).catch(() => {});
  }, [watch, t, signedIn]);
  const setSubs = useCallback((s: Set<number>) => {
    setSubsState(s);
    store.set(`premiero.subs.${country}`, [...s]);
    if (serverSubs.current) serverSubs.current[country] = [...s];
    if (signedIn) fetch('/api/me/subs', { method: 'PUT', body: JSON.stringify({ country, ids: [...s] }) }).catch(() => {});
  }, [country, signedIn]);
  const signOut = useCallback(() => {
    fetch('/api/auth/logout', { method: 'POST' }).finally(() => { serverSubs.current = null; setAccount(a => ({ ...a, user: null })); });
  }, []);
  const deleteAccount = useCallback(() => {
    fetch('/api/me', { method: 'DELETE' }).then(r => {
      if (!r.ok) return;
      serverSubs.current = null;
      setAccount(a => ({ ...a, user: null }));
      // вместе с аккаунтом очищаем и список в этом браузере
      setWatch(new Set()); setWatchItems({});
      store.set('premiero.watch', []); store.set('premiero.watchItems', {});
      setToastMsg(t('deleted'));
    }).catch(() => {});
  }, [t]);

  const env: Env = {
    ready: !!boot, t, f, lang, country, today, countryName: c => nameIn(COUNTRIES[c].name, lang),
    watch, watchItems, toggleWatch, subs, setSubs, toast: setToastMsg, account, signOut, deleteAccount,
  };

  // Смена языка или страны меняет начало адреса, остальная часть пути сохраняется
  const go = (l: Lang, c: CountryCode) => {
    document.cookie = `${PREF_COOKIE}=${l}/${c}; path=/; max-age=31536000; samesite=lax`;
    const rest = location.pathname.split('/').filter(Boolean).slice(2).join('/');
    router.push(`/${l}/${c}${rest ? '/' + rest : ''}${location.search}`);
  };
  const home = calendarPath(lang, country);

  return (
    <Ctx.Provider value={env}>
      <header className="top">
        <div className="wrap">
          <Link href={home} className="brand"><Logo />Premiero<small>{t('tagline')}</small></Link>
          <nav className="nav" aria-label={t('nav')}>
            <Suspense fallback={<NavLinks home={home} t={t} pathname="" />}><CurrentNav home={home} t={t} /></Suspense>
          </nav>
          {/* справа: язык, тема и вход */}
          <div className="top-tools">
            <label className="lang-pick" title={t('lang')}>
              <GlobeIcon />
              {/* видимая подпись; сам список прозрачный и лежит поверх, поэтому открывается системный выбор */}
              <span className="lang-full" aria-hidden>{LANGS[lang]}</span><span className="lang-code" aria-hidden>{lang.toUpperCase()}</span>
              <select id="lang" aria-label={t('lang')} value={lang} onChange={e => go(e.target.value as Lang, country)}>
                {LANG_CODES.map(k => <option key={k} value={k}>{LANGS[k]}</option>)}
              </select>
            </label>
            <button className="icon-btn theme-btn" onClick={toggleTheme} aria-label={t('theme')} title={t('theme')}>
              <SunIcon /><MoonIcon />
            </button>
            <AccountMenu home={home} />
          </div>
        </div>
      </header>

      <div className="page">{children}</div>

      <footer className="foot"><div className="wrap">
        <p className="foot-mm">{t('mm_q')} <a href="https://www.themoviemood.com/" target="_blank" rel="noopener">MovieMood</a> — {t('mm_a')}</p>
        {/* Страну сайт определяет по IP; поменять её можно здесь (даты выхода и стриминги зависят от страны) */}
        <Suspense fallback={null}><CountryPicker t={t} lang={lang} country={country} onPick={c => go(lang, c)} /></Suspense>
        <Link href={`${home}/submit`}>{t('sb_link')}</Link>
        <Link href={`${home}/privacy`}>{t('privacy')}</Link>
        <span>{t('attr')} This product uses the TMDB API but is not endorsed or certified by TMDB.</span>
        <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">themoviedb.org</a>
        <span>{t('attr_games')}</span>
        <a href="https://www.igdb.com/" target="_blank" rel="noreferrer">igdb.com</a>
      </div></footer>
      <div className={`toast${toastMsg ? ' show' : ''}`} role="status">{toastMsg}</div>
    </Ctx.Provider>
  );
}

/** Выбор страны в подвале. На «Моём списке» и странице о конфиденциальности страна ни на что не влияет — там его нет. */
function CountryPicker({ t, lang, country, onPick }: { t: T; lang: Lang; country: CountryCode; onPick: (c: CountryCode) => void }) {
  const pathname = usePathname();
  if (/\/(my|privacy|submit|reports)$/.test(pathname)) return null;
  return (
    <label className="foot-country">{t('country')}
      <select id="country" value={country} onChange={e => onPick(e.target.value as CountryCode)}>
        {GROUPS.map(g => (
          <optgroup key={g} label={t('rg_' + g)}>
            {COUNTRY_CODES.filter(k => COUNTRIES[k].group === g).map(k => <option key={k} value={k}>{nameIn(COUNTRIES[k].name, lang)}</option>)}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

/* Подсветка текущего раздела зависит от адреса, поэтому живёт внутри Suspense */
function CurrentNav({ home, t }: { home: string; t: T }) {
  return <NavLinks home={home} t={t} pathname={usePathname()} />;
}
function NavLinks({ home, t, pathname }: { home: string; t: T; pathname: string }) {
  // раздел подсвечивается и на страницах внутри него: /movie/… — «Фильмы», /tv/… — «Сериалы», /game/… — «Игры»
  const links: [string, string, string | null][] = [
    ['', 'nav_all', null], ['/movies', 'nav_movies', '/movie/'], ['/series', 'nav_series', '/tv/'], ['/games', 'nav_games', '/game/'],
  ];
  return <>
    {links.map(([path, key, inner]) => {
      const href = home + path;
      const on = pathname === href || (!!inner && pathname.includes(inner));
      return <Link key={key} href={href} aria-current={on ? 'page' : undefined}>{t(key)}</Link>;
    })}
  </>;
}
/* День и ночь: data-theme на <html>; без выбора сайт следует системе. Скрипт в <head> ставит тему до отрисовки */
function toggleTheme() {
  const el = document.documentElement;
  const dark = el.dataset.theme ? el.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const next = dark ? 'light' : 'dark';
  el.dataset.theme = next;
  try { localStorage.setItem(THEME_KEY, next); } catch { /* приватный режим */ }
}
const GlobeIcon = () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>;
const SunIcon = () => <svg className="i-sun" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
const MoonIcon = () => <svg className="i-moon" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>;