import type { Metadata } from 'next';
import AboutPage, { aboutMetadata } from '@/components/AboutPage';

export async function generateMetadata(): Promise<Metadata> {
  return aboutMetadata('contact');
}

export default function Page() {
  return <AboutPage name="contact" />;
}
