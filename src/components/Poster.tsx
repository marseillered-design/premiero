import { IMG } from '@/lib/regions';
import { hash } from '@/lib/demo-cinemas';

// Постер TMDB, а если его нет, типографическая заглушка с названием
const FALLBACK = [['#22324F', '#0C1220'], ['#43206A', '#12081F'], ['#2F5D50', '#12251F'], ['#3E0B10', '#0B0606'], ['#3D2E1E', '#1E1E1E']];

export default function Poster({ path, title, cert, mini = false, size = 'w342' }: { path: string | null; title: string; cert?: string | null; mini?: boolean; size?: string }) {
  const src = IMG(path, mini ? 'w92' : size);
  const [a, b] = FALLBACK[hash(title) % FALLBACK.length];
  return (
    <div className={`poster${mini ? ' mini' : ''}${src ? '' : ' fb'}`} style={src ? undefined : { background: `linear-gradient(165deg, ${a}, ${b})` }} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" loading="lazy" decoding="async" /> : <span className="p-t">{title}</span>}
      {cert && !mini ? <span className="p-age">{cert}</span> : null}
    </div>
  );
}
