import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Заголовок, описание и картинку для превью всегда отдаём сразу в <head>, а не в конце страницы:
  // их ищут там поисковики, Telegram, Viber и проверки вроде PageSpeed Insights.
  // Страницам релизов эти данные всё равно нужны для первого экрана, так что быстрее от стриминга они не становились.
  htmlLimitedBots: /.*/,
  poweredByHeader: false,
  // только HTTPS, без угадывания типов файлов, адрес для чужих сайтов — без пути,
  // и сайт нельзя встроить в чужую страницу (кнопки «удалить аккаунт» и т. п. не подсунуть под клик)
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
      ],
    }];
  },
};

export default nextConfig;
