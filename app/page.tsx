'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
// import Link from 'next/link' // 지금은 미사용이라 주석
import { db } from "@/lib/firebase-config"; // ✅ 당신 프로젝트 구조에 맞춤 (루트에 firebase-client.ts 존재)
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore/lite';
import { requestPermissionAndRegister } from '@/lib/push'; // ✅ 파일이 루트에 push.ts 인 구조였음

type SignalDoc = {
  id?: string;
  symbol?: string;
  signal?: string;
  signal2?: string;
  timeframe?: string;
  venue?: string;
  entry_zone?: number[];
  targets?: number[];
  invalidation?: number;
  receivedAt?: any;      // ✅ admin API가 넣는 필드명 (ISO 문자열)
  received_at?: any;     // 🔹 혹시 이전 스키마 호환
  price?: number | null; // 🔹 카드에 표시하려면 유용
  title?: string;
  message?: string | null;
  source?: string;
  meta?: any;
};

const COLLECTION_OPTIONS = [
  { value: 'signals_raw', label: 'signals_raw (default)' },
] as const;

type SignalFilter = 'ALL' | 'LONG' | 'SHORT';

function toDate(v: any): Date | null {
  if (!v) return null;
  if (typeof v?.toDate === 'function') return v.toDate();
  if (typeof v === 'number') return new Date(v);
  if (typeof v === 'string') {
    const d = new Date(v);
    return isNaN(+d) ? null : d;
  }
  return null;
}
function fmtDate(v: any): string {
  const d = toDate(v);
  if (!d) return '-';
  return d.toLocaleString('ko-KR', { hour12: false });
}

