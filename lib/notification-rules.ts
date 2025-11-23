// lib/notification-rules.ts

// ----------------------
// Types
// ----------------------
export type SupportedLocale = 'ko' | 'en' | 'ja';

export type StrategyId =
  | 'GOB_TREND_1H'
  | 'GOB_TREND_4H'
  | 'GOB_TREND_15M'
  | 'GOB_SCALP_5M'
  | 'GOB_SCALP_1M'
  | 'GOB_SWING_D1'
  | 'GOB_BREAKOUT_1H'
  | 'GOB_BREAKOUT_4H'
  | 'GOB_RANGE_SCALP'
  | 'GOB_LIQ_SWEEP'
  | 'GOB_SPOT_ACCUM_DCA'
  | 'GOB_ONCHAIN_WHALE'
  | 'GOB_NEWS_EVENT'
  | 'GOB_FED_EVENT'
  | 'GOB_DEFAULT';

export type TvSignalPayload = {
  symbol?: string;
  side?: 'LONG' | 'SHORT' | string;
  price?: number;
  strategyId?: string;
  timeframe?: string;
  exchange?: string;
  // Phase 3: 신뢰도 정보 (선택)
  score?: number;
  grade?: string;
};

export type NewsSignalPayload = {
  symbol?: string;
  headline?: string;
  source?: string;
  category?: string;
  importance?: 'high' | 'normal' | 'low';
};

export type BuiltNotification = {
  title: string;
  body: string;
};

// ----------------------
// Locale helpers
// ----------------------
export function normalizeLocale(input?: string | null): SupportedLocale {
  if (!input) return 'ko';
  const lower = input.toLowerCase();

  if (lower.startsWith('ko')) return 'ko';
  if (lower.startsWith('ja')) return 'ja';
  return 'en';
}

// ----------------------
// Strategy name mapping (multi-language)
// ----------------------
type StrategyLabel = {
  ko: string;
  en: string;
  ja: string;
};

export const strategyNameMap: Record<StrategyId, StrategyLabel> = {
  GOB_TREND_1H: {
    ko: '1시간 트렌드 추세 전략',
    en: '1H Trend Strategy',
    ja: '1時間トレンド戦略',
  },
  GOB_TREND_4H: {
    ko: '4시간 트렌드 추세 전략',
    en: '4H Trend Strategy',
    ja: '4時間トレンド戦略',
  },
  GOB_TREND_15M: {
    ko: '15분 트렌드 추세 전략',
    en: '15M Trend Strategy',
    ja: '15分トレンド戦略',
  },
  GOB_SCALP_5M: {
    ko: '5분 스캘핑 전략',
    en: '5M Scalping Strategy',
    ja: '5分スキャル戦略',
  },
  GOB_SCALP_1M: {
    ko: '1분 초단타 스캘핑',
    en: '1M Ultra Scalping',
    ja: '1分超短期スキャルピング',
  },
  GOB_SWING_D1: {
    ko: '일봉 스윙 전략',
    en: 'Daily Swing Strategy',
    ja: '日足スイング戦略',
  },
  GOB_BREAKOUT_1H: {
    ko: '1시간 박스 돌파 전략',
    en: '1H Breakout Strategy',
    ja: '1時間ブレイクアウト戦略',
  },
  GOB_BREAKOUT_4H: {
    ko: '4시간 박스 돌파 전략',
    en: '4H Breakout Strategy',
    ja: '4時間ブレイクアウト戦略',
  },
  GOB_RANGE_SCALP: {
    ko: '레인지 스캘핑 전략',
    en: 'Range Scalping',
    ja: 'レンジスキャルピング',
  },
  GOB_LIQ_SWEEP: {
    ko: '유동성 스윕(롱/숏 청산) 전략',
    en: 'Liquidity Sweep Strategy',
    ja: '流動性スイープ戦略',
  },
  GOB_SPOT_ACCUM_DCA: {
    ko: '현물 분할 매수(DCA) 전략',
    en: 'Spot DCA Accumulation',
    ja: '現物DCA積立戦略',
  },
  GOB_ONCHAIN_WHALE: {
    ko: '온체인 고래 매매 추적',
    en: 'On-chain Whale Activity',
    ja: 'オンチェーン・クジラ追跡',
  },
  GOB_NEWS_EVENT: {
    ko: '뉴스 기반 이벤트 시그널',
    en: 'News-based Event Signal',
    ja: 'ニュースイベントシグナル',
  },
  GOB_FED_EVENT: {
    ko: 'FOMC/연준 이벤트 시그널',
    en: 'FOMC / Fed Event Signal',
    ja: 'FOMC・FRBイベントシグナル',
  },
  GOB_DEFAULT: {
    ko: '고블린 비트코인 시그널',
    en: 'God of BTC Signal',
    ja: 'ゴッド・オブ・BTCシグナル',
  },
};

// ----------------------
// Small helpers
// ----------------------
function formatSymbol(symbol?: string): string {
  if (!symbol) return 'BTCUSDT';
  const s = symbol.toUpperCase();
  if (s.endsWith('USDT') && s.length > 4) {
    return s.replace('USDT', '') + '/USDT';
  }
  return s;
}

function sideLabel(side?: string, locale: SupportedLocale = 'ko'): string {
  const upper = (side || '').toUpperCase();

  if (locale === 'ko') {
    if (upper === 'LONG') return '롱 진입';
    if (upper === 'SHORT') return '숏 진입';
    return '포지션 신호';
  }

  if (locale === 'ja') {
    if (upper === 'LONG') return 'ロングエントリー';
    if (upper === 'SHORT') return 'ショートエントリー';
    return 'ポジションシグナル';
  }

  if (upper === 'LONG') return 'LONG entry';
  if (upper === 'SHORT') return 'SHORT entry';
  return 'Position signal';
}

