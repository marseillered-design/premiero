import CalendarPage, { calendarMetadata } from '@/components/CalendarPage';

export function generateMetadata() {
  return calendarMetadata('series');
}

export default function Page() {
  return <CalendarPage section="series" />;
}
