// app/signals/[id]/page.tsx
// @ts-nocheck

import { adminDB } from '@/lib/firebase-admin';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, ArrowLeft, Newspaper, LineChart } from 'lucide-react';

export const dynamic = 'force-dynamic';

function formatDate(value: any) {
  try {
    if (value && typeof value.toDate === 'function') {
      return value.toDate().toLocaleString('ko-KR');
    }
    if (typeof value === 'number') {
      return new Date(value).toLocaleString('ko-KR');
    }
    if (typeof value === 'string') {
      return new Date(value).toLocaleString('ko-KR');
    }
    return '';
  } catch {
    return '';
  }
}

export default async function SignalDetailPage({ params }: any) {
  const id = params.id as string;

  let kind: 'tv' | 'news';
  let colName: string;
  let docId: string;

  if (id.startsWith('tv-')) {
    kind = 'tv';
    colName = 'signals';
    docId = id.slice(3);
  } else if (id.startsWith('news-')) {
    kind = 'news';
    colName = 'news_signals';
    docId = id.slice(5);
  } else {
    notFound();
  }

  const snap = await adminDB.collection(colName).doc(docId).get();
  if (!snap.exists) {
    notFound();
  }
  const d = snap.data() as any;

  // 공통 필드 가공
  const createdAt =
    d.createdAt ??
    (typeof d.createdAtMs === 'number' ? d.createdAtMs : undefined);

  let title = '';
  let symbol = (d.symbol ?? 'BTCUSDT').toUpperCase();
  let side = (d.side ?? '').toUpperCase();
  let summary = '';
  let source = d.source ?? d.sourceName ?? '';
  let score: number | null = null;
  let grade: string | undefined;
  let strategyId: string | undefined;
  let category: string | undefined;
  let url: string | undefined;

  if (kind === 'tv') {
    title =
      d.title ??
      `[TV] ${symbol} ${side ? side + ' ' : ''}signal`;
    summary = d.message ?? d.label ?? '';
    strategyId = d.strategyId ?? d.strategy ?? '';

    if (typeof d.score === 'number') score = d.score;
    else if (typeof d.aiScore === 'number') score = d.aiScore;
    else if (typeof d.confidence === 'number') score = d.confidence;

    grade = d.grade;
  } else {
    title = d.headline ?? d.title ?? '(no title)';
    summary = d.summary ?? '';
    url = d.url ?? d.link ?? '';
    category = (d.category ?? d.sentiment ?? '').toString();

    if (typeof d.importanceScore === 'number') score = d.importanceScore;

    // 간단 등급 (뉴스 쪽은 없으면 계산)
    if (!grade && typeof score === 'number') {
      if (score >= 90) grade = 'S';
      else if (score >= 85) grade = 'A';
      else if (score >= 75) grade = 'B';
      else if (score >= 65) grade = 'C';
      else grade = 'D';
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/signals">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Feed
          </Link>
        </Button>

        <span className="text-xs text-muted-foreground">
          ID: {id}
        </span>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              {kind === 'tv' ? (
                <>
                  <Activity className="h-5 w-5" />
                  TV Signal · {symbol}
                </>
              ) : (
                <>
                  <Newspaper className="h-5 w-5" />
                  News Signal · {symbol}
                </>
              )}
            </CardTitle>
            <CardDescription className="mt-1 text-xs">
              from {source || (kind === 'tv' ? 'tradingview' : 'news')}
              {createdAt && ` · ${formatDate(createdAt)}`}
            </CardDescription>
          </div>

          <div className="flex flex-col items-end gap-1">
            {kind === 'tv' && side && (
              <Badge className="px-2 py-0.5 text-[11px] font-semibold uppercase">
                {side}
              </Badge>
            )}
            {strategyId && (
              <Badge
                variant="outline"
                className="flex items-center gap-1 px-2 py-0.5 text-[11px]"
              >
                <LineChart className="h-3 w-3" />
                {strategyId}
              </Badge>
            )}
            {category && (
              <Badge
                variant="outline"
                className="px-2 py-0.5 text-[11px]"
              >
                {category}
              </Badge>
            )}
            {typeof score === 'number' && (
              <Badge
                variant="outline"
                className="border-amber-500/60 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700"
              >
                {grade ? `${grade} Grade · ` : ''}
                {score}점
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <h2 className="mb-1 text-base font-semibold">{title}</h2>
            {summary && (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {summary}
              </p>
            )}
          </div>

          <div className="rounded-lg bg-muted p-3 text-xs">
            <div className="mb-1 font-semibold">Raw payload</div>
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-[11px]">
              {JSON.stringify(d, null, 2)}
            </pre>
          </div>

          {url && (
            <Button asChild size="sm" variant="outline">
              <Link href={url} target="_blank">
                원문 링크 열기
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
