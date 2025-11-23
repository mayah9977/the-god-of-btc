// lib/signal-scoring.ts

export type SignalType = 'rule' | 'ai';

export type SignalGrade = 'A' | 'B' | 'C' | 'D';

export type BaseSignal = {
  type: SignalType;
  strategyId?: string;
  score: number;     // 0 ~ 100
  grade: SignalGrade;
};

// 온체인/선물 지표 같은 "컨텍스트" 값 (있으면 쓰고, 없으면 기본값)
export type MarketContext = {
  fundingRate?: number;     // 예: -0.025
  oiChangePct?: number;     // OI 변화율 (%) 예: +7.5
  priceChangePct?: number;  // 특정 기간 가격 변동률 (%) 예: +0.3 (거의 횡보)
};

// -----------------------------
// grade 계산 (점수 → A/B/C/D)
// -----------------------------
export function calcGrade(score: number): SignalGrade {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}

// -----------------------------
// 규칙 기반 점수 계산 (Rule-based)
//   - 지금은 간단한 if문 몇 개로 구성
//   - 나중에 AI 모델로 교체해도, 이 함수만 바꾸면 됨
// -----------------------------
export function computeRuleScore(
  strategyId: string | undefined,
  ctx: MarketContext = {},
): { score: number; grade: SignalGrade } {
  let score = 50; // 기본값

  const funding = ctx.fundingRate ?? 0;
  const oi = ctx.oiChangePct ?? 0;
  const price = ctx.priceChangePct ?? 0;

  // 1) 예시: "펀딩이 많이 음수 + OI 증가 + 가격 횡보" → 숏 or 롱 스퀴즈 구간
  if (funding < -0.02 && oi > 5 && Math.abs(price) < 1) {
    score = 80;
  }

  // 2) 예시: "펀딩이 과도한 양수 + OI 급증" → 과열 구간
  if (funding > 0.02 && oi > 10) {
    score = Math.max(score, 75);
  }

  // 3) 전략별로 가중치
  if (strategyId?.includes('whale')) {
    // 고래 전략은 기본적으로 신뢰도 조금 더 높게
    score += 5;
  }
  if (strategyId?.includes('scalp')) {
    // 스캘핑 전략은 변동성 크므로 기본 점수 조금 낮춰도 됨
    score -= 5;
  }

  // 점수 범위 보정
  if (score > 100) score = 100;
  if (score < 0) score = 0;

  const grade = calcGrade(score);
  return { score, grade };
}
