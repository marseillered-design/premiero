import { kv, pairs } from './kv';
import type { User } from './auth';
import type { WatchItem } from './types';

/*
 * Данные аккаунта в Redis:
 *   u:<sub>            профиль из Google (имя, почта, фото)
 *   w:<sub>            «Мой список»: поле — ключ релиза, значение — WatchItem в JSON
 *   s:<sub>            выбранные стримингы: поле — страна, значение — список id TMDB
 */
const MAX_ITEMS = 500;

export const saveProfile = (u: User) =>
  kv(['HSET', `u:${u.sub}`, 'name', u.name, 'email', u.email, 'picture', u.picture ?? '', 'seen', new Date().toISOString()]);

export async function loadAccount(sub: string) {
  const [w, s] = await kv(['HGETALL', `w:${sub}`], ['HGETALL', `s:${sub}`]);
  const watch: Record<string, WatchItem> = {};
  for (const [k, v] of Object.entries(pairs(w))) { try { watch[k] = JSON.parse(v); } catch { /* пропускаем битую запись */ } }
  const subs: Record<string, number[]> = {};
  for (const [c, v] of Object.entries(pairs(s))) { try { subs[c] = JSON.parse(v); } catch { /* пропускаем */ } }
  return { watch, subs };
}

/** Проверяем то, что пришло из браузера: только ожидаемые поля и разумные длины. */
export function cleanItem(x: unknown): WatchItem | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const media = o.media === 'movie' || o.media === 'tv' || o.media === 'game' ? o.media : null;
  const id = typeof o.id === 'number' && Number.isInteger(o.id) && o.id > 0 ? o.id : null;
  if (!media || !id || typeof o.title !== 'string') return null;
  const str = (v: unknown, max: number) => (typeof v === 'string' && v.length <= max ? v : null);
  const date = str(o.date, 10);
  return {
    key: `${media}-${id}`, media, id, title: o.title.slice(0, 200),
    poster: str(o.poster, 120), date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
  };
}

export async function addItems(sub: string, items: WatchItem[]) {
  if (!items.length) return;
  const [count] = await kv(['HLEN', `w:${sub}`]);
  const room = Math.max(0, MAX_ITEMS - Number(count ?? 0));
  const flat = items.slice(0, room).flatMap(i => [i.key, JSON.stringify(i)]);
  if (flat.length) await kv(['HSET', `w:${sub}`, ...flat]);
}
export const removeItem = (sub: string, key: string) => kv(['HDEL', `w:${sub}`, key]);
export const saveSubs = (sub: string, country: string, ids: number[]) => kv(['HSET', `s:${sub}`, country, JSON.stringify(ids)]);
export const deleteAccount = (sub: string) => kv(['DEL', `u:${sub}`, `w:${sub}`, `s:${sub}`]);
