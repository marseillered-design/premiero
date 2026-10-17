import { LOCALE } from './regions';
import type { Lang } from './types';

const MS = 86400000;
export const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const dkey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const mkey = (d: Date) => dkey(d).slice(0, 7);
export const fromKey = (k: string) => { const [y, m, dd] = k.split('-').map(Number); return new Date(y, m - 1, dd); };
export const diffDays = (a: Date, b: Date) => Math.round((sod(a).getTime() - sod(b).getTime()) / MS);

export function dateFmt(lang: Lang, today: Date) {
  const loc = LOCALE[lang];
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const dm = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long' });
  const wdLong = new Intl.DateTimeFormat(loc, { weekday: 'long' });
  const wdShort = new Intl.DateTimeFormat(loc, { weekday: 'short' });
  const monShort = new Intl.DateTimeFormat(loc, { month: 'short' });
  const monLong = new Intl.DateTimeFormat(loc, { month: 'long' });
  const rel = new Intl.RelativeTimeFormat(loc, { numeric: 'auto' });
  return {
    date: (d: Date) => dm.format(d),
    wd: (d: Date, short = false) => (short ? wdShort : wdLong).format(d),
    monShort: (d: Date) => monShort.format(d).replace('.', ''),
    monthTitle: (d: Date) => `${cap(monLong.format(d))} ${d.getFullYear()}`,
    rel: (d: Date) => rel.format(diffDays(d, today), 'day'),
    cap,
  };
}
export type DateFmt = ReturnType<typeof dateFmt>;
