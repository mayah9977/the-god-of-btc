// @ts-nocheck
import AdminMetricsClient from './AdminMetricsClient';

// 오늘 날짜(KST) "YYYY-MM-DD"
function getTodayKstString(): string {
  const now = new Date();
  const kstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kstTime.toISOString().slice(0, 10);
}

export const dynamic = 'force-dynamic';

export default async function AdminMetricsPage() {
  const today = getTodayKstString();

  return <AdminMetricsClient initialDate={today} />;
}
