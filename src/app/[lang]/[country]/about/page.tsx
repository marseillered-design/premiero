import type { Metadata } from 'next';
import AboutPage, { aboutMetadata } from '@/components/AboutPage';

export async function generateMetadata(): Promise<Metadata> {
  return aboutMetadata('about');
}

export default function Page() {
  return <AboutPage name="about" />;
}