function priceLabel(price?: number, locale: SupportedLocale = 'ko'): string {
  if (!price && price !== 0) return '';

  const formatted = price.toLocaleString('en-US', {
    maximumFractionDigits: 2,
  });

  if (locale === 'ko') return `진입가: ${formatted} USDT`;
  if (locale === 'ja') return `エントリー価格: ${formatted} USDT`;
  return `Entry price: ${formatted} USDT`;
}

function timeframeLabel(
  timeframe?: string,
  strategyId?: string | null,
  locale: SupportedLocale = 'ko',
): string {
  let tf = timeframe;

  if (!tf && strategyId) {
    const match = strategyId.match(/(\d+[HMhmd])/);
    if (match) tf = match[1];
  }

  if (!tf) return '';

  const upper = tf.toUpperCase();

  if (locale === 'ko') return `타임프레임: ${upper}`;
  if (locale === 'ja') return `時間軸: ${upper}`;
  return `Timeframe: ${upper}`;
}

// ----------------------
// Strategy label (multilingual)
// ----------------------
export function getStrategyLabel(
  rawStrategyId?: string | null,
  localeInput?: string | null,
): string {
  const locale = normalizeLocale(localeInput);
  const key = (rawStrategyId || 'GOB_DEFAULT') as StrategyId;
  const label = strategyNameMap[key] ?? strategyNameMap['GOB_DEFAULT'];
  return label[locale];
}

// ----------------------
// TV signal notification builder
// ----------------------
export function buildTvSignalNotification(
  payload: TvSignalPayload & { locale?: string | null },
): BuiltNotification {
  const locale = normalizeLocale(payload.locale);
  const symbolPair = formatSymbol(payload.symbol);
  const strategy = getStrategyLabel(payload.strategyId, locale);
  const sideText = sideLabel(payload.side, locale);
  const priceText = priceLabel(payload.price, locale);
  const tfText = timeframeLabel(
    payload.timeframe,
    payload.strategyId,
    locale,
  );

  // ----- Title -----
  let title: string;
  if (locale === 'ko') {
    title = `🚨 [${symbolPair}] ${sideText} (${strategy})`;
  } else if (locale === 'ja') {
    title = `🚨 [${symbolPair}] ${sideText}（${strategy}）`;
  } else {
    title = `🚨 [${symbolPair}] ${sideText} (${strategy})`;
  }

  // ----- Body -----
  const bodyParts: string[] = [];

  if (priceText) bodyParts.push(priceText);
  if (tfText) bodyParts.push(tfText);

  // ★ 여기서 “신뢰도 A (80점)” 추가
  if (
    typeof payload.score === 'number' &&
    payload.score >= 0 &&
    payload.grade
  ) {
    if (locale === 'ko') {
      bodyParts.push(
        `신뢰도: ${payload.grade} (${payload.score}점)`,
      );
    } else if (locale === 'ja') {
      bodyParts.push(
        `信頼度: ${payload.grade} (${payload.score})`,
      );
    } else {
      bodyParts.push(
        `Confidence: ${payload.grade} (${payload.score})`,
      );
    }
  }

  if (locale === 'ko') {
    bodyParts.push('리스크를 관리하면서 진입을 검토하세요.');
  } else if (locale === 'ja') {
    bodyParts.push(
      '必ずリスク管理を徹底してエントリーを検討してください。',
    );
  } else {
    bodyParts.push(
      'Please manage your risk carefully before entering.',
    );
  }

  const body = bodyParts.join(' · ');

  return { title, body };
}

// ----------------------
// News signal notification builder
// ----------------------
export function buildNewsNotification(
  payload: NewsSignalPayload & { locale?: string | null },
): BuiltNotification {
  const locale = normalizeLocale(payload.locale);
  const symbolPair = formatSymbol(payload.symbol);
  const importance = payload.importance || 'normal';
  const headline = payload.headline || '';
  const source = payload.source || '';
  const category = payload.category || '';

  const isBreaking = importance === 'high' || category === 'breaking';

  let emoji = '📰';
  if (isBreaking) emoji = '🚨';
  else if (category === 'etf') emoji = '📈';
  else if (category === 'regulation') emoji = '⚖️';

  let title: string;
  if (locale === 'ko') {
    title = `${emoji} [${symbolPair}] ${
      headline || '중요 뉴스 업데이트'
    }`;
  } else if (locale === 'ja') {
    title = `${emoji} [${symbolPair}] ${
      headline || '重要ニュースアップデート'
    }`;
  } else {
    title = `${emoji} [${symbolPair}] ${
      headline || 'Important news update'
    }`;
  }

  const pieces: string[] = [];

  if (locale === 'ko') {
    if (source) pieces.push(`출처: ${source}`);
    if (category) pieces.push(`카테고리: ${category}`);
    pieces.push('시장 변동성과 리스크를 함께 확인하세요.');
  } else if (locale === 'ja') {
    if (source) pieces.push(`ソース: ${source}`);
    if (category) pieces.push(`カテゴリー: ${category}`);
    pieces.push(
      'ボラティリティとリスクを必ず確認してください。',
    );
  } else {
    if (source) pieces.push(`Source: ${source}`);
    if (category) pieces.push(`Category: ${category}`);
    pieces.push(
      'Always check volatility and risk before trading.',
    );
  }

  const body = pieces.join(' · ');

  return { title, body };
}



