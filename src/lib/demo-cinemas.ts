// Демонстрационные кинотеатры и сеансы. Детерминированы по городу, фильму и дате,
// чтобы выглядеть правдоподобно, пока не подключён настоящий источник расписаний.
import { COUNTRIES } from './regions';
import { addDays, diffDays, dkey, fromKey } from './dates';
import type { CalItem, CountryCode } from './types';

export function hash(str: string) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function rng(seed: string) {
  let a = hash(seed);
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const pick = <T,>(arr: T[], r: () => number) => arr[Math.floor(r() * arr.length)];

export interface Cinema { id: string; name: string; city: string; mall: string; halls: number; formats: string[] }
export interface Session { id: string; itemKey: string; cinema: Cinema; date: Date; time: string; fmt: string; price: number; hall: number; country: CountryCode }

const NAMES = ['Lumen', 'Orbit', 'Vista', 'Nova Screen', 'Prism', 'Reel House', 'Spotlight', 'Frame', 'Silver Hall', 'Zenith', 'Marquee', 'Arcade'];
const MALLS = ['Atrium', 'Galaxy', 'Riviera', 'Central', 'Parkside', 'Grand', 'Quarter', 'Harbor', 'Horizon', 'Meridian'];
const EXTRA = ['3D', 'IMAX', 'Dolby Atmos', '4DX', 'VIP'];
const FMT_MULT: Record<string, number> = { '2D': 1, '3D': 1.2, IMAX: 1.6, 'Dolby Atmos': 1.3, '4DX': 1.9, VIP: 2.4 };
const SLOTS = ['09:40', '10:30', '11:15', '12:20', '13:10', '14:00', '15:30', '16:20', '17:45', '18:30', '19:20', '20:10', '21:00', '21:50', '22:40', '23:30'];
const SIZE: Record<string, number> = { Kyiv: 7, 'New York': 7, 'Los Angeles': 6, 'Mexico City': 7, Almaty: 5 };
const RUN_DAYS = 34, PRESALE_DAYS = 21;

const cache = new Map<string, Cinema[]>();
export function cinemasFor(city: string): Cinema[] {
  const hit = cache.get(city);
  if (hit) return hit;
  const r = rng('city:' + city);
  const names = [...NAMES].sort(() => r() - .5).slice(0, SIZE[city] ?? 4);
  const malls = [...MALLS].sort(() => r() - .5);
  const list = names.map((name, i) => ({
    id: hash(city + name).toString(36), name, city, mall: malls[i % malls.length],
    halls: 4 + Math.floor(r() * 9), formats: ['2D', ...EXTRA.filter(() => r() < .42)],
  }));
  cache.set(city, list);
  return list;
}

export type TicketState = 'none' | 'tba' | 'soon' | 'presale' | 'on' | 'ended';
export function ticketState(item: CalItem, today: Date): TicketState {
  if (item.media !== 'movie') return 'none';
  if (!item.theatrical) return 'tba';
  const n = diffDays(fromKey(item.theatrical), today);
  if (n > PRESALE_DAYS) return 'soon';
  if (n > 0) return 'presale';
  if (n >= -RUN_DAYS) return 'on';
  return 'ended';
}
export const hasTickets = (item: CalItem, today: Date) => ['on', 'presale'].includes(ticketState(item, today));

export function sessionsFor(item: CalItem, cinema: Cinema, date: Date, country: CountryCode, today: Date): Session[] {
  if (!hasTickets(item, today) || !item.theatrical) return [];
  const rel = fromKey(item.theatrical);
  if (date < rel || diffDays(date, rel) > RUN_DAYS) return [];
  const r = rng(item.key + cinema.id + dkey(date));
  const pop = Math.min(1, item.popularity / 120);
  if (r() > .4 + pop * .55) return [];
  const adult = item.cert ? /^(R|NC-17|18|C|D|B15|16)/.test(item.cert) : false;
  const slots = SLOTS.filter(s => !(adult && s < '12'));
  const count = Math.min(slots.length, 1 + Math.floor(r() * (2 + pop * 4)));
  const chosen = [...slots].sort(() => r() - .5).slice(0, count).sort();
  const C = COUNTRIES[country];
  return chosen.map(time => {
    const fmt = r() < .55 ? '2D' : pick(cinema.formats, r);
    let p = C.basePrice;
    const h = parseInt(time, 10);
    if (h < 12) p *= .7; else if (h >= 18 && h < 22) p *= 1.25;
    if ([0, 5, 6].includes(date.getDay())) p *= 1.12;
    p *= FMT_MULT[fmt] * (.92 + r() * .16);
    return {
      id: `${item.key}|${cinema.id}|${dkey(date)}|${time}`, itemKey: item.key, cinema, date, time, fmt, country,
      price: Math.max(C.round, Math.round(p / C.round) * C.round), hall: 1 + Math.floor(r() * cinema.halls),
    };
  });
}

export function firstSessionDay(item: CalItem, today: Date) {
  const rel = item.theatrical ? fromKey(item.theatrical) : today;
  return rel > today ? rel : today;
}

export interface Hall { rows: number; per: number; taken: Set<string> }
export function hallLayout(s: Session, popularity: number): Hall {
  const r = rng(s.id + ':hall');
  const rows = 8 + Math.floor(r() * 5);
  const per = 12 + 2 * Math.floor(r() * 4);
  const busy = .25 + Math.min(.35, popularity / 400) + (parseInt(s.time, 10) >= 18 ? .12 : 0);
  const taken = new Set<string>();
  for (let y = 1; y <= rows; y++) for (let x = 1; x <= per; x++) if (r() < busy) taken.add(`${y}-${x}`);
  return { rows, per, taken };
}
export const seatPrice = (s: Session, row: number, rows: number) => {
  const round = COUNTRIES[s.country].round;
  return row === rows ? Math.round(s.price * 1.4 / round) * round : s.price;
};
export const isPast = (s: Session, today: Date, nowMin: number) =>
  diffDays(s.date, today) === 0 && parseInt(s.time, 10) * 60 + parseInt(s.time.slice(3), 10) < nowMin;
export { addDays };
