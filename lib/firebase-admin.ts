// lib/firebase-admin.ts
import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getMessaging, Messaging } from "firebase-admin/messaging";

/**
 * 환경변수 두 가지 방식을 모두 지원:
 * 1) FIREBASE_ADMIN_KEY = JSON (service account 전체)  ← 당신이 이미 사용 중
 * 2) FIREBASE_ADMIN_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY (개별 변수)
 */
function readServiceAccount() {
  const json = process.env.FIREBASE_ADMIN_KEY;
  if (json) {
    try {
      const parsed = JSON.parse(json);
      const projectId = parsed.project_id as string;
      const clientEmail = parsed.client_email as string;
      // env에 저장될 때 줄바꿈이 \n으로 들어온 경우 실제 줄바꿈으로 복원
      const privateKey = (parsed.private_key as string)?.replace(/\\n/g, "\n");
      if (!projectId || !clientEmail || !privateKey) {
        throw new Error("FIREBASE_ADMIN_KEY JSON에 필드가 부족합니다.");
      }
      return { projectId, clientEmail, privateKey };
    } catch (e) {
      throw new Error("FIREBASE_ADMIN_KEY 파싱 실패: " + (e as Error).message);
    }
  }

  // 개별 변수 모드
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin 환경변수가 없습니다. FIREBASE_ADMIN_KEY(JSON) 또는 PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY 중 하나를 설정하세요."
    );
  }
  return { projectId, clientEmail, privateKey };
}

let app: App | undefined;
let _db: Firestore | undefined;
let _auth: Auth | undefined;
let _msg: Messaging | undefined;

/** 앱/서비스 싱글톤 보장 */
export function initAdmin() {
  if (!getApps().length) {
    const { projectId, clientEmail, privateKey } = readServiceAccount();
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    // console.log("✅ Firebase Admin initialized");
  }
  // lazy get
  _db ??= getFirestore();
  _auth ??= getAuth();
  _msg ??= getMessaging();

  return { app, adminDb: _db!, adminAuth: _auth!, adminMsg: _msg! };
}

/** 편의용 바로 가져다 쓰는 export (initAdmin 이후 사용 보장) */
export const adminDb: Firestore = (() => {
  if (!_db) initAdmin();
  return _db!;
})();

export const adminAuth: Auth = (() => {
  if (!_auth) initAdmin();
  return _auth!;
})();

export const adminMsg: Messaging = (() => {
  if (!_msg) initAdmin();
  return _msg!;
})();










