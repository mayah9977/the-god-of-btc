// lib/firebase-admin.ts
import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import {
  getFirestore,
  FieldValue,
  Timestamp,
  Firestore,
} from "firebase-admin/firestore";
import { getMessaging, Messaging } from "firebase-admin/messaging";

// 내부 보관용 핸들
let _app: App | undefined;
let _db: Firestore | undefined;
let _msg: Messaging | undefined;

// 최초 1회만 Admin 초기화
export function initAdmin() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_ADMIN_KEY;
    if (!raw) throw new Error("FIREBASE_ADMIN_KEY is missing");
    const serviceAccount = JSON.parse(raw);
    _app = initializeApp({ credential: cert(serviceAccount) });
  }
  if (!_db) _db = getFirestore();
  if (!_msg) _msg = getMessaging();
  return { app: _app!, adminDb: _db!, adminMsg: _msg! };
}

// 바로 가져다 쓸 수 있는 참조(라우트에서 await initAdmin() 후 사용 권장)
export const adminDb: Firestore = getFirestore();
export const adminMsg: Messaging = getMessaging();

// 필요로 하던 심벌도 그대로 export
export { FieldValue, Timestamp };











