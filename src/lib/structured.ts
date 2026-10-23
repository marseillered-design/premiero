import { SITE } from './site';

/** Цепочка «Главная › Раздел › Страница» для выдачи Google. Пути — от корня сайта. */
export const breadcrumbs = (items: [name: string, path: string][]) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + path })),
});

/** JSON для <script type="application/ld+json">: без «<», чтобы текст не закрыл тег раньше времени. */
export const ldJson = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');
