// app/signals/news/page.tsx
// @ts-nocheck

import { adminDB } from '@/lib/firebase-admin';
import NewsSignalsClient, { NewsSignalItem } from './NewsSignalsClient';

export const dynamic = 'force-dynamic';

async function fetchSignalNews(limit = 100): Promise<NewsSignalItem[]> {
  const snap = await adminDB
    .collection('news_signals')
    .orderBy('createdAtMs', 'desc')
    .limit(limit)
    .get();

  return snap.docs.map((doc) => {
    const d = doc.data() as any;

    return {
      id: doc.id,
      symbol: d.symbol ?? 'BTCUSDT',
      title: d.title ?? '',
      summary: d.summary ?? '',
      url: d.url ?? '#',
      source: d.source ?? 'Unknown',
      sentiment: d.sentiment ?? 'NEUTRAL',
      provider: d.provider ?? '',
      tags: Array.isArray(d.tags) ? (d.tags as string[]) : [],
      createdAtMs:
        typeof d.createdAtMs === 'number' ? (d.createdAtMs as number) : Date.now(),
    };
  });
}

export default async function NewsSignalsPage() {
  const items = await fetchSignalNews(120);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold md:text-3xl">
          뉴스 기반 시그널 피드
        </h1>
        <div className="text-xs text-muted-foreground">
          BTC/ETF/온체인 이슈 기반 자동 시그널
        </div>
      </div>

      <NewsSignalsClient initialItems={items} />
    </div>
  );
}