function Badge({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'green' | 'red' | 'blue' | 'amber';
  className?: string;
}) {
  const map = {
    neutral: 'bg-gray-100 text-gray-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
  } as const;
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[tone]} ${className}`}>
      {children}
    </span>
  );
}

export default function Home() {
  const [collectionName, setCollectionName] = useState<string>('signals_raw');
  const [signals, setSignals] = useState<SignalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [intervalMs, setIntervalMs] = useState<number>(5000);
  const [paused, setPaused] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const lastTopKeyRef = useRef<string | number | null>(null);

  const [signalFilter, setSignalFilter] = useState<SignalFilter>('ALL');
  const [symbolQuery, setSymbolQuery] = useState<string>('');

  // ✅ 다크 모드 유지
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    const wantDark = saved ? saved === 'dark' : prefersDark;
    document.documentElement.classList.toggle('dark', wantDark);
  }, []);
  function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }

  // ✅ FCM + 권한 + SW 등록 + 토큰 발급
  async function requestNotifications() {
    const ok = await requestPermissionAndRegister();
    if (!ok) {
      alert('푸시 알림 등록에 실패했습니다. 브라우저 설정 또는 콘솔 오류 확인.');
    } else {
      alert('푸시 알림이 활성화되었습니다 ✅');
    }
  }

  // ✅ Firestore 폴링 (필드: receivedAt 기준)
  useEffect(() => {
    let stopped = false;

    async function fetchOnce() {
      try {
        const q = query(
          collection(db, collectionName),
          orderBy('receivedAt', 'desc'), // ✅ admin API가 저장한 필드명
          limit(100)
        );
        const snap = await getDocs(q);
        if (stopped) return;

        const rows = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as SignalDoc[];

        // fallback: 혹시 receivedAt이 없으면 received_at을 date로 변환
        rows.forEach((r) => {
          if (!r.receivedAt && r.received_at) r.receivedAt = r.received_at;
        });

        if (rows.length > 0) {
          const top = rows[0];
          const topKey: string | number | null =
            (top?.id as string) ?? (toDate(top?.receivedAt)?.getTime() ?? null);
          if (topKey) lastTopKeyRef.current = topKey;
        }

        setSignals(rows);
        setLoading(false);
        setError(null);
        setLastUpdated(new Date());
      } catch (e) {
        console.error('❌ Firestore 가져오기 오류:', e);
        setError('데이터 로드 중 오류가 발생했습니다.');
        setLoading(false);
      }
    }

    fetchOnce();
    const id = setInterval(() => {
      if (!paused) fetchOnce();
    }, Math.max(2000, intervalMs));

    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [collectionName, intervalMs, paused]);

  // ✅ 필터 및 검색
  const filtered = useMemo(() => {
    const term = symbolQuery.trim().toUpperCase();
    return signals.filter((s) => {
      const okSymbol = term ? (s.symbol || '').toUpperCase().includes(term) : true;
      const sig = (s.signal || s.signal2 || '').toUpperCase();
      const okFilter =
        signalFilter === 'ALL' ? true : signalFilter === 'LONG' ? sig === 'LONG' : sig === 'SHORT';
      return okSymbol && okFilter;
    });
  }, [signals, symbolQuery, signalFilter]);

  // ✅ CSV 다운로드
  function downloadCSV() {
    const header = [
      'time',
      'symbol',
      'signal',
      'timeframe',
      'venue',
      'entry_zone',
      'targets',
      'invalidation',
    ];
    const rows = filtered.map((s) => [
      fmtDate(s.receivedAt ?? s.received_at),
      s.symbol ?? '',
      s.signal ?? s.signal2 ?? '',
      s.timeframe ?? '',
      s.venue ?? '',
      Array.isArray(s.entry_zone) ? s.entry_zone.join('~') : '',
      Array.isArray(s.targets) ? s.targets.join('|') : '',
      typeof s.invalidation === 'number' ? String(s.invalidation) : '',
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signals-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6 dark:bg-neutral-900 dark:text-neutral-100 min-h-screen space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Trading Signals</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={collectionName}
            onChange={(e) => setCollectionName(e.target.value)}
            className="border rounded-md px-2 py-1 text-sm dark:bg-neutral-800 dark:border-neutral-700"
          >
            {COLLECTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            value={String(intervalMs)}
            onChange={(e) => setIntervalMs(Number(e.target.value))}
            className="border rounded-md px-2 py-1 text-sm dark:bg-neutral-800 dark:border-neutral-700"
          >
            <option value="5000">⟳ 5s</option>
            <option value="10000">⟳ 10s</option>
            <option value="30000">⟳ 30s</option>
            <option value="60000">⟳ 60s</option>
          </select>

          <button
            onClick={() => setPaused((x) => !x)}
            className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50 dark:hover:bg-neutral-800 dark:border-neutral-700"
          >
            {paused ? '▶ 재개' : 'Ⅱ 일시정지'}
          </button>

          {/* ✅ FCM Push */}
          <button
            onClick={requestNotifications}
            className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50 dark:hover:bg-neutral-800 dark:border-neutral-700"
          >
            🔔 알림 허용
          </button>

          <button
            onClick={downloadCSV}
            className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50 dark:hover:bg-neutral-800 dark:border-neutral-700"
          >
            ⬇ CSV
          </button>

          <button
            onClick={toggleDarkMode}
            className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50 dark:hover:bg-neutral-800 dark:border-neutral-700"
          >
            🌓 라이트/다크
          </button>
        </div>
      </div>

      {/* 검색/필터 (원하면 UI 추가 가능) */}
      {/* <div className="flex items-center gap-2">
        <input value={symbolQuery} onChange={e=>setSymbolQuery(e.target.value)} className="border rounded-md px-2 py-1" placeholder="BTCUSDT..." />
        <select value={signalFilter} onChange={e=>setSignalFilter(e.target.value as any)} className="border rounded-md px-2 py-1">
          <option value="ALL">ALL</option>
          <option value="LONG">LONG</option>
          <option value="SHORT">SHORT</option>
        </select>
      </div> */}

      {/* 목록 (심플 버전) */}
      <div className="grid gap-2">
        {loading ? (
          <p className="text-sm text-gray-500">불러오는 중…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : signals.length === 0 ? (
          <p className="text-sm text-gray-500">표시할 시그널이 없습니다. /admin에서 하나 추가해 보세요.</p>
        ) : (
          signals.map((s) => (
            <div key={s.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{s.symbol ?? 'UNKNOWN'}</span>
                  <Badge tone="green">{(s.signal || s.signal2 || 'neutral').toUpperCase()}</Badge>
                </div>
                <span className="text-xs text-gray-500">{fmtDate(s.receivedAt ?? s.received_at)}</span>
              </div>
              {s.title && <div className="mt-1 text-sm font-medium">{s.title}</div>}
              {s.message && <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">{s.message}</div>}
              {!!s.price && <div className="mt-1 text-xs text-gray-600">Price: {s.price}</div>}
            </div>
          ))
        )}
      </div>
    </main>
  );
}






