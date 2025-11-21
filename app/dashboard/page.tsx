// @ts-nocheck
import { adminDB } from '@/lib/firebase-admin';
import DashboardClient, {
  MetricCardItem,
  EventItem,
} from './DashboardClient';

export const dynamic = 'force-dynamic';

// KST 기준 오늘 날짜 "YYYY-MM-DD" 문자열 반환
function getTodayKstString(): string {
  const now = new Date();
  const kstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000); // UTC + 9h
  return kstTime.toISOString().slice(0, 10);
}

async function fetchMetricsAndEvents(dateStr: string) {
  // metrics_daily
  const metricsSnap = await adminDB
    .collection('metrics_daily')
    .where('date', '==', dateStr)
    .get();

  const metrics: MetricCardItem[] = metricsSnap.docs.map((doc) => {
    const d = doc.data() as any;
    return {
      id: doc.id,
      date: d.date ?? dateStr,
      metricName: d.metricName ?? '',
      imageUrl: d.imageUrl ?? '',
      note: d.note ?? '',
      order: typeof d.order === 'number' ? d.order : 999,
    };
  }).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  // events_daily
  const eventsSnap = await adminDB
    .collection('events_daily')
    .where('date', '==', dateStr)
    .get();

  const events: EventItem[] = eventsSnap.docs.map((doc) => {
    const d = doc.data() as any;
    return {
      id: doc.id,
      date: d.date ?? dateStr,
      title: d.title ?? '',
      time: d.time ?? '',
      note: d.note ?? '',
      importance: typeof d.importance === 'number' ? d.importance : 1,
      order: typeof d.order === 'number' ? d.order : 999,
    };
  }).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  return { metrics, events };
}

export default async function DashboardPage() {
  const today = getTodayKstString();
  const { metrics, events } = await fetchMetricsAndEvents(today);

  return (
    <DashboardClient
      today={today}
      metrics={metrics}
      events={events}
    />
  );
}
