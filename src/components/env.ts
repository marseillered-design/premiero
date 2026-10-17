import type { DateFmt } from '@/lib/dates';
import type { T } from '@/lib/i18n';
import type { CalItem, CountryCode, Lang } from '@/lib/types';

/** Всё, что нужно дочерним компонентам: язык, регион, текущие данные и действия. */
export interface Env {
  t: T;
  f: DateFmt;
  lang: Lang;
  country: CountryCode;
  city: string;
  cityName: (id: string) => string;
  countryName: (c: CountryCode) => string;
  today: Date;
  nowMin: number;
  items: Record<string, CalItem>;
  watch: Set<string>;
  toggleWatch: (it: CalItem) => void;
  toast: (msg: string) => void;
  money: (v: number) => string;
  openTitle: (key: string, tickets?: boolean) => void;
  openCinema: (id: string) => void;
}

export type ModalCtx = { kind: 'title'; key: string; tickets?: boolean } | { kind: 'cinema'; id: string };

export const store = {
  get<V>(k: string, d: V): V { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as V) : d; } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* приватный режим */ } },
};
