// thepremiero.com на Cloudflare. Сам сайт (Next.js) работает на сервере Google Cloud Run, а этот
// Worker стоит перед ним: принимает посетителей на домене, держит в кэше то, что можно (как CDN
// Vercel), не пускает ИИ-краулеров и по расписанию запускает /api/warm и /api/tg/remind.
// Адрес сервера — ORIGIN в wrangler.jsonc. Выкладка: npx wrangler deploy

// Краулеры, которые собирают сайты для обучения нейросетей (то же правило было в Vercel Firewall,
// список совпадает с robots.ts). Поисковики и ИИ-поиск (Googlebot, Bingbot, OAI-SearchBot) проходят.
const AI_TRAINING = /GPTBot|ClaudeBot|anthropic-ai|CCBot|Bytespider|meta-externalagent|Amazonbot|cohere-ai|Diffbot|img2dataset/i;

const CRONS = {
  // прогрев кэша календаря и отправка новых адресов в IndexNow
  '0 4 * * *': '/api/warm',
  // напоминания в Telegram и на почту, по понедельникам ещё и недельная подборка
  '0 7 * * *': '/api/tg/remind',
};

// Сколько секунд Cloudflare может держать ответ: s-maxage (ответы /api/calendar и /api/search)
// или max-age у неизменных файлов (/_next/static). Ответы с куками и личные не кэшируются.
function cacheSeconds(response) {
  if (response.status !== 200 || response.headers.has('set-cookie')) return 0;
  const cc = response.headers.get('cache-control') || '';
  if (!/public/.test(cc) || /private|no-store/.test(cc)) return 0;
  const m = /s-maxage=(\d+)/.exec(cc) || (/immutable/.test(cc) && /max-age=(\d+)/.exec(cc));
  return m ? Number(m[1]) : 0;
}

// Запрос посетителя — на сервер. Next.js узнаёт настоящий адрес из x-forwarded-host, а переадресации
// на адрес сервера возвращаются посетителю уже с thepremiero.com.
async function toOrigin(request, env, url) {
  const origin = new URL(env.ORIGIN);
  const headers = new Headers(request.headers);
  headers.set('x-forwarded-host', url.host);
  headers.set('x-forwarded-proto', 'https');
  // страна посетителя под тем именем, под каким её сообщал Vercel: по ней главная выбирает
  // календарь страны (src/proxy.ts)
  if (request.cf?.country) headers.set('x-vercel-ip-country', request.cf.country);
  // адрес посетителя, который сам посетитель подделать не может (по нему лимит сообщений об ошибках)
  headers.set('x-client-ip', request.headers.get('cf-connecting-ip') || '');
  // пропуск на сервер: без него src/proxy.ts отвечает 403
  if (env.ORIGIN_SECRET) headers.set('x-origin-auth', env.ORIGIN_SECRET);
  const response = await fetch(new URL(url.pathname + url.search, origin), {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual',
  });
  const out = new Response(response.body, response);
  const location = out.headers.get('location');
  if (location?.startsWith(origin.origin)) out.headers.set('location', url.origin + location.slice(origin.origin.length));
  return out;
}

export default {
  async fetch(request, env, ctx) {
    if (AI_TRAINING.test(request.headers.get('user-agent') || '')) {
      return new Response('Forbidden', { status: 403 });
    }
    const url = new URL(request.url);
    // сайт живёт на thepremiero.com без www, как было на Vercel
    if (url.hostname === 'www.thepremiero.com') {
      return Response.redirect(`https://thepremiero.com${url.pathname}${url.search}`, 308);
    }

    const cacheable = request.method === 'GET' && !request.headers.has('rsc');
    if (cacheable) {
      const hit = await caches.default.match(request);
      if (hit) return hit;
    }
    const response = await toOrigin(request, env, url);
    const seconds = cacheable ? cacheSeconds(response) : 0;
    if (seconds) {
      const stored = new Response(response.clone().body, response);
      stored.headers.set('cache-control', `public, max-age=${seconds}`);
      ctx.waitUntil(caches.default.put(request, stored));
    }
    return response;
  },

  async scheduled(controller, env, ctx) {
    const path = CRONS[controller.cron];
    if (!path) return;
    const response = await fetch(new URL(path, env.ORIGIN), {
      headers: {
        'x-forwarded-host': 'thepremiero.com',
        'x-forwarded-proto': 'https',
        ...(env.CRON_SECRET ? { authorization: `Bearer ${env.CRON_SECRET}` } : {}),
        ...(env.ORIGIN_SECRET ? { 'x-origin-auth': env.ORIGIN_SECRET } : {}),
      },
    });
    console.log(`cron ${path}: ${response.status} ${(await response.text()).slice(0, 300)}`);
  },
};
