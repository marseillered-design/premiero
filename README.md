# Premiero

Календарь премьер кино и сериалов с сеансами и покупкой билетов.

- **Регионы:** Украина, 14 стран Европы, США, Мексика, Кавказ и Центральная Азия (22 страны).
- **Языки интерфейса:** украинский, английский, испанский, польский, немецкий, русский.

## Запуск

1. Получите ключ на [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api): подойдёт API Read Access Token или короткий API key (v3).
2. Скопируйте `.env.example` в `.env.local` и впишите ключ в `TMDB_TOKEN=`.
3. `npm install`, затем `npm run dev` и откройте http://localhost:3000.

На Vercel `TMDB_TOKEN` задаётся в Settings → Environment Variables. Если там же задать `CRON_SECRET`, прогрев кэша будет защищён этим секретом.

## Адреса

| Адрес | Что это |
|---|---|
| `/` | proxy уводит на `/{язык}/{страна}`: по прошлому выбору, иначе по языку браузера и стране по IP |
| `/uk/ua` | календарь месяца |
| `/uk/ua/cinemas` | кинотеатры города (демо) |
| `/uk/ua/movie/1153576-street-fighter-vulychnyy-boyets` | страница фильма |
| `/uk/ua/tv/2734-zakon-i-poryadok-spetsialnyy-korpus` | страница сериала |

Город берётся из `x-vercel-ip-city` (кука `premiero_geo_city`), если он есть в списке. Посетитель всегда может выбрать страну, город и язык вручную в шапке.

## Откуда данные

| Что | Источник |
|---|---|
| Фильмы в кино и цифровые релизы по странам | TMDB `discover/movie` + `movie/{id}` (release_dates, watch/providers) |
| Сериалы и даты выхода серий | TMDB `discover/tv` + `tv/{id}/season/{n}` |
| Где смотреть, фильтр «Мои подписки» | TMDB `watch/providers` (данные JustWatch) |
| Кинотеатры, сеансы, места | **демо**, `src/lib/demo-cinemas.ts` |
| Оплата | не подключена |

## Скорость

- Ответы TMDB кэшируются на сервере (`'use cache'` + `cacheLife('hours')`).
- API отдаёт `Cache-Control: s-maxage=3600, stale-while-revalidate=86400`, поэтому CDN Vercel держит готовые ответы.
- `vercel.json` запускает `/api/warm` каждый день в 04:00 UTC: прогрев текущего и следующего месяца для всех стран.

## Структура

- `src/proxy.ts`: редирект на язык и страну, город по IP
- `src/app/[lang]/[country]/`: календарь, кинотеатры, страницы `movie/[slug]` и `tv/[slug]`
- `src/components/TitlePage.tsx`: серверная страница фильма или сериала с метаданными и schema.org
- `src/components/TitleIslands.tsx`: сеансы, трейлер, «Добавить в календарь», график серий
- `src/components/CalendarView.tsx`: лента, сетка месяца, список, фильтры, подписки
- `src/components/AppProvider.tsx`: язык, страна, город, список «Хочу посмотреть», шапка
- `src/lib/tmdb.ts`: запросы к TMDB; `src/lib/regions.ts`: страны и города; `src/lib/i18n.ts`: тексты

This product uses the TMDB API but is not endorsed or certified by TMDB.
