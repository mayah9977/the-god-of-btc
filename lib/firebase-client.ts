// lib/firebase-client.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 🔥 이미 존재하면 재사용, 없으면 생성
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 🔥 messaging 은 브라우저에서만 생성
export const messaging =
  typeof window !== "undefined"
    ? await isSupported().then((ok) => (ok ? getMessaging(app) : null))
    : null;

export default app;













