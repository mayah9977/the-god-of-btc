// @ts-nocheck
"use client";

import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type NewsItem = {
  id: string;
  sourceId: string;
  sourceName: string;
  lang: "ko" | "en" | "ja";
  title: string;
  summary: string;
  url: string;
  coins: string[];
  tags: string[];
  publishedAt: string; // ISO string
};

type Props = {
  initialItems: NewsItem[];
};

const LANG_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "ko", label: "한국어" },
  { value: "en", label: "영어" },
  { value: "ja", label: "일본어" },
];

export default function NewsListClient({ initialItems }: Props) {
  const [lang, setLang] = useState<"all" | "ko" | "en" | "ja">("all");
  const [keyword, setKeyword] = useState("");
  const [coinFilter, setCoinFilter] = useState<string>("all");

  const coinsAll = useMemo(() => {
    const set = new Set<string>();
    initialItems.forEach((n) => n.coins?.forEach((c) => set.add(c)));
    return Array.from(set);
  }, [initialItems]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();

    return initialItems.filter((n) => {
      if (lang !== "all" && n.lang !== lang) return false;
      if (coinFilter !== "all" && !n.coins.includes(coinFilter)) return false;

      if (kw) {
        const text = (n.title + " " + n.summary + " " + n.sourceName).toLowerCase();
        if (!text.includes(kw)) return false;
      }

      return true;
    });
  }, [initialItems, lang, keyword, coinFilter]);

  return (
    <div className="space-y-4">
      {/* 필터 영역 */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">언어</div>
          <Select value={lang} onValueChange={(v) => setLang(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="언어 선택" />
            </SelectTrigger>
            <SelectContent>
              {LANG_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">코인</div>
          <Select value={coinFilter} onValueChange={(v) => setCoinFilter(v)}>
            <SelectTrigger>
              <SelectValue placeholder="코인 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {coinsAll.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">
            검색 (제목/내용/출처)
          </div>
          <Input
            placeholder="ETF, FOMC, 비트코인 등 키워드"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </div>

      {/* 리스트 */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-sm text-muted-foreground">
            조건에 맞는 뉴스가 없습니다.
          </div>
        )}

        {filtered.map((n) => {
          const date = new Date(n.publishedAt);
          const dateStr = isNaN(date.getTime())
            ? ""
            : date.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

          return (
            <a
              key={n.id}
              href={n.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Card className={cn("transition hover:border-primary/60 hover:shadow-md")}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold line-clamp-2">{n.title}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {n.sourceName}
                      </Badge>
                      {n.lang !== "en" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {n.lang.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {n.summary && (
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {n.summary}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1">
                      {n.coins.map((c) => (
                        <Badge
                          key={c}
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {c}
                          </Badge>
                      ))}
                      {n.tags.map((t) => (
                        <Badge
                          key={t}
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          #{t}
                        </Badge>
                      ))}
                    </div>
                    {dateStr && (
                      <div className="text-[11px] text-muted-foreground">
                        {dateStr}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </a>
          );
        })}
      </div>
    </div>
  );
}

