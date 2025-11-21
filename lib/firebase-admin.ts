// lib/firebase-admin.ts

import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// FIREBASE_SERVICE_ACCOUNT_KEY 는 .env.local 에 JSON 문자열로 들어 있습니다.
// 예) FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account", ... }

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountJson) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set in environment variables');
}

const serviceAccount = JSON.parse(serviceAccountJson);

// 이미 초기화된 앱이 있으면 재사용, 없으면 새로 초기화
const adminApp =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount as any),
      });

// 🔥 Firestore & Messaging 인스턴스
export const adminDB = getFirestore(adminApp);
export const adminMessaging = getMessaging(adminApp);

// ✅ 예전 코드 호환용 이름 (adminMsg)
export const adminMsg = adminMessaging;

// ✅ Firestore FieldValue 도 함께 export (증분 업데이트 등에 사용)
export { FieldValue };














