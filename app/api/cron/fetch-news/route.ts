// app/api/cron/fetch-news/route.ts
import { NextRequest, NextResponse } from "next/server";
import Parser from "rss-parser";
import crypto from "crypto";
import { adminDB, adminMsg, FieldValue } from "@/lib/firebase-admin";

export const runtime = "nodejs";

type Lang = "ko" | "en" | "ja";

type NewsSource = {
  id: string;
  url: string;
  lang: Lang;
  sourceName: string;
};

const NEWS_SOURCES: NewsSource[] = [
  // ⚠️ 여기 RSS 주소는 실제 쓰는 걸로 바꿔주세요.
  {
    id: "sample-en",
    url: "https://feeds.feedburner.com/CoinDesk", // 예시 (영문)
    lang: "en",
    sourceName: "CoinDesk",
  },
  // {
  //   id: "sample-ko",
  //   url: "https://example.com/rss", // 한국어 코인 뉴스 RSS
  //   lang: "ko",
  //   sourceName: "코인 뉴스 사이트",
  // },
];

const parser = new Parser();

// URL + source 로부터 Firestore docId 만들기 (중복 제거용)
function makeNewsDocId(sourceId: string, link: string): string {
  const hash = crypto
    .createHash("sha256")
    .update(sourceId + "|" + link)
    .digest("hex");
  return hash; // 64자리 hex (슬래시 없음 → docId로 안전)
}

function detectCoins(text: string): string[] {
  const upper = text.toUpperCase();
  const coins: string[] = [];

  const maybe = [
    "BTC",
    "BITCOIN",
    "ETH",
    "ETHEREUM",
    "DOT",
    "SOL",
    "XRP",
    "DOGE",
  ];

  if (maybe.some((k) => upper.includes(k))) {
    if (upper.includes("BTC") || upper.includes("BITCOIN")) coins.push("BTC");
    if (upper.includes("ETH") || upper.includes("ETHEREUM")) coins.push("ETH");
    if (upper.includes("DOT")) coins.push("DOT");
    if (upper.includes("SOL")) coins.push("SOL");
    if (upper.includes("XRP")) coins.push("XRP");
    if (upper.includes("DOGE")) coins.push("DOGE");
  }

  return Array.from(new Set(coins));
}

// “중요 뉴스” 간단 판별 (나중에 규칙 손봐도 됨)
function isImportantNews(title: string, summary: string): boolean {
  const text = (title + " " + summary).toUpperCase();
  const keywords = [
    "ETF",
    "FOMC",
    "CPI",
    "SPOT",
    "HACK",
    "SEC",
    "LISTING",
    "상장",
    "긴급",
    "속보",
  ];
  return keywords.some((k) => text.includes(k));
}

export async function GET(_req: NextRequest) {
  try {
    const results: any[] = [];

    for (const source of NEWS_SOURCES) {
      try {
        const feed = await parser.parseURL(source.url);

        for (const item of feed.items) {
          const title = item.title ?? "";
          const link = item.link ?? "";
          const summary =
            (item.contentSnippet as string | undefined) ??
            (item.content as string | undefined) ??
            "";

          if (!title || !link) continue;

          const coins = detectCoins(title + " " + summary);

          // pubDate 파싱
          const publishedMs = item.isoDate
            ? Date.parse(item.isoDate)
            : item.pubDate
            ? Date.parse(item.pubDate)
            : Date.now();
          const publishedAt = new Date(
            Number.isNaN(publishedMs) ? Date.now() : publishedMs,
          );

          // 1) raw 저장 (자동 id)
          await adminDB.collection("news_raw").add({
            sourceId: source.id,
            sourceName: source.sourceName,
            lang: source.lang,
            title,
            summary,
            url: link,
            coins,
            publishedAt,
            fetchedAt: FieldValue.serverTimestamp(),
          });

          // 2) normalized 저장 (중복 제거)
          const docId = makeNewsDocId(source.id, link);
          const ref = adminDB.collection("news_normalized").doc(docId);
          const snap = await ref.get();
          const isNew = !snap.exists;

          await ref.set(
            {
              sourceId: source.id,
              sourceName: source.sourceName,
              lang: source.lang,
              title,
              summary,
              url: link,
              coins,
              tags: [], // 나중에 /admin에서 태그 추가
              publishedAt,
              createdAt: snap.exists
                ? snap.get("createdAt") ?? FieldValue.serverTimestamp()
                : FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );

          // 3) 중요 뉴스면 topic: "news" 로 푸시 (신규일 때만)
          if (isNew && isImportantNews(title, summary)) {
            try {
              await adminMsg.send({
                topic: "news",
                notification: {
                  title: `뉴스 속보 · ${source.sourceName}`,
                  body: title,
                },
                data: {
                  clickUrl: link,
                  source: "news",
                  sourceName: source.sourceName,
                },
                webpush: {
                  fcmOptions: {
                    link,
                  },
                },
              });
              console.log("[fetch-news] push sent (news):", title);
            } catch (e) {
              console.error("[fetch-news] push error:", e);
            }
          }

          results.push({ source: source.id, title, link, coins });
        }
      } catch (e) {
        console.error("[fetch-news] source error:", source.id, e);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        count: results.length,
        sources: NEWS_SOURCES.map((s) => s.id),
      },
      { status: 200 },
    );
  } catch (e: any) {
    console.error("❌ /api/cron/fetch-news error:", e);
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500 },
    );
  }
}
