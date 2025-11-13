"use client";

import { requestPermissionAndRegister } from "@/lib/push";

export default function Settings() {
  async function handleEnablePush() {
    const ok = await requestPermissionAndRegister();
    alert(ok ? "✅ 푸시 알림 등록 완료" : "❌ 푸시 알림 등록에 실패했습니다. 콘솔 오류를 확인하세요.");
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-4xl font-bold">Settings</h1>
      <p className="mt-3 text-gray-600">설정 페이지입니다. (추후 기능 추가 예정)</p>

      <div className="mt-6">
        <button
          onClick={handleEnablePush}
          className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
          title="브라우저 푸시 알림 권한 요청 및 등록"
        >
          🔔 알림 허용
        </button>
      </div>
    </main>
  );
}


