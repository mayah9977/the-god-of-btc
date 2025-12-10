// lib/firebase-admin.ts

import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// =============================
// 1) 환경변수 읽기
// =============================
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

// =============================
// 2) Firebase Admin Credential 설정
// =============================
let credential: any;

if (serviceAccountJson) {
  // =============================
  // 👉 Production (Vercel)
  // =============================
  console.log("Using: FIREBASE_SERVICE_ACCOUNT_KEY (Production)");

  credential = cert(JSON.parse(serviceAccountJson));
} else {
  // =============================
  // 👉 Local Development
  // =============================
  console.log("Using: FIREBASE_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY (Local)");

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("❌ Missing Firebase Admin ENV for Local Development");
  }

  credential = cert({
    projectId,
    clientEmail,
    privateKey,
  });
}

// =============================
// 3) Firebase Admin 앱 초기화
// =============================
const adminApp =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential,
      });

// =============================
// 4) 서비스 export
// =============================
export const adminDB = getFirestore(adminApp);
export const adminMessaging = getMessaging(adminApp);

// 예전 코드 호환용
export const adminMsg = adminMessaging;

// Firestore FieldValue export
export { FieldValue };










