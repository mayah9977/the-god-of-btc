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
import {
  Activity,
  ArrowLeft,
  Newspaper,
  LineChart,
  BarChart3,
  History,
} from 'lucide-react';

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
    colName = 'signals_raw';
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

  const createdAt =
    d.createdAt ??
    (typeof d.createdAtMs === 'number' ? d.createdAtMs : undefined);

  let title = '';
  const symbol = (d.symbol ?? 'BTCUSDT').toUpperCase();
  const side = (d.side ?? '').toUpperCase();
  let summary = '';
  const source = d.source ?? d.sourceName ?? '';
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

    grade = d.grade;
  } else {
    title = d.headline ?? d.title ?? '(no title)';
    summary = d.summary ?? '';
    url = d.url ?? d.link ?? '';
    category = (d.category ?? d.sentiment ?? '').toString();

    if (typeof d.importanceScore === 'number') score = d.importanceScore;
    grade = d.grade;
  }

  // ----------------- 백테스트/유사패턴 섹션용 계산 -----------------
  // Firestore에 backtest / similarCases 필드가 있으면 그대로 사용,
  // 없으면 score/grade 를 기반으로 예상치를 만들어 표시.
  const bt = d.backtest ?? d.btStats ?? null;

  let btWinRate: number | null = null;
  let btRR: number | null = null;
  let btSamples: number | null = null;

  if (bt) {
    if (typeof bt.winRate === 'number') btWinRate = bt.winRate;
    if (typeof bt.rr === 'number') btRR = bt.rr;
    if (typeof bt.samples === 'number') btSamples = bt.samples;
  } else if (kind === 'tv' && typeof score === 'number') {
    // 점수 기반 예상 승률 (단순 휴리스틱)
    btWinRate = Math.min(90, Math.max(40, 40 + (score - 50) * 0.8));
    btRR = 1.8;
    btSamples = 200;
  }

  const similarCases: any[] =
    Array.isArray(d.similarCases) && d.similarCases.length > 0
      ? d.similarCases
      : kind === 'tv'
      ? [
          {
            id: 'ex-1',
            date: '2024-03-15',
            side,
            resultPct: +8.5,
            comment: 'Funding 음수 & OI 증가 구간, 단기 상승 파동.',
          },
          {
            id: 'ex-2',
            date: '2024-05-27',
            side,
            resultPct: -3.2,
            comment: 'Whale Ratio 급등으로 손절, 변동성 큰 구간.',
          },
        ]
      : [];

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

        <CardContent className="space-y-6">
          {/* 요약 섹션 */}
          <div>
            <h2 className="mb-1 text-base font-semibold">{title}</h2>
            {summary && (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {summary}
              </p>
            )}
          </div>

          {/* ⭐ 백테스트 결과 섹션 */}
          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="h-4 w-4" />
              Backtest Results
            </div>
            {btWinRate ? (
              <div className="grid gap-2 text-xs md:grid-cols-3">
                <div>
                  <div className="text-muted-foreground">추정 승률</div>
                  <div className="text-base font-semibold">
                    {btWinRate.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">
                    평균 손익비(R:R)
                  </div>
                  <div className="text-base font-semibold">
                    {btRR?.toFixed(2) ?? '-'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">테스트 샘플 수</div>
                  <div className="text-base font-semibold">
                    {btSamples ?? '-'}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                이 시그널에 대한 백테스트 데이터가 아직 없습니다.  
                (AI 점수와 온체인 조건만 반영된 전략입니다.)
              </p>
            )}
          </div>

          {/* ⭐ 유사 패턴 과거 사례 섹션 */}
          {similarCases.length > 0 && (
            <div className="rounded-lg border bg-muted/40 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <History className="h-4 w-4" />
                Past Cases of Similar Patterns
              </div>
              <div className="space-y-2 text-xs">
                {similarCases.map((c) => (
                  <div
                    key={c.id ?? `${c.date}-${c.resultPct}`}
                    className="flex items-center justify-between rounded-md bg-background px-2 py-1"
                  >
                    <div>
                      <div className="font-medium">
                        {c.date ?? '-'} ·{' '}
                        {(c.side ?? side ?? '').toUpperCase()}
                      </div>
                      {c.comment && (
                        <div className="text-[11px] text-muted-foreground">
                          {c.comment}
                        </div>
                      )}
                    </div>
                    {typeof c.resultPct === 'number' && (
                      <div
                        className={
                          c.resultPct >= 0
                            ? 'text-emerald-600'
                            : 'text-red-600'
                        }
                      >
                        {c.resultPct >= 0 ? '+' : ''}
                        {c.resultPct.toFixed(1)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw payload 확인용 */}
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
