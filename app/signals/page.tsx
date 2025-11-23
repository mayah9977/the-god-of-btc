// app/signals/page.tsx
// @ts-nocheck

import { adminDB } from '@/lib/firebase-admin';
import Link from 'next/link';
import { Activity, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SignalsFeedClient from './SignalsFeedClient';

export const dynamic = 'force-dynamic';

type FeedItem = {
  id: string;
  kind: 'tv' | 'news';
  symbol: string;
  side?: string;
  strategyId?: string;
  title: string;
  summary?: string;
  source: string;
  url?: string;
  score?: number | null;
  grade?: string | null;
  category?: string | null;
  createdAtMs: number;
  signalType?: string;
};

async function fetchTvSignals(limitCount = 120): Promise<FeedItem[]> {
  const snap = await adminDB
    .collection('signals_raw')
    .orderBy('createdAtMs', 'desc')
    .limit(limitCount)
    .get();

  return snap.docs.map((doc) => {
    const d = doc.data() as any;

    const createdAtMs =
      typeof d.createdAtMs === 'number'
        ? (d.createdAtMs as number)
        : Date.now();

    let score: number | null = null;
    if (typeof d.score === 'number') score = d.score;
    else if (typeof d.aiScore === 'number') score = d.aiScore;

    return {
      // ⬇⬇⬇ 여기서는 Firestore Timestamp/Date 같은 건 절대 그대로 넣지 않습니다.
      id: `tv-${doc.id}`,
      kind: 'tv',
      symbol: (d.symbol ?? 'BTCUSDT').toUpperCase(),
      side: (d.side ?? '').toUpperCase(),
      strategyId: d.strategyId ?? d.strategy ?? '',
      title:
        d.title ??
        `[TV] ${(d.symbol ?? 'BTCUSDT').toUpperCase()} ${(d.side ?? '')
          .toString()
          .toUpperCase()} signal`,
      summary: d.message ?? d.label ?? '',
      source: d.source ?? 'tradingview',
      url: '', // 상세 페이지에서 다시 보여줄 예정이면 나중에 채워도 됨
      score,
      grade: d.grade ?? null,
      category: null,
      createdAtMs,
      signalType: d.type ?? 'ai',
    };
  });
}

async function fetchNewsSignals(limitCount = 120): Promise<FeedItem[]> {
  const snap = await adminDB
    .collection('news_signals')
    .orderBy('createdAtMs', 'desc')
    .limit(limitCount)
    .get();

  return snap.docs.map((doc) => {
    const d = doc.data() as any;

    const createdAtMs =
      typeof d.createdAtMs === 'number'
        ? (d.createdAtMs as number)
        : Date.now();

    const categoryRaw = (d.category ?? d.sentiment ?? 'general')
      .toString()
      .toLowerCase();

    let newsScore: number | null = null;
    if (typeof d.importanceScore === 'number') {
      newsScore = d.importanceScore;
    } else {
      if (categoryRaw.includes('etf')) newsScore = 92;
      else if (categoryRaw.includes('halving')) newsScore = 90;
      else if (categoryRaw.includes('regulation')) newsScore = 85;
      else if (categoryRaw.includes('breaking')) newsScore = 88;
      else if (categoryRaw.includes('positive')) newsScore = 80;
      else if (categoryRaw.includes('negative')) newsScore = 78;
      else newsScore = 70;
    }

    let grade: string | undefined;
    if (newsScore >= 90) grade = 'S';
    else if (newsScore >= 85) grade = 'A';
    else if (newsScore >= 75) grade = 'B';
    else if (newsScore >= 65) grade = 'C';
    else grade = 'D';

    return {
      id: `news-${doc.id}`,
      kind: 'news',
      symbol: (d.symbol ?? 'BTCUSDT').toUpperCase(),
      side: '',
      strategyId: '',
      title: d.headline ?? d.title ?? '(no title)',
      summary: d.summary ?? '',
      source: d.source ?? d.sourceName ?? 'cryptonews',
      url: d.url ?? d.link ?? '',
      score: newsScore,
      grade,
      category: categoryRaw,
      createdAtMs,
      signalType: 'news',
    };
  });
}

export default async function SignalsPage() {
  const [tvSignals, newsSignals] = await Promise.all([
    fetchTvSignals(120),
    fetchNewsSignals(120),
  ]);

  // 단순 숫자/문자열만 담긴 plain object 배열
  const allItems: FeedItem[] = [...tvSignals, ...newsSignals].sort(
    (a, b) => b.createdAtMs - a.createdAtMs,
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Activity className="h-6 w-6" />
            Trading Signals Feed
          </h1>
          <p className="text-sm text-muted-foreground">
            TV 전략 시그널 + 뉴스 기반 시그널을 한 번에 보는 통합 피드입니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="default" size="sm">
            <Link href="/signals">Feed</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/signals/news">
              <Newspaper className="mr-1 h-3 w-3" />
              News only
            </Link>
          </Button>
        </div>
      </div>

      {/* 여기서 SignalsFeedClient 로 넘기는 것은 완전히 직렬화 가능한 plain objects */}
      <SignalsFeedClient initialItems={allItems} />
    </div>
  );
}

