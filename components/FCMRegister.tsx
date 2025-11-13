"use client";

import { useCallback, useState } from "react";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { app } from "@/lib/firebase-config";

/**
 * 사용법
 * 1) 페이지/컴포넌트에서 <FCMRegister /> 를 배치하면 버튼이 렌더됩니다.
 * 2) 이미 버튼이 있다면, export된 requestPermissionAndRegister() 를 직접 호출해도 됩니다.
 */

type Props = {
  topics?: string[]; // 기본: ['all']
  label?: string;    // 버튼 라벨 커스터마이즈
};

export default function FCMRegister({ topics = ["all"], label = "🔔 알림 허용" }: Props) {
  const [loading, setLoading] = useState(false);

  const onClick = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      await requestPermissionAndRegister(topics);
    } finally {
      setLoading(false);
    }
  }, [loading, topics]);

  return (
    <button
      onClick={onClick}
      className="px-3 py-2 rounded-md border text-sm"
      disabled={loading}
      aria-busy={loading}
    >
      {loading ? "등록 중..." : label}
    </button>
  );
}

/** 다른 곳(예: 기존 '알림 허용' 버튼)에서 직접 호출하고 싶다면 이 함수를 import 해서 쓰세요. */
export async function requestPermissionAndRegister(topics: string[] = ["all"]) {
  try {
    // 1) Service Worker 지원 여부
    if (!("serviceWorker" in navigator)) {
      alert("이 브라우저는 Service Worker를 지원하지 않습니다.");
      return;
    }

    // 2) FCM 웹 푸시 지원 여부(브라우저/환경)
    const supported = await isSupported().catch(() => false);
    if (!supported) {
      alert("현재 환경에서는 FCM 웹 푸시가 지원되지 않습니다.");
      return;
    }

    // 3) 서비스워커 '루트 경로'에 고정 등록 (모바일 필수)
    //    ⚠ 반드시 '/firebase-messaging-sw.js' 처럼 슬래시로 시작해야 함
    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/",
    });
    await navigator.serviceWorker.ready;

    // 4) 알림 권한 요청
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      alert("알림 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.");
      return;
    }

    // 5) FCM 토큰 발급 (반드시 SW 등록 객체를 넣어줌)
    const messaging = getMessaging(app);
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      alert("VAPID 키가 없습니다. .env.local의 NEXT_PUBLIC_FIREBASE_VAPID_KEY 를 확인하세요.");
      return;
    }

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: reg, // ✅ 모바일에서 매우 중요
    });

    if (!token) {
      alert("FCM 토큰을 받지 못했습니다. 다시 시도하거나 브라우저 캐시/데이터를 지우고 재시도하세요.");
      return;
    }

    // 6) 서버에 토큰 + 구독 토픽 등록
    const res = await fetch("/api/push/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, topics }),
    });
    const json = await res.json().catch(() => ({} as any));

    if (!res.ok || !json?.ok) {
      alert(`등록 실패: ${json?.err || res.status}`);
      return;
    }

    console.log("[register] ok:", json);
    console.log("[register] token:", token);
    alert("모바일 푸시 등록 완료!");
  } catch (e: any) {
    console.error("[FCM register] error:", e);
    alert(`등록 중 오류: ${e?.message || String(e)}`);
  }
}



