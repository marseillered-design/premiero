import { IMG, SRCSET } from '@/lib/regions';

// Постер TMDB, а если его нет, типографическая заглушка с названием
const hash = (str: string) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const FALLBACK = [['#22324F', '#0C1220'], ['#43206A', '#12081F'], ['#2F5D50', '#12251F'], ['#3E0B10', '#0B0606'], ['#3D2E1E', '#1E1E1E']];

export default function Poster({ path, title, cert, mini = false, size = 'w342', sizes, eager = false }: { path: string | null; title: string; cert?: string | null; mini?: boolean; size?: string; sizes?: string; eager?: boolean }) {
  const src = IMG(path, mini ? 'w92' : size);
  // карточки календаря: две колонки на телефоне, около 200 px на компьютере
  const srcSet = mini ? undefined : SRCSET(path, 'poster');
  const media = sizes ?? '(max-width: 640px) 46vw, 220px';
  const [a, b] = FALLBACK[hash(title) % FALLBACK.length];
  return (
    <div className={`poster${mini ? ' mini' : ''}${src ? '' : ' fb'}`} style={src ? undefined : { background: `linear-gradient(165deg, ${a}, ${b})` }} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} srcSet={srcSet} sizes={srcSet ? media : undefined} alt="" loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? undefined : 'low'} decoding="async" /> : <span className="p-t">{title}</span>}
      {cert && !mini ? <span className="p-age">{cert}</span> : null}
    </div>
  );
}
