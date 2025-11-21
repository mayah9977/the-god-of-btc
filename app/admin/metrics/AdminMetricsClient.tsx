// @ts-nocheck
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';

type MetricItem = {
  id: string;
  date: string;
  metricName: string;
  imageUrl: string;
  note: string;
  order?: number;
};

type EventItem = {
  id: string;
  date: string;
  title: string;
  time?: string;
  note: string;
  importance?: number;
  order?: number;
};

type Props = {
  initialDate: string;
};

export default function AdminMetricsClient({ initialDate }: Props) {
  const [date, setDate] = useState(initialDate);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<MetricItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  // 신규 metric form 상태
  const [metricName, setMetricName] = useState('');
  const [metricImageUrl, setMetricImageUrl] = useState('');
  const [metricNote, setMetricNote] = useState('');
  const [metricOrder, setMetricOrder] = useState<string>('');

  // 신규 event form 상태
  const [eventTitle, setEventTitle] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventNote, setEventNote] = useState('');
  const [eventImportance, setEventImportance] = useState<string>('3');
  const [eventOrder, setEventOrder] = useState<string>('');

  useEffect(() => {
    void fetchData(date);
  }, [date]);

  async function fetchData(d: string) {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/metrics?date=${d}`);
      const json = await res.json();
      if (!json.ok) {
        setMessage(`불러오기 실패: ${json.error ?? 'Unknown error'}`);
      } else {
        setMetrics(json.metrics ?? []);
        setEvents(json.events ?? []);
      }
    } catch (err: any) {
      console.error(err);
      setMessage(`불러오기 에러: ${err?.message ?? 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddMetric(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!metricName.trim()) {
      setMessage('Metric Name 은 필수입니다.');
      return;
    }

    try {
      const res = await fetch('/api/admin/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'metric',
          date,
          metricName: metricName.trim(),
          imageUrl: metricImageUrl.trim(),
          note: metricNote.trim(),
          order: metricOrder ? Number(metricOrder) : undefined,
        }),
      });

      const json = await res.json();
      if (!json.ok) {
        setMessage(`Metric 저장 실패: ${json.error ?? 'Unknown error'}`);
      } else {
        setMessage('Metric 이 저장되었습니다.');
        // 폼 초기화
        setMetricName('');
        setMetricImageUrl('');
        setMetricNote('');
        setMetricOrder('');
        // 리스트 다시 로드
        void fetchData(date);
      }
    } catch (err: any) {
      console.error(err);
      setMessage(`Metric 저장 에러: ${err?.message ?? 'Unknown error'}`);
    }
  }

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!eventTitle.trim()) {
      setMessage('Event Title 은 필수입니다.');
      return;
    }

    try {
      const res = await fetch('/api/admin/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'event',
          date,
          title: eventTitle.trim(),
          time: eventTime.trim(),
          note: eventNote.trim(),
          importance: Number(eventImportance),
          order: eventOrder ? Number(eventOrder) : undefined,
        }),
      });

      const json = await res.json();
      if (!json.ok) {
        setMessage(`Event 저장 실패: ${json.error ?? 'Unknown error'}`);
      } else {
        setMessage('Event 가 저장되었습니다.');
        setEventTitle('');
        setEventTime('');
        setEventNote('');
        setEventOrder('');
        // 리스트 다시 로드
        void fetchData(date);
      }
    } catch (err: any) {
      console.error(err);
      setMessage(`Event 저장 에러: ${err?.message ?? 'Unknown error'}`);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 p-4 md:p-8">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Admin · Metrics & Events</h1>
          <p className="text-xs text-muted-foreground md:text-sm">
            Firestore 콘솔을 열지 않고, 대시보드용 지표·이벤트를 직접 입력하는 페이지입니다.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs md:text-sm">
          <span>날짜 (KST 기준):</span>
          <Input
            type="date"
            className="h-8 w-40"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </header>

      {message && (
        <div className="text-xs text-amber-600">
          {message}
        </div>
      )}

      {/* 상단: 입력 폼들 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Metric 추가 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">새 지표 추가 (metrics_daily)</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleAddMetric}>
              <div className="space-y-1">
                <label className="text-xs font-medium">Metric Name</label>
                <Input
                  placeholder="예) Open Interest (Binance + Bybit)"
                  value={metricName}
                  onChange={(e) => setMetricName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Image URL</label>
                <Input
                  placeholder="지표 스크린샷이 업로드된 URL"
                  value={metricImageUrl}
                  onChange={(e) => setMetricImageUrl(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Note (설명)</label>
                <Textarea
                  rows={3}
                  placeholder="오늘 지표 해석 / 메모"
                  value={metricNote}
                  onChange={(e) => setMetricNote(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Order (정렬 순서, 선택)</label>
                <Input
                  type="number"
                  placeholder="1, 2, 3 ..."
                  value={metricOrder}
                  onChange={(e) => setMetricOrder(e.target.value)}
                />
              </div>

              <Button type="submit" size="sm">
                지표 저장
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Event 추가 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">새 이벤트 추가 (events_daily)</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleAddEvent}>
              <div className="space-y-1">
                <label className="text-xs font-medium">Event Title</label>
                <Input
                  placeholder="예) US CPI Release, FOMC Meeting, BTC Spot ETF Decision"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Time (선택)</label>
                <Input
                  placeholder="예) 22:30 KST, NY Pre-market"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Importance (1~5)</label>
                <Select
                  value={eventImportance}
                  onValueChange={(v) => setEventImportance(v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Low</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3 - Medium</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5 - Very High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Note (설명)</label>
                <Textarea
                  rows={3}
                  placeholder="이 이벤트가 왜 중요한지 / 매매에 어떤 영향을 줄지"
                  value={eventNote}
                  onChange={(e) => setEventNote(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Order (정렬 순서, 선택)</label>
                <Input
                  type="number"
                  placeholder="1, 2, 3 ..."
                  value={eventOrder}
                  onChange={(e) => setEventOrder(e.target.value)}
                />
              </div>

              <Button type="submit" size="sm">
                이벤트 저장
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* 하단: 현재 날짜 데이터 리스트 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Metrics 리스트 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {date} · 지표 목록 (metrics_daily)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && (
              <p className="text-xs text-muted-foreground">불러오는 중...</p>
            )}
            {!loading && metrics.length === 0 && (
              <p className="text-xs text-muted-foreground">
                이 날짜에 저장된 지표가 없습니다.
              </p>
            )}
            {!loading &&
              metrics.map((m) => (
                <div
                  key={m.id}
                  className="rounded border px-2 py-1 text-xs leading-tight"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{m.metricName}</span>
                    <span className="text-[10px] text-muted-foreground">
                      order: {m.order ?? 999}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-blue-600 break-all">
                    {m.imageUrl}
                  </div>
                  {m.note && (
                    <div className="mt-0.5 text-[11px] text-muted-foreground whitespace-pre-line">
                      {m.note}
                    </div>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Events 리스트 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {date} · 이벤트 목록 (events_daily)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && (
              <p className="text-xs text-muted-foreground">불러오는 중...</p>
            )}
            {!loading && events.length === 0 && (
              <p className="text-xs text-muted-foreground">
                이 날짜에 저장된 이벤트가 없습니다.
              </p>
            )}
            {!loading &&
              events.map((e) => (
                <div
                  key={e.id}
                  className="rounded border px-2 py-1 text-xs leading-tight"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{e.title}</span>
                    <span className="text-[10px] text-muted-foreground">
                      imp: {e.importance ?? 1} · order: {e.order ?? 999}
                    </span>
                  </div>
                  {e.time && (
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      time: {e.time}
                    </div>
                  )}
                  {e.note && (
                    <div className="mt-0.5 text-[11px] text-muted-foreground whitespace-pre-line">
                      {e.note}
                    </div>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
