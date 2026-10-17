# Premiero

Календарь премьер кино и сериалов с сеансами и покупкой билетов. Регионы: Украина, США, Мексика, Казахстан, Узбекистан, Армения, Кыргызстан, Беларусь. Языки интерфейса: украинский, английский, испанский, русский.

## Запуск

1. Получите API Read Access Token на [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api).
2. Скопируйте `.env.example` в `.env.local` и вставьте токен в `TMDB_TOKEN=`.
3. `npm install`, затем `npm run dev` и откройте http://localhost:3000.

## Откуда данные

| Что | Источник |
|---|---|
| Фильмы в кино и цифровые релизы по странам | TMDB `discover/movie` + `release_dates` |
| Сериалы и даты выхода серий | TMDB `discover/tv` + `tv/{id}/season/{n}` |
| Где смотреть | TMDB `watch/providers` (данные JustWatch) |
| Кинотеатры, сеансы, места | **демо**, `src/lib/demo-cinemas.ts` |
| Оплата | не подключена |

Ответы TMDB кэшируются на сервере (`'use cache'` + `cacheLife('hours')`), токен в браузер не попадает.

Для стран, где у TMDB мало региональных дат (часто Центральная Азия), фильмы показываются по мировой премьере, и сайт об этом предупреждает.

## Структура

- `src/lib/tmdb.ts`: запросы к TMDB и сборка календаря месяца
- `src/app/api/*`: маршруты `calendar`, `now-playing`, `title/[media]/[id]`
- `src/components/CalendarApp.tsx`: календарь (лента, месяц, список), фильтры, регион, язык
- `src/components/Modal.tsx`: карточка фильма, расписание, выбор мест, оформление
- `src/lib/i18n.ts`: тексты интерфейса на четырёх языках

This product uses the TMDB API but is not endorsed or certified by TMDB.
