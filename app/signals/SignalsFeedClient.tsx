// app/signals/SignalsFeedClient.tsx
'use client';
// @ts-nocheck

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowUpDown,
  Filter,
  Flame,
  LineChart,
  Newspaper,
} from 'lucide-react';
import Link from 'next/link';

type UnifiedItem = {
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
  grade?: string;
  category?: string;
  createdAtMs: number;
};

type Props = {
  initialItems: UnifiedItem[];
};

function formatDate(ms: number) {
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

export default function SignalsFeedClient({ initialItems }: Props) {
  const [kindFilter, setKindFilter] = useState<'all' | 'tv' | 'news'>('all');
  const [sideFilter, setSideFilter] = useState<'all' | 'LONG' | 'SHORT'>(
    'all',
  );
  const [sortMode, setSortMode] = useState<'latest' | 'oldest' | 'score'>(
    'latest',
  );
  const [symbolQuery, setSymbolQuery] = useState('');

  const filtered = useMemo(() => {
    let items = [...initialItems];

    // 종류 필터 (TV / News / All)
    if (kindFilter !== 'all') {
      items = items.filter((i) => i.kind === kindFilter);
    }

    // 방향 필터 (TV 시그널에만 적용)
    if (sideFilter !== 'all') {
      items = items.filter((i) =>
        i.kind === 'tv'
          ? (i.side ?? '').toUpperCase() === sideFilter
          : true,
      );
    }

    // 심볼 검색 (BTC, ETH 등)
    if (symbolQuery.trim()) {
      const q = symbolQuery.trim().toUpperCase();
      items = items.filter((i) =>
        (i.symbol ?? '').toUpperCase().includes(q),
      );
    }

    // 정렬
    if (sortMode === 'latest') {
      items.sort((a, b) => b.createdAtMs - a.createdAtMs);
    } else if (sortMode === 'oldest') {
      items.sort((a, b) => a.createdAtMs - b.createdAtMs);
    } else if (sortMode === 'score') {
      // 점수 높은 TV 시그널 우선
      items.sort((a, b) => {
        const as = a.score ?? -1;
        const bs = b.score ?? -1;
        if (as === bs) {
          return b.createdAtMs - a.createdAtMs;
        }
        return bs - as;
      });
    }

    return items;
  }, [initialItems, kindFilter, sideFilter, sortMode, symbolQuery]);

  return (
    <div className="space-y-4">
      {/* 필터/정렬 바 */}
      <div className="flex flex-col gap-3 rounded-xl border bg-muted/40 p-3 text-xs md:flex-row md:items-center md:justify-between">
        {/* 왼쪽: 종류 + 방향 */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] font-medium uppercase text-muted-foreground">
            <Filter className="h-3 w-3" />
            Filters
          </span>

          {/* 종류 필터 */}
          <div className="flex rounded-full border bg-background p-1">
            <Button
              size="sm"
              variant={kindFilter === 'all' ? 'default' : 'ghost'}
              className="h-6 px-3 text-[11px]"
              onClick={() => setKindFilter('all')}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={kindFilter === 'tv' ? 'default' : 'ghost'}
              className="h-6 px-3 text-[11px]"
              onClick={() => setKindFilter('tv')}
            >
              TV
            </Button>
            <Button
              size="sm"
              variant={kindFilter === 'news' ? 'default' : 'ghost'}
              className="h-6 px-3 text-[11px]"
              onClick={() => setKindFilter('news')}
            >
              News
            </Button>
          </div>

          {/* 방향 필터 (TV 전용) */}
          <div className="ml-1 flex rounded-full border bg-background p-1">
            <Button
              size="sm"
              variant={sideFilter === 'all' ? 'default' : 'ghost'}
              className="h-6 px-3 text-[11px]"
              onClick={() => setSideFilter('all')}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={sideFilter === 'LONG' ? 'default' : 'ghost'}
              className="h-6 px-3 text-[11px]"
              onClick={() => setSideFilter('LONG')}
            >
              LONG
            </Button>
            <Button
              size="sm"
              variant={sideFilter === 'SHORT' ? 'default' : 'ghost'}
              className="h-6 px-3 text-[11px]"
              onClick={() => setSideFilter('SHORT')}
            >
              SHORT
            </Button>
          </div>
        </div>

        {/* 오른쪽: 심볼 검색 + 정렬 */}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="심볼 검색 (예: BTC, ETH)"
            value={symbolQuery}
            onChange={(e) => setSymbolQuery(e.target.value)}
            className="h-8 w-36 text-[11px] md:w-44"
          />

          <Select
            value={sortMode}
            onValueChange={(v: any) => setSortMode(v)}
          >
            <SelectTrigger className="h-8 w-32 text-[11px]">
              <SelectValue
                placeholder="정렬"
                className="text-[11px]"
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">
                <div className="flex items-center gap-1 text-[11px]">
                  <ArrowUpDown className="h-3 w-3" />
                  최신순
                </div>
              </SelectItem>
              <SelectItem value="oldest">
                <div className="flex items-center gap-1 text-[11px]">
                  <ArrowUpDown className="h-3 w-3 rotate-180" />
                  오래된순
                </div>
              </SelectItem>
              <SelectItem value="score">
                <div className="flex items-center gap-1 text-[11px]">
                  <Flame className="h-3 w-3" />
                  점수 높은순
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 리스트 영역 */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          조건에 맞는 시그널이 없습니다.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((item) =>
            item.kind === 'tv' ? (
              <TvSignalCard key={item.id} item={item} />
            ) : (
              <NewsSignalCard key={item.id} item={item} />
            ),
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- TV 카드 ---------------- */

function TvSignalCard({ item }: { item: UnifiedItem }) {
  const side = (item.side ?? '').toUpperCase();
  const sideColor =
    side === 'LONG'
      ? 'bg-emerald-600 text-white'
      : side === 'SHORT'
      ? 'bg-red-600 text-white'
      : 'bg-slate-500 text-white';

  return (
    <Card className="border-l-4 border-l-emerald-500/70">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
              TV
            </span>
            {item.symbol}{' '}
            {side && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${sideColor}`}
              >
                {side}
              </span>
            )}
          </CardTitle>
          <CardDescription className="mt-1 text-xs">
            {item.strategyId && (
              <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                <LineChart className="h-3 w-3" />
                {item.strategyId}
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">
              from {item.source ?? 'tradingview'}
            </span>
          </CardDescription>
        </div>

        <div className="flex flex-col items-end gap-1">
          {item.grade && (
            <Badge
              variant="outline"
              className="border-amber-500/60 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700"
            >
              {item.grade} Grade
              {typeof item.score === 'number'
                ? ` (${item.score}점)`
                : ''}
            </Badge>
          )}
          {!item.grade && typeof item.score === 'number' && (
            <Badge
              variant="outline"
              className="border-amber-500/60 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700"
            >
              {item.score}점
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground">
            {formatDate(item.createdAtMs)}
          </span>
        </div>
      </CardHeader>

      {item.summary && (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">{item.summary}</p>
        </CardContent>
      )}

      <CardFooter className="flex items-center justify-between pt-2">
        <span className="text-[11px] text-muted-foreground">
          시그널 ID: {item.id.replace('tv-', '')}
        </span>
      </CardFooter>
    </Card>
  );
}

/* ---------------- NEWS 카드 ---------------- */

function NewsSignalCard({ item }: { item: UnifiedItem }) {
  const cat = (item.category ?? '').toLowerCase();
  let badgeLabel = 'News';
  let badgeClass = 'border-slate-300 bg-slate-50 text-slate-700';

  if (cat.includes('positive')) {
    badgeLabel = '호재(Positive)';
    badgeClass = 'border-emerald-400 bg-emerald-50 text-emerald-700';
  } else if (cat.includes('negative')) {
    badgeLabel = '악재(Negative)';
    badgeClass = 'border-red-400 bg-red-50 text-red-700';
  } else if (cat.includes('etf')) {
    badgeLabel = 'ETF';
    badgeClass = 'border-indigo-400 bg-indigo-50 text-indigo-700';
  } else if (cat.includes('regulation')) {
    badgeLabel = '규제/정책';
    badgeClass = 'border-amber-400 bg-amber-50 text-amber-700';
  }

  return (
    <Card className="border-l-4 border-l-slate-400/70">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[11px] font-medium text-slate-700">
              <Newspaper className="mr-1 h-3 w-3" />
              NEWS
            </span>
            {item.title}
          </CardTitle>
          <CardDescription className="mt-1 text-xs">
            <span className="font-medium">{item.source}</span>
            {item.symbol && (
              <>
                {' · '}
                <span className="uppercase">{item.symbol}</span>
              </>
            )}
          </CardDescription>
        </div>

        <Badge
          variant="outline"
          className={`px-2 py-0.5 text-[11px] ${badgeClass}`}
        >
          {badgeLabel}
        </Badge>
      </CardHeader>

      {item.summary && (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground line-clamp-3">
            {item.summary}
          </p>
        </CardContent>
      )}

      <CardFooter className="flex items-center justify-between pt-2">
        <span className="text-[11px] text-muted-foreground">
          수집 시각: {formatDate(item.createdAtMs)}
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
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

