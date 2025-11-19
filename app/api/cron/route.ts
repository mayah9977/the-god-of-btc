// app/api/cron/route.ts
import { NextResponse } from "next/server";

// 샘플용 뉴스 수집 함수 (지금은 더미 데이터)
async function fetchSampleFeed() {
  return [
    {
      id: "sample-1",
      title: "Bitcoin breaks 100K",
      source: "sample-en",
    },
  ];
}

export async function GET(req: Request) {
  const CRON_SECRET = process.env.CRON_SECRET;

  if (!CRON_SECRET) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not set" },
      { status: 500 },
    );
  }

  const auth = req.headers.get("Authorization") || "";
  const expected = `Bearer ${CRON_SECRET}`;

  if (auth !== expected) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const items = await fetchSampleFeed();

  return NextResponse.json(
    {
      ok: true,
      count: items.length,
      sources: ["sample-en"],
    },
    { status: 200 },
  );
}

