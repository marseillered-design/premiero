// Premiero на Cloudflare Workers: сайт целиком отдаёт OpenNext (.open-next/worker.js, собирается
// командой npx opennextjs-cloudflare build), а здесь — задачи по расписанию вместо крон-задач Vercel
// (wrangler.jsonc → triggers.crons). Маршруты те же и с тем же паролем CRON_SECRET.
import { default as handler } from './.open-next/worker.js';

const CRONS = {
  // прогрев кэша календаря и отправка новых адресов в IndexNow
  '0 4 * * *': '/api/warm',
  // напоминания в Telegram и на почту, по понедельникам ещё и недельная подборка
  '0 7 * * *': '/api/tg/remind',
};

// Краулеры, которые собирают сайты для обучения нейросетей (как правило в Vercel Firewall и
// список в robots.ts): посетителей не приводят, а запросов делали больше всех людей вместе.
// Поисковики и ИИ-поиск (Googlebot, Bingbot, OAI-SearchBot) проходят.
const AI_TRAINING = /GPTBot|ClaudeBot|anthropic-ai|CCBot|Bytespider|meta-externalagent|Amazonbot|cohere-ai|Diffbot|img2dataset/i;

export default {
  fetch(request, env, ctx) {
    if (AI_TRAINING.test(request.headers.get('user-agent') || '')) {
      return new Response('Forbidden', { status: 403 });
    }
    // сайт живёт на thepremiero.com без www, как было на Vercel
    const url = new URL(request.url);
    if (url.hostname === 'www.thepremiero.com') {
      return Response.redirect(`https://thepremiero.com${url.pathname}${url.search}`, 308);
    }
    return handler.fetch(request, env, ctx);
  },

  async scheduled(controller, env, ctx) {
    const path = CRONS[controller.cron];
    if (!path) return;
    const request = new Request(`https://thepremiero.com${path}`, {
      headers: env.CRON_SECRET ? { authorization: `Bearer ${env.CRON_SECRET}` } : {},
    });
    ctx.waitUntil(handler.fetch(request, env, ctx).then(async res => {
      console.log(`cron ${path}: ${res.status} ${(await res.text()).slice(0, 300)}`);
    }));
  },
};
