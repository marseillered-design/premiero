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
  const add = items.slice(0, room);
  if (!add.length) return;
  // HSETNX отвечает 1 только для новых записей: их и прибавляем к общему счётчику
  const fresh = await kv(...add.map(i => ['HSETNX', `w:${sub}`, i.key, JSON.stringify(i)]));
  const inc = add.filter((_, n) => Number(fresh[n]) === 1).map(i => ['HINCRBY', 'want', i.key, 1]);
  if (inc.length) await kv(...inc);
}
export async function removeItem(sub: string, key: string) {
  const [gone] = await kv(['HDEL', `w:${sub}`, key]);
  if (Number(gone) === 1) await kv(['HINCRBY', 'want', key, -1]);
}
/** Сколько аккаунтов отметили каждый из релизов. */
export async function wantCounts(keys: string[]): Promise<Record<string, number>> {
  if (!keys.length) return {};
  const [vals] = await kv(['HMGET', 'want', ...keys]);
  const out: Record<string, number> = {};
  (Array.isArray(vals) ? vals : []).forEach((v, i) => { const n = Number(v); if (n > 0) out[keys[i]] = n; });
  return out;
}
export const saveSubs = (sub: string, country: string, ids: number[]) => kv(['HSET', `s:${sub}`, country, JSON.stringify(ids)]);
export async function deleteAccount(sub: string) {
  const [token, keys] = await kv(['HGET', `u:${sub}`, 'cal'], ['HKEYS', `w:${sub}`]);
  const listed = Array.isArray(keys) ? (keys as string[]) : [];
  if (listed.length) await kv(...listed.map(k => ['HINCRBY', 'want', k, -1]));
  await kv(['DEL', `u:${sub}`, `w:${sub}`, `s:${sub}`, ...(token ? [`cal:${token}`] : [])]);
}

/* ---------- «Мой список» как подписка в календаре ----------
 *   cal:<token>       кому принадлежит ссылка и для какой страны и языка она собирается
 *   u:<sub> → cal     текущая ссылка пользователя (новая ссылка отключает старую)
 */
export interface CalFeed { sub: string; country: string; lang: string }
export const calToken = async (sub: string) => ((await kv(['HGET', `u:${sub}`, 'cal']))[0] as string | null) ?? null;
export async function newCalToken(sub: string, country: string, lang: string) {
  const old = await calToken(sub);
  const token = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString('base64url');
  await kv(
    ...(old ? [['DEL', `cal:${old}`]] : []),
    ['SET', `cal:${token}`, JSON.stringify({ sub, country, lang } satisfies CalFeed)],
    ['HSET', `u:${sub}`, 'cal', token],
  );
  return token;
}
export async function dropCalToken(sub: string) {
  const old = await calToken(sub);
  if (old) await kv(['DEL', `cal:${old}`], ['HDEL', `u:${sub}`, 'cal']);
}
export async function feedOwner(token: string): Promise<CalFeed | null> {
  const [raw] = await kv(['GET', `cal:${token}`]);
  try { return raw ? JSON.parse(String(raw)) as CalFeed : null; } catch { return null; }
}
/** Обновить дату в записи списка, если релиз перенесли. */
export const saveItems = (sub: string, items: WatchItem[]) =>
  items.length ? kv(['HSET', `w:${sub}`, ...items.flatMap(i => [i.key, JSON.stringify(i)])]) : Promise.resolve([]);
