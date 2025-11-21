// app/api/cron/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminDB, adminMessaging } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

// ---- Types ----
type NewsApiItem = {
  news_title?: string;
  news_link?: string;
  image_url?: string;
  text?: string;
  source_name?: string;
  date?: string;
  sentiment?: string;
  tags?: string[];
  tickers?: string[];
};

type SignalSentiment = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

type NewsSignal = {
  symbol: string; // e.g. "BTCUSDT"
  title: string;
  summary: string;
  source: string;
  url: string;
  imageUrl?: string;
  createdAt: Date;
  sentiment: SignalSentiment;
  rawSentiment?: string;
  provider: string;
  tags?: string[];
};

const NEWS_API_BASE = 'https://data.tradefeeds.com/api/v1/crypto_news';

// ---- Helper: map external sentiment -> internal direction ----
function mapSentiment(raw?: string): SignalSentiment {
  if (!raw) return 'NEUTRAL';
  const v = raw.toLowerCase();

  if (v.includes('positive') || v.includes('bull')) return 'BULLISH';
  if (v.includes('negative') || v.includes('bear')) return 'BEARISH';

  return 'NEUTRAL';
}

// 코인 심볼 → 코인 배열 (normalized.coins 에 사용)
function mapSymbolToCoins(symbol: string | undefined): string[] {
  if (!symbol) return [];
  const upper = symbol.toUpperCase();

  const coins: string[] = [];
  if (upper.includes('BTC')) coins.push('BTC');
  if (upper.includes('ETH')) coins.push('ETH');
  if (upper.includes('DOT')) coins.push('DOT');
  if (upper.includes('SOL')) coins.push('SOL');
  if (upper.includes('ADA')) coins.push('ADA');
  if (upper.includes('XRP')) coins.push('XRP');
  if (upper.includes('BNB')) coins.push('BNB');

  return coins.length ? coins : [upper]; // 최소 1개는 넣어두기
}

// ---- Core: fetch + normalize (raw signals) ----
async function fetchNewsSignals(): Promise<{ signals: NewsSignal[]; sources: string[] }> {
  const apiKey = process.env.CRYPTO_NEWS_API_KEY;

  if (!apiKey) {
    throw new Error('CRYPTO_NEWS_API_KEY is not set in environment variables');
  }

  const url = `${NEWS_API_BASE}?key=${apiKey}&ticker=BTC&limit=30`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000); // 10s timeout

  let json: any;

  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(
        `News API error: ${res.status} ${res.statusText} - ${body.slice(0, 200)}`,
      );
    }

    json = await res.json();
    console.log('[CRON] raw news json:', JSON.stringify(json).slice(0, 1000));
  } catch (err: any) {
    clearTimeout(timeout);
    if (err?.name === 'AbortError') {
      throw new Error('News API request timed out');
    }
    throw err;
  }

  const items: NewsApiItem[] = Array.isArray(json)
    ? json
    : Array.isArray(json.data)
    ? json.data
    : Array.isArray(json.results)
    ? json.results
    : [];

  const signalsFromNews: NewsSignal[] = items
    .map((item) => {
      const createdAt = item.date ? new Date(item.date) : new Date();

      const text = item.text ?? '';
      const summary =
        text.length > 600 ? text.slice(0, 600).trimEnd() + '…' : text;

      return {
        symbol: 'BTCUSDT',
        title: item.news_title ?? 'Untitled Bitcoin News',
        summary,
        source: item.source_name ?? 'Unknown',
        url: item.news_link ?? '',
        imageUrl: item.image_url,
        createdAt,
        sentiment: mapSentiment(item.sentiment),
        rawSentiment: item.sentiment,
        provider: 'tradefeeds_crypto_news',
        tags: Array.isArray(item.tags) ? item.tags : undefined,
      };
    })
    .filter((s) => !!s.url);

  // 🔥 뉴스가 없으면 테스트용 더미 하나
  let finalSignals: NewsSignal[] = signalsFromNews;

  if (!finalSignals.length) {
    const now = new Date();
    finalSignals = [
      {
        symbol: 'BTCUSDT',
        title: '[TEST] Cron + Firestore pipeline is working',
        summary:
          'This is a dummy signal inserted because the news API returned no items. If you see this in Firestore, your cron job and Firestore write are working.',
        source: 'local-test',
        url: 'https://example.com/test-signal',
        imageUrl: undefined,
        createdAt: now,
        sentiment: 'NEUTRAL',
        rawSentiment: 'TEST',
        provider: 'dummy-fallback',
        tags: ['TEST', 'CRON', 'FIRESTORE'],
      },
    ];
  }

  const sources = Array.from(
    new Set(finalSignals.map((s) => s.source).filter(Boolean)),
  );

  return { signals: finalSignals, sources };
}

