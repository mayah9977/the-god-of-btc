// app/api/cron/route.ts
import { NextResponse } from "next/server";
// 실제로는 여기에서 진짜 RSS / 뉴스 수집 함수를 가져오면 됩니다.
// 지금은 샘플이라 간단한 가짜 함수로 사용한다고 가정.
async function fetchSampleFeed() {
  // TODO: 나중에 실제 RSS / 뉴스 수집 로직으로 교체
  return [
    { id: 1, title: "sample news 1" },
    { id: 2, title: "sample news 2" },
  ];
}

// API Route가 항상 서버에서 실행되도록 (캐시 말고)
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;

  // 1) 환경변수 자체가 없을 때 (설정 안 되어 있을 때)
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not set" },
      { status: 500 }
    );
  }

  const url = new URL(req.url);

  // 2) Vercel Cron 이 보낼 Authorization 헤더
  const authHeader = req.headers.get("authorization");

  // 3) 사람이 브라우저에서 테스트할 때 사용할 쿼리 파라미터
  const querySecret = url.searchParams.get("secret");

  const expectedHeader = `Bearer ${secret}`;

  // 헤더도 아니고, 쿼리도 아니고 둘 다 틀리면 거절
  if (authHeader !== expectedHeader && querySecret !== secret) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  // --- 여기부터 실제 뉴스 수집 로직 ---
  const items = await fetchSampleFeed();

  return NextResponse.json(
    {
      ok: true,
      count: items.length,
      sources: ["sample-en"],
    },
    { status: 200 }
  );
}

