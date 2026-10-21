import CalendarPage, { calendarMetadata } from '@/components/CalendarPage';

export function generateMetadata() {
  return calendarMetadata();
}

export default function Page() {
  return <CalendarPage />;
}