// ---- Firestore save: news_signals + news_normalized ----
async function saveSignalsToFirestore(signals: NewsSignal[]): Promise<void> {
  if (!signals.length) return;

  const batch = adminDB.batch();
  const signalsCol = adminDB.collection('news_signals');
  const normalizedCol = adminDB.collection('news_normalized');

  for (const signal of signals) {
    // 1) raw 시그널 저장 (news_signals)
    const signalDoc = signalsCol.doc();
    batch.set(signalDoc, {
      symbol: signal.symbol,
      title: signal.title,
      summary: signal.summary,
      source: signal.source,
      url: signal.url,
      imageUrl: signal.imageUrl ?? null,
      sentiment: signal.sentiment,
      rawSentiment: signal.rawSentiment ?? null,
      provider: signal.provider,
      tags: signal.tags ?? [],
      createdAt: signal.createdAt,
      createdAtMs: signal.createdAt.getTime(),
    });

    // 2) normalized 뉴스 저장 (news_normalized)
    const coins = mapSymbolToCoins(signal.symbol);
    const lang: 'ko' | 'en' | 'ja' = 'en'; // TODO: 나중에 NLP/헤더로 언어 감지

    const normalizedDoc = normalizedCol.doc();
    batch.set(normalizedDoc, {
      sourceId: signal.provider ?? 'unknown', // e.g. "tradefeeds_crypto_news"
      sourceName: signal.source ?? 'Unknown',
      lang,
      title: signal.title,
      summary: signal.summary,
      url: signal.url,
      coins,
      tags: signal.tags ?? [],
      publishedAt: signal.createdAt,
      createdAt: signal.createdAt,
    });
  }

  await batch.commit();
}

// ---- FCM Push: "중요 뉴스"만 topic: news 로 발송 ----
async function sendFcmForSignals(signals: NewsSignal[]): Promise<void> {
  if (!signals.length) return;

  // 중요 키워드 목록 (필요하면 여기만 추가)
  const IMPORTANT_KEYWORDS = [
    'etf',
    'spot etf',
    'fomc',
    'cpi',
    'interest rate',
    'rate decision',
    'sec',
    'approval',
    'approved',
    'denied',
    'delay',
  ];

  // 1) BTC 관련 + 중요 키워드 포함된 뉴스만 필터
  const filtered = signals
    .map((signal) => {
      const text = `${signal.title} ${signal.summary}`.toLowerCase();
      const hasKeyword = IMPORTANT_KEYWORDS.some((kw) => text.includes(kw));
      const isBtc =
        signal.symbol.toUpperCase().includes('BTC') || text.includes('bitcoin');

      return { signal, isBtc, hasKeyword };
    })
    .filter((x) => x.isBtc && x.hasKeyword)
    .map((x) => x.signal);

  if (!filtered.length) {
    console.log('[CRON] no breaking BTC news for push');
    return;
  }

  // 2) 너무 많이 쏘지 않도록 상위 3개까지만
  const limited = filtered.slice(0, 3);

  const promises = limited.map((signal) => {
    const title = `[NEWS] ${signal.title}`;
    const rawBody = signal.summary || '';
    const body =
      rawBody.length > 140 ? rawBody.slice(0, 137).trimEnd() + '…' : rawBody;

    const message = {
      topic: 'news', // ✅ 뉴스용 토픽
      notification: {
        title,
        body,
      },
      data: {
        symbol: signal.symbol,
        url: signal.url,
        source: signal.source,
        sentiment: String(signal.sentiment),
        provider: signal.provider,
      },
    };

    return adminMessaging
      .send(message as any)
      .then((id: string) => {
        console.log('[CRON] NEWS FCM sent:', id, 'for', signal.title);
      })
      .catch((err: unknown) => {
        console.error('[CRON] NEWS FCM send error:', err);
      });
  });

  await Promise.all(promises);
}

// ---- Route Handler (called by Vercel Cron) ----
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { ok: false, error: 'CRON_SECRET is not configured on the server' },
      { status: 500 },
    );
  }

  const authHeader = req.headers.get('authorization');

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  try {
    const { signals, sources } = await fetchNewsSignals();

    await saveSignalsToFirestore(signals); // news_signals + news_normalized 저장
    await sendFcmForSignals(signals); // 중요 뉴스만 topic "news" 푸시

    return NextResponse.json({
      ok: true,
      count: signals.length,
      sources,
    });
  } catch (error: any) {
    console.error('[CRON] Error fetching/saving news signals:', error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? 'Unknown error',
      },
      { status: 500 },
    );
  }
}







