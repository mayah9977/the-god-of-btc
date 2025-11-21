// @ts-nocheck
'use client';

import React, { useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export type MetricCardItem = {
  id: string;
  date: string;
  metricName: string;
  imageUrl: string;
  note: string;
  order?: number;
};

export type EventItem = {
  id: string;
  date: string;
  title: string;
  time?: string;
  note: string;
  importance?: number;
  order?: number;
};

type Props = {
  today: string;
  metrics: MetricCardItem[];
  events: EventItem[];
};

const importanceLabel = (value?: number) => {
  if (!value || value <= 1) return 'Low';
  if (value >= 5) return 'Very High';
  if (value >= 3) return 'High';
  return 'Medium';
};

export default function DashboardClient({ today, metrics, events }: Props) {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 p-4 md:p-8">
      {/* Top: title */}
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">BTC Dashboard</h1>
          <p className="text-xs text-muted-foreground md:text-sm">
            TradingView 차트 + 온체인/파생상품 지표 + 오늘의 주요 이벤트
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          Today (KST): <span className="font-mono">{today}</span>
        </div>
      </header>

      {/* Top: TradingView widget */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm md:text-base">
              BTC/USDT TradingView (1h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[360px] w-full md:h-[420px]">
              <TradingViewBTCWidget />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Middle: metrics cards */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">오늘의 주요 지표 (이미지 카드)</h2>
          <p className="text-xs text-muted-foreground">
            Open Interest / Funding / Netflow / SOPR / Whale Ratio …
          </p>
        </div>

        {metrics.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            오늘 날짜({today})에 해당하는 지표가 없습니다.
            <br />
            Firestore <code>metrics_daily</code> 컬렉션에 데이터를 추가해 주세요.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {metrics.map((m) => (
              <Card key={m.id} className="flex flex-col overflow-hidden">
                <CardHeader className="space-y-1 pb-2">
                  <CardTitle className="text-sm font-semibold">
                    {m.metricName}
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground">
                    date: {m.date}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {m.imageUrl ? (
                    <div className="overflow-hidden rounded-md border bg-muted">
                      {/* 스크린샷 이미지 */}
                      <img
                        src={m.imageUrl}
                        alt={m.metricName}
                        className="h-48 w-full object-contain bg-background"
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-red-500">
                      imageUrl 이 설정되어 있지 않습니다.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground whitespace-pre-line">
                    {m.note}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Bottom: today's key events */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">오늘의 주요 이벤트</h2>
          <p className="text-xs text-muted-foreground">
            ETF 승인/연기, CPI, FOMC, 대형 온체인 이벤트 등
          </p>
        </div>

        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            오늘 날짜({today})에 해당하는 이벤트가 없습니다.
            <br />
            Firestore <code>events_daily</code> 컬렉션에 데이터를 추가해 주세요.
          </p>
        ) : (
          <div className="space-y-3">
            {events.map((e) => (
              <Card
                key={e.id}
                className="flex flex-col justify-between gap-2 border-l-4 border-l-amber-500"
              >
                <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                  <div>
                    <CardTitle className="text-sm font-semibold">
                      {e.title}
                    </CardTitle>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{e.date}</span>
                      {e.time && (
                        <>
                          <span>•</span>
                          <span>{e.time}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge className="text-[10px]">
                    {importanceLabel(e.importance)}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground whitespace-pre-line">
                    {e.note}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/**
 * TradingView BTC/USDT 위젯
 * 이미 /chart 페이지에서 비슷한 위젯을 쓰고 있다면,
 * symbol 이나 interval 만 맞춰서 사용하면 됩니다.
 */
function TradingViewBTCWidget() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // 이미 스크립트가 로드된 경우 중복 추가 방지
    if (document.getElementById('tradingview-widget-script')) {
      createWidget();
      return;
    }

    const script = document.createElement('script');
    script.id = 'tradingview-widget-script';
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => createWidget();
    document.body.appendChild(script);

    return () => {
      // dev 환경에서 너무 자주 지우면 문제될 수 있어서 제거는 생략
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function createWidget() {
    if (!(window as any).TradingView || !containerRef.current) return;

    new (window as any).TradingView.widget({
      autosize: true,
      symbol: 'BINANCE:BTCUSDT',
      interval: '60',
      timezone: 'Etc/UTC',
      theme: 'light',
      style: '1',
      locale: 'en',
      toolbar_bg: '#f1f3f6',
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      container_id: containerRef.current.id,
    });
  }

  return (
    <div
      id="tradingview_btcusdt_dashboard"
      ref={containerRef}
      className="h-full w-full"
    />
  );
}
