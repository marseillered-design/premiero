/**
 * CDN Vercel держит ответ час и ещё сутки отдаёт старую копию, пока в фоне готовит новую.
 * Поэтому ждать загрузки TMDB приходится только самому первому посетителю.
 */
export const CDN_CACHE = { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' };
