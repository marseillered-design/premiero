import { IMG, SRCSET } from '@/lib/regions';

// Постер TMDB, а если его нет, типографическая заглушка с названием
const hash = (str: string) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const FALLBACK = [['#22324F', '#0C1220'], ['#43206A', '#12081F'], ['#2F5D50', '#12251F'], ['#3E0B10', '#0B0606'], ['#3D2E1E', '#1E1E1E']];

// The page grows on 2K/4K screens (--zoom in globals.css: 1.2, 1.5, 2), but the browser picks an
// image by screen pixels: the last width in `sizes` gets the same steps, so posters stay sharp
const wide = (sizes: string) => {
  const m = /(?:^|,\s*)(\d+)px$/.exec(sizes);
  if (!m) return sizes;
  const px = Number(m[1]);
  const head = sizes.slice(0, m.index);
  const steps = [[3400, 2], [2880, 1.5], [2200, 1.2]].map(([w, z]) => `(min-width: ${w}px) ${Math.round(px * z)}px`).join(', ');
  return [head, steps, `${px}px`].filter(Boolean).join(', ');
};

export default function Poster({ path, title, alt, cert, mini = false, size = 'w342', sizes, eager = false }: { path: string | null; title: string; alt?: string; cert?: string | null; mini?: boolean; size?: string; sizes?: string; eager?: boolean }) {
  const src = IMG(path, mini ? 'w92' : size);
  // карточки календаря: две колонки на телефоне, около 200 px на компьютере
  const srcSet = mini ? undefined : SRCSET(path, 'poster');
  const media = wide(sizes ?? '(max-width: 640px) 46vw, 220px');
  const [a, b] = FALLBACK[hash(title) % FALLBACK.length];
  return (
    <div className={`poster${mini ? ' mini' : ''}${src ? '' : ' fb'}`} style={src ? undefined : { background: `linear-gradient(165deg, ${a}, ${b})` }} aria-hidden={alt ? undefined : true}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} srcSet={srcSet} sizes={srcSet ? media : undefined} alt={alt ?? ""} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? undefined : 'low'} decoding="async" /> : <span className="p-t">{title}</span>}
      {cert && !mini ? <span className="p-age">{cert}</span> : null}
    </div>
  );
}
