// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { adminDB } from '@/lib/firebase-admin';
import { pushNewsSignalToTopics } from '@/lib/server-push';

export const runtime = 'nodejs';

function getNowKst() {
  const now = new Date();
  return new Date(now.getTime() + 9 * 60 * 60 * 1000);
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const apiKey = process.env.CRYPTO_NEWS_API_KEY;

  if (!cronSecret || !apiKey) {
    return NextResponse.json(
      { ok: false, error: 'CRON_SECRET or CRYPTO_NEWS_API_KEY not configured' },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (token !== cronSecret) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized cron' },
      { status: 401 },
    );
  }

  // ===============================
  // 1) cryptonews-api.com 호출
  // ===============================
  const apiUrl = `https://cryptonews-api.com/api/v1/category?section=all&items=50&token=${apiKey}`;

  let articles: any[] = [];
  try {
    const res = await fetch(apiUrl, {
      method: 'GET',
      cache: 'no-store',
    });

    const json = await res.json();
    // cryptonews-api 응답 구조: { data: [...] }
    articles = json.data ?? [];
  } catch (err) {
    console.error('[NEWS] fetch error:', err);
    return NextResponse.json(
      { ok: false, error: 'fetch failed' },
      { status: 500 },
    );
  }

  if (!Array.isArray(articles) || articles.length === 0) {
    return NextResponse.json({ ok: true, count: 0 });
  }

  const now = getNowKst();

  const rawCol = adminDB.collection('news_raw');
  const normalizedCol = adminDB.collection('news_normalized');
  const signalsCol = adminDB.collection('news_signals');

  let successCount = 0;

  for (const article of articles) {
    try {
      // 🔥 cryptonews-api.com은 심볼 정보가 없으므로 일단 BTCUSDT로 고정
      const symbol = 'BTCUSDT';

      const headline = article.title ?? '(no title)';
      const source = article.source_name ?? 'cryptonews';
      const category = article.sentiment ?? 'general';
      const url = article.news_url ?? '';
      const publishedAt = article.date ?? null;

      // 1) 원본 저장
      const rawRef = await rawCol.add({
        ...article,
        symbol,
        headline,
        source,
        category,
        url,
        publishedAt,
        createdAt: now,
        createdAtMs: now.getTime(),
      });

      // 2) normalized 저장
      const normalizedData = {
        rawId: rawRef.id,
        symbol,
        headline,
        source,
        category,
        url,
        publishedAt,
        createdAt: now,
        createdAtMs: now.getTime(),
      };

      const normalizedRef = await normalizedCol.add(normalizedData);

      // 3) news_signals 저장
      await signalsCol.add({
        ...normalizedData,
        normalizedId: normalizedRef.id,
      });

      // 4) 푸시 발송
      await pushNewsSignalToTopics({
        ...normalizedData,
        docId: normalizedRef.id,
        locale: 'ko', // 원하면 나중에 언어 선택 가능
      });

      successCount += 1;
    } catch (err) {
      console.error('[NEWS] article process error:', err);
    }
  }

  return NextResponse.json({ ok: true, count: successCount });
}


