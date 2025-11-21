// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { adminDB } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

// KST 기준 오늘 날짜 "YYYY-MM-DD"
function getTodayKstString(): string {
  const now = new Date();
  const kstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kstTime.toISOString().slice(0, 10);
}

// GET /api/admin/metrics?date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || getTodayKstString();

  try {
    // metrics_daily
    const metricsSnap = await adminDB
      .collection('metrics_daily')
      .where('date', '==', date)
      .get();

    const metrics = metricsSnap.docs
      .map((doc) => {
        const d = doc.data() as any;
        return {
          id: doc.id,
          date: d.date ?? date,
          metricName: d.metricName ?? '',
          imageUrl: d.imageUrl ?? '',
          note: d.note ?? '',
          order: typeof d.order === 'number' ? d.order : 999,
        };
      })
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

    // events_daily
    const eventsSnap = await adminDB
      .collection('events_daily')
      .where('date', '==', date)
      .get();

    const events = eventsSnap.docs
      .map((doc) => {
        const d = doc.data() as any;
        return {
          id: doc.id,
          date: d.date ?? date,
          title: d.title ?? '',
          time: d.time ?? '',
          note: d.note ?? '',
          importance: typeof d.importance === 'number' ? d.importance : 1,
          order: typeof d.order === 'number' ? d.order : 999,
        };
      })
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

    return NextResponse.json({ ok: true, date, metrics, events });
  } catch (err: any) {
    console.error('[admin/metrics GET] error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' },
      { status: 500 },
    );
  }
}

// POST /api/admin/metrics
// body 예시:
// { kind: "metric", date, metricName, imageUrl, note, order }
// { kind: "event", date, title, time, note, importance, order }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const kind = body.kind as 'metric' | 'event';
    const date = (body.date as string) || getTodayKstString();

    if (kind === 'metric') {
      const metricName = body.metricName as string;
      const imageUrl = (body.imageUrl as string) ?? '';
      const note = (body.note as string) ?? '';
      const order =
        typeof body.order === 'number'
          ? body.order
          : Number(body.order ?? 999) || 999;

      if (!metricName) {
        return NextResponse.json(
          { ok: false, error: 'metricName is required' },
          { status: 400 },
        );
      }

      const docRef = await adminDB.collection('metrics_daily').add({
        date,
        metricName,
        imageUrl,
        note,
        order,
        createdAt: new Date(),
      });

      return NextResponse.json({
        ok: true,
        kind: 'metric',
        id: docRef.id,
      });
    }

    if (kind === 'event') {
      const title = body.title as string;
      const time = (body.time as string) ?? '';
      const note = (body.note as string) ?? '';
      const importance =
        typeof body.importance === 'number'
          ? body.importance
          : Number(body.importance ?? 1) || 1;
      const order =
        typeof body.order === 'number'
          ? body.order
          : Number(body.order ?? 999) || 999;

      if (!title) {
        return NextResponse.json(
          { ok: false, error: 'title is required' },
          { status: 400 },
        );
      }

      const docRef = await adminDB.collection('events_daily').add({
        date,
        title,
        time,
        note,
        importance,
        order,
        createdAt: new Date(),
      });

      return NextResponse.json({
        ok: true,
        kind: 'event',
        id: docRef.id,
      });
    }

    return NextResponse.json(
      { ok: false, error: 'Invalid kind (must be metric or event)' },
      { status: 400 },
    );
  } catch (err: any) {
    console.error('[admin/metrics POST] error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' },
      { status: 500 },
    );
  }
}
