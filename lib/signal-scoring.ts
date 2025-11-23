// lib/signal-scoring.ts
// @ts-nocheck

/**
 * TV 시그널에 들어오는 온체인 / 파생상품 지표들을 기반으로
 * 0~100 점수와 등급(S/A/B/C/D)을 계산하는 헬퍼입니다.
 *
 * - side: LONG / SHORT
 * - meta.fundingRate: 현재 펀딩 비율 (%)
 * - meta.oiChangePct: OI 변화율 (%)
 * - meta.exchangeNetflow: 거래소 순유입 (BTC 기준, +면 유입, -면 유출)
 * - meta.whaleRatio: Whale Exchange Ratio (0~1 사이 비율)
 */

export type TvScoreInput = {
  side?: 'LONG' | 'SHORT' | string;
  meta?: {
    fundingRate?: number | string;
    oiChangePct?: number | string;
    exchangeNetflow?: number | string;
    whaleRatio?: number | string;
    [key: string]: any;
  };
};

export type TvScoreResult = {
  score: number; // 0~100
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
};

function toNum(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function computeRuleScore(input: TvScoreInput): TvScoreResult {
  const side = (input.side ?? '').toUpperCase();
  const m = input.meta ?? {};

  const funding = toNum(m.fundingRate, 0); // 현재 펀딩 (%)
  const oi = toNum(m.oiChangePct, 0); // OI 변화율 (%)
  const netflow = toNum(m.exchangeNetflow, 0); // 거래소 순유입 (BTC)
  const whaleRatio = toNum(m.whaleRatio, 0); // 0~1 비율

  // 1) 기본 점수 (중립 70점)
  let score = 70;

  // 2) Funding Rate
  //   LONG: 마이너스 펀딩이 유리, SHORT: 플러스 펀딩이 유리
  if (side === 'LONG') {
    if (funding < -0.03) score += 14;
    else if (funding < -0.02) score += 10;
    else if (funding < -0.01) score += 6;
    else if (funding > 0.03) score -= 14;
    else if (funding > 0.02) score -= 10;
  } else if (side === 'SHORT') {
    if (funding > 0.03) score += 14;
    else if (funding > 0.02) score += 10;
    else if (funding > 0.01) score += 6;
    else if (funding < -0.03) score -= 14;
    else if (funding < -0.02) score -= 10;
  }

  // 3) OI 변화
  //   +: 포지션 쌓임, -: 포지션 청산
  if (oi > 15) score += 10;
  else if (oi > 8) score += 7;
  else if (oi < -15) score -= 10;
  else if (oi < -8) score -= 7;

  // 4) 거래소 Netflow (BTC 기준)
  //   음수: 거래소 유출(강세), 양수: 거래소 유입(약세)
  if (netflow < -5000) score += 8;
  else if (netflow < -2000) score += 5;
  else if (netflow > 5000) score -= 8;
  else if (netflow > 2000) score -= 5;

  // 5) Whale Ratio
  //   낮을수록 안전, 높을수록 큰 매도 압력 위험
  if (whaleRatio < 0.35) score += 6;
  else if (whaleRatio > 0.6) score -= 6;

  // 6) 점수 보정 및 클램프
  if (!Number.isFinite(score)) score = 70;
  if (score > 100) score = 100;
  if (score < 0) score = 0;

  // 7) 등급 매핑
  let grade: TvScoreResult['grade'];
  if (score >= 90) grade = 'S';
  else if (score >= 85) grade = 'A';
  else if (score >= 75) grade = 'B';
  else if (score >= 65) grade = 'C';
  else grade = 'D';

  return { score, grade };
}

