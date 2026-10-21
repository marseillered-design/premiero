import GamePage, { gameMetadata } from '@/components/GamePage';

export function generateMetadata({ params }: PageProps<'/[lang]/[country]/game/[slug]'>) {
  return gameMetadata(params);
}

export default function Page({ params }: PageProps<'/[lang]/[country]/game/[slug]'>) {
  return <GamePage params={params} />;
}
