// lib/firebase-admin.ts
import { initializeApp, getApps, cert, ServiceAccount } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

// .env.local 에 한 줄로 들어있는 서비스 계정 JSON
// FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account", ... }'
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountJson) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY env is missing");
}

// ServiceAccount 타입으로 캐스팅 (project_id / projectId 등은 JSON 안에 그대로 들어있으면 됩니다)
const serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccount;

// 이미 초기화된 앱이 있으면 재사용, 없으면 새로 초기화
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    // projectId 는 serviceAccount 안에 있는 값 사용
    projectId: serviceAccount.projectId,
  });
}

// 서버에서 사용할 Firestore / Messaging 핸들러
export const adminDB = getFirestore();
export const adminMsg = getMessaging();
export { FieldValue };












