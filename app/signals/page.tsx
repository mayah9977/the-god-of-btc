// app/signals/page.tsx
// @ts-nocheck

import { adminDB } from '@/lib/firebase-admin';
import Link from 'next/link';
import { Activity, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SignalsFeedClient from './SignalsFeedClient';

export const dynamic = 'force-dynamic';

// TV / 알고리즘 시그널 가져오기 + 점수/등급 계산
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

    // 1) 원본 score / aiScore / confidence 중 있는 값을 사용
    let rawScore: number | null = null;
    if (typeof d.score === 'number') rawScore = d.score;
    else if (typeof d.aiScore === 'number') rawScore = d.aiScore;
    else if (typeof d.confidence === 'number') rawScore = d.confidence;

    // 2) 등급 자동 계산 (없으면)
    let grade = d.grade as string | undefined;
    if (!grade && typeof rawScore === 'number') {
      if (rawScore >= 90) grade = 'S';
      else if (rawScore >= 85) grade = 'A';
      else if (rawScore >= 75) grade = 'B';
      else if (rawScore >= 65) grade = 'C';
      else grade = 'D';
    }

    return {
      id: `tv-${doc.id}`,
      kind: 'tv' as const,
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
      url: '', // 나중에 디테일 페이지 링크 가능
      score: rawScore,
      grade,
      createdAtMs,
    };
  });
}

// 뉴스 시그널 가져오기 + 중요도 점수 계산
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

    const categoryRaw = (d.category ?? d.sentiment ?? 'general')
      .toString()
      .toLowerCase();

    // 카테고리/속성 기반 중요도 스코어
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
      kind: 'news' as const,
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
    };
  });
}

export default async function SignalsPage() {
  const [tvSignals, newsSignals] = await Promise.all([
    fetchTvSignals(120),
    fetchNewsSignals(120),
  ]);

  // 통합 피드 (최신순)
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

