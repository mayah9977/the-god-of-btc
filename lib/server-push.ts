// @ts-nocheck

import { adminMessaging } from '@/lib/firebase-admin';
import {
  buildTvSignalNotification,
  buildNewsNotification,
  TvSignalPayload,
  NewsSignalPayload,
} from './notification-rules';

// FCM data payload는 string만 허용되므로 값은 전부 string 또는 undefined
type PushData = Record<string, string | undefined>;

// =============================
// 공용: 토픽 푸시
// =============================
export async function sendTopicPush(
  topic: string,
  title: string,
  body: string,
  data: PushData = {},
  options?: {
    // 웹 푸시 클릭 시 이동할 링크 (있으면 webpush.fcmOptions.link 로 설정)
    link?: string;
  },
) {
  if (!topic) return;

  const message: any = {
    topic,
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v ?? '']),
    ),
  };

  if (options?.link) {
    message.webpush = {
      fcmOptions: {
        link: options.link,
      },
    };
  }

  try {
    const id = await adminMessaging.send(message);
    console.log('[PUSH][topic]', topic, '→', id);
  } catch (err) {
    console.error('[PUSH][topic] error:', err);
  }
}

// =============================
// 공용: 단일 토큰 푸시
// =============================
export async function sendTokenPush(
  token: string,
  title: string,
  body: string,
  data: PushData = {},
  options?: {
    link?: string;
  },
) {
  if (!token) return;

  const message: any = {
    token,
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v ?? '']),
    ),
  };

  if (options?.link) {
    message.webpush = {
      fcmOptions: {
        link: options.link,
      },
    };
  }

  try {
    const id = await adminMessaging.send(message);
    console.log('[PUSH][token]', token, '→', id);
  } catch (err) {
    console.error('[PUSH][token] error:', err);
  }
}

// =============================
// 공용: user-<uid> 토픽 푸시
// =============================
/**
 * 사용자 전용 토픽: user-<uid>
 *  - /settings 에서 각 사용자 FCM 토큰을 user-<uid> 토픽에 subscribe 시켜두면,
 *  - 여기서는 uid만 알면 된다.
 */
export async function sendUserTopicPush(
  uid: string,
  title: string,
  body: string,
  data: PushData = {},
  options?: {
    link?: string;
  },
) {
  if (!uid) return;
  const topic = `user-${uid}`;
  return sendTopicPush(topic, title, body, { uid, ...data }, options);
}

// =============================
// TV 시그널용 다국어 푸시 함수
//  - Phase 3: score / grade(신뢰도) 포함
// =============================
export async function pushTvSignalToTopics(raw: any) {
  // 0) 기본 사이트 URL (푸시 클릭 시 이동)
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://the-god-of-btc.vercel.app';

  // 1) TradingView / PowerShell 에서 넘어온 body를
  //    TvSignalPayload 타입 + locale/score/grade 로 정리
  const payload: TvSignalPayload & {
    locale?: string | null;
    score?: number;
    grade?: string;
  } = {
    symbol: raw.symbol ?? raw.SYMBOL ?? raw.ticker,
    side: raw.side ?? raw.SIDE,
    strategyId:
      raw.strategyId ??
      raw.STRATEGY_ID ??
      raw.strategy ??
      raw.strategy_id,
    timeframe: raw.timeframe ?? raw.TIMEFRAME ?? raw.tf,
    price:
      typeof raw.price === 'number'
        ? raw.price
        : raw.price
        ? Number(raw.price)
        : undefined,
    exchange: raw.exchange ?? raw.EXCHANGE,
    // TradingView JSON에 "lang": "ja" / "en" / "ko" 넣으면 사용,
    // 없으면 notification-rules 에서 ko 기본값 사용
    locale: raw.lang ?? raw.locale ?? raw.LANG ?? null,

    // Phase 3: route.ts 에서 넘어온 신뢰도 정보 (score/grade)
    score:
      typeof raw.score === 'number'
        ? raw.score
        : raw.score
        ? Number(raw.score)
        : undefined,
    grade: raw.grade,
  };

  // 2) 다국어 제목/본문 생성 (여기서 신뢰도 문구까지 포함)
  const { title, body } = buildTvSignalNotification(payload);

  // 3) 보낼 토픽 목록
  const topics = new Set<string>();
  topics.add('signals'); // 전체 시그널

  if (payload.symbol) {
    // 개별 심볼 토픽: sym-BTCUSDT
    topics.add(`sym-${payload.symbol}`);
  }
  if (payload.strategyId) {
    // 전략별 토픽도 원하면 사용 가능: strat-GOB_TREND_1H
    topics.add(`strat-${payload.strategyId}`);
  }

  // 4) 공통 data payload (클라이언트에서 활용 가능)
  const data: PushData = {
    type: 'tv-signal',
    symbol: payload.symbol ?? '',
    side: payload.side ?? '',
    strategyId: payload.strategyId ?? '',
    timeframe: payload.timeframe ?? '',
    exchange: payload.exchange ?? '',
    price:
      payload.price !== undefined && payload.price !== null
        ? String(payload.price)
        : '',
    // Phase 3: 클라이언트에서도 신뢰도 활용 가능하도록 data에도 포함
    score:
      payload.score !== undefined && payload.score !== null
        ? String(payload.score)
        : '',
    grade: payload.grade ?? '',
  };

  // 5) 각 토픽으로 동시에 푸시 전송
  await Promise.all(
    Array.from(topics).map((topic) =>
      sendTopicPush(
        topic,
        title,
        body,
        data,
        {
          // 푸시 클릭하면 이동할 페이지
          link: `${siteUrl}/signals`, // 필요하면 /signals/tv 등으로 변경
        },
      ),
    ),
  );

  console.log('[PUSH][tv] topics:', Array.from(topics));
}

// =============================
// 뉴스 시그널용 다국어 푸시 함수
//  - /api/cron → Firestore(news_signals/news_normalized) 저장 후 호출용
// =============================
export async function pushNewsSignalToTopics(raw: any) {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://the-god-of-btc.vercel.app';

  const payload: NewsSignalPayload & { locale?: string | null } = {
    symbol: raw.symbol ?? raw.SYMBOL ?? raw.ticker,
    headline: raw.headline ?? raw.title ?? raw.HEADLINE,
    source: raw.source ?? raw.SOURCE,
    category: raw.category ?? raw.CATEGORY ?? raw.type,
    importance:
      raw.importance ??
      raw.IMPORTANCE ??
      'normal',
    locale: raw.lang ?? raw.locale ?? raw.LANG ?? null,
  };

  const { title, body } = buildNewsNotification(payload);

  const topics = new Set<string>();
  topics.add('signals'); // 전체용
  topics.add('news');    // 뉴스 전용 전체 토픽

  if (payload.symbol) {
    topics.add(`sym-${payload.symbol}`); // 코인별 뉴스
  }
  if (payload.category) {
    // 예: news-etf, news-regulation, news-breaking
    topics.add(`news-${payload.category}`);
  }

  const data: PushData = {
    type: 'news-signal',
    symbol: payload.symbol ?? '',
    headline: payload.headline ?? '',
    source: payload.source ?? '',
    category: payload.category ?? '',
    importance: payload.importance ?? 'normal',
  };

  await Promise.all(
    Array.from(topics).map((topic) =>
      sendTopicPush(
        topic,
        title,
        body,
        data,
        {
          // 뉴스용 상세 페이지
          link: `${siteUrl}/signals/news`,
        },
      ),
    ),
  );

  console.log('[PUSH][news] topics:', Array.from(topics));
}




