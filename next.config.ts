import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Заголовок, описание и картинку для превью всегда отдаём сразу в <head>, а не в конце страницы:
  // их ищут там поисковики, Telegram, Viber и проверки вроде PageSpeed Insights.
  // Страницам релизов эти данные всё равно нужны для первого экрана, так что быстрее от стриминга они не становились.
  htmlLimitedBots: /.*/,
};

export default nextConfig;
