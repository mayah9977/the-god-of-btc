'use client';

import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type SignalType = 'rule' | 'ai';

type SignalCardProps = {
  symbol: string;
  side: string;                   // 'LONG' | 'SHORT' | 'UNKNOWN'
  strategyId?: string | null;
  strategyLabel?: string | null;  // 다국어 전략 이름(있으면 표시)
  type?: SignalType;
  price?: number | null;
  score?: number | null;          // 0~100
  grade?: string | null;          // 'A' | 'B' | 'C' | 'D'
  timeframe?: string | null;
  createdAt?: Date | string | null;
};

function formatSymbol(symbol: string | undefined) {
  if (!symbol) return 'BTCUSDT';
  const s = symbol.toUpperCase();
  if (s.endsWith('USDT')) {
    return s.replace('USDT', '') + '/USDT';
  }
  return s;
}

function formatPrice(price?: number | null) {
  if (price === null || price === undefined) return '-';
  return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatDate(createdAt?: Date | string | null) {
  if (!createdAt) return '-';
  try {
    const d =
      createdAt instanceof Date ? createdAt : new Date(createdAt);
    return d.toLocaleString('ko-KR', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

function sideBadgeColor(side: string) {
  const s = side.toUpperCase();
  if (s === 'LONG') return 'bg-emerald-500 text-white';
  if (s === 'SHORT') return 'bg-red-500 text-white';
  return 'bg-slate-500 text-white';
}

function typeBadgeLabel(type?: SignalType) {
  if (type === 'ai') return 'AI Signal';
  return 'Rule Signal';
}

export function SignalCard(props: SignalCardProps) {
  const {
    symbol,
    side,
    strategyId,
    strategyLabel,
    type = 'rule',
    price,
    score,
    grade,
    timeframe,
    createdAt,
  } = props;

  const symbolText = formatSymbol(symbol);
  const priceText = formatPrice(price);
  const dateText = formatDate(createdAt);
  const sideClass = sideBadgeColor(side);

  // “Confidence A (80점)” 형태 표시용 텍스트 (한국어 기준)
  let confidenceText = '-';
  if (score !== null && score !== undefined && grade) {
    confidenceText = `신뢰도 ${grade} (${score}점)`;
  }

  return (
    <Card className="w-full max-w-xl border border-slate-800 bg-slate-950/60 text-slate-50 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-lg font-semibold">
            {symbolText}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-300">
            {strategyLabel && (
              <span className="truncate max-w-[220px]">
                {strategyLabel}
              </span>
            )}
            {!strategyLabel && strategyId && (
              <span className="truncate max-w-[220px] opacity-70">
                {strategyId}
              </span>
            )}
            {timeframe && (
              <span className="text-slate-400">
                · TF: {timeframe.toUpperCase()}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge className={sideClass}>{side.toUpperCase()}</Badge>
          <Badge variant="outline" className="border-slate-700 text-[10px]">
            {typeBadgeLabel(type)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">진입가 (Entry)</span>
          <span className="font-medium">{priceText} USDT</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">신뢰도 (Confidence)</span>
          <span className="font-medium">
            {confidenceText}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800 mt-2">
          <span>생성 시각</span>
          <span>{dateText}</span>
        </div>
      </CardContent>
    </Card>
  );
}
