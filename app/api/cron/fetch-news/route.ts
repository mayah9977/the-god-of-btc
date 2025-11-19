// app/api/cron/fetch-news/route.ts
import { NextResponse } from "next/server";

// Vercel 환경 변수에 설정한 CRON_SECRET 값을 읽어옵니다.
const CRON_SECRET = process.env.CRON_SECRET;

// ---- 여기서는 샘플 뉴스 데이터를 만든다고 가정합니다 ----
// 나중에 Firestore에 저장하는 로직으로 교체해도 됩니다.
type SampleNews = {
  id: string;
  title: string;
  source: string;
};

async function fetchSampleFeed(): Promise<SampleNews[]> {
  // 실제 구현에서는 RSS/HTTP 요청 등을 넣으면 됩니다.
  // 지금은 테스트용으로 가짜 데이터 25개를 만들어 줍니다.
  const items: SampleNews[] = Array.from({ length: 25 }).map((_, i) => ({
    id: `sample-${i}`,
    title: `Sample news #${i + 1}`,
    source: "sample-en",
  }));
  return items;
}

// ---- GET 핸들러: Vercel Cron 이 호출하는 엔드포인트 ----
export async function GET(req: Request) {
  // 1) 환경 변수 체크 (실수로 안 넣었을 때)
  if (!CRON_SECRET) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not set" },
      { status: 500 },
    );
  }

  // 2) Authorization 헤더에서 토큰 확인
  // Vercel Cron은 자동으로 아래 형태의 헤더를 추가합니다:
  // Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get("Authorization") || "";
  const expected = `Bearer ${CRON_SECRET}`;

  if (auth !== expected) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  // 3) 여기부터 실제 뉴스 수집/저장 로직 실행
  const items = await fetchSampleFeed();

  // TODO: 나중에 Firestore news_raw/news_normalized 에 저장하는 코드로 확장하면 됩니다.

  return NextResponse.json(
    {
      ok: true,
      count: items.length,
      sources: ["sample-en"],
    },
    { status: 200 },
  );
}

