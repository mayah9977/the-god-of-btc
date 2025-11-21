// @ts-nocheck
import { adminDB } from '@/lib/firebase-admin';
import NewsListClient, { NewsItem } from './NewsListClient';

export const dynamic = 'force-dynamic';

async function fetchLatestNews(limit = 120): Promise<NewsItem[]> {
  const snap = await adminDB
    .collection('news_normalized')
    .orderBy('publishedAt', 'desc')
    .limit(limit)
    .get();

  return snap.docs.map((doc) => {
    const d = doc.data() as any;

    return {
      id: doc.id,
      sourceId: d.sourceId ?? '',
      sourceName: d.sourceName ?? '',
      lang: (d.lang as 'ko' | 'en' | 'ja') ?? 'en',
      title: d.title ?? '',
      summary: d.summary ?? '',
      url: d.url ?? '#',
      coins: (d.coins as string[]) ?? [],
      tags: (d.tags as string[]) ?? [],
      publishedAt: d.publishedAt?.toDate
        ? d.publishedAt.toDate().toISOString()
        : new Date().toISOString(),
      sentiment: d.sentiment ?? 'NEUTRAL',
      rankScore: typeof d.rankScore === 'number' ? d.rankScore : 0,
      pushCandidate: Boolean(d.pushCandidate),
    };
  });
}

export default async function NewsPage() {
  const news = await fetchLatestNews(120);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold md:text-3xl">뉴스 / 속보 피드</h1>
        <div className="text-xs text-muted-foreground">
          실시간 코인 뉴스 · ETF / 온체인 이벤트
        </div>
      </div>

      <NewsListClient initialItems={news} />
    </div>
  );
}


