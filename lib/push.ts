// lib/push.ts
"use client";

import { getApps, getApp, initializeApp } from "firebase/app"; // ✅

import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAAKww-eYrWMHyuTXjPAedN1mI0vIyac",
  authDomain: "the-god-of-btc.firebaseapp.com",
  projectId: "the-god-of-btc",
  storageBucket: "the-god-of-btc.appspot.com",
  messagingSenderId: "971668089355",
  appId: "1:971668089355:web:b64c136a220381b869b50e",
  measurementId: "G-187NK22W5G"
};

// ✅ Firebase 앱 중복 초기화 방지
function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

export async function requestPermissionAndRegister(): Promise<boolean> {
  try {
    // ✅ 브라우저 지원 여부
    const supported = await isSupported().catch(() => false);
    if (!supported) {
      alert("이 브라우저에서는 알림을 지원하지 않습니다.");
      return false;
    }

    // ✅ 권한 체크
    if (Notification.permission === "denied") {
      alert("알림이 차단되어 있습니다. 브라우저 설정에서 허용해주세요.");
      return false;
    }

    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return false;
    }

    // ✅ 서비스워커 등록
    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/",
    });

    // ✅ 활성될 때까지 대기
    const readyReg = await navigator.serviceWorker.ready;
    let swReg = readyReg;

    for (let i = 0; i < 3 && swReg.active?.state !== "activated"; i++) {
      await sleep(200);
      swReg = await navigator.serviceWorker.ready;
    }

    // ✅ Messaging 인스턴스
    const app = getFirebaseApp();
    const messaging = getMessaging(app);

    // ✅ 🔥🔥 여기 VAPID key 매우 중요
    const token = await getToken(messaging, {
      vapidKey: "BJUgVSJVhln76inUybEQP3IF42EzoliLR_FtO7qwhuwExbkW4bcsmHqhOXT8beDxhvKT-MxH0HnD31jO0vL6dq4",
      serviceWorkerRegistration: swReg
    });

    console.log("✅ FCM token:", token);
    localStorage.setItem("fcmToken", token);

    onMessage(messaging, (payload) => {
      console.log("📩 Foreground message:", payload);
    });

    return true;
  } catch (err) {
    console.error("❌ FCM 등록 오류:", err);
    alert("❌ 푸시 알림 등록 실패. 콘솔 오류를 확인하세요.");
    return false;
  }
}









