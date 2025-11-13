// lib/firebase-client.ts
// ✅ 클라이언트(Firebase 웹 SDK) 초기화 + FCM 토큰 발급/수신 유틸

import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";

// 🔑 .env.local (당신 환경에 맞춘 이름들)
// NEXT_PUBLIC_FIREBASE_API_KEY=...
// NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
// NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
// NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
// NEXT_PUBLIC_FIREBASE_APP_ID=...
// NEXT_PUBLIC_FIREBASE_VAPID_KEY=...   ← 콘솔에서 발급받은 웹 푸시 인증서 공개키

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

export const firebaseApp =
  getApps().length ? getApp() : initializeApp(firebaseConfig);

/**
 * ✅ 알림 권한 확인 → FCM 토큰 발급
 * - 서비스워커: /public/firebase-messaging-sw.js 필수
 * - VAPID 키: NEXT_PUBLIC_FIREBASE_VAPID_KEY 또는 NEXT_PUBLIC_FB_VAPID_KEY 중 하나 사용
 */
export async function ensureFcmToken() {
  const supported = await isSupported().catch(() => false);
  if (!supported) return null;

  if (typeof window !== "undefined" && Notification?.permission === "default") {
    await Notification.requestPermission();
  }
  if (typeof window !== "undefined" && Notification?.permission !== "granted") {
    return null;
  }

  const messaging = getMessaging(firebaseApp);
  const swReg =
    typeof navigator !== "undefined" ? await navigator.serviceWorker.ready : undefined;

  const vapidKey =
    process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ||
    process.env.NEXT_PUBLIC_FB_VAPID_KEY;
  if (!vapidKey) throw new Error("Missing VAPID key in .env.local");

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: swReg,
  });

  return token || null;
}

/** ✅ 페이지가 열려 있을 때(포그라운드) 수신 리스너 */
export function listenForegroundMessage(cb: (payload: any) => void) {
  isSupported()
    .then((ok) => {
      if (!ok) return;
      const messaging = getMessaging(firebaseApp);
      onMessage(messaging, (payload) => cb?.(payload));
    })
    .catch(() => {});
}







