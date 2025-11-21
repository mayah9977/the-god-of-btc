// @ts-nocheck
'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';

export type NewsItem = {
  id: string;
  sourceId: string;
  sourceName: string;
  lang: 'ko' | 'en' | 'ja';
  title: string;
  summary: string;
  url: string;
  coins: string[];
  tags: string[];
  publishedAt: string; // ISO string
  sentiment?: string;
  rankScore?: number;
  pushCandidate?: boolean;
};

type Props = {
  initialItems: NewsItem[];
};

const sentimentColor: Record<string, string> = {
  BULLISH: 'bg-emerald-500',
  BEARISH: 'bg-red-500',
  NEUTRAL: 'bg-slate-500',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export default function NewsListClient({ initialItems }: Props) {
  const [keyword, setKeyword] = useState('');
  const [lang, setLang] = useState<'ALL' | 'ko' | 'en' | 'ja'>('ALL');
  const [coin, setCoin] = useState<'ALL' | string>('ALL');
  const [sentiment, setSentiment] =
    useState<'ALL' | 'BULLISH' | 'BEARISH' | 'NEUTRAL'>('ALL');
  const [onlyPush, setOnlyPush] = useState(false);

  const coins = useMemo(() => {
    const s = new Set<string>();
    initialItems.forEach((n) => n.coins?.forEach((c) => s.add(c)));
    return Array.from(s);
  }, [initialItems]);

  const filtered = useMemo(() => {
    let list = initialItems;

    if (lang !== 'ALL') {
      list = list.filter((n) => n.lang === lang);
    }
    if (coin !== 'ALL') {
      list = list.filter((n) => n.coins?.includes(coin));
    }
    if (sentiment !== 'ALL') {
      list = list.filter((n) => n.sentiment === sentiment);
    }
    if (onlyPush) {
      list = list.filter((n) => n.pushCandidate);
    }
    if (keyword.trim().length > 0) {
      const k = keyword.toLowerCase();
      list = list.filter((n) => {
        const haystack = `${n.title} ${n.summary} ${n.sourceName}`.toLowerCase();
        return haystack.includes(k);
      });
    }

    // 🔥 Reordering: rankScore 우선, 동점이면 최신순
    return [...list].sort((a, b) => {
      const ra = a.rankScore ?? 0;
      const rb = b.rankScore ?? 0;
      if (ra !== rb) return rb - ra;

      const ta = new Date(a.publishedAt).getTime();
      const tb = new Date(b.publishedAt).getTime();
      return tb - ta;
    });
  }, [initialItems, lang, coin, sentiment, onlyPush, keyword]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
      {/* Left: list */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">
            현재 조건에 맞는 뉴스가 없습니다.
          </p>
        )}

        {filtered.map((item) => (
          <Card
            key={item.id}
            className="cursor-pointer transition hover:shadow-md"
            onClick={() => {
              if (item.url && item.url !== '#') {
                window.open(item.url, '_blank', 'noopener,noreferrer');
              }
            }}
          >
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{item.title}</CardTitle>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{item.sourceName}</span>
                  <span>•</span>
                  <span>{item.lang}</span>
                  <span>•</span>
                  <span>{item.coins.join(', ') || 'ALL'}</span>
                  <span>•</span>
                  <span>{formatDate(item.publishedAt)}</span>
                  {typeof item.rankScore === 'number' && (
                    <>
                      <span>•</span>
                      <span>score {item.rankScore}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {item.sentiment && (
                  <Badge
                    className={
                      'text-[10px] font-semibold uppercase text-white ' +
                      (sentimentColor[item.sentiment] ?? 'bg-slate-500')
                    }
                  >
                    {item.sentiment}
                  </Badge>
                )}
                {item.pushCandidate && (
                  <Badge className="bg-amber-500 text-[10px] text-white">
                    PUSH
                  </Badge>
                )}
                {item.tags && item.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap justify-end gap-1">
                    {item.tags.slice(0, 4).map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="border-slate-300 px-1.5 py-0 text-[10px]"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="line-clamp-3 text-sm text-muted-foreground">
                {item.summary}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Right: filters */}
      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Language */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Language
              </label>
              <Select
                value={lang}
                onValueChange={(v) => setLang(v as 'ALL' | 'ko' | 'en' | 'ja')}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="ko">Korean (ko)</SelectItem>
                  <SelectItem value="en">English (en)</SelectItem>
                  <SelectItem value="ja">Japanese (ja)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Coin */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Coin
              </label>
              <Select
                value={coin}
                onValueChange={(v) => setCoin(v as 'ALL' | string)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  {coins.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sentiment */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Sentiment
              </label>
              <Select
                value={sentiment}
                onValueChange={(v) =>
                  setSentiment(
                    v as 'ALL' | 'BULLISH' | 'BEARISH' | 'NEUTRAL'
                  )
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="BULLISH">Bullish</SelectItem>
                  <SelectItem value="BEARISH">Bearish</SelectItem>
                  <SelectItem value="NEUTRAL">Neutral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Only push candidates */}
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Only push candidates
              </label>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={onlyPush}
                onChange={(e) => setOnlyPush(e.target.checked)}
              />
            </div>

            {/* Keyword */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Keyword
              </label>
              <Input
                className="h-9 text-xs"
                placeholder="Search title / summary / source"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}


