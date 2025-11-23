// app/signals/page.tsx
// @ts-nocheck

import { adminDB } from '@/lib/firebase-admin';
import Link from 'next/link';
import { Newspaper, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SignalsFeedClient from './SignalsFeedClient';

export const dynamic = 'force-dynamic';

// TV / 알고리즘 시그널 가져오기
async function fetchTvSignals(limitCount = 120) {
  const snap = await adminDB
    .collection('signals')
    .orderBy('createdAtMs', 'desc')
    .limit(limitCount)
    .get();

  return snap.docs.map((doc) => {
    const d = doc.data() as any;

    const createdAtMs =
      typeof d.createdAtMs === 'number'
        ? (d.createdAtMs as number)
        : Date.now();

    const score =
      typeof d.score === 'number' ? (d.score as number) : null;

    return {
      id: `tv-${doc.id}`,
      kind: 'tv' as const,
      symbol: (d.symbol ?? 'BTCUSDT').toUpperCase(),
      side: (d.side ?? '').toUpperCase(),
      strategyId: d.strategyId ?? d.strategy ?? '',
      title:
        d.title ??
        `[TV] ${d.symbol ?? 'BTCUSDT'} ${(
          d.side ?? ''
        ).toUpperCase()} signal`,
      summary: d.message ?? d.label ?? '',
      source: d.source ?? 'tradingview',
      url: '', // 나중에 디테일 페이지 만들면 링크 연결
      score,
      grade: d.grade ?? '',
      createdAtMs,
    };
  });
}

// 뉴스 시그널 가져오기
async function fetchNewsSignals(limitCount = 120) {
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

    return {
      id: `news-${doc.id}`,
      kind: 'news' as const,
      symbol: (d.symbol ?? 'BTCUSDT').toUpperCase(),
      side: '', // 뉴스에는 LONG/SHORT 없음
      strategyId: '',
      title: d.headline ?? d.title ?? '(no title)',
      summary: d.summary ?? '',
      source: d.source ?? d.sourceName ?? 'cryptonews',
      url: d.url ?? d.link ?? '',
      score: null,
      grade: '',
      category: d.category ?? d.sentiment ?? 'general',
      createdAtMs,
    };
  });
}

export default async function SignalsPage() {
  const [tvSignals, newsSignals] = await Promise.all([
    fetchTvSignals(120),
    fetchNewsSignals(120),
  ]);

  // 통합 피드 (최신순 정렬)
  const allItems = [...tvSignals, ...newsSignals].sort(
    (a, b) => b.createdAtMs - a.createdAtMs,
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
      {/* 상단 헤더 */}
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

      {/* 클라이언트 필터/정렬 UI + 리스트 */}
      <SignalsFeedClient initialItems={allItems} />
    </div>
  );
}
