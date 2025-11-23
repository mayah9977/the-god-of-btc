// app/signals/news/page.tsx
// @ts-nocheck

import { adminDB } from '@/lib/firebase-admin';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Newspaper, ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

type NewsSignal = {
  id: string;
  symbol: string;
  headline: string;
  source: string;
  category: string;
  url?: string;
  publishedAt?: string | null;
  createdAtMs: number;
};

// 날짜 포맷
function formatDateFromMs(ms?: number | null) {
  if (!ms) return '';
  try {
    const d = new Date(ms);
    return d.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

// 감성/카테고리에 따라 뱃지 스타일
function categoryLabel(cat: string) {
  const c = (cat || '').toLowerCase();
  if (c.includes('positive')) {
    return { label: '호재(Positive)', variant: 'default' as const };
  }
  if (c.includes('negative')) {
    // shadcn Badge 타입에 destructive가 없는 경우가 있어서 secondary 사용
    return { label: '악재(Negative)', variant: 'secondary' as const };
  }
  if (c.includes('etf')) {
    return { label: 'ETF', variant: 'default' as const };
  }
  if (c.includes('regulation')) {
    return { label: '규제/정책', variant: 'outline' as const };
  }
  return { label: cat || '일반 뉴스', variant: 'outline' as const };
}

// Firestore(Admin)에서 뉴스 시그널 가져오기
async function fetchSignalNews(limitCount = 100): Promise<NewsSignal[]> {
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
      id: doc.id,
      symbol: d.symbol ?? 'BTCUSDT',
      headline: d.headline ?? d.title ?? '(no title)',
      source: d.source ?? d.sourceName ?? 'cryptonews',
      category: d.category ?? d.sentiment ?? 'general',
      url: d.url ?? d.link ?? '',
      publishedAt: d.publishedAt ?? d.date ?? null,
      createdAtMs,
    };
  });
}

export default async function NewsSignalsPage() {
  const items = await fetchSignalNews(120);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6">
      {/* 상단 헤더 + 탭 */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Newspaper className="h-6 w-6" />
            News Signals
          </h1>
          <p className="text-sm text-muted-foreground">
            온체인/ETF/거시 이슈와 연결되는 주요 크립토 뉴스 시그널 피드입니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/signals">
            <Button variant="outline" size="sm">
              TV Signals
            </Button>
          </Link>
          <Button variant="default" size="sm">
            News
          </Button>
        </div>
      </div>

      {/* 빈 상태 처리 */}
      {items.length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          아직 수집된 뉴스 시그널이 없습니다.
          <br />
          크론이 한 번 이상 실행되면 이곳에 표시됩니다.
        </div>
      )}

      {/* 뉴스 카드 리스트 */}
      <div className="flex flex-col gap-3">
        {items.map((item) => {
          const cat = categoryLabel(item.category);
          return (
            <Card
              key={item.id}
              className="transition-colors hover:border-primary/70"
            >
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">
                    {item.headline}
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs">
                    <span className="font-medium">{item.source}</span>
                    {item.symbol && (
                      <>
                        {' · '}
                        <span className="uppercase">{item.symbol}</span>
                      </>
                    )}
                    {item.publishedAt && (
                      <>
                        {' · '}
                        {item.publishedAt}
                      </>
                    )}
                  </CardDescription>
                </div>
                <Badge variant={cat.variant}>{cat.label}</Badge>
              </CardHeader>

              {item.url && (
                <CardContent className="pt-0">
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    원문 링크: {item.url}
                  </p>
                </CardContent>
              )}

              <CardFooter className="flex items-center justify-between pt-3">
                <span className="text-[11px] text-muted-foreground">
                  수집 시각: {formatDateFromMs(item.createdAtMs)}
                </span>

                {item.url && (
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                  >
                    <Link href={item.url} target="_blank">
                      원문 보기
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}


