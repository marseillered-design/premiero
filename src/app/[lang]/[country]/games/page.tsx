import CalendarPage, { calendarMetadata } from '@/components/CalendarPage';

export function generateMetadata() {
  return calendarMetadata('games');
}

export default function Page() {
  return <CalendarPage section="games" />;
}
