// app/api/cron/route.ts
import { NextResponse } from "next/server";

// 그냥 cron 라우트가 살아있는지만 확인하는 테스트용 코드입니다.
export async function GET(req: Request) {
  return NextResponse.json(
    {
      ok: true,
      message: "cron route OK (test)",
    },
    { status: 200 }
  );
}


