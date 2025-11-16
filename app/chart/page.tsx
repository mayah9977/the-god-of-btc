// app/chart/page.tsx
import { Suspense } from "react";
import ChartPageClient from "./ChartPageClient";

export default function ChartPage() {
  return (
    <Suspense fallback={<div>차트를 불러오는 중입니다...</div>}>
      <ChartPageClient />
    </Suspense>
  );
}
