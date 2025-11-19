// app/api/cron/route.ts
import { NextResponse } from "next/server";

const CRON_SECRET = process.env.CRON_SECRET;

type SampleNews = {
  id: string;
  title: string;
  source: string;
};

async function fetchSampleFeed(): Promise<SampleNews[]> {
  const items: SampleNews[] = Array.from({ length: 25 }).map((_, i) => ({
    id: `sample-${i}`,
    title: `Sample news #${i + 1}`,
    source: "sample-en",
  }));
  return items;
}

export async function GET(req: Request) {
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
