/*
 * Хранилище аккаунтов: Upstash Redis через REST (подключается на Vercel во вкладке Storage).
 * Vercel кладёт ключи в KV_REST_API_URL и KV_REST_API_TOKEN, сам Upstash — в UPSTASH_REDIS_REST_*.
 */
const url = () => (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
const token = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
export const hasKv = () => Boolean(url() && token());

type Cmd = (string | number)[];

/** Несколько команд одним запросом; возвращает результаты по порядку. */
export async function kv(...cmds: Cmd[]): Promise<unknown[]> {
  const res = await fetch(`${url()}/pipeline`, {
    method: 'POST', cache: 'no-store',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  if (!res.ok) throw new Error(`KV ${res.status}`);
  const out = (await res.json()) as { result?: unknown; error?: string }[];
  const bad = out.find(r => r.error);
  if (bad) throw new Error(`KV ${bad.error}`);
  return out.map(r => r.result);
}

/** Ответ HGETALL: плоский список [поле, значение, …] → объект. */
export const pairs = (flat: unknown): Record<string, string> => {
  const a = Array.isArray(flat) ? (flat as string[]) : [];
  const o: Record<string, string> = {};
  for (let i = 0; i + 1 < a.length; i += 2) o[a[i]] = a[i + 1];
  return o;
};
